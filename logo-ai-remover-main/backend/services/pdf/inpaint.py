"""
PDF Raster Watermark Inpainter.

Used ONLY when the watermark is physically baked into a scanned image page
(strategy == "raster").

Rules:
  - Operates ONLY on the pixels inside the precise mask
  - All pixels outside the mask are untouched (zero-copy)
  - Uses localized inpainting: INPAINT_TELEA for content-aware fill
  - Does NOT reconstruct text via OCR
  - Does NOT flatten/recreate the whole page
"""
from __future__ import annotations

import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def remove_uniform_color_overlay(bgr_image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Reverse a uniform translucent colored overlay over neutral document ink.

    The estimate changes only colored mask pixels. It does not invent letters
    that are fully hidden by opaque marks.
    """
    if not np.any(mask):
        return bgr_image.copy()

    pixels = bgr_image[mask > 0]
    sample = pixels[::max(1, len(pixels) // 200_000)]
    colors, counts = np.unique(sample, axis=0, return_counts=True)
    dominant = colors[np.argmax(counts)].astype(np.float32)
    if counts.max() < len(sample) * 0.08:
        return inpaint_raster_watermark(bgr_image, mask)

    base = float(dominant.min())
    source_delta = dominant - base
    coverage = 1.0 - base / 255.0
    if coverage < 0.08 or source_delta.max() < 14:
        return inpaint_raster_watermark(bgr_image, mask)

    source_chroma = float(source_delta.max() / coverage)
    selected = pixels.astype(np.float32)
    minimum = selected.min(axis=1)
    delta = selected - minimum[:, None]
    chroma = delta.max(axis=1)
    cosine = (delta @ source_delta) / (
        np.maximum(np.linalg.norm(delta, axis=1) * np.linalg.norm(source_delta), 1e-6)
    )
    matched = cosine >= 0.94
    alpha = np.clip(chroma / source_chroma, 0, 0.88)
    recovered = np.clip(minimum / np.maximum(1.0 - alpha, 0.12), 0, 255)
    recovered[recovered > 242] = 255

    result = bgr_image.copy()
    output_pixels = pixels.copy()
    output_pixels[matched] = recovered[matched, None].astype(np.uint8)
    result[mask > 0] = output_pixels

    if np.any(~matched):
        other_mask = np.zeros(mask.shape, dtype=np.uint8)
        other_mask[mask > 0] = (~matched).astype(np.uint8) * 255
        result = inpaint_raster_watermark(result, other_mask)
    return result


def inpaint_raster_watermark(
    bgr_image: np.ndarray,
    precise_mask: np.ndarray,
) -> np.ndarray:
    """
    Remove watermark pixels from bgr_image using localized inpainting.

    Only the pixels inside precise_mask are altered.
    All other pixels are returned byte-for-byte identical.

    Args:
        bgr_image:    Original rendered page (BGR uint8)
        precise_mask: uint8 mask, 255 = watermark pixels to remove

    Returns:
        Cleaned BGR image with only watermark pixels inpainted.
    """
    if precise_mask is None or np.count_nonzero(precise_mask) == 0:
        logger.info("Empty mask passed to inpainter — returning original unchanged")
        return bgr_image.copy()

    h, w = bgr_image.shape[:2]
    if precise_mask.shape != (h, w):
        precise_mask = cv2.resize(precise_mask, (w, h), interpolation=cv2.INTER_NEAREST)

    # Feather mask boundary slightly for natural blending at edges
    feathered = cv2.GaussianBlur(precise_mask, (3, 3), 0)
    # Re-binarize after blur (we only want a slightly softened edge, not a full Gaussian)
    binary_inpaint_mask = (feathered > 30).astype(np.uint8) * 255

    # Localized Telea inpainting — only touches masked region
    inpainted = cv2.inpaint(bgr_image, binary_inpaint_mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)

    # CRITICAL: Composite — paste only the inpainted region back; all other pixels from original
    mask_3ch = np.stack([binary_inpaint_mask / 255.0] * 3, axis=-1)
    result = (inpainted.astype(np.float32) * mask_3ch + bgr_image.astype(np.float32) * (1.0 - mask_3ch))
    result = np.clip(result, 0, 255).astype(np.uint8)

    logger.info(
        "[Inpaint] altered_px=%d  total_px=%d  fraction=%.2f%%",
        int(np.count_nonzero(precise_mask)),
        h * w,
        np.count_nonzero(precise_mask) / (h * w) * 100,
    )
    return result
