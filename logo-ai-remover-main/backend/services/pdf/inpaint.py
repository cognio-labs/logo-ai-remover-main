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
