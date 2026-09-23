import logging
from typing import Any
import cv2
import numpy as np
import pymupdf


logger = logging.getLogger(__name__)


def extract_page_text_spans(page: pymupdf.Page) -> list[dict[str, Any]]:
    """
    Extract structured text spans from PyMuPDF page.
    Each span has: text, font, size, color, bbox (x0, y0, x1, y1), origin.
    """
    spans: list[dict[str, Any]] = []
    try:
        page_dict = page.get_text("dict")
        for block in page_dict.get("blocks", []):
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    spans.append(
                        {
                            "text": span["text"],
                            "font": span.get("font", "Helvetica"),
                            "size": span.get("size", 11.0),
                            "color": span.get("color", 0),
                            "bbox": span.get("bbox", (0, 0, 0, 0)),
                            "origin": span.get("origin", (0, 0)),
                            "flags": span.get("flags", 0),
                        }
                    )
    except Exception as exc:
        logger.warning("Error extracting text layer: %s", exc)
    return spans


def find_spans_under_mask(
    spans: list[dict[str, Any]],
    mask: np.ndarray,
    page_width: float,
    page_height: float,
) -> list[dict[str, Any]]:
    """Identify text spans whose bounding box overlaps marked pixels in the mask."""
    img_h, img_w = mask.shape[:2]
    if img_h == 0 or img_w == 0 or page_width == 0 or page_height == 0:
        return []

    scale_x = img_w / page_width
    scale_y = img_h / page_height

    overlapping_spans: list[dict[str, Any]] = []
    for s in spans:
        x0, y0, x1, y1 = s["bbox"]
        px0 = max(0, min(img_w - 1, int(x0 * scale_x)))
        py0 = max(0, min(img_h - 1, int(y0 * scale_y)))
        px1 = max(0, min(img_w, int(x1 * scale_x)))
        py1 = max(0, min(img_h, int(y1 * scale_y)))

        if px1 > px0 and py1 > py0:
            roi_mask = mask[py0:py1, px0:px1]
            if np.any(roi_mask > 0):
                overlapping_spans.append(s)

    return overlapping_spans


def overlay_crisp_text_on_image(
    image: np.ndarray,
    spans: list[dict[str, Any]],
    page_width: float,
    page_height: float,
) -> np.ndarray:
    """
    Render preserved text spans crisply onto an inpainted BGR image using OpenCV text rendering.
    Ensures that words obscured by marker strokes remain legible.
    """
    result = image.copy()
    img_h, img_w = result.shape[:2]
    if page_width <= 0 or page_height <= 0:
        return result

    scale_x = img_w / page_width
    scale_y = img_h / page_height

    for s in spans:
        text = s["text"]
        origin_x, origin_y = s["origin"]
        size = s["size"]
        
        # Calculate pixel position and font scale
        px = int(origin_x * scale_x)
        py = int(origin_y * scale_y)
        font_scale = max(0.35, (size * scale_y) / 28.0)

        # PyMuPDF color is an integer (e.g. 0 for black) or RGB tuple
        color_val = s.get("color", 0)
        if isinstance(color_val, int):
            r = (color_val >> 16) & 0xFF
            g = (color_val >> 8) & 0xFF
            b = color_val & 0xFF
            text_color = (b, g, r)
        elif isinstance(color_val, (tuple, list)) and len(color_val) >= 3:
            text_color = (int(color_val[2] * 255), int(color_val[1] * 255), int(color_val[0] * 255))
        else:
            text_color = (20, 20, 20)

        thickness = 1 if font_scale < 0.8 else 2
        cv2.putText(
            result,
            text,
            (px, py),
            cv2.FONT_HERSHEY_DUPLEX,
            font_scale,
            text_color,
            thickness,
            cv2.LINE_AA,
        )

    return result
