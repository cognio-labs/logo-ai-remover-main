import json
import logging
import shutil
from pathlib import Path
from uuid import uuid4

import cv2
import pymupdf
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from backend.config import settings
from backend.models.pdf_job import (
    DetectedRegion,
    PdfJobRecord,
    PdfJobStatus,
    PdfMetadata,
    PdfPageMetadata,
    PdfProcessOptions,
)
from backend.services.annotation_detector import detect_page_annotations
from backend.services.document_watermark_detector import (
    detect_blue_marker_regions,
    detect_watermark_overlays,
)
from backend.services.openrouter_service import OpenRouterUnavailable, openrouter_service
from backend.services.pdf_job_service import pdf_job_service
from backend.services.pdf_renderer import (
    render_image_preview_file,
    render_page_to_bgr,
    render_page_to_jpeg_bytes,
    render_pdf_page_preview_file,
)
from backend.utils.file_utils import (
    ALLOWED_PDF_EXTENSIONS,
    assert_pdf_job_owned_path,
    pdf_job_dir,
    safe_pdf_download_name,
)
from backend.workers.pdf_worker import process_pdf_job


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdf", tags=["pdf"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    jobId: str | None = Form(default=None),
):
    """Upload a PDF or image document, create isolated job, and generate page 1 preview."""
    original_name = file.filename or "document.pdf"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_PDF_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension '{suffix}'. Supported: PDF, PNG, JPG, JPEG, WEBP",
        )

    job_id = jobId or str(uuid4())
    root = pdf_job_service.create_layout(job_id)
    original_dest = assert_pdf_job_owned_path(job_id, root / "original" / f"input{suffix}")

    # Stream upload with size cap
    size = 0
    max_bytes = settings.max_pdf_upload_mb * 1024 * 1024
    try:
        with original_dest.open("wb") as dst:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.max_pdf_upload_mb} MB",
                    )
                dst.write(chunk)
    except HTTPException:
        shutil.rmtree(root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Failed to upload document: {exc}") from exc
    finally:
        await file.close()

    is_pdf = suffix == ".pdf"
    page_count = 1
    pages_meta: list[PdfPageMetadata] = []

    # Generate page 1 original preview
    page_1_preview = root / "pages" / "original" / "page_1.png"

    try:
        if is_pdf:
            doc = pymupdf.open(str(original_dest))
            page_count = len(doc)
            if page_count == 0:
                doc.close()
                raise ValueError("Uploaded PDF contains 0 pages")
            if page_count > settings.max_pdf_pages:
                doc.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF exceeds maximum allowed page count of {settings.max_pdf_pages}",
                )

            for p_idx in range(min(page_count, 10)):  # analyze first few pages for metadata
                p = doc[p_idx]
                pages_meta.append(
                    PdfPageMetadata(
                        page_number=p_idx + 1,
                        width=round(p.rect.width, 2),
                        height=round(p.rect.height, 2),
                        has_text_layer=len(p.get_text("words")) > 0,
                        annot_count=len(list(p.annots())),
                    )
                )

            # Render page 1 preview
            first_page = doc[0]
            preview_bgr = render_page_to_bgr(first_page, dpi=130)
            page_1_preview.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(page_1_preview), preview_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 4])
            doc.close()
        else:
            # Standalone image
            img = cv2.imread(str(original_dest))
            if img is None:
                raise ValueError("Uploaded image cannot be decoded")
            h, w = img.shape[:2]
            pages_meta.append(
                PdfPageMetadata(
                    page_number=1,
                    width=w,
                    height=h,
                    has_text_layer=False,
                    annot_count=0,
                )
            )
            render_image_preview_file(original_dest, page_1_preview)

    except HTTPException:
        shutil.rmtree(root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Invalid document file: {exc}") from exc

    metadata = PdfMetadata(
        page_count=page_count,
        file_size_bytes=size,
        is_pdf=is_pdf,
        format="PDF" if is_pdf else suffix.lstrip(".").upper(),
        pages=pages_meta,
    )

    job = PdfJobRecord(
        id=job_id,
        status=PdfJobStatus.QUEUED,
        progress=5,
        stage="Uploaded",
        message="Document uploaded and preview generated",
        original_filename=original_name,
        original_path=str(original_dest),
        is_pdf=is_pdf,
        page_count=page_count,
        metadata=metadata,
    )
    pdf_job_service.save(job)

    return {
        "success": True,
        "jobId": job_id,
        "fileName": original_name,
        "pageCount": page_count,
        "fileSize": size,
        "isPdf": is_pdf,
        "previewUrl": f"/api/pdf/preview/{job_id}/1?type=original",
    }


@router.post("/detect/{job_id}")
async def detect_document_watermarks(
    job_id: str,
    page: int = Query(default=1, ge=1),
):
    """Detect candidate watermark regions using the conservative multi-signal detector."""
    job = pdf_job_service.get(job_id)
    orig_path = Path(job.original_path)
    if not orig_path.is_file():
        raise HTTPException(status_code=404, detail="Original document not found")

    from backend.services.pdf.detector import analyze_page
    from backend.models.pdf_job import DetectedRegion as DR

    regions: list[DetectedRegion] = []

    if job.is_pdf:
        doc = pymupdf.open(str(orig_path))
        try:
            target_idx = max(0, min(len(doc) - 1, page - 1))
            analysis = analyze_page(doc, target_idx)
        finally:
            doc.close()

        for c in analysis.candidates:
            nx, ny, nw, nh = c.norm_bbox
            if nw <= 0 or nh <= 0:
                continue
            regions.append(
                DetectedRegion(
                    x=round(max(0.0, min(1.0, nx)), 4),
                    y=round(max(0.0, min(1.0, ny)), 4),
                    width=round(max(0.001, min(1.0 - nx, nw)), 4),
                    height=round(max(0.001, min(1.0 - ny, nh)), 4),
                    type=c.source,
                    confidence=round(c.confidence, 3),
                    page=page,
                )
            )
    else:
        # For standalone images — use the raster detector only
        bgr = cv2.imread(str(orig_path))
        if bgr is None:
            raise HTTPException(status_code=422, detail="Could not decode image for detection")
        # Use conservative blue marker detection for annotated images
        blue_regions, _ = detect_blue_marker_regions(bgr, page_number=page)
        regions.extend(blue_regions)

    # Save detections
    pdf_job_service.save_detections(job_id, regions)
    pdf_job_service.update(job_id, detected_regions=regions)

    return {
        "success": True,
        "jobId": job_id,
        "page": page,
        "regions": [r.model_dump() for r in regions],
    }



@router.post("/process/{job_id}")
async def process_document(
    job_id: str,
    background_tasks: BackgroundTasks,
    mode: str = Form(default="balanced"),
    removeAnnotations: bool = Form(default=True),
    removeBlueMarker: bool = Form(default=True),
    manualRegions: str | None = Form(default=None),
):
    """Launch asynchronous document cleaning background worker."""
    job = pdf_job_service.get(job_id)
    if job.status == PdfJobStatus.RESTORING or job.status == PdfJobStatus.REBUILDING:
        raise HTTPException(status_code=409, detail="Document processing is already in progress")

    parsed_manual: list[DetectedRegion] = []
    if manualRegions:
        try:
            data = json.loads(manualRegions)
            if isinstance(data, list):
                for item in data:
                    parsed_manual.append(DetectedRegion.model_validate(item))
        except Exception as exc:
            logger.warning("Failed to parse manualRegions JSON: %s", exc)

    options = PdfProcessOptions(
        mode=mode.lower(),
        remove_annotations=removeAnnotations,
        remove_blue_marker=removeBlueMarker,
        manual_regions=parsed_manual,
    )

    pdf_job_service.update(
        job_id,
        status=PdfJobStatus.QUEUED,
        progress=10,
        stage="Queued",
        message="Queued for cleaning",
        error="",
    )
    # Save options on job
    job = pdf_job_service.get(job_id)
    job.options = options
    pdf_job_service.save(job)

    # Launch background worker
    background_tasks.add_task(process_pdf_job, job_id)

    return {
        "success": True,
        "jobId": job_id,
        "status": "queued",
        "message": "Processing started asynchronously",
    }


@router.get("/status/{job_id}")
def get_document_status(job_id: str):
    """Fast status polling endpoint."""
    try:
        job = pdf_job_service.get(job_id)
        return {
            "jobId": job.id,
            "status": job.status,
            "progress": job.progress,
            "stage": job.stage,
            "message": job.message,
            "error": job.error,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Job not found: {exc}")


@router.get("/result/{job_id}")
def get_document_result(job_id: str):
    """Retrieve full result details for a completed document cleaning job."""
    job = pdf_job_service.get(job_id)
    if job.status != PdfJobStatus.COMPLETED or not job.result_path:
        return {
            "success": False,
            "jobId": job.id,
            "status": job.status,
            "error": job.error or "Processing is not completed yet",
        }

    return {
        "success": True,
        "jobId": job.id,
        "status": "completed",
        "fileName": job.original_filename,
        "pageCount": job.page_count,
        "isPdf": job.is_pdf,
        "downloadUrl": f"/api/pdf/download/{job.id}",
        "cleanedPreviewUrl": f"/api/pdf/preview/{job.id}/1?type=cleaned",
    }


@router.get("/preview/{job_id}/{page}")
def get_document_preview(
    job_id: str,
    page: int = 1,
    type: str = Query(default="original"),
):
    """Serve crisp rendered preview of an original or cleaned page."""
    root = pdf_job_dir(job_id)
    subfolder = "cleaned" if type.startswith("cleaned") else "original"
    preview_path = root / "pages" / subfolder / f"page_{page}.png"

    # If already cached, return immediately
    if preview_path.is_file():
        return FileResponse(
            preview_path,
            media_type="image/png",
            headers={"Cache-Control": "private, no-cache, no-store, must-revalidate"},
        )

    # Otherwise generate on the fly
    job = pdf_job_service.get(job_id)
    target_doc_path = Path(job.result_path) if type == "cleaned" and job.result_path else Path(job.original_path)

    if not target_doc_path.is_file():
        raise HTTPException(status_code=404, detail="Preview source file not found")

    if job.is_pdf:
        render_pdf_page_preview_file(target_doc_path, page, preview_path, dpi=130)
    else:
        render_image_preview_file(target_doc_path, preview_path)

    if not preview_path.is_file():
        raise HTTPException(status_code=404, detail="Preview generation failed")

    return FileResponse(
        preview_path,
        media_type="image/png",
        headers={"Cache-Control": "private, no-cache, no-store, must-revalidate"},
    )


@router.get("/download/{job_id}")
def download_document(job_id: str):
    """Download the cleaned output file."""
    job = pdf_job_service.get(job_id)
    if job.status != PdfJobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=400, detail="Cleaned document is not ready for download")

    result_path = Path(job.result_path)
    if not result_path.is_file():
        raise HTTPException(status_code=404, detail="Result file missing from storage")

    ext = result_path.suffix.lstrip(".")
    download_filename = safe_pdf_download_name(job.original_filename, ext=ext)
    media_type = "application/pdf" if ext.lower() == "pdf" else f"image/{ext.lower()}"

    return FileResponse(
        result_path,
        media_type=media_type,
        filename=download_filename,
        headers={"Content-Disposition": f'attachment; filename="{download_filename}"'},
    )


@router.delete("/{job_id}")
def delete_document_job(job_id: str):
    """Delete a document job and its stored files."""
    root = pdf_job_dir(job_id)
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    return {"success": True, "jobId": job_id}
