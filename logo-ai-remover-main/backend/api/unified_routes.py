import os
import json
import asyncio
import logging
from uuid import uuid4
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, FileResponse

from backend.config import settings
from backend.services.rate_limiter import rate_limiter
from backend.services.cache_service import cache_service
from backend.storage.s3_storage import storage_service
from backend.workers.tasks import (
    upscale_task,
    remove_bg_task,
    clean_image_task,
    clean_pdf_task,
    get_job_status,
    update_job_status
)
from backend.engines.lama_cleaner_engine import lama_cleaner_engine
from backend.engines.pdf_cleaner_engine import pdf_cleaner_engine
import cv2

logger = logging.getLogger(__name__)

router = APIRouter(tags=["unified_ai"])

# -------------------------------------------------------------------------
# 1. UPSCALER: POST /api/upscale
# -------------------------------------------------------------------------
@router.post("/api/upscale")
async def api_upscale(
    request: Request,
    image: UploadFile = File(...),
    scale: int = Form(4),
    mode: str = Form("natural"),
    format: str = Form("png"),
):
    rate_limiter.check_rate_limit(request)

    if scale not in (2, 4, 8):
        raise HTTPException(status_code=400, detail="Scale must be 2, 4, or 8")

    job_id = str(uuid4())
    ext = Path(image.filename or "input.png").suffix.lower() or ".png"
    work_dir = settings.image_storage_root / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    input_path = work_dir / f"input{ext}"
    output_path = work_dir / f"upscaled_{scale}x.{format.lower()}"

    content = await image.read()
    if len(content) > settings.max_image_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image exceeds {settings.max_image_upload_mb}MB limit")

    with open(input_path, "wb") as f:
        f.write(content)

    update_job_status(job_id, "queued", 0, "Job enqueued")

    # Dispatch to Celery or synchronous fallback
    try:
        from backend.workers.celery_app import celery_app
        upscale_task.delay(job_id, str(input_path), str(output_path), scale, mode, format)
    except Exception as e:
        logger.warning(f"Celery queue unavailable ({e}), running in direct worker thread")
        asyncio.create_task(asyncio.to_thread(
            upscale_task, job_id, str(input_path), str(output_path), scale, mode, format
        ))

    return {"job_id": job_id, "status": "queued"}

# -------------------------------------------------------------------------
# 2. BACKGROUND REMOVER: POST /api/remove-bg
# -------------------------------------------------------------------------
@router.post("/api/remove-bg")
@router.post("/api/background/remove")
async def api_remove_bg(
    request: Request,
    image: UploadFile = File(...),
    quality: str = Form("balanced"),
    bg_mode: str = Form("transparent"),
    bg_color: str = Form("#FFFFFF"),
    studio_preset: str = Form("luxury-studio"),
    format: str = Form("png"),
):
    rate_limiter.check_rate_limit(request)

    job_id = str(uuid4())
    ext = Path(image.filename or "input.png").suffix.lower() or ".png"
    work_dir = settings.background_storage_root / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    input_path = work_dir / f"input{ext}"
    output_path = work_dir / f"cutout.{format.lower()}"

    content = await image.read()
    if len(content) > settings.bg_max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.bg_max_upload_mb}MB limit")

    with open(input_path, "wb") as f:
        f.write(content)

    update_job_status(job_id, "queued", 0, "Job enqueued")

    try:
        remove_bg_task.delay(job_id, str(input_path), str(output_path), quality, bg_mode, bg_color, studio_preset)
    except Exception as e:
        logger.warning(f"Celery queue unavailable ({e}), running in direct worker thread")
        asyncio.create_task(asyncio.to_thread(
            remove_bg_task, job_id, str(input_path), str(output_path), quality, bg_mode, bg_color, studio_preset
        ))

    return {"job_id": job_id, "status": "queued"}

# -------------------------------------------------------------------------
# 3. IMAGE CLEANER: POST /api/clean/detect & POST /api/clean
# -------------------------------------------------------------------------
@router.post("/api/clean/detect")
async def api_clean_detect(request: Request, image: UploadFile = File(...)):
    rate_limiter.check_rate_limit(request)
    content = await image.read()
    temp_dir = settings.storage_root / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file = temp_dir / f"detect_{uuid4().hex}.png"
    with open(temp_file, "wb") as f:
        f.write(content)

    img = cv2.imread(str(temp_file))
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image format")

    mask, boxes = lama_cleaner_engine.auto_detect_watermarks(img)
    mask_out = temp_dir / f"mask_{uuid4().hex}.png"
    cv2.imwrite(str(mask_out), mask)

    signed_mask_url = storage_service.get_signed_url(str(mask_out))
    return {
        "mask_url": signed_mask_url,
        "boxes": boxes,
        "count": len(boxes)
    }

