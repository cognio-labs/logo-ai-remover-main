import asyncio
import io
import logging
import os
import shutil
from pathlib import Path
from typing import Optional
from uuid import uuid4

import cv2
import numpy as np
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse, Response

from backend.config import settings
from backend.models.background_job import (
    BackgroundJobRecord,
    BackgroundJobStatus,
    BackgroundImageMetadata,
    BackgroundConfig,
    BackgroundType,
    ExportFormat,
    QualityMode,
    ShadowConfig,
    RefineMaskRequest,
    CompositeRequest,
)
from backend.services.background_service import (
    BackgroundJobNotFoundError,
    background_job_service,
)
from backend.services.model_manager import model_manager
from backend.services.mask_refiner import MaskRefiner
from backend.services.compositing_service import CompositingService
from backend.services.bg_verifier import BackgroundQualityVerifier
from backend.utils.file_utils import (
    ALLOWED_IMAGE_EXTENSIONS,
    assert_background_job_owned_path,
    background_job_dir,
    safe_bg_download_name,
    validate_job_id,
)
from backend.workers.background_worker import process_background_removal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["background"])
# Also alias prefix for convenience
router_alias = APIRouter(prefix="/api/background", tags=["background"])


def _job(job_id: str) -> BackgroundJobRecord:
    try:
        return background_job_service.get(validate_job_id(job_id))
    except BackgroundJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Background job not found") from exc


# -------------------------------------------------------------------------
# CAPABILITIES & HEALTH
# -------------------------------------------------------------------------

@router.get("/capabilities")
@router_alias.get("/capabilities")
async def get_capabilities():
    return {
        "status": "ready",
        "engines": ["local_onnx", "tiled_ultra_hd"],
        "quality_modes": ["standard", "fast", "ultra_hd"],
        "export_formats": ["png", "jpg", "webp"],
        "background_types": ["transparent", "color", "image", "backdrop"],
        "max_upload_size_mb": settings.max_image_upload_mb,
        "max_resolution": "8000x8000",
        "supported_extensions": list(ALLOWED_IMAGE_EXTENSIONS),
        "backdrops": [
            {"id": "luxury-studio", "name": "Luxury Studio", "category": "Studio"},
            {"id": "warm-loft", "name": "Warm Minimalist", "category": "Studio"},
            {"id": "sunset-beach", "name": "Golden Hour Glow", "category": "Nature"},
            {"id": "modern-office", "name": "Corporate Executive", "category": "Business"},
            {"id": "cyberpunk-neon", "name": "Cyberpunk Neon", "category": "Creative"},
            {"id": "pastel-spring", "name": "Pastel Blossom", "category": "Creative"},
        ],
        "solid_colors": [
            {"name": "Pure White", "hex": "#FFFFFF"},
            {"name": "Studio Charcoal", "hex": "#1F2937"},
            {"name": "Blush Rose", "hex": "#FDF2F8"},
            {"name": "Ocean Slate", "hex": "#F0F9FF"},
            {"name": "Warm Cream", "hex": "#FEFCE8"},
            {"name": "Mint Fresh", "hex": "#ECFDF5"},
        ],
    }


@router.get("/health/model")
@router_alias.get("/health/model")
async def get_model_health():
    return model_manager.get_model_info()


# -------------------------------------------------------------------------
# ASYNC JOB CREATION & EXECUTION
# -------------------------------------------------------------------------

