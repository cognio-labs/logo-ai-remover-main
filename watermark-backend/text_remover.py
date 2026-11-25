"""
text_remover.py — Precision Text and Object Removal Engine
==========================================================
Local text and object inpainting for explicit user selections.
Uses existing LaMa weights when available, with OpenCV fallback. Morphological
legacy proposals are not OCR and are never trusted as a semantic selection.
Output quality depends on context; all unselected pixels stay unchanged.
"""
from __future__ import annotations

import io
import json
import logging
import os
from pathlib import Path
from typing import List, Optional, Tuple, Union

import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("text_remover")


def inpaint_with_local_lama(image_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray | None:
    """Reuse installed LaMa weights; never download weights or modify outside selection.

    The prediction works on a bounded contextual crop. Full-resolution original
    pixels remain authoritative outside the exact mask, even when a large crop
    needs to be scaled for neural inference.
    """
    default = Path(__file__).resolve().parents[1] / 'artifacts' / 'big-lama.pt'
    weights = Path(os.getenv('LAMA_MODEL_PATH', str(default)))
    if not weights.is_file() or not np.any(mask):
        return None
    try:
        import torch
        from lama_residual import _load, _inference_lock
        ys, xs = np.where(mask > 0)
        h, w = mask.shape
        margin = max(48, min(256, int(max(xs.max()-xs.min(), ys.max()-ys.min()) * .35)))
        x0, y0 = max(0, int(xs.min())-margin), max(0, int(ys.min())-margin)
        x1, y1 = min(w, int(xs.max())+margin+1), min(h, int(ys.max())+margin+1)
        crop = image_bgr[y0:y1, x0:x1]
        selection = mask[y0:y1, x0:x1]
        ch, cw = selection.shape
        scale = min(1., 1024./max(ch,cw))
        sw, sh = max(1, round(cw*scale)), max(1, round(ch*scale))
        rgb = cv2.cvtColor(cv2.resize(crop, (sw,sh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
        small_mask = cv2.resize(selection, (sw,sh), interpolation=cv2.INTER_NEAREST) > 0
        if not small_mask.any():
            return None
        padding = ((0, (-sh)%8), (0, (-sw)%8))
        image_tensor = torch.from_numpy(np.ascontiguousarray(
            np.pad(rgb, (*padding,(0,0)), mode='edge').transpose(2,0,1)[None], dtype=np.float32)/255.)
        mask_tensor = torch.from_numpy(np.pad(small_mask.astype(np.float32), padding)[None,None])
        with _inference_lock, torch.inference_mode():
            model = _load(str(weights.resolve()))
            prediction = model(image_tensor, mask_tensor)[0].permute(1,2,0).numpy()[:sh,:sw]
        repaired = cv2.cvtColor(np.rint(np.clip(prediction,0,1)*255).astype(np.uint8), cv2.COLOR_RGB2BGR)
        repaired = cv2.resize(repaired, (cw,ch), interpolation=cv2.INTER_LINEAR)
        result = image_bgr.copy()
        region = result[y0:y1,x0:x1]
        region[selection>0] = repaired[selection>0]
        logger.info('Selected-region repair used local LaMa on %sx%s context', sw,sh)
        return result
    except Exception:
        logger.exception('Local LaMa unavailable; using bounded OpenCV inpainting')
        return None


def detect_text_regions_morphological(image_bgr: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detect text bounding boxes using morphological gradient, MSER/Otsu, and contour aspect filtering.
    Returns list of (x, y, w, h) bounding boxes.
    """
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Morphological Gradient to highlight high-contrast stroke edges
    morph_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    gradient = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, morph_kernel)

    # 2. Otsu thresholding to create binary edge map
    _, thresh = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 3. Horizontal connection to group letters into words and lines
    connect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
    connected = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, connect_kernel)

    contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    text_boxes = []
    min_area = max(40, int(w * h * 0.00005))
    max_area = int(w * h * 0.40)

    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        area = bw * bh
        if min_area <= area <= max_area and bw >= 8 and bh >= 6:
            # Aspect ratio and density checks
            aspect = bw / float(bh)
            if 0.2 <= aspect <= 25.0:
                # Pad slightly to capture ascenders and descenders
                pad_x = max(2, int(bw * 0.04))
                pad_y = max(2, int(bh * 0.08))
                x0 = max(0, x - pad_x)
                y0 = max(0, y - pad_y)
                x1 = min(w, x + bw + pad_x)
                y1 = min(h, y + bh + pad_y)
                text_boxes.append((x0, y0, x1 - x0, y1 - y0))

    return text_boxes


def build_text_mask(
    image_bgr: np.ndarray,
    boxes: Optional[List[Tuple[int, int, int, int]]] = None,
    custom_mask: Optional[np.ndarray] = None,
    auto_detect: bool = True,
) -> np.ndarray:
    """
    Constructs a refined binary mask covering text strokes to be removed.
    """
    h, w = image_bgr.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    # 1. If custom drawn mask is provided, blend it in
    if custom_mask is not None:
        if custom_mask.shape[:2] != (h, w):
            custom_mask = cv2.resize(custom_mask, (w, h), interpolation=cv2.INTER_NEAREST)
        mask = np.maximum(mask, (custom_mask > 0).astype(np.uint8) * 255)

    # 2. Add manual bounding boxes
    if boxes:
        for (bx, by, bw, bh) in boxes:
            x0 = max(0, min(w - 1, int(bx)))
            y0 = max(0, min(h - 1, int(by)))
            x1 = max(x0 + 1, min(w, x0 + int(bw)))
            y1 = max(y0 + 1, min(h, y0 + int(bh)))
            mask[y0:y1, x0:x1] = 255

    # 3. If auto-detect is requested and no boxes passed
    if auto_detect and not boxes and custom_mask is None:
        detected = detect_text_regions_morphological(image_bgr)
        for (bx, by, bw, bh) in detected:
            mask[by:by + bh, bx:bx + bw] = 255

    # An explicit user mask is authoritative: never expand into unselected text,
    # faces or neighbouring objects. Automatic proposals may need padding.
    if custom_mask is not None or boxes:
        return mask
    # Refine automatically detected strokes only.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.dilate(mask, kernel, iterations=1)

    return mask


def inpaint_text_and_objects(
    image_bgr: np.ndarray,
    mask: np.ndarray,
    inpaint_radius: int = 4,
    use_grain_matching: bool = True,
) -> np.ndarray:
    """
    Reconstructs the original background behind text using high-fidelity inpainting
    with Navier-Stokes fluid dynamics and edge texture matching.
    """
    if cv2.countNonZero(mask) == 0:
        return image_bgr.copy()

    # 1. Dual-method inpainting: Navier-Stokes for gradient continuity + Telea for fine textures
    inpainted_ns = cv2.inpaint(image_bgr, mask, inpaint_radius, cv2.INPAINT_NS)
    inpainted_telea = cv2.inpaint(image_bgr, mask, inpaint_radius, cv2.INPAINT_TELEA)

    # Blend them: 70% NS (better edge alignment) + 30% Telea (smooth marching)
    blended = cv2.addWeighted(inpainted_ns, 0.70, inpainted_telea, 0.30, 0)

    # 2. Texture grain matching: prevents flat plastic/blurry patches on textured paper or photo noise
    if use_grain_matching:
        # Sample standard deviation of surrounding border pixels
        border_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        dilated_mask = cv2.dilate(mask, border_kernel)
        border_ring = (dilated_mask > 0) & (mask == 0)

        if np.any(border_ring):
            ring_pixels = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)[border_ring]
            std_dev = float(np.std(ring_pixels))
            if std_dev > 3.0:
                noise_sigma = min(std_dev * 0.45, 6.0)
                noise = np.random.normal(0, noise_sigma, image_bgr.shape).astype(np.float32)
                blended_float = blended.astype(np.float32) + noise * (mask[:, :, None] / 255.0)
                blended = np.clip(blended_float, 0, 255).astype(np.uint8)

    # Composite: replace only the masked pixels
    result = image_bgr.copy()
    result[mask > 0] = blended[mask > 0]
    return result


def remove_text_pipeline(
    image_bytes: bytes,
    boxes_json: Optional[str] = None,
    mask_bytes: Optional[bytes] = None,
    auto_detect: bool = False,
) -> bytes:
    """
    High-level entry point for text and object removal.
    """
    pil_img = Image.open(io.BytesIO(image_bytes))
    if pil_img.width * pil_img.height > 32_000_000:
        raise ValueError('Image exceeds the 32 megapixel processing limit')
    try:
        pil_img = ImageOps.exif_transpose(pil_img)
    except Exception:
        pass

    has_alpha = 'A' in pil_img.getbands() or 'transparency' in pil_img.info
    img_bgr = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = img_bgr.shape[:2]

    # Parse manual boxes if passed
    boxes = None
    if boxes_json:
        try:
            raw_boxes = json.loads(boxes_json)
            parsed_boxes = []
            for b in raw_boxes:
                if len(b) == 4:
                    # Support normalized (0..1) or pixel coords
                    bx, by, bw, bh = b
                    if max(bx, by, bw, bh) <= 1.0:
                        parsed_boxes.append((int(bx * w), int(by * h), int(bw * w), int(bh * h)))
                    else:
                        parsed_boxes.append((int(bx), int(by), int(bw), int(bh)))
            if parsed_boxes:
                boxes = parsed_boxes
        except Exception as e:
            logger.warning("Failed to parse boxes_json: %s", e)

    # Parse custom drawn mask if passed
    custom_mask = None
    if mask_bytes:
        try:
            mask_pil = Image.open(io.BytesIO(mask_bytes)).convert("L")
            custom_mask = np.array(mask_pil)
        except Exception as e:
            logger.warning("Failed to parse mask_bytes: %s", e)

    # Build binary text mask
    mask = build_text_mask(img_bgr, boxes=boxes, custom_mask=custom_mask, auto_detect=auto_detect)

    # Inpaint
    clean_bgr = inpaint_with_local_lama(img_bgr, mask)
    if clean_bgr is None:
        clean_bgr = inpaint_text_and_objects(img_bgr, mask)
    clean_rgb = cv2.cvtColor(clean_bgr, cv2.COLOR_BGR2RGB)

    if has_alpha:
        orig_alpha = np.array(pil_img.convert('RGBA'))[:, :, 3]
        final_rgba = np.dstack([clean_rgb, orig_alpha])
        out_pil = Image.fromarray(final_rgba, "RGBA")
    else:
        out_pil = Image.fromarray(clean_rgb, "RGB")

    buf = io.BytesIO()
    out_pil.save(buf, format="PNG", optimize=False)
    buf.seek(0)
    return buf.read()
