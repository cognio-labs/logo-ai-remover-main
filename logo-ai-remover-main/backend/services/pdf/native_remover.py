"""
Native PDF Watermark Remover — operates directly on PDF objects.

Removes:
  - Annotation objects (STAMP, WATERMARK, FreeText with keyword)
  - Image XObjects that are transparent overlays
  - Optional Content Groups (OCG layers) named as watermarks

Does NOT:
  - Rasterize the page
  - Use redact_annot on the content area (which whites-out the bbox)
  - OCR or reconstruct text
  - Alter any existing text/vector/image document content
"""
from __future__ import annotations

import logging
from typing import Any

import pymupdf

from backend.services.pdf.detector import PageWatermarkAnalysis, WatermarkCandidate

logger = logging.getLogger(__name__)


def remove_native_watermarks(
    src_doc: pymupdf.Document,
    cleaned_doc: pymupdf.Document,
    analysis: PageWatermarkAnalysis,
) -> bool:
    """
    Copy one page from src_doc to cleaned_doc and remove native watermark objects.
    Returns True if any removal was performed.
    """
    page_index = analysis.page_index
    safe_candidates = analysis.safe_candidates
    strategy = analysis.strategy

    # Always copy the original page first to preserve 100% of content
    cleaned_doc.insert_pdf(src_doc, from_page=page_index, to_page=page_index)
    new_page = cleaned_doc[-1]

    removed_count = 0

    # ── Annotation removal ──────────────────────────────────────────────────
    annot_candidates = [c for c in safe_candidates if c.source == "annotation"]
    if annot_candidates:
        removed_count += _remove_annotation_candidates(new_page, annot_candidates, page_index)

    # ── XObject removal ─────────────────────────────────────────────────────
    xobj_candidates = [c for c in safe_candidates if c.source == "xobject"]
    if xobj_candidates:
        removed_count += _remove_xobject_candidates(cleaned_doc, new_page, xobj_candidates, page_index)

    # ── OCG layer removal ───────────────────────────────────────────────────
    ocg_candidates = [c for c in safe_candidates if c.source == "ocg"]
    if ocg_candidates:
        removed_count += _remove_ocg_candidates(cleaned_doc, ocg_candidates, page_index)

    logger.info(
        "[NativeRemover] page=%d strategy=%s removed=%d",
        page_index + 1,
        strategy,
        removed_count,
    )
    return removed_count > 0


def _remove_annotation_candidates(
    page: pymupdf.Page,
    candidates: list[WatermarkCandidate],
    page_index: int,
) -> int:
    """Delete only the specific watermark annotation objects. Never touches content stream."""
    removed = 0
    # Build a lookup of annot refs to delete by type_id + rect
    to_delete: list[Any] = []
    for c in candidates:
        if c.annot_ref is not None:
            to_delete.append(c.annot_ref)

    # Re-read current annots from the inserted copy (refs changed on insert_pdf)
    # Match by type + bounding rect proximity
    try:
        live_annots = list(page.annots())
    except Exception as exc:
        logger.warning("Cannot list annots on inserted page %d: %s", page_index + 1, exc)
        return 0

    # Build set of (type_id, approximate rect) from candidates
    target_signatures: set[tuple[int, float, float]] = set()
    for c in candidates:
        target_signatures.add((c.annot_type_id, round(c.norm_bbox[0], 2), round(c.norm_bbox[1], 2)))

    page_rect = page.rect
    pw, ph = page_rect.width, page_rect.height

    for annot in live_annots:
        try:
            type_id = annot.type[0]
            r = annot.rect
            nx = round((r.x0 - page_rect.x0) / pw, 2) if pw > 0 else 0
            ny = round((r.y0 - page_rect.y0) / ph, 2) if ph > 0 else 0
            sig = (type_id, nx, ny)
            if sig in target_signatures:
                page.delete_annot(annot)
                removed += 1
                logger.debug("Deleted annot type=%d page=%d", type_id, page_index + 1)
        except Exception as exc:
            logger.warning("Error deleting annot on page %d: %s", page_index + 1, exc)

    return removed


def _remove_xobject_candidates(
    doc: pymupdf.Document,
    page: pymupdf.Page,
    candidates: list[WatermarkCandidate],
    page_index: int,
) -> int:
    """
    Remove image XObject references from the page content stream.
    This removes only the placement of the image, NOT the document text.
    """
    removed = 0
    xref_names_to_remove = {c.xobject_name for c in candidates}

    try:
        # Get page's XObject resource dictionary
        # We edit the content stream to remove the specific image placement commands
        # Approach: use page.clean_contents() + modify xref entries
        # Safe approach: delete image reference from page /Resources /XObject
        page_xref = page.xref

        # Get the /Resources /XObject dictionary
        resources = doc.xref_get_key(page_xref, "Resources")
        if not resources or resources[0] == "null":
            return removed

        # PyMuPDF: iterate page resources and remove specific image xrefs
        for xref_name in xref_names_to_remove:
            try:
                xref_int = int(xref_name)
                # Get all images on this page and remove the named xref
                img_list = page.get_images(full=True)
                for img_info in img_list:
                    if img_info[0] == xref_int:
                        # Remove reference by setting xref to null in the page resource dict
                        # This prevents the image from being rendered without touching text
                        name_in_resources = img_info[7]  # resource name (e.g. "Im0")
                        if name_in_resources:
                            try:
                                doc.xref_set_key(
                                    page_xref,
                                    f"Resources/XObject/{name_in_resources}",
                                    "null",
                                )
                                removed += 1
                                logger.info(
                                    "Removed XObject '%s' (xref=%d) from page %d",
                                    name_in_resources,
                                    xref_int,
                                    page_index + 1,
                                )
                            except Exception as exc:
                                logger.warning(
                                    "Could not null XObject ref '%s': %s", name_in_resources, exc
                                )
            except (ValueError, IndexError) as exc:
                logger.debug("Skipping invalid xref_name '%s': %s", xref_name, exc)

    except Exception as exc:
        logger.warning("XObject removal error on page %d: %s", page_index + 1, exc)

    return removed


def _remove_ocg_candidates(
    doc: pymupdf.Document,
    candidates: list[WatermarkCandidate],
    page_index: int,
) -> int:
    """Toggle off OCG (optional content group) layers identified as watermarks."""
    removed = 0
    for c in candidates:
        if c.ocg_xref > 0:
            try:
                doc.set_ocg_visibility(c.ocg_xref, False)
                removed += 1
                logger.info(
                    "Toggled off OCG xref=%d (watermark layer) for page %d",
                    c.ocg_xref,
                    page_index + 1,
                )
            except Exception as exc:
                logger.warning("Cannot toggle OCG xref=%d: %s", c.ocg_xref, exc)
    return removed
