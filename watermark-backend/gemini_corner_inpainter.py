"""
=============================================================================
gemini_corner_inpainter.py — Production Gemini Sparkle Removal Engine
=============================================================================
Removes the visible Google Gemini sparkle watermark from generated images.
No API key, no external AI service, everything runs locally.
Supported aspect ratios: 1:1, 9:16, 3:4, 4:3, 16:9 (and any other size).

WHERE THE SPARKLE IS (measured on real Gemini images):
- It is NOT in the extreme corner. It sits inside the bottom-right area.
- Let S = min(width, height).
- Sparkle center:  cx = W - 0.156 * S,   cy = H - 0.156 * S
- Sparkle size:    about 0.062 * S (a 4-point star, semi-transparent white/grey)
- Examples: 1024x559 -> center (937, 472); 572x1024 -> center (483, 935).
- Scales with the short side across portrait, landscape, and square.
=============================================================================
"""

import io
import os
import cv2
import numpy as np
from PIL import Image, ImageOps
from pathlib import Path
from typing import Union, Tuple, Optional

PathLike = Union[str, Path]


def create_synthetic_star(size: int) -> np.ndarray:
    """Generate a 4-point semi-transparent sparkle template."""
    size = max(9, size)
    if size % 2 == 0:
        size += 1
    star = np.zeros((size, size), dtype=np.uint8)
    center = size // 2
    r_arm = max(2, int(size * 0.44))
    r_diag = max(1, int(size * 0.10))

    pts = np.array([
        [center, center - r_arm],
        [center + r_diag, center - r_diag],
        [center + r_arm, center],
        [center + r_diag, center + r_diag],
        [center, center + r_arm],
        [center - r_diag, center + r_diag],
        [center - r_arm, center],
        [center - r_diag, center - r_diag],
    ], dtype=np.int32)
    cv2.fillPoly(star, [pts], 255)
    return cv2.GaussianBlur(star, (3, 3), 0)


