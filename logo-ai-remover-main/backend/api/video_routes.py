import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.config import settings
from backend.models.job import JobRecord, JobStatus
from backend.schemas.video import ProcessRequest
from backend.services.job_service import JobNotFoundError, job_service
from backend.services.video_analyzer import analyze_video
from backend.utils.file_utils import (
    ALLOWED_EXTENSIONS,
    assert_job_owned_path,
    job_dir,
    safe_download_name,
    validate_job_id,
)
from backend.workers.video_worker import cancel_video_job, submit_video_job


router = APIRouter(prefix="/api/video", tags=["video"])
router_alias = APIRouter(prefix="/api/video-watermark", tags=["video-watermark"])


def _job(job_id: str) -> JobRecord:
    try:
        return job_service.get(validate_job_id(job_id))
    except JobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Video job not found") from exc


def _metadata_payload(job: JobRecord) -> dict | None:
    if job.metadata is None:
        return None
    data = job.metadata.model_dump()
    data["hasAudio"] = data.pop("audio_present")
    data["frameCount"] = data.pop("frame_count")
    data["pixelFormat"] = data.pop("pixel_format")
    data["videoCodec"] = data.pop("video_codec")
    data["audioCodec"] = data.pop("audio_codec")
    data["sampleRate"] = data.pop("sample_rate")
    return data


def _urls(job: JobRecord) -> dict:
    has_preview = bool(job.preview_ready and job.preview_path and Path(job.preview_path).is_file())
    is_done = job.status == JobStatus.COMPLETED
    return {
        "originalVideoUrl": f"/api/video/original/{job.id}",
        "previewVideoUrl": f"/api/video/preview/{job.id}" if has_preview else None,
        "cleanedVideoUrl": f"/api/video/cleaned/{job.id}" if is_done else None,
        "downloadVideoUrl": f"/api/video/download/{job.id}" if is_done else None,
        "downloadUrls": {
            "720p": f"/api/video/download/{job.id}/720p",
            "1080p": f"/api/video/download/{job.id}/1080p",
            "4k": f"/api/video/download/{job.id}/4k",
        } if is_done else {},
    }


import uuid


async def _handle_upload(
    file: UploadFile = File(...),
    jobId: str | None = Form(None),
    job_id: str | None = Form(None),
):
    requested_id = jobId or job_id
    if requested_id:
        actual_job_id = validate_job_id(requested_id)
    else:
        actual_job_id = str(uuid.uuid4())

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported video extension. Use MP4, MOV, WebM, AVI, or MKV.",
        )
    if file.content_type and not (
        file.content_type.startswith("video/") or file.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=415, detail="Uploaded file is not a valid video format.")
    root = job_dir(actual_job_id)
    if (root / "metadata.json").exists():
        raise HTTPException(status_code=409, detail="jobId already exists")
    job_service.create_layout(actual_job_id)
    original = assert_job_owned_path(actual_job_id, root / "original" / f"input{suffix}")
    size = 0
    maximum = settings.max_upload_mb * 1024 * 1024
    try:
        with original.open("xb") as destination:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > maximum:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video exceeds the {settings.max_upload_mb} MB limit",
                    )
                destination.write(chunk)
        metadata = analyze_video(original, settings.max_duration_seconds)
        job = JobRecord(
            id=actual_job_id,
            status=JobStatus.UPLOADED,
            progress=5,
            stage="Upload verified",
            message="Original video verified and stored",
            original_filename=Path(file.filename or "video.mp4").name,
            original_path=str(original),
            mime_type=file.content_type or "video/mp4",
            size=size,
            total_frames=metadata.frame_count,
            metadata=metadata,
        )
        job_service.save(job)
    except HTTPException:
        shutil.rmtree(root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Invalid video file: {exc}") from exc
    finally:
        await file.close()

    return {
        "success": True,
        "job_id": job.id,
        "jobId": job.id,
        "status": "uploaded",
        "filename": job.original_filename,
        "duration": metadata.duration,
        "width": metadata.width,
        "height": metadata.height,
        "fps": metadata.fps,
        **_urls(job),
        "metadata": _metadata_payload(job),
    }


def _handle_process(request: ProcessRequest):
    job = _job(request.jobId)
    if job.status not in {JobStatus.UPLOADED, JobStatus.FAILED, JobStatus.CANCELLED}:
        raise HTTPException(status_code=409, detail=f"Job cannot start from status {job.status}")
    original = assert_job_owned_path(job.id, job.original_path)
    if not original.is_file():
        raise HTTPException(status_code=422, detail="The original file for this job is missing")
    job_service.update(
        job.id,
        status=JobStatus.QUEUED,
        progress=6,
        stage="Queued",
        message="Queued for frame reconstruction",
        cancelled=False,
        error="",
    )
    submit_video_job(job.id, request.manualRegion)
    return {"success": True, "jobId": job.id, "status": "queued"}


def _handle_status(job_id: str):
    job = _job(job_id)
    has_preview = bool(job.preview_ready and job.preview_path and Path(job.preview_path).is_file())
    urls = _urls(job)
    return {
        "jobId": job.id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "message": job.message,
        "processedFrames": job.processed_frames,
        "totalFrames": job.total_frames or (job.metadata.frame_count if job.metadata else 0),
        "hasPreview": has_preview,
        "previewUrl": urls.get("previewVideoUrl"),
        "outputs": urls.get("downloadUrls", {}),
        "error": job.error if job.status == JobStatus.FAILED else None,
    }


def _handle_cancel(job_id: str):
    cancel_video_job(job_id)
    job = _job(job_id)
    return {"success": True, "jobId": job.id, "status": "cancelled"}


def _handle_preview(job_id: str):
    job = _job(job_id)
    if not job.preview_path:
        raise HTTPException(status_code=404, detail="Cleaned preview is not ready yet")
    preview_file = assert_job_owned_path(job.id, job.preview_path)
    if not preview_file.is_file():
        raise HTTPException(status_code=404, detail="Cleaned preview is not ready yet")
    return FileResponse(
        preview_file,
        media_type="video/mp4",
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
            "X-Video-Job-Id": job.id,
        },
    )