@router.post("/background/process")
@router_alias.post("/process")
async def process_image_background(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    bg_type: str = Form("transparent"),
    bg_color: str = Form("#FFFFFF"),
    backdrop_id: str = Form("luxury-studio"),
    quality_mode: str = Form("standard"),
    export_format: str = Form("png"),
    edge_refinement: bool = Form(True),
    color_decontamination: bool = Form(True),
    shadow_enabled: bool = Form(False),
    shadow_opacity: float = Form(0.35),
    jobId: Optional[str] = Form(None),
):
    job_id = validate_job_id(jobId) if jobId else str(uuid4())

    suffix = Path(image.filename or "").suffix.lower()
    if not suffix:
        suffix = ".png"
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image extension '{suffix}'. Supported: PNG, JPG, WebP, GIF, AVIF",
        )

    root = background_job_dir(job_id)
    if (root / "metadata.json").exists():
        raise HTTPException(status_code=409, detail="jobId already exists")

    background_job_service.create_layout(job_id)
    original_dest = assert_background_job_owned_path(job_id, root / "original" / f"input{suffix}")

    # Stream upload to disk
    size = 0
    max_bytes = settings.max_image_upload_mb * 1024 * 1024
    try:
        with original_dest.open("xb") as dst:
            while chunk := await image.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.max_image_upload_mb} MB",
                    )
                dst.write(chunk)
    except HTTPException:
        shutil.rmtree(root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Failed to upload image: {exc}") from exc
    finally:
        await image.close()

    # Read dimensions
    test_img = cv2.imread(str(original_dest))
    if test_img is None:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail="Invalid or unreadable image file")
    h, w = test_img.shape[:2]

    # Validate mode and format
    parsed_bg_type = BackgroundType(bg_type) if bg_type in BackgroundType._value2member_map_ else BackgroundType.TRANSPARENT
    parsed_quality = QualityMode(quality_mode) if quality_mode in QualityMode._value2member_map_ else QualityMode.STANDARD
    parsed_format = ExportFormat(export_format) if export_format in ExportFormat._value2member_map_ else ExportFormat.PNG

    config = BackgroundConfig(
        bg_type=parsed_bg_type,
        bg_color=bg_color,
        backdrop_id=backdrop_id,
        export_format=parsed_format,
        quality_mode=parsed_quality,
        edge_refinement=edge_refinement,
        color_decontamination=color_decontamination,
        shadow=ShadowConfig(enabled=shadow_enabled, opacity=shadow_opacity),
    )

    orig_meta = BackgroundImageMetadata(
        width=w,
        height=h,
        channels=3,
        format=suffix.lstrip("."),
        size_bytes=size,
    )

    job_record = BackgroundJobRecord(
        id=job_id,
        status=BackgroundJobStatus.CREATED,
        progress=0,
        stage="Created",
        message="Job queued for processing",
        original_filename=image.filename or f"image{suffix}",
        original_path=str(original_dest),
        config=config,
        original_metadata=orig_meta,
    )

    background_job_service.save(job_record)

    # Queue background task
    background_tasks.add_task(process_background_removal, job_id)

    return job_record


# -------------------------------------------------------------------------
# DIRECT SYNCHRONOUS REMOVAL
# -------------------------------------------------------------------------

@router.post("/background/remove")
@router_alias.post("/remove")
async def remove_background_direct(
    image: UploadFile = File(...),
    bg_type: str = Form("transparent"),
    bg_color: str = Form("#FFFFFF"),
    backdrop_id: str = Form("luxury-studio"),
    quality_mode: str = Form("standard"),
    export_format: str = Form("png"),
    edge_refinement: bool = Form(True),
    color_decontamination: bool = Form(True),
    shadow_enabled: bool = Form(False),
    shadow_opacity: float = Form(0.35),
):
    """
    Direct synchronous background removal.
    Processes the image and returns JSON with job details and preview/result URLs.
    """
    job_id = str(uuid4())
    suffix = Path(image.filename or "").suffix.lower() or ".png"
    root = background_job_dir(job_id)
    background_job_service.create_layout(job_id)
    original_dest = assert_background_job_owned_path(job_id, root / "original" / f"input{suffix}")

    content = await image.read()
    await image.close()
    original_dest.write_bytes(content)

    test_img = cv2.imread(str(original_dest))
    if test_img is None:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail="Invalid image file")
    h, w = test_img.shape[:2]

    config = BackgroundConfig(
        bg_type=BackgroundType(bg_type) if bg_type in BackgroundType._value2member_map_ else BackgroundType.TRANSPARENT,
        bg_color=bg_color,
        backdrop_id=backdrop_id,
        export_format=ExportFormat(export_format) if export_format in ExportFormat._value2member_map_ else ExportFormat.PNG,
        quality_mode=QualityMode(quality_mode) if quality_mode in QualityMode._value2member_map_ else QualityMode.STANDARD,
        edge_refinement=edge_refinement,
        color_decontamination=color_decontamination,
        shadow=ShadowConfig(enabled=shadow_enabled, opacity=shadow_opacity),
    )

    orig_meta = BackgroundImageMetadata(
        width=w,
        height=h,
        channels=3,
        format=suffix.lstrip("."),
        size_bytes=len(content),
    )

    job_record = BackgroundJobRecord(
        id=job_id,
        status=BackgroundJobStatus.CREATED,
        original_filename=image.filename or f"image{suffix}",
        original_path=str(original_dest),
        config=config,
        original_metadata=orig_meta,
    )
    background_job_service.save(job_record)

    # Process synchronously
    process_background_removal(job_id)
    updated_job = background_job_service.get(job_id)

    if updated_job.status == BackgroundJobStatus.FAILED:
        raise HTTPException(status_code=500, detail=f"Processing failed: {updated_job.error}")

    return {
        "job_id": job_id,
        "status": updated_job.status,
        "width": w,
        "height": h,
        "processing_time_ms": updated_job.processing_time_ms,
        "preview_url": f"/api/v1/jobs/{job_id}/preview",
        "result_url": f"/api/v1/jobs/{job_id}/download",
        "mask_url": f"/api/v1/jobs/{job_id}/mask",
    }