def locate_gemini_sparkle(
    bgr: np.ndarray,
    offset_pct: float = 0.156,
    box_pct: float = 0.10,
    star_pct: float = 0.062,
    threshold: float = 0.35,
) -> Tuple[int, int, int, int]:
    """
    Locates the Gemini sparkle using the 15.6% short-side rule,
    with auto-refine in a 0.30*S search window via template matching.
    """
    H, W = bgr.shape[:2]
    S = min(W, H)

    cx = int(round(W - offset_pct * S))
    cy = int(round(H - offset_pct * S))
    star_size = max(8, int(round(star_pct * S)))
    box_size = max(12, int(round(box_pct * S)))

    x0 = max(0, min(W - box_size, cx - box_size // 2))
    y0 = max(0, min(H - box_size, cy - box_size // 2))
    w = min(box_size, W - x0)
    h = min(box_size, H - y0)

    # Auto-refine search window
    search_r = int(round(0.18 * S))
    sx0 = max(0, cx - search_r)
    sy0 = max(0, cy - search_r)
    sx1 = min(W, cx + search_r)
    sy1 = min(H, cy + search_r)

    if sx1 - sx0 > star_size and sy1 - sy0 > star_size:
        search_roi = bgr[sy0:sy1, sx0:sx1]
        gray = cv2.cvtColor(search_roi, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        hp = cv2.subtract(gray, blur)

        template = create_synthetic_star(star_size)
        t_blur = cv2.GaussianBlur(template, (5, 5), 0)
        t_hp = cv2.subtract(template, t_blur)

        if hp.shape[0] >= t_hp.shape[0] and hp.shape[1] >= t_hp.shape[1]:
            res = cv2.matchTemplate(hp, t_hp, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)

            if max_val >= threshold:
                matched_cx = sx0 + max_loc[0] + star_size // 2
                matched_cy = sy0 + max_loc[1] + star_size // 2
                x0 = max(0, min(W - box_size, matched_cx - box_size // 2))
                y0 = max(0, min(H - box_size, matched_cy - box_size // 2))
                w = min(box_size, W - x0)
                h = min(box_size, H - y0)

    return (x0, y0, w, h)


def remove_gemini_corner_sparkle(
    image_input: Union[PathLike, bytes, np.ndarray],
    output_path: Optional[PathLike] = None,
    offset_pct: float = 0.156,
    box_pct: float = 0.10,
    inpaint_mode: str = "ns",
) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
    """
    Remove Google Gemini corner sparkle logo automatically.
    Returns: (cleaned_image_bgr_or_bgra, (x, y, w, h))
    """
    # 1. Load image and apply EXIF orientation
    if isinstance(image_input, (str, Path)):
        pil_img = Image.open(str(image_input))
        pil_img = ImageOps.exif_transpose(pil_img)
        img_np = np.array(pil_img)
    elif isinstance(image_input, bytes):
        pil_img = Image.open(io.BytesIO(image_input))
        pil_img = ImageOps.exif_transpose(pil_img)
        img_np = np.array(pil_img)
    elif isinstance(image_input, np.ndarray):
        img_np = image_input
    else:
        raise ValueError("Unsupported image input type")

    # Safety limits: max 8000px
    H, W = img_np.shape[:2]
    if H > 8000 or W > 8000:
        raise ValueError(f"Image dimensions ({W}x{H}) exceed maximum limit of 8000px.")

    # Convert PIL RGBA/RGB to OpenCV BGR/BGRA
    has_alpha = False
    alpha_channel = None
    if img_np.ndim == 3 and img_np.shape[2] == 4:
        has_alpha = True
        alpha_channel = img_np[:, :, 3]
        bgr = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
    elif img_np.ndim == 3 and img_np.shape[2] == 3:
        if isinstance(image_input, (str, Path, bytes)):
            bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        else:
            bgr = img_np
    elif img_np.ndim == 2:
        bgr = cv2.cvtColor(img_np, cv2.COLOR_GRAY2BGR)
    else:
        bgr = img_np

    # 2. Locate Sparkle Box using 15.6% Short-Side Rule + Auto-Refine
    x0, y0, w, h = locate_gemini_sparkle(bgr, offset_pct=offset_pct, box_pct=box_pct)
    box = (x0, y0, w, h)

    # 3. Create sub-pixel watermark mask inside target box
    roi = bgr[y0:y0 + h, x0:x0 + w].copy()
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    k = max(3, int(min(w, h) * 0.25)) | 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    top_hat = cv2.morphologyEx(gray_roi, cv2.MORPH_TOPHAT, kernel)

    white_mask = cv2.inRange(hsv_roi, np.array([0, 0, 150], np.uint8), np.array([180, 120, 255], np.uint8))
    _, detail = cv2.threshold(top_hat, 12, 255, cv2.THRESH_BINARY)
    star_mask = cv2.bitwise_and(detail, white_mask)

    if cv2.countNonZero(star_mask) < 10:
        star_mask = np.zeros((h, w), dtype=np.uint8)
        star_templ = create_synthetic_star(int(min(w, h) * 0.65))
        th, tw = star_templ.shape[:2]
        tx = (w - tw) // 2
        ty = (h - th) // 2
        star_mask[ty:ty + th, tx:tx + tw] = (star_templ > 60).astype(np.uint8) * 255

    dil = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    star_mask = cv2.dilate(star_mask, dil, iterations=1)

    full_mask = np.zeros((H, W), dtype=np.uint8)
    full_mask[y0:y0 + h, x0:x0 + w] = star_mask

    # 4. Inpaint using Navier-Stokes (ns) or Telea
    mode = cv2.INPAINT_NS if inpaint_mode.lower() in ("ns", "navier-stokes") else cv2.INPAINT_TELEA
    result_bgr = cv2.inpaint(bgr, full_mask, inpaintRadius=3.0, flags=mode)

    # 5. Add light sensor grain (+/- 1.8) inside patch to match texture
    mask_idx = np.where(full_mask > 0)
    if len(mask_idx[0]) > 0:
        noise = np.random.normal(0, 1.8, (len(mask_idx[0]), 3))
        patch = result_bgr[mask_idx].astype(np.float32) + noise
        result_bgr[mask_idx] = np.clip(patch, 0, 255).astype(np.uint8)

    # Re-attach alpha if present
    if has_alpha and alpha_channel is not None:
        result = cv2.merge([result_bgr[:, :, 0], result_bgr[:, :, 1], result_bgr[:, :, 2], alpha_channel])
    else:
        result = result_bgr

    # Save to file if output_path specified
    if output_path is not None:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), result)

    return result, box


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        inp = sys.argv[1]
        outp = sys.argv[2]
        print(f"Cleaning Gemini sparkle from: {inp} -> {outp}")
        _, b = remove_gemini_corner_sparkle(inp, outp)
        print(f"Done! Cleaned target box: {b}")
    else:
        print("Usage: python gemini_corner_inpainter.py <input> <output>")
