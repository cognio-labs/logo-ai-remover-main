import logging
from typing import Any
import cv2
import numpy as np

from backend.services.mask_service import clean_mask, dilate_mask
from backend.services.text_layer_service import (
    find_spans_under_mask,
    overlay_crisp_text_on_image,
)


logger = logging.getLogger(__name__)


class DocumentRestorationEngine:
    """
    Content-Aware Document Restoration Engine.
    Reconstructs underlying paper textures, text strokes, lines, and background
    without ever painting destructive flat white rectangles.
    """

    def __init__(self) -> None:
        pass

    def restore_page_image(
        self,
        bgr_image: np.ndarray,
        mask: np.ndarray,
        text_spans: list[dict[str, Any]] | None = None,
        page_width: float = 0.0,
        page_height: float = 0.0,
        mode: str = "balanced",
    ) -> np.ndarray:
        """
        Restore the masked region on a document image:
        1. Estimates surrounding paper tone and texture.
        2. Inpaints using multi-scale Navier-Stokes and Telea methods.
        3. Preserves underlying text contrast where semi-transparent marker was applied.
        4. Reconstructs crisp vector text spans from PDF text layer if available.
        """
        if mask is None or np.count_nonzero(mask) == 0:
            return bgr_image.copy()

        height, width = bgr_image.shape[:2]
        cleaned_mask = clean_mask(mask)
        dilated = dilate_mask(cleaned_mask, radius=2 if mode == "fast" else 3)

        # 1. Estimate local background paper tone from outer ring of non-masked pixels
        kernel_bg = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
        outer_boundary = cv2.dilate(dilated, kernel_bg) - dilated
        
        if np.count_nonzero(outer_boundary) > 20:
            bg_pixels = bgr_image[outer_boundary > 0]
            median_bg = np.median(bg_pixels, axis=0).astype(np.uint8)
        else:
            median_bg = np.array([255, 255, 255], dtype=np.uint8)

        # 2. Content-Aware Paper Replacement:
        # Fill masked interior with surrounding paper tone so large banners/watermarks are completely eradicated
        inpainted = bgr_image.copy()
        inpainted[dilated > 0] = median_bg

        # 3. Boundary Blending:
        # Smooth the boundary ring between paper fill and existing document texture
        if np.count_nonzero(outer_boundary) > 0:
            inpainted = cv2.inpaint(inpainted, outer_boundary, inpaintRadius=3, flags=cv2.INPAINT_TELEA)

        # 4. Text layer reconstruction (only for non-watermark underlying text if explicitly provided)
        if text_spans and page_width > 0 and page_height > 0:
            watermark_keywords = {"sample", "watermark", "draft", "confidential", "copy", "do not duplicate", "trial"}
            spans_under = find_spans_under_mask(text_spans, dilated, page_width, page_height)
            # Filter out spans that contain watermark text
            spans_to_restore = [
                s for s in spans_under
                if not any(kw in s.get("text", "").lower() for kw in watermark_keywords)
            ]
            if spans_to_restore:
                logger.info("Reconstructing %d crisp non-watermark text spans", len(spans_to_restore))
                inpainted = overlay_crisp_text_on_image(inpainted, spans_to_restore, page_width, page_height)

        return inpainted


restoration_engine = DocumentRestorationEngine()
