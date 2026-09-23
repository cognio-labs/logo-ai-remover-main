import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.config import settings
from backend.models.image_job import ImageJobRecord, ImageJobStatus
from backend.services.image_job_service import ImageJobNotFoundError, image_job_service
from backend.services.image_upscaler import calculate_max_safe_dimensions, read_image_metadata
from backend.utils.file_utils import (
    ALLOWED_IMAGE_EXTENSIONS,
    assert_image_job_owned_path,
    image_job_dir,
    safe_image_download_name,
    validate_job_id,
)
from backend.workers.image_worker import submit_image_job

router = APIRouter(prefix="/api/image", tags=["image"])


def _job(job_id: str) -> ImageJobRecord:
    try:
        return image_job_service.get(validate_job_id(job_id))
    except ImageJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Image job not found") from exc


@router.post("/upscale")
async def upscale_image(
    image: UploadFile = File(...),
    scale: int = Form(4),
    mode: str = Form("natural"),
    outputFormat: str = Form("png"),
    jobId: str | None = Form(None),
):
    # Validate Scale
    if scale not in {2, 4, 8}:
        raise HTTPException(status_code=422, detail="Scale must be 2, 4, or 8")

    # Validate Mode
    norm_mode = mode.strip().lower()
    if norm_mode not in {"natural", "portrait", "art", "product"}:
        raise HTTPException(status_code=422, detail="Mode must be natural, portrait, art, or product")

    # Validate Output Format
    norm_format = outputFormat.strip().lower()
    if norm_format not in {"png", "jpg", "jpeg"}:
        raise HTTPException(status_code=422, detail="Output format must be png or jpg")

    # Validate Job ID
    job_id = validate_job_id(jobId) if jobId else str(uuid4())

    suffix = Path(image.filename or "").suffix.lower()
    if not suffix:
        suffix = ".png"
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image extension '{suffix}'. Supported: PNG, JPG, WebP, GIF, AVIF",
        )

    root = image_job_dir(job_id)
    if (root / "metadata.json").exists():
        raise HTTPException(status_code=409, detail="jobId already exists")

    image_job_service.create_layout(job_id)
    original_dest = assert_image_job_owned_path(job_id, root / "original" / f"input{suffix}")

    # Stream upload with size cap
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

    try:
        orig_metadata = read_image_metadata(original_dest)

        target_w = orig_metadata.width * scale
        target_h = orig_metadata.height * scale
        target_pixels = target_w * target_h

        if (
            target_pixels > settings.max_safe_image_pixels
            or target_w > settings.max_safe_image_dimension
            or target_h > settings.max_safe_image_dimension
        ):
            can_2x = (
                (orig_metadata.width * 2 * orig_metadata.height * 2 <= settings.max_safe_image_pixels)
                and (orig_metadata.width * 2 <= settings.max_safe_image_dimension)
                and (orig_metadata.height * 2 <= settings.max_safe_image_dimension)
            )
            suggestion = (
                "Choose 2× or reduce the source/output dimensions."
                if (scale > 2 and can_2x)
                else "Reduce the source/output dimensions."
            )
            shutil.rmtree(root, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail=f"{scale}× output exceeds the maximum supported image size. {suggestion}",
            )

        job = ImageJobRecord(
            id=job_id,
            status=ImageJobStatus.QUEUED,
            progress=5,
            stage="Queued",
            message="Waiting in queue",
            original_filename=image.filename or "image.png",
            original_path=str(original_dest),
            scale=scale,
            mode=norm_mode,
            output_format=norm_format,
            original_metadata=orig_metadata,
        )
        image_job_service.save(job)
    except HTTPException:
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Invalid image file: {exc}") from exc

    submit_image_job(job.id)
    return {
        "success": True,
        "jobId": job.id,
        "status": "queued",
    }


@router.get("/status/{job_id}")
def image_status(job_id: str):
    job = _job(job_id)
    return {
        "jobId": job.id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "message": job.message,
        "error": job.error if job.status == ImageJobStatus.FAILED else None,
    }


@router.get("/result/{job_id}")
def image_result(job_id: str):
    job = _job(job_id)
    if job.status != ImageJobStatus.COMPLETED:
        raise HTTPException(status_code=409, detail=f"Image job is {job.status}")
    if not job.result_path:
        raise HTTPException(status_code=404, detail="Upscaled image is not available")
    result = assert_image_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Upscaled image file missing from storage")

    return {
        "success": True,
        "jobId": job.id,
        "status": "completed",
        "originalImageUrl": f"/api/image/original/{job.id}",
        "upscaledImageUrl": f"/api/image/preview/{job.id}",
        "downloadUrl": f"/api/image/download/{job.id}",
        "metadata": {
            "originalWidth": job.original_metadata.width if job.original_metadata else 0,
            "originalHeight": job.original_metadata.height if job.original_metadata else 0,
            "upscaledWidth": job.upscaled_metadata.width if job.upscaled_metadata else 0,
            "upscaledHeight": job.upscaled_metadata.height if job.upscaled_metadata else 0,
            "scale": job.scale,
            "mode": job.mode,
            "format": job.output_format.upper(),
            "fileSizeBytes": job.upscaled_metadata.size_bytes if job.upscaled_metadata else 0,
        },
        "resultVersion": result.stat().st_mtime_ns,
    }


@router.get("/original/{job_id}")
def original_image(job_id: str):
    job = _job(job_id)
    original = assert_image_job_owned_path(job.id, job.original_path)
    if not original.is_file():
        raise HTTPException(status_code=404, detail="Original image is missing")

    suffix = original.suffix.lower()
    media_type = "image/png"
    if suffix in {".jpg", ".jpeg"}:
        media_type = "image/jpeg"
    elif suffix == ".webp":
        media_type = "image/webp"

    return FileResponse(
        original,
        media_type=media_type,
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": "inline",
            "X-Image-Job-Id": job.id,
        },
    )


@router.get("/preview/{job_id}")
def preview_upscaled_image(job_id: str):
    job = _job(job_id)
    if job.status != ImageJobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=409, detail="Upscaled image is not ready")
    result = assert_image_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Upscaled image file missing")

    media_type = "image/jpeg" if job.output_format.lower() in {"jpg", "jpeg"} else "image/png"
    return FileResponse(
        result,
        media_type=media_type,
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": "inline",
            "X-Image-Job-Id": job.id,
        },
    )


@router.get("/download/{job_id}")
def download_upscaled_image(job_id: str):
    job = _job(job_id)
    if job.status != ImageJobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=409, detail="Upscaled image is not ready")
    result = assert_image_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Upscaled image file missing")

    ext = "jpg" if job.output_format.lower() in {"jpg", "jpeg"} else "png"
    download_filename = safe_image_download_name(job.original_filename, job.scale, ext)
    media_type = "image/jpeg" if ext == "jpg" else "image/png"

    return FileResponse(
        result,
        media_type=media_type,
        filename=download_filename,
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "X-Image-Job-Id": job.id,
        },
    )


@router.delete("/{job_id}")
def delete_image_job(job_id: str):
    job = _job(job_id)
    if job.status in {
        ImageJobStatus.ANALYZING,
        ImageJobStatus.UPSCALING,
        ImageJobStatus.ENHANCING,
        ImageJobStatus.ENCODING,
        ImageJobStatus.VERIFYING,
    }:
        raise HTTPException(status_code=409, detail="An active upscaling job cannot be deleted")
    root = image_job_dir(job.id)
    shutil.rmtree(root, ignore_errors=True)
    return {"success": True, "jobId": job.id}
