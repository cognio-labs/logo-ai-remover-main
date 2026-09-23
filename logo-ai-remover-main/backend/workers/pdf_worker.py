import logging
from pathlib import Path
import cv2
import numpy as np
import pymupdf

from backend.models.pdf_job import DetectedRegion, PdfJobRecord, PdfJobStatus, PdfProcessOptions
from backend.services.annotation_detector import detect_page_annotations
from backend.services.document_watermark_detector import (
    detect_blue_marker_regions,
    detect_watermark_overlays,
)
from backend.services.mask_service import create_mask_from_regions
from backend.services.pdf_job_service import pdf_job_service
from backend.services.pdf_renderer import render_page_to_bgr
from backend.services.pdf_verifier import verify_cleaned_image, verify_cleaned_pdf
from backend.services.restoration_service import restoration_engine
from backend.services.text_layer_service import extract_page_text_spans
from backend.utils.file_utils import pdf_job_dir


logger = logging.getLogger(__name__)


def process_pdf_job(job_id: str) -> None:
    """Execute the end-to-end PDF/document watermark removal worker for a job."""
    try:
        job = pdf_job_service.get(job_id)
    except Exception as exc:
        logger.error("Job %s could not be loaded: %s", job_id, exc)
        return

    job_root = pdf_job_dir(job_id)
    orig_path = Path(job.original_path)

    if not orig_path.is_file():
        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.FAILED,
            stage="Failed",
            error="Original input file not found on disk",
        )
        return

    try:
        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.ANALYZING,
            progress=10,
            stage="Reading document",
            message="Analyzing document structure and security marks",
        )

        if job.is_pdf:
            _process_pdf(job, job_root, orig_path)
        else:
            _process_image(job, job_root, orig_path)

    except Exception as exc:
        logger.exception("Processing failed for PDF job %s: %s", job_id, exc)
        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.FAILED,
            stage="Failed",
            error=str(exc),
            message=f"Document cleaning failed: {exc}",
        )