# -------------------------------------------------------------------------
# JOB STATUS & RESULT
# -------------------------------------------------------------------------

@router.get("/jobs/{job_id}")
@router_alias.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    return _job(job_id)


@router.get("/jobs/{job_id}/result")
@router_alias.get("/jobs/{job_id}/result")
async def get_job_result(job_id: str):
    job = _job(job_id)
    if job.status != BackgroundJobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Job is not completed (current status: {job.status})")
    return {
        "job_id": job.id,
        "status": job.status,
        "original_metadata": job.original_metadata,
        "result_metadata": job.result_metadata,
        "processing_time_ms": job.processing_time_ms,
        "download_url": f"/api/v1/jobs/{job.id}/download",
        "preview_url": f"/api/v1/jobs/{job.id}/preview",
        "mask_url": f"/api/v1/jobs/{job.id}/mask",
    }


# -------------------------------------------------------------------------
# RE-COMPOSITE & REFINE (MANUAL STROKES)
# -------------------------------------------------------------------------

@router.post("/background/composite")
@router_alias.post("/composite")
async def recomposite_background(req: CompositeRequest):
    """
    Re-composites an existing mask with new background parameters instantly.
    """
    job = _job(req.job_id)
    if not job.mask_path or not Path(job.mask_path).is_file():
        raise HTTPException(status_code=400, detail="Mask not ready for this job")

    img_rgb, _ = background_job_service.load_original_rgb(job.id)
    mask = background_job_service.load_mask(job.id)

    if req.config.color_decontamination:
        processed_fg = MaskRefiner.color_decontaminate(img_rgb, mask)
    else:
        processed_fg = img_rgb

    composited = CompositingService.composite(
        image_rgb=processed_fg,
        alpha_mask=mask,
        bg_type=req.config.bg_type.value,
        bg_color=req.config.bg_color,
        backdrop_id=req.config.backdrop_id,
        shadow_config=req.config.shadow.model_dump() if req.config.shadow else None,
    )

    ext = req.config.export_format.value
    if req.config.bg_type == BackgroundType.TRANSPARENT:
        ext = "png"

    result_path = background_job_service.save_result(job.id, composited, ext=ext)
    preview_path = background_job_service.save_preview(job.id, composited)

    h, w = composited.shape[:2]
    channels = 4 if req.config.bg_type == BackgroundType.TRANSPARENT else 3

    meta = BackgroundImageMetadata(
        width=w,
        height=h,
        channels=channels,
        format=ext,
        size_bytes=Path(result_path).stat().st_size,
    )

    updated_job = background_job_service.update(
        job.id,
        config=req.config,
        result_path=str(result_path),
        preview_path=str(preview_path),
        result_metadata=meta,
    )

    return {
        "status": "success",
        "job_id": job.id,
        "preview_url": f"/api/v1/jobs/{job.id}/preview?t={int(asyncio.get_event_loop().time() * 1000)}",
        "download_url": f"/api/v1/jobs/{job.id}/download",
    }


