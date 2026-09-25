"""
PDF Raster Watermark Mask Builder.

ONLY called when:
  - The page is a scanned image (no selectable text layer)
  - AND a raster watermark was detected by the detector

Key rules:
  - Mask must be as SMALL AND PRECISE as possible
  - Must NOT include normal dark-ink text pixels
  - Must NOT be a large rectangle bounding box
  - Mask coverage > 60% of page → refuse to continue
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import cv2
import numpy as np

if TYPE_CHECKING:
    from backend.services.pdf.detector import WatermarkCandidate

logger = logging.getLogger(__name__)

# Refuse removal if mask covers more than this fraction of the page
MAX_ALLOWED_MASK_COVERAGE = 0.55


def build_precise_raster_mask(
    bgr_image: np.ndarray,
    candidate: "WatermarkCandidate",
) -> np.ndarray | None:
    """
    Given a raster watermark candidate, produce a refined pixel-precise mask.

    Returns:
        uint8 mask (same HxW as bgr_image) with 255 = watermark pixels
        or None if mask coverage is too high (refuse destructive operation)
    """
    h, w = bgr_image.shape[:2]
    if h == 0 or w == 0:
        return None

    # Start from detector's pre-computed mask if available
    if candidate.raster_mask is not None:
        base_mask = candidate.raster_mask.copy()
    else:
        # Reconstruct from norm_bbox as a rough start
        nx, ny, nw, nh = candidate.norm_bbox
        x1 = max(0, int(nx * w))
        y1 = max(0, int(ny * h))
        x2 = min(w, int((nx + nw) * w))
        y2 = min(h, int((ny + nh) * h))
        base_mask = np.zeros((h, w), dtype=np.uint8)
        base_mask[y1:y2, x1:x2] = 255

    # ── Refinement Step 1: remove dark pixels (real ink) from the mask ──────
    # Dark pixels (< 160) are definitively real document ink — protect them
    gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
    dark_ink_pixels = (gray < 160).astype(np.uint8) * 255
    # Dilate ink protection zone slightly (to also protect anti-aliased edges)
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    protected_zone = cv2.dilate(dark_ink_pixels, kern, iterations=1)
    # Remove protected pixels from mask
    refined_mask = cv2.bitwise_and(base_mask, cv2.bitwise_not(protected_zone))

    # ── Refinement Step 2: morphological cleanup ─────────────────────────────
    kern_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    refined_mask = cv2.morphologyEx(refined_mask, cv2.MORPH_CLOSE, kern_close)
    # Slight erosion to shrink mask boundary away from text edges
    kern_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    refined_mask = cv2.erode(refined_mask, kern_erode, iterations=1)

    # ── Safety check: reject if mask is too large ────────────────────────────
    coverage = float(np.count_nonzero(refined_mask)) / (h * w)
    if coverage > MAX_ALLOWED_MASK_COVERAGE:
        logger.warning(
            "Raster mask coverage %.1f%% exceeds safety limit — refusing removal on page %d",
            coverage * 100,
            candidate.page_index + 1,
        )
        return None

    if np.count_nonzero(refined_mask) == 0:
        logger.info(
            "Refined mask is empty after ink protection on page %d — no raster removal",
            candidate.page_index + 1,
        )
        return None

    logger.info(
        "[Mask] page=%d coverage=%.2f%% active_px=%d",
        candidate.page_index + 1,
        coverage * 100,
        int(np.count_nonzero(refined_mask)),
    )
    return refined_mask
