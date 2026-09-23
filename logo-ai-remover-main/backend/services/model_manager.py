import logging
import threading
from typing import Any
import cv2
import numpy as np

from backend.config import settings
from backend.engines.base import BackgroundRemovalEngine
from backend.engines.local_birefnet import LocalBiRefNetEngine
from backend.engines.local_rmbg import LocalRMBGEngine

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Thread-safe model manager and lifecycle coordinator.
    Handles lazy initialization, device selection, model warmup,
    memory cleanup, and high-resolution tiled inference.
    """

    _instance: "ModelManager | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._engines: dict[str, BackgroundRemovalEngine] = {}
        self._warmed_up = False

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_engine(self, quality_mode: str = "balanced") -> BackgroundRemovalEngine:
        with self._lock:
            if quality_mode == "fast":
                if "fast" not in self._engines:
                    self._engines["fast"] = LocalRMBGEngine()
                return self._engines["fast"]
            else:
                if "primary" not in self._engines:
                    self._engines["primary"] = LocalBiRefNetEngine()
                return self._engines["primary"]

    def warmup(self) -> None:
        """Run a 1-shot inference pass during startup to warm up execution engine caches."""
        if self._warmed_up:
            return
        with self._lock:
            if self._warmed_up:
                return
            try:
                dummy = np.zeros((320, 320, 3), dtype=np.uint8)
                eng = self.get_engine("balanced")
                eng.remove_background(dummy, "balanced")
                self._warmed_up = True
                logger.info("ModelManager: Warmup inference completed successfully.")
            except Exception as exc:
                logger.warning("ModelManager: Warmup failed: %s", exc)

    def predict_mask(
        self,
        image_rgb: np.ndarray,
        fast_mode: bool = False,
        tiled: bool = False,
    ) -> np.ndarray:
        """
        Unified mask prediction entry point.
        Expects RGB numpy array.
        """
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        mode = "ultra" if tiled else ("fast" if fast_mode else "balanced")
        return self.process_image_with_tiling(image_bgr, quality_mode=mode)

    def process_image_with_tiling(
        self,
        image_bgr: np.ndarray,
        quality_mode: str = "balanced",
    ) -> np.ndarray:
        """
        Process image with appropriate inference strategy:
        - If quality_mode is 'ultra' and image is large (> 1400px), use tiled overlapping inference.
        - Otherwise run full-frame inference.
        """
        h, w = image_bgr.shape[:2]
        engine = self.get_engine(quality_mode)

        if quality_mode != "ultra" or max(h, w) <= 1400:
            return engine.remove_background(image_bgr, quality_mode)

        # Ultra / HD Tiled Inference for large images
        logger.info("Running Ultra HD tiled inference on image %dx%d", w, h)
        tile_size = min(settings.bg_tile_size, min(h, w))
        overlap = min(settings.bg_tile_overlap, tile_size // 4)
        stride = tile_size - overlap

        # Create 2D Hanning blending window
        window_y = np.hanning(tile_size)
        window_x = np.hanning(tile_size)
        window_2d = np.outer(window_y, window_x).astype(np.float32)
        window_2d = np.maximum(window_2d, 1e-4)

        accum_mask = np.zeros((h, w), dtype=np.float32)
        accum_weights = np.zeros((h, w), dtype=np.float32)

        # Compute tile coordinates
        y_steps = list(range(0, h - tile_size + 1, stride))
        if not y_steps or y_steps[-1] != h - tile_size:
            y_steps.append(h - tile_size)

        x_steps = list(range(0, w - tile_size + 1, stride))
        if not x_steps or x_steps[-1] != w - tile_size:
            x_steps.append(w - tile_size)

        # Base full-frame pass as low-frequency anchor
        base_mask = engine.remove_background(image_bgr, "balanced").astype(np.float32) / 255.0

        for y in y_steps:
            for x in x_steps:
                tile = image_bgr[y : y + tile_size, x : x + tile_size]
                tile_alpha = engine.remove_background(tile, "high_quality").astype(np.float32) / 255.0

                accum_mask[y : y + tile_size, x : x + tile_size] += tile_alpha * window_2d
                accum_weights[y : y + tile_size, x : x + tile_size] += window_2d

        # Normalize accumulated tiles
        valid = accum_weights > 0
        tiled_result = np.zeros((h, w), dtype=np.float32)
        tiled_result[valid] = accum_mask[valid] / accum_weights[valid]

        # Blend tiled detail with full-frame context (75% tiled detail, 25% global context)
        final_alpha = 0.75 * tiled_result + 0.25 * base_mask
        return np.clip(final_alpha * 255.0, 0.0, 255.0).astype(np.uint8)

    def get_model_info(self) -> dict[str, Any]:
        engine = self.get_engine("balanced")
        info = engine.get_model_info()
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
        except Exception:
            providers = ["CPUExecutionProvider"]

        return {
            "status": "ready" if info.get("loaded") else "degraded",
            "standard_model": settings.bg_model_name,
            "fast_model": settings.bg_fast_model_name,
            "providers": providers,
            "model_info": info,
            "warmed_up": self._warmed_up,
            "tile_size": settings.bg_tile_size,
            "max_upload_mb": settings.max_image_upload_mb,
        }

    def get_health_info(self) -> dict[str, Any]:
        return self.get_model_info()


model_manager = ModelManager.get_instance()
