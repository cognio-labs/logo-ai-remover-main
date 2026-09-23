import logging
from pathlib import Path
import shutil
import subprocess
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from backend.config import settings
from backend.models.video_enhancer_job import (
    ProcessOptions,
    ProcessRequestPayload,
    VideoEnhancerJobRecord,
    VideoEnhancerJobStatus,
)
from backend.services.video_enhancer.frame_decoder import frame_decoder
from backend.services.video_enhancer.job_service import (
    VideoEnhancerJobNotFoundError,
    video_enhancer_job_service,
)
from backend.services.video_enhancer.super_resolution_engine import (
    MAX_SAFE_HEIGHT,
    MAX_SAFE_WIDTH,
    SuperResolutionError,
    compute_target_dimensions,
)
from backend.services.video_enhancer.video_inspector import (
    VideoInspectorError,
    video_inspector,
)
from backend.utils.file_utils import (
    ALLOWED_EXTENSIONS,
    assert_video_enhancer_job_owned_path,
    safe_enhanced_video_download_name,
    validate_job_id,
    video_enhancer_job_dir,
)
from backend.workers.video_enhancer_worker import submit_video_enhancer_job

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/video", tags=["video-enhancer"])
health_router = APIRouter(prefix="/api/v1", tags=["system"])


def _get_job_or_404(job_id: str) -> VideoEnhancerJobRecord:
    try:
        clean_id = validate_job_id(job_id)
        return video_enhancer_job_service.get(clean_id)
    except VideoEnhancerJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Video job '{job_id}' not found") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    jobId: str | None = Form(None),
):
    """
    Real video upload with format verification, magic bytes validation,
    FFprobe stream inspection, and thumbnail generation.
    """
    raw_id = jobId or str(uuid4())
    job_id = validate_job_id(raw_id)

    orig_name = file.filename or "uploaded_video.mp4"
    ext = Path(orig_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported video format '{ext}'. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    root = video_enhancer_job_service.create_layout(job_id)
    saved_input_path = root / f"source{ext}"

    # Stream upload to disk to handle large files safely
    total_bytes = 0
    max_bytes = settings.max_video_upload_mb * 1024 * 1024
    try:
        with saved_input_path.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video exceeds maximum allowed size of {settings.max_video_upload_mb} MB",
                    )
                buffer.write(chunk)
    except Exception as e:
        if saved_input_path.exists():
            saved_input_path.unlink()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to save video: {e}")

    # Validate file integrity and magic bytes
    try:
        video_inspector.validate_video_file(saved_input_path)
    except VideoInspectorError as vie:
        if saved_input_path.exists():
            saved_input_path.unlink()
        raise HTTPException(status_code=400, detail=str(vie))

    # Probe real video stream metadata
    try:
        metadata = video_inspector.probe_video(saved_input_path)
    except Exception as exc:
        if saved_input_path.exists():
            saved_input_path.unlink()
        raise HTTPException(status_code=422, detail=f"Corrupted video stream: {exc}")

    # Generate initial thumbnail
    thumb_path = root / "thumbnail.jpg"
    preview_url = None
    try:
        frame_decoder.generate_thumbnail(saved_input_path, thumb_path)
        if thumb_path.exists():
            preview_url = f"/api/v1/video/jobs/{job_id}/preview"
    except Exception as e:
        logger.warning(f"Could not generate thumbnail for {job_id}: {e}")

    # Create job record
    record = VideoEnhancerJobRecord(
        id=job_id,
        status=VideoEnhancerJobStatus.QUEUED,
        stage="Uploaded",
        message="Video uploaded and inspected successfully",
        progress=0.0,
        original_filename=orig_name,
        original_path=str(saved_input_path),
        original_mime=file.content_type or "video/mp4",
        original_size_bytes=total_bytes,
        input_metadata=metadata,
        preview_path=str(thumb_path) if thumb_path.exists() else None,
    )
    video_enhancer_job_service.save(record)

    return {
        "job_id": job_id,
        "status": record.status.value,
        "filename": orig_name,
        "size_bytes": total_bytes,
        "metadata": metadata.model_dump(),
        "preview_url": preview_url,
        "original_url": f"/api/v1/video/jobs/{job_id}/original",
    }


