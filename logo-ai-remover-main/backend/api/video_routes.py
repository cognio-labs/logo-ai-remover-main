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
from backend.workers.video_worker import submit_video_job


router = APIRouter(prefix="/api/video", tags=["video"])


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
    return {
        "originalVideoUrl": f"/api/video/original/{job.id}",
        "cleanedVideoUrl": f"/api/video/download/{job.id}" if job.status == JobStatus.COMPLETED else None,
    }


@router.post("/upload")
async def upload_video(file: UploadFile = File(...), jobId: str = Form(...)):
    job_id = validate_job_id(jobId)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported video extension")
    if file.content_type and not (
        file.content_type.startswith("video/") or file.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=415, detail="Uploaded file is not a video")
    root = job_dir(job_id)
    if (root / "metadata.json").exists():
        raise HTTPException(status_code=409, detail="jobId already exists")
    job_service.create_layout(job_id)
    original = assert_job_owned_path(job_id, root / "original" / f"input{suffix}")
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
            id=job_id,
            status=JobStatus.UPLOADED,
            progress=5,
            stage="Upload verified",
            message="Exact uploaded file stored in an isolated job",
            original_filename=Path(file.filename or "video.mp4").name,
            original_path=str(original),
            mime_type=file.content_type or "application/octet-stream",
            size=size,
            metadata=metadata,
        )
        job_service.save(job)
    except HTTPException:
        shutil.rmtree(root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Invalid video: {exc}") from exc
    finally:
        await file.close()
    return {
        "success": True,
        "jobId": job.id,
        **_urls(job),
        "metadata": _metadata_payload(job),
    }


@router.post("/process")
def process_video(request: ProcessRequest):
    job = _job(request.jobId)
    if job.status not in {JobStatus.UPLOADED, JobStatus.FAILED}:
        raise HTTPException(status_code=409, detail=f"Job cannot start from status {job.status}")
    original = assert_job_owned_path(job.id, job.original_path)
    if not original.is_file():
        raise HTTPException(status_code=422, detail="The original file for this job is missing")
    job_service.update(
        job.id,
        status=JobStatus.QUEUED,
        progress=6,
        stage="Queued",
        message="Waiting for the video worker",
        error="",
    )
    submit_video_job(job.id, request.manualRegion)
    return {"success": True, "jobId": job.id, "status": "queued"}


@router.post("/process/{job_id}")
def process_video_path(job_id: str, request: ProcessRequest | None = None):
    payload = request or ProcessRequest(jobId=job_id)
    if payload.jobId != job_id:
        raise HTTPException(status_code=409, detail="Path and body jobId do not match")
    return process_video(payload)


@router.get("/status/{job_id}")
def video_status(job_id: str):
    job = _job(job_id)
    return {
        "jobId": job.id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "message": job.message,
        "error": job.error if job.status == JobStatus.FAILED else None,
    }


@router.get("/result/{job_id}")
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
        "jobId": job.id,
        "status": job.status,
        **_urls(job),
        "metadata": _metadata_payload(job),
        "resultVersion": result.stat().st_mtime_ns,
    }


@router.get("/original/{job_id}")
def original_video(job_id: str):
    job = _job(job_id)
    original = assert_job_owned_path(job.id, job.original_path)
    if not original.is_file():
        raise HTTPException(status_code=404, detail="Original video is missing")
    return FileResponse(
        original,
        media_type=job.mime_type,
        headers={"Cache-Control": "private, no-store, max-age=0", "X-Video-Job-Id": job.id},
    )


@router.get("/download/{job_id}")
def download_video(job_id: str):
    job = _job(job_id)
    if job.status != JobStatus.COMPLETED or not job.result_path:
        raise HTTPException(status_code=409, detail="Cleaned video is not ready")
    result = assert_job_owned_path(job.id, job.result_path)
    if not result.is_file():
        raise HTTPException(status_code=404, detail="Cleaned video could not be generated. Please retry.")
    return FileResponse(
        result,
        media_type="video/mp4",
        filename=safe_download_name(job.original_filename),
        headers={"Cache-Control": "private, no-store, max-age=0", "X-Video-Job-Id": job.id},
    )


@router.delete("/{job_id}")
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
    shutil.rmtree(root)
    return {"success": True, "jobId": job.id}