def _handle_download(job_id: str, quality: str | None = None):
    job = _job(job_id)
    if job.status != JobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=409, detail="Cleaned video is not ready for download")

    target_file = None
    quality_label = ""

    if quality and job.outputs and quality.lower() in job.outputs:
        target_file = Path(job.outputs[quality.lower()])
        quality_label = f"-{quality.lower()}"
    elif quality and quality.lower() in ("720p", "1080p", "4k"):
        # Check output directory directly
        root = job_dir(job.id)
        candidate = root / "output" / f"cleaned_{quality.lower()}.mp4"
        if candidate.is_file():
            target_file = candidate
            quality_label = f"-{quality.lower()}"

    if target_file is None or not target_file.is_file():
        target_file = assert_job_owned_path(job.id, job.result_path)

    if not target_file.is_file():
        raise HTTPException(status_code=404, detail="Cleaned video file not found")

    clean_base = Path(safe_download_name(job.original_filename)).stem
    download_filename = f"{clean_base}{quality_label}-cleaned.mp4"

    return FileResponse(
        target_file,
        media_type="video/mp4",
        filename=download_filename,
        headers={"Cache-Control": "private, no-store, max-age=0", "X-Video-Job-Id": job.id},
    )


def video_result(job_id: str):
    job = _job(job_id)
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=409, detail=f"Job is {job.status}")
    if not job.result_path:
        raise HTTPException(status_code=404, detail="Cleaned video could not be generated. Please retry.")
    result = assert_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Cleaned video could not be generated. Please retry.")
    return {
        "success": True,
        "job_id": job.id,
        "jobId": job.id,
        "status": job.status,
        **_urls(job),
        "metadata": _metadata_payload(job),
        "resultVersion": result.stat().st_mtime_ns,
    }


def original_video(job_id: str):
    job = _job(job_id)
    original = assert_job_owned_path(job.id, job.original_path)
    if not original.is_file():
        raise HTTPException(status_code=404, detail="Original video is missing")
    return FileResponse(
        original,
        media_type=job.mime_type,
        headers={"Cache-Control": "private, no-store, max-age=0", "Accept-Ranges": "bytes", "X-Video-Job-Id": job.id},
    )


def cleaned_video(job_id: str):
    job = _job(job_id)
    if job.status != JobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=409, detail="Cleaned video is not ready")
    result = assert_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Cleaned video could not be generated. Please retry.")
    return FileResponse(
        result,
        media_type="video/mp4",
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
            "X-Video-Job-Id": job.id,
        },
    )


def delete_video_job(job_id: str):
    job = _job(job_id)
    if job.status in {
        JobStatus.ANALYZING,
        JobStatus.DETECTING,
        JobStatus.TRACKING,
        JobStatus.PROCESSING,
        JobStatus.ENCODING,
        JobStatus.VERIFYING,
    }:
        raise HTTPException(status_code=409, detail="A processing job cannot be deleted")
    root = job_dir(job.id)
    shutil.rmtree(root, ignore_errors=True)
    return {"success": True, "job_id": job.id, "jobId": job.id}


# --- Register All Routes on both /api/video and /api/video-watermark ---

for r in (router, router_alias):
    r.add_api_route("/upload", _handle_upload, methods=["POST"])
    r.add_api_route("/process", _handle_process, methods=["POST"])
    r.add_api_route("/process/{job_id}", lambda job_id, req=None: _handle_process(req or ProcessRequest(jobId=job_id)), methods=["POST"])
    r.add_api_route("/status/{job_id}", _handle_status, methods=["GET"])
    r.add_api_route("/cancel/{job_id}", _handle_cancel, methods=["POST"])
    r.add_api_route("/preview/{job_id}", _handle_preview, methods=["GET"])
    r.add_api_route("/download/{job_id}", _handle_download, methods=["GET"])
    r.add_api_route("/download/{job_id}/{quality}", _handle_download, methods=["GET"])
    r.add_api_route("/result/{job_id}", video_result, methods=["GET"])
    r.add_api_route("/original/{job_id}", original_video, methods=["GET"])
    r.add_api_route("/cleaned/{job_id}", cleaned_video, methods=["GET"])
    r.add_api_route("/{job_id}", delete_video_job, methods=["DELETE"])