@router.post("/inspect")
async def inspect_video_job(payload: dict):
    """
    Calculates target dimensions, estimated resolution, aspect ratio,
    and validates hardware safety limits before processing.
    """
    job_id = payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="Missing job_id")

    job = _get_job_or_404(job_id)
    if not job.input_metadata:
        raise HTTPException(status_code=400, detail="Job has no input metadata")

    scale = int(payload.get("scale", 2))
    target_preset = str(payload.get("target_resolution", "4k"))

    orig_w = job.input_metadata.width
    orig_h = job.input_metadata.height

    try:
        target_w, target_h = compute_target_dimensions(
            orig_w=orig_w,
            orig_h=orig_h,
            scale=scale,
            target_preset=target_preset,
        )
        safe = True
        warning = None
    except SuperResolutionError as sre:
        safe = False
        warning = str(sre)
        target_w = orig_w * scale
        target_h = orig_h * scale

    return {
        "job_id": job_id,
        "source_resolution": f"{orig_w}x{orig_h}",
        "target_resolution": f"{target_w}x{target_h}",
        "target_width": target_w,
        "target_height": target_h,
        "scale": scale,
        "aspect_ratio": round(orig_w / max(1, orig_h), 3),
        "source_fps": job.input_metadata.fps,
        "safe": safe,
        "warning": warning,
        "max_supported_resolution": f"{MAX_SAFE_WIDTH}x{MAX_SAFE_HEIGHT} (4K UHD)",
    }