def _process_pdf(job: PdfJobRecord, job_root: Path, orig_path: Path) -> None:
    job_id = job.id
    options = job.options

    orig_doc = pymupdf.open(str(orig_path))
    total_pages = len(orig_doc)
    if total_pages == 0:
        orig_doc.close()
        raise ValueError("The uploaded PDF has 0 pages")

    logger.info("[PDF JOB] jobId=%s total_pages=%d options=%s", job_id, total_pages, options)

    # Prepare output document
    cleaned_doc = pymupdf.open()
    dpi = 180 if options.mode == "high_quality" else 150

    try:
        for page_idx in range(total_pages):
            page_num = page_idx + 1
            orig_page = orig_doc[page_idx]
            page_rect = orig_page.rect
            pw, ph = page_rect.width, page_rect.height

            progress_val = int(20 + (page_idx / total_pages) * 55)
            pdf_job_service.update(
                job_id,
                status=PdfJobStatus.RESTORING,
                progress=progress_val,
                stage=f"Processing page {page_num} of {total_pages}",
                message=f"Analyzing and cleaning page {page_num}",
            )

            # 1. Native PDF Annotations (Highlight, Ink, Stamp, FreeText)
            annots_to_delete = []
            if options.remove_annotations:
                annot_regions, annots = detect_page_annotations(orig_page, page_num)
                annots_to_delete = annots

            # 2. Check for Blue Marker or Manual / Detected Watermark Regions
            manual_for_page = [
                r for r in options.manual_regions if r.page == page_num or r.page == 0
            ]
            detected_for_page = [
                r for r in job.detected_regions if r.page == page_num or r.page == 0
            ]
            
            # Check if this page requires raster inpainting
            bgr_page = render_page_to_bgr(orig_page, dpi=dpi)
            page_h, page_w = bgr_page.shape[:2]

            blue_regions = []
            blue_mask = np.zeros((page_h, page_w), dtype=np.uint8)
            if options.remove_blue_marker:
                blue_regions, blue_mask = detect_blue_marker_regions(bgr_page, page_num)

            # Combine all candidate regions
            all_target_regions = manual_for_page + detected_for_page + blue_regions
            raster_mask = np.zeros((page_h, page_w), dtype=np.uint8)

            if blue_mask is not None and np.any(blue_mask > 0):
                raster_mask = cv2.bitwise_or(raster_mask, blue_mask)

            if all_target_regions:
                region_mask = create_mask_from_regions(page_w, page_h, all_target_regions)
                raster_mask = cv2.bitwise_or(raster_mask, region_mask)

            has_raster_marks = int(np.count_nonzero(raster_mask)) > 50
            has_annots_to_delete = len(annots_to_delete) > 0
            has_text_layer = bool(orig_page.get_text("text").strip())

            if not has_raster_marks and not has_annots_to_delete:
                # Untouched page: copy directly from original document to preserve 100% vector typography!
                cleaned_doc.insert_pdf(orig_doc, from_page=page_idx, to_page=page_idx)
            elif has_text_layer and not (blue_mask is not None and np.any(blue_mask > 0)):
                # Vector PDF with text/drawings/watermark regions:
                # Use PyMuPDF native redaction and annotation deletion to preserve 100% vector quality!
                cleaned_doc.insert_pdf(orig_doc, from_page=page_idx, to_page=page_idx)
                new_page = cleaned_doc[-1]
                for annot in list(new_page.annots()):
                    try:
                        new_page.delete_annot(annot)
                    except Exception as e:
                        logger.warning("Could not delete annot: %s", e)
                for r in all_target_regions:
                    rect = pymupdf.Rect(r.x * pw, r.y * ph, (r.x + r.width) * pw, (r.y + r.height) * ph)
                    for annot in list(new_page.annots()):
                        if annot.rect.intersects(rect):
                            try:
                                new_page.delete_annot(annot)
                            except Exception:
                                pass
                    new_page.add_redact_annot(rect, fill=(1, 1, 1))
                new_page.apply_redactions()
            else:
                # Scanned document or blue pen strokes: perform content-aware restoration on page image
                text_spans = extract_page_text_spans(orig_page)
                restored_bgr = restoration_engine.restore_page_image(
                    bgr_page,
                    raster_mask,
                    text_spans=text_spans,
                    page_width=pw,
                    page_height=ph,
                    mode=options.mode,
                )

                # Save page image into new PDF page with exact dimensions
                new_page = cleaned_doc.new_page(width=pw, height=ph)
                success, encoded_jpg = cv2.imencode(".jpg", restored_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
                if not success:
                    raise RuntimeError(f"Failed to encode cleaned page {page_num}")
                new_page.insert_image(new_page.rect, stream=encoded_jpg.tobytes())

                # If original had selectable text, reinsert crisp text layer
                if text_spans:
                    for span in text_spans:
                        try:
                            x, y = span["origin"]
                            new_page.insert_text(
                                (x, y),
                                span["text"],
                                fontsize=span["size"],
                                fontname="helv",
                                color=(0, 0, 0),
                            )
                        except Exception:
                            pass

        pdf_job_service.update(
            job_id,
            status=PdfJobStatus.REBUILDING,
            progress=85,
            stage="Rebuilding PDF",
            message="Compiling cleaned document master",
        )

        output_path = job_root / "output" / "cleaned.pdf"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cleaned_doc.save(str(output_path), garbage=3, deflate=True)

    finally:
        orig_doc.close()
        cleaned_doc.close()

    # 3. Output Verification
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.VERIFYING,
        progress=95,
        stage="Verifying output",
        message="Validating page count and document visual integrity",
    )
    verify_cleaned_pdf(orig_path, output_path, total_pages)

    # 4. Generate Page 1 Cleaned Preview
    cleaned_preview_png = job_root / "pages" / "cleaned" / "page_1.png"
    cleaned_preview_png.parent.mkdir(parents=True, exist_ok=True)
    doc_cleaned = pymupdf.open(str(output_path))
    try:
        first_page = doc_cleaned[0]
        preview_bgr = render_page_to_bgr(first_page, dpi=120)
        cv2.imwrite(str(cleaned_preview_png), preview_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    finally:
        doc_cleaned.close()

    # 5. Mark Completed
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.COMPLETED,
        progress=100,
        stage="Complete",
        message=f"Cleaned {total_pages} page document successfully",
        result_path=str(output_path),
    )
    logger.info("[PDF JOB] jobId=%s COMPLETED successfully", job_id)


def _process_image(job: PdfJobRecord, job_root: Path, orig_path: Path) -> None:
    job_id = job.id
    options = job.options

    img = cv2.imread(str(orig_path))
    if img is None:
        raise ValueError("Uploaded image cannot be decoded by OpenCV")

    height, width = img.shape[:2]
    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.RESTORING,
        progress=40,
        stage="Detecting marks",
        message="Scanning image for blue markers and overlays",
    )

    blue_regions, blue_mask = detect_blue_marker_regions(img, page_number=1)
    manual_regions = [r for r in options.manual_regions if r.page in (0, 1)]
    detected_regions = [r for r in job.detected_regions if r.page in (0, 1)]

    all_regions = manual_regions + detected_regions + blue_regions
    combined_mask = np.zeros((height, width), dtype=np.uint8)

    if blue_mask is not None and np.any(blue_mask > 0):
        combined_mask = cv2.bitwise_or(combined_mask, blue_mask)

    if all_regions:
        reg_mask = create_mask_from_regions(width, height, all_regions)
        combined_mask = cv2.bitwise_or(combined_mask, reg_mask)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.RESTORING,
        progress=70,
        stage="Restoring image",
        message="Reconstructing underlying image details and text",
    )

    restored = restoration_engine.restore_page_image(img, combined_mask, mode=options.mode)

    ext = orig_path.suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        ext = ".png"

    output_path = job_root / "output" / f"cleaned{ext}"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), restored)

    verify_cleaned_image(orig_path, output_path)

    # Save preview
    cleaned_preview_png = job_root / "pages" / "cleaned" / "page_1.png"
    cleaned_preview_png.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(cleaned_preview_png), restored)

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.COMPLETED,
        progress=100,
        stage="Complete",
        message="Cleaned image document successfully",
        result_path=str(output_path),
    )
    logger.info("[PDF JOB] jobId=%s Image COMPLETED successfully", job_id)
