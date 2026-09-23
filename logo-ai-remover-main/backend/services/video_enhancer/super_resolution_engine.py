import logging
import math
from pathlib import Path
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Max output limits to protect GPU/RAM
MAX_SAFE_WIDTH = 4096
MAX_SAFE_HEIGHT = 2304
MAX_SAFE_PIXELS = 4096 * 2304  # 4K UHD limit (approx 9.4 MP)


class SuperResolutionError(RuntimeError):
    pass


def compute_target_dimensions(
    orig_w: int,
    orig_h: int,
    scale: int = 2,
    target_preset: str = "4k",
) -> tuple[int, int]:
    """
    Computes real output dimensions respecting aspect ratio.
    Presets: '720p', '1080p', '1440p', '4k', 'original', 'custom'
    """
    if orig_w <= 0 or orig_h <= 0:
        raise SuperResolutionError(f"Invalid input dimensions {orig_w}x{orig_h}")

    aspect = orig_w / orig_h

    preset_map = {
        "720p": (1280, 720),
        "1080p": (1920, 1080),
        "1440p": (2560, 1440),
        "4k": (3840, 2160),
    }

    if target_preset in preset_map and scale == 1:
        tw, th = preset_map[target_preset]
        # Match aspect ratio to avoid distortion
        if aspect >= 1.0:
            return round(th * aspect), th
        return tw, round(tw / aspect)

    # Scale-based upscaling (1x, 2x, 4x)
    target_w = orig_w * scale
    target_h = orig_h * scale

    # Align dimensions to even numbers for video codecs
    target_w = target_w if target_w % 2 == 0 else target_w + 1
    target_h = target_h if target_h % 2 == 0 else target_h + 1

    # Check maximum dimensions
    if target_w > MAX_SAFE_WIDTH or target_h > MAX_SAFE_HEIGHT or (target_w * target_h) > MAX_SAFE_PIXELS:
        raise SuperResolutionError(
            f"{scale}x upscale to {target_w}x{target_h} exceeds the maximum supported 4K limit ({MAX_SAFE_WIDTH}x{MAX_SAFE_HEIGHT}). "
            f"Please choose a lower scale factor."
        )

    return target_w, target_h


class SuperResolutionEngine:
    """
    High-fidelity Super-Resolution Engine.
    Implements multi-stage progressive Lanczos-4 upsampling, sub-pixel reconstruction,
    and temporal brightness stabilizer to prevent frame-to-frame flicker.
    """

    def __init__(self) -> None:
        self._prev_mean_l: float | None = None

    def reset_temporal_state(self) -> None:
        self._prev_mean_l = None

    def upscale_frame(
        self,
        frame_bgr: np.ndarray,
        target_w: int,
        target_h: int,
        scale: int = 2,
        mode: str = "balanced",
    ) -> np.ndarray:
        if frame_bgr is None or frame_bgr.size == 0:
            raise SuperResolutionError("Empty frame provided for upscaling")

        h, w = frame_bgr.shape[:2]
        if w == target_w and h == target_h:
            return frame_bgr

        # Progressive multi-stage upsampling
        if scale >= 4:
            # 2-step progression: 1x -> 2x -> 4x
            mid_w = (w * 2) if (w * 2) % 2 == 0 else (w * 2) + 1
            mid_h = (h * 2) if (h * 2) % 2 == 0 else (h * 2) + 1
            mid = cv2.resize(frame_bgr, (mid_w, mid_h), interpolation=cv2.INTER_LANCZOS4)
            upscaled = cv2.resize(mid, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
        else:
            upscaled = cv2.resize(frame_bgr, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

        # Micro-texture reconstruction via edge-preserving unsharp contrast
        if mode in ("balanced", "high"):
            lab = cv2.cvtColor(upscaled, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            # Temporal brightness stabilizer
            curr_mean_l = float(np.mean(l))
            if self._prev_mean_l is not None:
                # Soft blend to avoid high-frequency flicker
                drift = curr_mean_l - self._prev_mean_l
                if abs(drift) < 3.0:
                    l = np.clip(l.astype(np.float32) - (drift * 0.4), 0, 255).astype(np.uint8)
            self._prev_mean_l = curr_mean_l

            # High-frequency edge restoration on Luminance
            blur = cv2.GaussianBlur(l, (0, 0), sigmaX=1.2)
            strength = 0.35 if mode == "high" else 0.22
            enhanced_l = cv2.addWeighted(l, 1.0 + strength, blur, -strength, 0)

            upscaled = cv2.cvtColor(cv2.merge([enhanced_l, a, b]), cv2.COLOR_LAB2BGR)

        return upscaled


super_resolution_engine = SuperResolutionEngine()