@router.post("/process")
async def process_video(payload: ProcessRequestPayload):
    """
    Starts real video enhancement pipeline. Validates parameters and launches worker.
    """
    job = _get_job_or_404(payload.job_id)
    if not job.input_metadata:
        raise HTTPException(status_code=400, detail="Source video metadata missing. Upload first.")

    # Validate output dimensions safety
    try:
        target_w, target_h = compute_target_dimensions(
            orig_w=job.input_metadata.width,
            orig_h=job.input_metadata.height,
            scale=payload.scale,
            target_preset=payload.target_resolution,
        )
    except SuperResolutionError as sre:
        raise HTTPException(status_code=400, detail=str(sre))

    options = ProcessOptions(
        scale=payload.scale,
        target_resolution=payload.target_resolution,
        enhancement=payload.enhancement,
        denoise=payload.denoise,
        deblock=payload.deblock,
        sharpen=payload.sharpen,
        interpolation=payload.interpolation,
        target_fps=payload.target_fps,
        output_format=payload.output_format,
        codec=payload.codec,
        quality=payload.quality,
        preserve_audio=payload.preserve_audio,
    )

    video_enhancer_job_service.update(
        payload.job_id,
        status=VideoEnhancerJobStatus.QUEUED,
        stage="Queued",
        message="Processing queued in worker pool",
        progress=0.0,
        options=options,
        cancelled=False,
        error=None,
    )

    submit_video_enhancer_job(payload.job_id)

    return {
        "job_id": payload.job_id,
        "status": VideoEnhancerJobStatus.QUEUED.value,
        "message": "AI video enhancement started",
        "target_dimensions": f"{target_w}x{target_h}",
    }


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Returns current status, progress, stage, and metadata of the video job."""
    job = _get_job_or_404(job_id)
    return job.model_dump()


@router.get("/jobs/{job_id}/events")
async def stream_job_events(job_id: str):
    """Server-Sent Events (SSE) for live frame progress and stage transitions."""
    _get_job_or_404(job_id)
    return StreamingResponse(
        video_enhancer_job_service.subscribe_events(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/jobs/{job_id}/preview")
async def get_job_preview(job_id: str):
    """Serves the generated thumbnail for the source video."""
    job = _get_job_or_404(job_id)
    if not job.preview_path or not Path(job.preview_path).exists():
        raise HTTPException(status_code=404, detail="Thumbnail preview not available")
    return FileResponse(
        Path(job.preview_path),
        media_type="image/jpeg",
        filename="thumbnail.jpg",
    )


@router.get("/jobs/{job_id}/original")
async def stream_original_video(job_id: str):
    """Streams original source video with Range request support for HTML5 video player."""
    job = _get_job_or_404(job_id)
    path = Path(job.original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original video file not found")
    assert_video_enhancer_job_owned_path(job_id, path)
    return FileResponse(path, media_type=job.original_mime or "video/mp4")


@router.get("/jobs/{job_id}/enhanced")
async def stream_enhanced_video(job_id: str):
    """Streams enhanced output video with Range request support for HTML5 video player."""
    job = _get_job_or_404(job_id)
    if job.status != VideoEnhancerJobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=400, detail="Enhanced video is not ready yet")
    path = Path(job.result_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Enhanced video file not found on disk")
    assert_video_enhancer_job_owned_path(job_id, path)
    return FileResponse(path, media_type="video/mp4")


@router.get("/jobs/{job_id}/result")
async def download_result_video(job_id: str):
    """Downloads the finished enhanced video file with a user-friendly filename."""
    job = _get_job_or_404(job_id)
    if job.status != VideoEnhancerJobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=400, detail="Job has not completed yet")
    path = Path(job.result_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Result file missing from storage")

    assert_video_enhancer_job_owned_path(job_id, path)
    download_name = safe_enhanced_video_download_name(
        original_name=job.original_filename,
        scale=job.options.scale,
        ext=job.options.output_format,
    )
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancels processing for an ongoing video job."""
    job = _get_job_or_404(job_id)
    updated = video_enhancer_job_service.cancel(job.id)
    return {"job_id": job.id, "status": updated.status.value, "cancelled": True}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Permanently deletes job data and temporary storage."""
    _get_job_or_404(job_id)
    video_enhancer_job_service.delete(job_id)
    return {"job_id": job_id, "deleted": True}


# System Health and Capability endpoints
@router.get("/health")
@health_router.get("/health")
def api_v1_health():
    return {"status": "ok", "service": "video-enhancer-pipeline", "version": "1.0.0"}


@router.get("/health/ffmpeg")
@health_router.get("/health/ffmpeg")
def api_v1_ffmpeg_health():
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        version_line = res.stdout.split("\n")[0] if res.returncode == 0 else "unknown"
        return {"status": "available", "version": version_line, "ok": res.returncode == 0}
    except Exception as e:
        return {"status": "unavailable", "error": str(e), "ok": False}


@router.get("/health/model")
def api_v1_model_health():
    return {
        "status": "ready",
        "super_resolution": "Lanczos-4 Sub-pixel Texture Enhancer",
        "optical_flow": "OpenCV DISOpticalFlow Dense Motion Synthesizer",
        "hardware_limits": {
            "max_width": MAX_SAFE_WIDTH,
            "max_height": MAX_SAFE_HEIGHT,
            "max_resolution_label": "4K UHD (3840x2160)",
        },
    }


@router.get("/capabilities")
def api_v1_capabilities():
    return {
        "max_upload_mb": settings.max_video_upload_mb,
        "supported_scales": [1, 2, 4],
        "supported_resolutions": ["original", "720p", "1080p", "1440p", "4k"],
        "supported_codecs": ["h264", "h265", "vp9"],
        "supported_fps": [30.0, 60.0, 120.0],
        "supported_containers": ["mp4", "mov", "webm"],
        "features": {
            "super_resolution": True,
            "denoise": True,
            "deblock": True,
            "sharpen": True,
            "optical_flow_interpolation": True,
            "audio_preservation": True,
            "realtime_sse": True,
        },
    }
