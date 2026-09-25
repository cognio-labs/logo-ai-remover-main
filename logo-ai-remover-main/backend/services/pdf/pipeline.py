"""
PDF Watermark Removal Pipeline — orchestrates all steps.

Pipeline:
  detect_watermark()
  ↓
  classify_watermark()
  ↓
  For each page:
    → native_annot / xobject / ocg  → native_remover.remove_native_watermarks()
    → raster (scanned only)         → mask.build_precise_raster_mask()
                                      → inpaint.inpaint_raster_watermark()
    → none (untouched)              → copy page verbatim
  ↓
  verify_document_integrity()
  ↓
  generate_output()

INVARIANT:
  If there is any uncertainty about what to remove → preserve original page.
  False-positive deletion is worse than leaving a watermark.
"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np
import pymupdf


from backend.models.pdf_job import PdfJobRecord, PdfJobStatus
from backend.services.pdf.detector import PageWatermarkAnalysis, analyze_page
from backend.services.pdf.inpaint import inpaint_raster_watermark
from backend.services.pdf.mask import build_precise_raster_mask
from backend.services.pdf.native_remover import remove_native_watermarks
from backend.services.pdf.verifier import IntegrityError, verify_cleaned_pdf, verify_cleaned_image
from backend.services.pdf_job_service import pdf_job_service
from backend.services.pdf_renderer import render_page_to_bgr
from backend.utils.file_utils import pdf_job_dir

logger = logging.getLogger(__name__)


# ── Status message helpers ──────────────────────────────────────────────────

_STAGE_ANALYZING = "Analyzing PDF…"
_STAGE_DETECTING = "Detecting watermark…"
_STAGE_REMOVING = "Removing watermark…"
_STAGE_VERIFYING = "Verifying document integrity…"
_STAGE_DONE = "Clean PDF ready"


def run_pdf_pipeline(job_id: str) -> None:
    """Main entrypoint: run the full PDF watermark removal pipeline."""
    try:
        job = pdf_job_service.get(job_id)
    except Exception as exc:
        logger.error("Job %s not found: %s", job_id, exc)
        return

    job_root = pdf_job_dir(job_id)
    orig_path = Path(job.original_path)

    if not orig_path.is_file():
        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.FAILED,
            stage="Failed",
            error="Original file not found on disk",
        )
        return

    try:
        if job.is_pdf:
            _run_pdf(job, job_root, orig_path)
        else:
            _run_image(job, job_root, orig_path)
    except Exception as exc:
        logger.exception("Pipeline failure for job %s: %s", job_id, exc)
        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.FAILED,
            stage="Failed",
            error=str(exc),
            message=f"Document cleaning failed: {exc}",
        )


# ── PDF path ────────────────────────────────────────────────────────────────

def _run_pdf(job: PdfJobRecord, job_root: Path, orig_path: Path) -> None:
    job_id = job.id

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.ANALYZING,
        progress=10,
        stage=_STAGE_ANALYZING,
        message="Reading document structure",
    )

    src_doc = pymupdf.open(str(orig_path))
    total_pages = len(src_doc)
    if total_pages == 0:
        src_doc.close()
        raise ValueError("PDF has 0 pages")

    logger.info("[Pipeline] jobId=%s total_pages=%d", job_id, total_pages)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.DETECTING,
        progress=15,
        stage=_STAGE_DETECTING,
        message=f"Inspecting {total_pages} page(s) for watermark objects",
    )

    # ── Phase 1: Detect watermarks on all pages ────────────────────────────
    analyses: list[PageWatermarkAnalysis] = []
    for p_idx in range(total_pages):
        analysis = analyze_page(src_doc, p_idx)
        analyses.append(analysis)
        logger.info(
            "[Pipeline] page=%d strategy=%s safe_candidates=%d",
            p_idx + 1,
            analysis.strategy,
            len(analysis.safe_candidates),
        )

    strategies_found = {a.strategy for a in analyses if a.strategy != "none"}
    logger.info("[Pipeline] strategies across all pages: %s", strategies_found)

    # ── Phase 2: Build cleaned document ────────────────────────────────────
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.RESTORING,
        progress=25,
        stage=_STAGE_REMOVING,
        message="Removing watermark objects while preserving document content",
    )

    cleaned_doc = pymupdf.open()
    try:
        for p_idx, analysis in enumerate(analyses):
            page_num = p_idx + 1
            progress_val = int(25 + (p_idx / total_pages) * 55)

            pdf_job_service.update(
                job_id,
                progress=progress_val,
                stage=_STAGE_REMOVING,
                message=f"Processing page {page_num} of {total_pages}",
            )

            strategy = analysis.strategy

            if strategy == "none":
                # No watermark detected — copy verbatim, zero modifications
                cleaned_doc.insert_pdf(src_doc, from_page=p_idx, to_page=p_idx)
                logger.debug("[Pipeline] page=%d: no watermark, copied verbatim", page_num)

            elif strategy in ("native_annot", "xobject", "ocg"):
                # Native PDF object removal — does NOT rasterize or OCR
                remove_native_watermarks(src_doc, cleaned_doc, analysis)
                logger.info("[Pipeline] page=%d: native removal strategy=%s", page_num, strategy)

            elif strategy == "raster":
                # Fallback: scanned page with baked-in watermark
                _apply_raster_removal(
                    src_doc=src_doc,
                    cleaned_doc=cleaned_doc,
                    analysis=analysis,
                )

            else:
                # Unknown strategy — safe fallback: copy verbatim
                cleaned_doc.insert_pdf(src_doc, from_page=p_idx, to_page=p_idx)

    except Exception as exc:
        src_doc.close()
        cleaned_doc.close()
        raise RuntimeError(f"Failed to process page: {exc}") from exc

    # ── Phase 3: Save output ───────────────────────────────────────────────
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.REBUILDING,
        progress=82,
        stage="Rebuilding PDF",
        message="Compiling cleaned document",
    )

    output_path = job_root / "output" / "cleaned.pdf"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        cleaned_doc.save(str(output_path), garbage=3, deflate=True)
    finally:
        src_doc.close()
        cleaned_doc.close()

    # ── Phase 4: Integrity verification ───────────────────────────────────
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.VERIFYING,
        progress=92,
        stage=_STAGE_VERIFYING,
        message="Validating page count and document integrity",
    )

    try:
        summary = verify_cleaned_pdf(orig_path, output_path, total_pages)
    except IntegrityError as exc:
        raise RuntimeError(
            f"Cleaning stopped — document content could not be safely preserved: {exc}"
        ) from exc

    # ── Phase 5: Generate page 1 cleaned preview ───────────────────────────
    cleaned_preview_png = job_root / "pages" / "cleaned" / "page_1.png"
    cleaned_preview_png.parent.mkdir(parents=True, exist_ok=True)
    try:
        doc_preview = pymupdf.open(str(output_path))
        preview_bgr = render_page_to_bgr(doc_preview[0], dpi=130)
        doc_preview.close()
        cv2.imwrite(str(cleaned_preview_png), preview_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    except Exception as exc:
        logger.warning("Could not generate cleaned preview PNG: %s", exc)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.COMPLETED,
        progress=100,
        stage=_STAGE_DONE,
        message=f"Cleaned {total_pages} page(s) successfully",
        result_path=str(output_path),
    )
    logger.info("[Pipeline] jobId=%s COMPLETED summary=%s", job_id, summary)


def _apply_raster_removal(
    src_doc: pymupdf.Document,
    cleaned_doc: pymupdf.Document,
    analysis: PageWatermarkAnalysis,
) -> None:
    """
    Raster-only fallback: render → precise mask → localized inpainting → embed as image page.
    Only called when no native PDF objects were found AND page has no text layer.
    If mask building fails or is too large, the original page is copied verbatim.
    """
    p_idx = analysis.page_index
    page_num = p_idx + 1
    orig_page = src_doc[p_idx]
    pw, ph = orig_page.rect.width, orig_page.rect.height

    raster_candidates = [c for c in analysis.safe_candidates if c.source == "raster"]
    if not raster_candidates:
        # No safe raster candidates — copy verbatim
        cleaned_doc.insert_pdf(src_doc, from_page=p_idx, to_page=p_idx)
        return

    # Render at 150 DPI
    bgr = render_page_to_bgr(orig_page, dpi=150)

    # Build and combine precise masks for all raster candidates
    combined_mask = np.zeros(bgr.shape[:2], dtype=np.uint8)

    any_valid_mask = False

    for candidate in raster_candidates:
        precise_mask = build_precise_raster_mask(bgr, candidate)
        if precise_mask is not None:
            combined_mask = cv2.bitwise_or(combined_mask, precise_mask)
            any_valid_mask = True

    if not any_valid_mask:
        # Could not build a safe mask → copy verbatim
        logger.warning(
            "[Pipeline] page=%d raster mask refused — copying original verbatim", page_num
        )
        cleaned_doc.insert_pdf(src_doc, from_page=p_idx, to_page=p_idx)
        return

    # Localized inpainting — ONLY masked pixels are changed
    cleaned_bgr = inpaint_raster_watermark(bgr, combined_mask)

    # Encode and embed into a new PDF page with original dimensions
    new_page = cleaned_doc.new_page(width=pw, height=ph)
    success, jpg_bytes = cv2.imencode(".jpg", cleaned_bgr, [cv2.IMWRITE_JPEG_QUALITY, 96])
    if not success:
        raise RuntimeError(f"Failed to encode cleaned raster page {page_num}")
    new_page.insert_image(new_page.rect, stream=jpg_bytes.tobytes())

    logger.info("[Pipeline] page=%d raster removal applied", page_num)


# ── Image path ──────────────────────────────────────────────────────────────

def _run_image(job: PdfJobRecord, job_root: Path, orig_path: Path) -> None:
    """Process a standalone image file (PNG/JPG/WEBP) uploaded as a document."""
    job_id = job.id

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.ANALYZING,
        progress=20,
        stage="Analyzing image",
        message="Scanning image for watermark overlays",
    )

    img = cv2.imread(str(orig_path))
    if img is None:
        raise ValueError("Uploaded image cannot be decoded")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use the same conservative raster detection as the PDF detector:
    # semi-transparent overlay pixels in [175, 230] (below 175 = real ink)
    wm_mask_raw = cv2.inRange(gray, 175, 230)
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    wm_mask_raw = cv2.morphologyEx(wm_mask_raw, cv2.MORPH_CLOSE, kern)

    # Protect dark ink
    dark_ink = (gray < 160).astype(np.uint8) * 255
    kern_d = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    protected = cv2.dilate(dark_ink, kern_d, iterations=1)
    wm_mask = cv2.bitwise_and(wm_mask_raw, cv2.bitwise_not(protected))

    coverage = float(np.count_nonzero(wm_mask)) / (h * w)
    if coverage > 0.55:
        logger.warning("Image watermark mask coverage %.1f%% too large — no removal", coverage * 100)
        wm_mask = np.zeros((h, w), dtype=np.uint8)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.RESTORING,
        progress=60,
        stage="Removing watermark",
        message="Applying localized watermark removal",
    )

    if np.count_nonzero(wm_mask) > 0:
        cleaned_img = inpaint_raster_watermark(img, wm_mask)
    else:
        cleaned_img = img.copy()

    ext = orig_path.suffix.lower() or ".png"
    output_path = job_root / "output" / f"cleaned{ext}"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), cleaned_img)

    # Integrity check
    try:
        verify_cleaned_image(orig_path, output_path)
    except IntegrityError as exc:
        raise RuntimeError(f"Image integrity check failed: {exc}") from exc

    # Preview
    cleaned_preview_png = job_root / "pages" / "cleaned" / "page_1.png"
    cleaned_preview_png.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(cleaned_preview_png), cleaned_img)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.COMPLETED,
        progress=100,
        stage=_STAGE_DONE,
        message="Image watermark cleaned successfully",
        result_path=str(output_path),
    )
    logger.info("[Pipeline] jobId=%s image COMPLETED", job_id)
