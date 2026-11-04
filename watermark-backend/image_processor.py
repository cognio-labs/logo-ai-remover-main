"""OpenCV helpers for best-effort removal of a small bright corner mark.

Requires numpy and opencv-python(-headless). Template/color detectors are
heuristics: inspect output masks/results and tune thresholds for your images.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple, Union

import cv2
import numpy as np

PathLike = Union[str, Path]
Box = Tuple[int, int, int, int]  # x, y, width, height in full-image pixels


def _clip_box(box: Box, width: int, height: int) -> Box:
    x, y, w, h = (int(v) for v in box)
    x0, y0 = max(0, min(width - 1, x)), max(0, min(height - 1, y))
    x1 = max(x0 + 1, min(width, x + max(1, w)))
    y1 = max(y0 + 1, min(height, y + max(1, h)))
    return x0, y0, x1 - x0, y1 - y0


def _odd(value: int, minimum: int = 3) -> int:
    value = max(minimum, int(value))
    return value if value % 2 else value + 1


def _sparkle_template(size: int) -> np.ndarray:
    """Create a generic four-point sparkle template (not a brand logo asset)."""
    size = _odd(size, 9)
    canvas = np.zeros((size, size), dtype=np.uint8)
    center = size // 2
    radius = max(3, int(size * 0.43))
    narrow = max(1, int(size * 0.045))
    points = np.array([
        [center, center - radius], [center + narrow, center - narrow],
        [center + radius, center], [center + narrow, center + narrow],
        [center, center + radius], [center - narrow, center + narrow],
        [center - radius, center], [center - narrow, center - narrow],
    ], dtype=np.int32)
    cv2.fillPoly(canvas, [points], 255)
    return canvas


def _template_mask(response: np.ndarray, roi_shape: Tuple[int, int]) -> np.ndarray:
    """Find a high-confidence generic sparkle shape at a few plausible sizes."""
    height, width = roi_shape
    found = np.zeros((height, width), dtype=np.uint8)
    short_side = min(height, width)
    best_score, best_rect = -1.0, None
    # Search multiple sizes because source resolutions vary. Match against the
    # top-hat response rather than raw colors to reduce sensitivity to backdrop.
    sizes = sorted({s for s in (int(short_side * f) for f in (0.10, 0.14, 0.18, 0.23, 0.29)) if 9 <= s < short_side})
    for size in sizes:
        size = _odd(size)
        if size >= height or size >= width:
            continue
        template = _sparkle_template(size)
        score_map = cv2.matchTemplate(response, template, cv2.TM_CCOEFF_NORMED)
        _, score, _, location = cv2.minMaxLoc(score_map)
        if score > best_score:
            best_score = float(score)
            best_rect = (location[0], location[1], size, size)
    # Conservative threshold reduces random matches; tune against validated data.
    if best_rect is not None and best_score >= 0.60:
        x, y, w, h = best_rect
        found[y:y + h, x:x + w] = 255
    return found


def _auto_mask_bgr(crop: np.ndarray) -> np.ndarray:
    """Detect small bright sparkle-like marks using three complementary cues."""
    height, width = crop.shape[:2]
    if height < 5 or width < 5:
        return np.zeros((height, width), np.uint8)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    short_side = min(height, width)

    # White top-hat isolates details smaller than its structuring element.
    ksize = min(_odd(max(9, int(short_side * 0.22))), _odd(max(3, short_side - 1)))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    top_hat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    otsu_threshold, _ = cv2.threshold(top_hat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    response_threshold = max(12, int(otsu_threshold))
    bright_detail = cv2.threshold(top_hat, response_threshold, 255, cv2.THRESH_BINARY)[1]

    # A white/semitransparent sparkle is usually high-value and low-saturation.
    # This cue is intersected with top-hat response to avoid masking large pale
    # backgrounds on their own. Saturation max is intentionally permissive.
    neutral_bright = cv2.inRange(hsv, np.array([0, 0, 175], np.uint8), np.array([180, 125, 255], np.uint8))
    color_detail = cv2.bitwise_and(bright_detail, neutral_bright)

    # Keep components of plausible mark size and discard scattered highlights.
    n, labels, stats, _centroids = cv2.connectedComponentsWithStats(color_detail, 8)
    components = np.zeros_like(color_detail)
    min_area = max(1, int(short_side * short_side * 0.000006))
    max_area = max(min_area, int(height * width * 0.08))
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        bw, bh = int(stats[i, cv2.CC_STAT_WIDTH]), int(stats[i, cv2.CC_STAT_HEIGHT])
        aspect = max(bw, bh) / max(1, min(bw, bh))
        if min_area <= area <= max_area and aspect <= 8.0:
            components[labels == i] = 255

    # Generic template matching can reconnect disconnected sparkle arms; combine
    # with local bright pixels only inside the matched bounding square.
    templ = _template_mask(top_hat, (height, width))
    if cv2.countNonZero(templ):
        templ = cv2.dilate(templ, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        components = cv2.bitwise_or(components, cv2.bitwise_and(templ, cv2.dilate(bright_detail, np.ones((3, 3), np.uint8))))

    if not cv2.countNonZero(components):
        return components
    dilation_size = min(_odd(max(3, int(short_side * 0.012))), _odd(max(3, short_side - 1)))
    dilation = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation_size, dilation_size))
    return cv2.dilate(components, dilation, iterations=1)


def make_corner_mask(image_bgr: np.ndarray, manual_box: Optional[Box] = None, fallback: bool = True) -> np.ndarray:
    """Return an 8-bit full-image mask for the bottom-right mark.

    Search defaults to the bottom-right 20% width x 15% height. ``manual_box``
    overrides the search region. If no pixels are detected and fallback is True,
    a small box at the region's bottom-right is used.
    """
    height, width = image_bgr.shape[:2]
    full_mask = np.zeros((height, width), dtype=np.uint8)
    if manual_box is not None:
        x, y, w, h = _clip_box(manual_box, width, height)
    else:
        w, h = max(1, int(round(width * 0.20))), max(1, int(round(height * 0.15)))
        x, y = width - w, height - h
    roi = image_bgr[y:y + h, x:x + w]
    detected = _auto_mask_bgr(roi) if roi.size else np.zeros((h, w), np.uint8)
    if cv2.countNonZero(detected):
        full_mask[y:y + h, x:x + w] = detected
        return full_mask
    if fallback:
        fw, fh = max(3, int(w * 0.12)), max(3, int(h * 0.18))
        full_mask[y + h - fh:y + h, x + w - fw:x + w] = 255
    return full_mask


def remove_corner_mark(image: np.ndarray, manual_box: Optional[Box] = None,
                       inpaint_radius: float = 2.5, fallback: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """Inpaint a detected mark with Navier-Stokes and subtle camera grain matching."""
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        raise ValueError("Image is empty or invalid")
    if image.dtype != np.uint8:
        raise ValueError("Only 8-bit images are supported")
    if image.ndim != 3 or image.shape[2] not in (3, 4):
        raise ValueError("Expected a BGR or BGRA image")
    has_alpha = image.shape[2] == 4
    bgr = image[:, :, :3].copy()
    mask = make_corner_mask(bgr, manual_box=manual_box, fallback=fallback)
    
    # 1. High-fidelity Navier-Stokes edge-preserving inpaint (eliminates plastic blur)
    result_bgr = cv2.inpaint(bgr, mask, float(inpaint_radius), cv2.INPAINT_NS)
    
    # 2. Add subtle sensor grain to inpaint area to blend seamlessly with camera texture
    mask_indices = np.where(mask > 0)
    if len(mask_indices[0]) > 0:
        noise = np.random.normal(0, 1.8, (len(mask_indices[0]), 3))
        patch_pixels = result_bgr[mask_indices].astype(np.float32) + noise
        result_bgr[mask_indices] = np.clip(patch_pixels, 0, 255).astype(np.uint8)

    result = np.dstack((result_bgr, image[:, :, 3].copy())) if has_alpha else result_bgr
    return result, mask


def process_image_file(input_path: PathLike, output_path: PathLike,
                       manual_box: Optional[Box] = None, fallback: bool = True) -> dict:
    """Decode an image, remove the corner mark, and write a full-resolution PNG."""
    input_path, output_path = Path(input_path), Path(output_path)
    image = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Could not decode image; check its actual file type")
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    elif image.ndim != 3 or image.shape[2] not in (3, 4):
        raise ValueError("Unsupported image channel layout")
    result, mask = remove_corner_mark(image, manual_box=manual_box, fallback=fallback)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), result, [cv2.IMWRITE_PNG_COMPRESSION, 3]):
        raise IOError(f"Could not write output PNG: {output_path}")
    height, width = result.shape[:2]
    return {
        "output_path": str(output_path),
        "width": width,
        "height": height,
        "has_alpha": result.shape[2] == 4,
        "masked_pixels": int(cv2.countNonZero(mask)),
    }

