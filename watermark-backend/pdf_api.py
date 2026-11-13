"""Job-isolated document upload, detection, processing, preview and export."""
import asyncio
import io
import json
import math
import time
import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pymupdf
from PIL import Image, ImageOps
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pdf_engine import analyze_pdf, clean_pdf, clean_image, detect_pdf, detect_image_watermarks

router = APIRouter(prefix="/api/pdf", tags=["PDF cleanup"])
ROOT = Path(__file__).resolve().parent / "document_uploads"
ROOT.mkdir(exist_ok=True)
jobs = {}
slots = asyncio.Semaphore(2)
MAX_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_PAGES = 25
ALLOWED_IMAGE_FORMATS = ("PNG", "JPEG", "WEBP", "BMP", "TIFF")


def get_job(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        folder = ROOT / job_id
        if folder.is_dir():
            candidates = list(folder.glob("original.*"))
            if candidates:
                source = candidates[0]
                is_pdf = source.suffix.lower() == ".pdf"
                cleaned_candidates = [p for p in folder.glob("cleaned*.*") if p.is_file()]
                output_path = cleaned_candidates[0] if cleaned_candidates else folder / ("cleaned.pdf" if is_pdf else "cleaned.png")
                has_cleaned = output_path.is_file()
                pages = 1
                img_width, img_height = 0, 0
                if is_pdf:
                    try:
                        with pymupdf.open(source) as doc:
                            pages = len(doc)
                    except Exception:
                        pass
                else:
                    try:
                        with Image.open(source) as img:
                            img_width, img_height = img.size
                    except Exception:
                        pass
                job = {
                    "jobId": job_id,
                    "source": source,
                    "output": output_path,
                    "outputs": {"full": output_path} if has_cleaned else {},
                    "fileName": source.name,
                    "fileSize": source.stat().st_size,
                    "pageCount": pages,
                    "isPdf": is_pdf,
                    "width": img_width,
                    "height": img_height,
                    "status": "completed" if has_cleaned else "ready",
                    "progress": 100 if has_cleaned else 0,
                    "stage": "Clean document ready." if has_cleaned else "Document ready.",
                    "message": "",
                    "created": source.stat().st_mtime,
                }
                jobs[job_id] = job
                return job
        raise HTTPException(404, "Document job not found. Upload the document again.")
    return job


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    folder = ROOT / job_id
    folder.mkdir(parents=True, exist_ok=True)

    filename = Path((file.filename or "document").replace("\\", "/")).name
    orig_ext = Path(filename).suffix.lower()
    source = folder / f"original{orig_ext if orig_ext else '.bin'}"

    size = 0
    try:
        with source.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise HTTPException(413, "Maximum document size is 50 MB.")
                handle.write(chunk)

        with source.open("rb") as handle:
            header = handle.read(5)
            is_pdf = header == b"%PDF-"

        img_width = 0
        img_height = 0

        if is_pdf:
            with pymupdf.open(source) as doc:
                if doc.needs_pass:
                    raise HTTPException(422, "Unlock the password-protected PDF before uploading.")
                pages = len(doc)
                if not 1 <= pages <= MAX_PAGES:
                    raise HTTPException(422, f"Upload a PDF with 1-{MAX_PAGES} pages.")
        else:
            try:
                with Image.open(source) as image:
                    fmt = image.format or "PNG"
                    if fmt not in ALLOWED_IMAGE_FORMATS:
                        # Attempt to verify if it can be decoded as image anyway
                        image.load()
                    img_width, img_height = image.size
                    if img_width * img_height > 50_000_000:
                        raise HTTPException(422, "Image is too large (maximum 50 megapixels).")
            except Exception as img_err:
                if isinstance(img_err, HTTPException):
                    raise
                raise HTTPException(422, "Upload a valid PDF, PNG, JPG, JPEG, WEBP, BMP or TIFF file.") from img_err
            pages = 1

    except Exception as exc:
        source.unlink(missing_ok=True)
        try:
            folder.rmdir()
        except Exception:
            pass
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(422, "The document could not be decoded. Upload a valid PDF, PNG, JPG, WEBP, BMP or TIFF.") from exc

    output_ext = ".pdf" if is_pdf else (orig_ext if orig_ext in (".jpg", ".jpeg", ".webp", ".png") else ".png")
    output_path = folder / f"cleaned{output_ext}"

    jobs[job_id] = {
        "jobId": job_id,
        "source": source,
        "output": output_path,
        "outputs": {},
        "fileName": filename,
        "pageCount": pages,
        "isPdf": is_pdf,
        "width": img_width,
        "height": img_height,
        "status": "uploaded",
        "progress": 0,
        "stage": "Upload complete. Ready for automatic analysis.",
        "message": "",
        "created": time.time(),
    }
    return {
        "success": True,
        "jobId": job_id,
        "fileName": filename,
        "pageCount": pages,
        "fileSize": size,
        "isPdf": is_pdf,
        "width": img_width,
        "height": img_height,
        "previewUrl": f"/api/pdf/preview/{job_id}/1?type=original",
    }


@router.post("/analyze/{job_id}")
async def analyze(job_id: str):
    job = get_job(job_id)
    if not job["isPdf"]:
        raise HTTPException(422, "Automatic PDF analysis requires a PDF file.")
    if job["status"] in ("queued", "restoring"):
        raise HTTPException(409, "This document is already processing.")
    job.update(status="analyzing", progress=None, stage="Analyzing your PDF…")
    try:
        analysis = await asyncio.to_thread(analyze_pdf, job["source"])
    except Exception as exc:
        job.update(status="failed", stage="Analysis failed.", error="The PDF could not be analyzed.")
        raise HTTPException(422, "The PDF could not be analyzed.") from exc
    job.update(status="ready", progress=None, stage="Analysis complete.", analysis=analysis)
    return {"success": True, "jobId": job_id, **analysis}


@router.post("/detect/{job_id}")
async def detect(job_id: str, page: int = 1):
    job = get_job(job_id)
    if job["isPdf"]:
        if not 1 <= page <= job["pageCount"]:
            raise HTTPException(422, "Invalid page number.")
        regions = await asyncio.to_thread(detect_pdf, job["source"], page)
    else:
        def detect_img():
            pil_img = ImageOps.exif_transpose(Image.open(job["source"])).convert("RGB")
            img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            _, boxes = detect_image_watermarks(img_bgr)
            return boxes

        regions = await asyncio.to_thread(detect_img)

    return {"success": True, "jobId": job_id, "page": page, "regions": regions}


async def worker(job, regions, scope):
    async with slots:
        job.update(status="restoring", progress=10, stage="Inspecting document structure…")

        def progress(percent, text):
            job.update(progress=percent, stage=text)

        try:
            if job["isPdf"]:
                output = job["source"].parent / ("cleaned-first.pdf" if scope == "first" else "cleaned-full.pdf")
                details = await asyncio.to_thread(
                    clean_pdf, job["source"], output, progress, regions, scope,
                )
                job["output"] = output
            else:
                progress(20, "Detecting and inpainting watermark…")
                details = await asyncio.to_thread(clean_image, job["source"], job["output"], regions)
                progress(95, "Finalizing clean document…")

            job["outputs"][scope] = job["output"]
            job.update(
                status="completed",
                progress=100,
                stage="Clean PDF ready to review.",
                details=details,
                scope=scope,
                resultPageCount=details.get("pageCount", 1),
            )
        except Exception as exc:
            job["output"].unlink(missing_ok=True)
            job.update(status="failed", stage="Processing failed.", error=str(exc))


@router.post("/process/{job_id}")
async def process(
    job_id: str,
    background_tasks: BackgroundTasks,
    manualRegions: str = Form("[]"),
    scope: str = Form("full"),
):
    job = get_job(job_id)
    if job["status"] in ("queued", "restoring"):
        raise HTTPException(409, "This document is already processing.")

    if scope not in ("first", "full"):
        raise HTTPException(422, "Processing scope must be first or full.")
    regions = []
    if manualRegions:
        try:
            parsed = json.loads(manualRegions)
            if isinstance(parsed, list):
                for r in parsed:
                    if not isinstance(r, dict) or not all(key in r for key in ("x", "y", "width", "height")):
                        raise ValueError
                    values = [float(r[key]) for key in ("x", "y", "width", "height")]
                    if min(values) < 0 or values[0] + values[2] > 1 or values[1] + values[3] > 1:
                        raise ValueError
                    regions.append(r)
        except Exception as exc:
            raise HTTPException(422, "Manual selection coordinates are invalid.") from exc

    job.pop("error", None)
    job.update(status="queued", progress=5, stage="Queued for document processing…")
    background_tasks.add_task(worker, job, regions, scope)
    return {"success": True, "jobId": job_id, "status": "queued", "scope": scope}


@router.get("/status/{job_id}")
async def status(job_id: str):
    job = get_job(job_id)
    return {k: job.get(k) for k in ("jobId", "status", "progress", "stage", "message", "error", "details")}


@router.get("/preview/{job_id}/{page}")
async def preview(job_id: str, page: int, type: str = "original"):
    job = get_job(job_id)
    if type not in ("original", "cleaned") or not 1 <= page <= job["pageCount"]:
        raise HTTPException(422, "Invalid preview request.")
    if type == "cleaned" and job["status"] != "completed":
        raise HTTPException(409, "A verified cleaned document is not ready.")

    path = job["output"] if type == "cleaned" else job["source"]

    def render():
        if job["isPdf"]:
            with pymupdf.open(path) as doc:
                p = doc[page - 1]
                scale = min(1.5, 1920 / max(p.rect.width, p.rect.height))
                return p.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False).tobytes("png")
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            return buffer.getvalue()

    return Response(
        await asyncio.to_thread(render),
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/result/{job_id}")
async def result(job_id: str):
    job = get_job(job_id)
    if job["status"] != "completed":
        raise HTTPException(409, "A verified result is not ready.")
    return {
        "success": True,
        "jobId": job_id,
        "status": "completed",
        "fileName": job["fileName"],
        "pageCount": job.get("resultPageCount", job["pageCount"]),
        "isPdf": job["isPdf"],
        "scope": job.get("scope", "full"),
        "downloadUrl": f"/api/pdf/download/{job_id}",
        "cleanedPreviewUrl": f"/api/pdf/preview/{job_id}/1?type=cleaned",
    }


@router.get("/download/{job_id}")
async def download(job_id: str, format: Optional[str] = Query(None)):
    job = get_job(job_id)
    if job["status"] != "completed" or not job["output"].is_file():
        raise HTTPException(409, "A verified result is not ready.")

    stem = Path(job["fileName"]).stem
    if job["isPdf"]:
        return FileResponse(
            job["output"],
            media_type="application/pdf",
            filename=f"cleaned-{stem}.pdf",
        )

    # For images, support format=jpg or default png
    if format and format.lower() in ("jpg", "jpeg"):
        # Convert to JPEG if not already
        with Image.open(job["output"]) as img:
            rgb = img.convert("RGB")
            buf = io.BytesIO()
            rgb.save(buf, "JPEG", quality=98)
            buf.seek(0)
            return Response(
                buf.getvalue(),
                media_type="image/jpeg",
                headers={"Content-Disposition": f'attachment; filename="cleaned-{stem}.jpg"'},
            )

    return FileResponse(
        job["output"],
        media_type="image/png",
        filename=f"cleaned-{stem}.png",
    )