@router.post("/background/refine")
@router_alias.post("/refine")
async def refine_mask_strokes(req: RefineMaskRequest):
    """
    Applies user manual brush strokes (keep/remove) to the existing mask,
    refines edges, and updates the composite output.
    """
    job = _job(req.job_id)
    if not job.mask_path or not Path(job.mask_path).is_file():
        raise HTTPException(status_code=400, detail="Mask not ready for this job")

    img_rgb, _ = background_job_service.load_original_rgb(job.id)
    current_mask = background_job_service.load_mask(job.id)

    # Convert pydantic strokes to dicts
    stroke_dicts = [s.model_dump() for s in req.strokes]
    modified_mask = MaskRefiner.apply_manual_strokes(current_mask, stroke_dicts)

    if req.edge_refine:
        modified_mask = MaskRefiner.refine_mask(
            img_rgb,
            modified_mask,
            bilateral_refine=True,
            fill_holes=False,
            smooth_radius=1
        )

    # Save modified mask
    background_job_service.save_mask(job.id, modified_mask)

    # Re-composite
    fg = MaskRefiner.color_decontaminate(img_rgb, modified_mask) if job.config.color_decontamination else img_rgb
    composited = CompositingService.composite(
        image_rgb=fg,
        alpha_mask=modified_mask,
        bg_type=job.config.bg_type.value,
        bg_color=job.config.bg_color,
        backdrop_id=job.config.backdrop_id,
        shadow_config=job.config.shadow.model_dump() if job.config.shadow else None,
    )

    ext = job.config.export_format.value
    if job.config.bg_type == BackgroundType.TRANSPARENT:
        ext = "png"

    result_path = background_job_service.save_result(job.id, composited, ext=ext)
    preview_path = background_job_service.save_preview(job.id, composited)

    return {
        "status": "success",
        "job_id": job.id,
        "preview_url": f"/api/v1/jobs/{job.id}/preview?t={int(asyncio.get_event_loop().time() * 1000)}",
        "mask_url": f"/api/v1/jobs/{job.id}/mask?t={int(asyncio.get_event_loop().time() * 1000)}",
    }


# -------------------------------------------------------------------------
# DOWNLOAD & PREVIEWS
# -------------------------------------------------------------------------

@router.get("/jobs/{job_id}/download")
@router_alias.get("/jobs/{job_id}/download")
async def download_result(job_id: str, format: Optional[str] = None):
    job = _job(job_id)
    if not job.result_path or not Path(job.result_path).is_file():
        raise HTTPException(status_code=404, detail="Result file not found or processing not complete")

    result_path = Path(job.result_path)
    ext = format.lower() if format else result_path.suffix.lstrip(".").lower()
    download_name = safe_bg_download_name(
        job.original_filename,
        bg_type=job.config.bg_type.value,
        ext=ext
    )

    media_type = "image/png"
    if ext in ("jpg", "jpeg"):
        media_type = "image/jpeg"
    elif ext == "webp":
        media_type = "image/webp"

    return FileResponse(
        str(result_path),
        media_type=media_type,
        filename=download_name,
        headers={"Cache-Control": "no-cache"}
    )


@router.get("/jobs/{job_id}/preview")
@router_alias.get("/jobs/{job_id}/preview")
async def get_job_preview(job_id: str):
    job = _job(job_id)
    preview_file = Path(job.preview_path) if job.preview_path else None
    if not preview_file or not preview_file.is_file():
        # Fallback to result if preview not found
        if job.result_path and Path(job.result_path).is_file():
            preview_file = Path(job.result_path)
        else:
            raise HTTPException(status_code=404, detail="Preview not ready")

    return FileResponse(
        str(preview_file),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/jobs/{job_id}/mask")
@router_alias.get("/jobs/{job_id}/mask")
async def get_job_mask(job_id: str):
    job = _job(job_id)
    if not job.mask_path or not Path(job.mask_path).is_file():
        raise HTTPException(status_code=404, detail="Mask not ready")

    return FileResponse(
        job.mask_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.delete("/jobs/{job_id}")
@router_alias.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    valid_id = validate_job_id(job_id)
    success = background_job_service.delete(valid_id)
    return {"deleted": success, "job_id": valid_id}
