import logging
from typing import Any
import pymupdf

from backend.models.pdf_job import DetectedRegion


logger = logging.getLogger(__name__)

# Sensitive keywords that must NOT be removed automatically
SENSITIVE_KEYWORDS = {
    "signature",
    "signed",
    "seal",
    "official seal",
    "authenticity",
    "certificate",
    "certified",
    "notary",
    "apostille",
    "government",
    "security",
    "tamper",
    "verification",
}

# Removable annotation types
REMOVABLE_ANNOT_TYPES = {
    pymupdf.PDF_ANNOT_HIGHLIGHT,  # 8
    pymupdf.PDF_ANNOT_INK,        # 15
    pymupdf.PDF_ANNOT_STAMP,      # 13
    pymupdf.PDF_ANNOT_FREE_TEXT,  # 2
    pymupdf.PDF_ANNOT_SQUARE,     # 4
    pymupdf.PDF_ANNOT_CIRCLE,     # 5
    pymupdf.PDF_ANNOT_LINE,       # 3
    pymupdf.PDF_ANNOT_WATERMARK,  # 22
}



def is_sensitive_annotation(annot: Any) -> bool:
    """Check if an annotation appears to be a signature, official seal, or security feature."""
    # Widgets/signatures
    if annot.type[0] in (pymupdf.PDF_ANNOT_WIDGET, 19, 20):  # Widget / Signature
        return True

    info = annot.info or {}
    content = str(info.get("content", "")).lower()
    title = str(info.get("title", "")).lower()
    subject = str(info.get("subject", "")).lower()

    text_to_check = f"{content} {title} {subject}"
    for kw in SENSITIVE_KEYWORDS:
        if kw in text_to_check:
            logger.info("Preserving sensitive annotation: matched keyword '%s'", kw)
            return True

    return False


def detect_page_annotations(
    page: pymupdf.Page,
    page_number: int,
) -> tuple[list[DetectedRegion], list[Any]]:
    """Inspect page annotations and return removable candidate regions and annot objects."""
    removable_regions: list[DetectedRegion] = []
    removable_annots: list[Any] = []

    page_rect = page.rect
    pw, ph = page_rect.width, page_rect.height
    if pw <= 0 or ph <= 0:
        return [], []

    try:
        annots = list(page.annots())
    except Exception as exc:
        logger.warning("Failed to read annotations on page %d: %s", page_number, exc)
        return [], []

    for annot in annots:
        try:
            annot_type_id = annot.type[0]
            if is_sensitive_annotation(annot):
                continue

            if annot_type_id in REMOVABLE_ANNOT_TYPES:
                r = annot.rect
                # Normalize coordinates 0 to 1
                norm_x = max(0.0, min(1.0, (r.x0 - page_rect.x0) / pw))
                norm_y = max(0.0, min(1.0, (r.y0 - page_rect.y0) / ph))
                norm_w = max(0.001, min(1.0 - norm_x, r.width / pw))
                norm_h = max(0.001, min(1.0 - norm_y, r.height / ph))

                annot_name = annot.type[1].lower() if len(annot.type) > 1 else "annotation"
                region_type = "blue_marker" if annot_type_id in (pymupdf.PDF_ANNOT_HIGHLIGHT, pymupdf.PDF_ANNOT_INK) else "user_annotation"

                region = DetectedRegion(
                    x=round(norm_x, 4),
                    y=round(norm_y, 4),
                    width=round(norm_w, 4),
                    height=round(norm_h, 4),
                    type=region_type,
                    confidence=0.95,
                    page=page_number,
                )
                removable_regions.append(region)
                removable_annots.append(annot)
        except Exception as exc:
            logger.warning("Error inspecting annotation: %s", exc)
            continue

    return removable_regions, removable_annots