@router.post("/api/clean")
async def api_clean(
    request: Request,
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    quality: str = Form("balanced"),
    format: str = Form("png"),
):
    rate_limiter.check_rate_limit(request)
    job_id = str(uuid4())
    work_dir = settings.image_storage_root / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    img_path = work_dir / "input.png"
    mask_path = work_dir / "mask.png"
    out_path = work_dir / f"cleaned.{format.lower()}"

    with open(img_path, "wb") as f:
        f.write(await image.read())
    with open(mask_path, "wb") as f:
        f.write(await mask.read())

    update_job_status(job_id, "queued", 0, "Job enqueued")

    try:
        clean_image_task.delay(job_id, str(img_path), str(mask_path), str(out_path), quality, format)
    except Exception as e:
        logger.warning(f"Celery queue unavailable ({e}), running in direct worker thread")
        asyncio.create_task(asyncio.to_thread(
            clean_image_task, job_id, str(img_path), str(mask_path), str(out_path), quality, format
        ))

    return {"job_id": job_id, "status": "queued"}

# -------------------------------------------------------------------------
# 4. PDF CLEANER: POST /api/pdf/analyze & POST /api/pdf/clean
# -------------------------------------------------------------------------
@router.post("/api/pdf/analyze")
async def api_pdf_analyze(request: Request, file: UploadFile = File(...)):
    rate_limiter.check_rate_limit(request)
    temp_dir = settings.pdf_storage_root / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_pdf = temp_dir / f"analyze_{uuid4().hex}.pdf"
    with open(temp_pdf, "wb") as f:
        f.write(await file.read())

    analysis = pdf_cleaner_engine.analyze_document(temp_pdf)
    return analysis

@router.post("/api/pdf/clean")
async def api_pdf_clean(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("vector_lossless"),
    quality: str = Form("balanced"),
):
    rate_limiter.check_rate_limit(request)
    job_id = str(uuid4())
    work_dir = settings.pdf_storage_root / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    input_pdf = work_dir / "input.pdf"
    output_pdf = work_dir / "cleaned.pdf"

    with open(input_pdf, "wb") as f:
        f.write(await file.read())

    update_job_status(job_id, "queued", 0, "Job enqueued")

    try:
        clean_pdf_task.delay(job_id, str(input_pdf), str(output_pdf), mode, quality)
    except Exception as e:
        logger.warning(f"Celery queue unavailable ({e}), running in direct worker thread")
        asyncio.create_task(asyncio.to_thread(
            clean_pdf_task, job_id, str(input_pdf), str(output_pdf), mode, quality
        ))

    return {"job_id": job_id, "status": "queued"}

# -------------------------------------------------------------------------
# 5. UNIFIED STATUS, STREAM (SSE) & RESULT ENDPOINTS
# -------------------------------------------------------------------------
@router.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    return get_job_status(job_id)

@router.get("/api/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str):
    """Server-Sent Events (SSE) live progress stream."""
    async def event_generator():
        last_progress = -1
        while True:
            st = get_job_status(job_id)
            curr = st.get("progress", 0)
            if curr != last_progress or st.get("status") in ("done", "failed"):
                last_progress = curr
                payload = json.dumps(st)
                yield f"data: {payload}\n\n"

            if st.get("status") in ("done", "failed"):
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/api/jobs/{job_id}/result")
async def get_job_result(job_id: str):
    st = get_job_status(job_id)
    if st.get("status") != "done":
        raise HTTPException(status_code=400, detail=f"Job not ready: {st.get('status')}")
    return st.get("result", {})

# -------------------------------------------------------------------------
# 6. TRY SAMPLES ENDPOINT: POST /api/samples/{sample_id}
# -------------------------------------------------------------------------
@router.post("/api/samples/{sample_id}")
async def run_sample_endpoint(sample_id: str):
    """Executes predefined synthetic demonstration samples."""
    samples_map = {
        "invoice": {"title": "Corporate Tax Invoice", "mode": "vector_lossless", "time_sec": 0.4},
        "legal-nda": {"title": "Commercial Legal NDA", "mode": "vector_lossless", "time_sec": 0.6},
        "blueprint": {"title": "Architectural Blueprint", "mode": "auto_inpaint", "time_sec": 1.2},
        "studio-portrait": {"title": "Studio Portrait", "scale": 4, "mode": "portrait"},
        "generative-art": {"title": "Generative Art", "scale": 8, "mode": "art"},
        "vector-logo": {"title": "Vector & Logos", "scale": 2, "mode": "product"},
    }
    if sample_id not in samples_map:
        raise HTTPException(status_code=404, detail="Sample ID not found")

    return {
        "sample_id": sample_id,
        "info": samples_map[sample_id],
        "preview_url": f"/samples/{sample_id}_after.webp"
    }

# -------------------------------------------------------------------------
# 7. LOCAL STORAGE FILE STREAMING (FALLBACK)
# -------------------------------------------------------------------------
@router.get("/api/storage/files/{filename}")
async def get_storage_file(filename: str):
    # Search in all storage dirs
    for root in [settings.image_storage_root, settings.background_storage_root, settings.pdf_storage_root, settings.storage_root]:
        for p in root.rglob(filename):
            if p.is_file():
                return FileResponse(p)
    raise HTTPException(status_code=404, detail="File not found")
