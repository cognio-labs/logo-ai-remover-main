import logging
from pathlib import Path
from typing import Any
import cv2
import numpy as np

from backend.config import settings
from backend.engines.base import BackgroundRemovalEngine

logger = logging.getLogger(__name__)


class LocalRMBGEngine(BackgroundRemovalEngine):
    """
    High-speed local ONNX segmentation engine.
    Optimized for low-latency batch processing and Fast Mode.
    """

    def __init__(self, model_path: Path | str | None = None) -> None:
        self.model_path = Path(model_path) if model_path else settings.weights_root / settings.bg_fast_model_name
        self.session = None
        self.input_name = None
        self.output_name = None
        self.input_size = (320, 320)
        self._init_session()

    def _init_session(self) -> None:
        try:
            import onnxruntime as ort

            providers = []
            if settings.bg_device in ("cuda", "auto") and "CUDAExecutionProvider" in ort.get_available_providers():
                providers.append("CUDAExecutionProvider")
            providers.append("CPUExecutionProvider")

            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

            if not self.model_path.is_file():
                alt = settings.weights_root / "u2net.onnx"
                if alt.is_file():
                    self.model_path = alt

            if self.model_path.is_file():
                self.session = ort.InferenceSession(str(self.model_path), sess_options=opts, providers=providers)
                self.input_name = self.session.get_inputs()[0].name
                self.output_name = self.session.get_outputs()[0].name
                in_shape = self.session.get_inputs()[0].shape
                if len(in_shape) == 4 and isinstance(in_shape[2], int) and in_shape[2] > 0:
                    self.input_size = (in_shape[3], in_shape[2])
                logger.info(
                    "LocalRMBGEngine loaded model=%s input_shape=%s",
                    self.model_path.name,
                    self.input_size,
                )
        except Exception as exc:
            logger.exception("Failed to initialize fast session for %s: %s", self.model_path, exc)
            self.session = None

    def remove_background(
        self,
        image_bgr: np.ndarray,
        quality_mode: str = "fast",
    ) -> np.ndarray:
        orig_h, orig_w = image_bgr.shape[:2]
        if self.session is None:
            return np.full((orig_h, orig_w), 255, dtype=np.uint8)

        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        target_w, target_h = self.input_size
        resized = cv2.resize(rgb, (target_w, target_h), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0

        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (resized - mean) / std

        blob = np.ascontiguousarray(np.transpose(normalized, (2, 0, 1))[np.newaxis, :, :, :], dtype=np.float32)
        preds = self.session.run([self.output_name], {self.input_name: blob})
        raw_mask = preds[0][0, 0]

        mi, ma = float(raw_mask.min()), float(raw_mask.max())
        if ma - mi > 1e-6:
            norm_mask = (raw_mask - mi) / (ma - mi)
        else:
            norm_mask = np.zeros_like(raw_mask)

        full_res_mask = cv2.resize(norm_mask, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        return np.clip(full_res_mask * 255.0, 0.0, 255.0).astype(np.uint8)

    def get_model_info(self) -> dict[str, Any]:
        return {
            "name": self.model_path.name if self.model_path else "Silueta/RMBG",
            "type": "local_fast_onnx",
            "device": self.session.get_providers()[0] if self.session else "none",
            "input_size": list(self.input_size),
            "loaded": self.session is not None,
        }
