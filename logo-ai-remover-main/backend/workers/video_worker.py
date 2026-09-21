import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from backend.models.job import JobStatus
from backend.schemas.video import ManualRegion
from backend.services.ffmpeg_service import encode_and_mux
from backend.services.frame_processor import process_frames
from backend.services.job_service import job_service
from backend.services.quality_verifier import verify_output
from backend.services.watermark_detector import detect
from backend.utils.file_utils import assert_job_owned_path, job_dir
from backend.utils.logging_utils import log_job


logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="video-job")


def _progress(job_id: str, value: int, stage: str, message: str = "") -> None:
    job_service.update(
        job_id,
        status=JobStatus.PROCESSING,
        progress=value,
        stage=stage,
        message=message or stage,
    )


def process_video_job(job_id: str, manual_region: ManualRegion | None = None) -> None:
    job = job_service.get(job_id)
    original = assert_job_owned_path(job_id, job.original_path)
    root = job_dir(job_id)
    result = assert_job_owned_path(job_id, root / "output" / "cleaned.mp4")
    intermediate = assert_job_owned_path(job_id, root / "temp" / "cleaned-video-track.mp4")
    tracking = assert_job_owned_path(job_id, root / "masks" / "tracking.json")
    try:
        if not original.is_file():
            raise RuntimeError("The original file for this job is missing")
        job_service.update(
            job_id,
            status=JobStatus.ANALYZING,
            progress=8,
            stage="Upload verified",
            message="Exact uploaded file verified",
        )
        job_service.update(
            job_id,
            status=JobStatus.DETECTING,
            progress=15,
            stage="Detecting AI watermark",
            message="Analyzing representative frames",
        )
        detection = detect(job_id, original, manual_region)
        region = max(detection["regions"], key=lambda item: item.get("confidence", 0))
        job_service.update(
            job_id,
            status=JobStatus.TRACKING,
            progress=32,
            stage="Tracking watermark",
            message="Creating frame-specific masks",
        )
        metadata = job.metadata
        if metadata is None:
            raise RuntimeError("The job has no video metadata")
        process_frames(
            original,
            intermediate,
            tracking,
            region,
            metadata.fps,
            metadata.frame_count,
            lambda value, stage: _progress(job_id, value, stage, "Maintaining temporal consistency"),
        )
        job_service.update(
            job_id,
            status=JobStatus.ENCODING,
            progress=80,
            stage="Rebuilding MP4",
            message="Restoring original audio",
        )
        encode_and_mux(intermediate, original, result, metadata.audio_present)
        job_service.update(
            job_id,
            status=JobStatus.VERIFYING,
            progress=94,
            stage="Quality verification",
            message="Verifying duration, dimensions, FPS, and audio",
        )
        verify_output(metadata, result)
        completed = job_service.update(
            job_id,
            status=JobStatus.COMPLETED,
            progress=100,
            stage="Complete",
            message="Clean MP4 is ready",
            result_path=str(result),
            completed_at=datetime.now(timezone.utc),
        )
        log_job(logger, job_id, str(original), str(result), completed.status, completed.progress)
    except Exception as exc:
        logger.exception("Video job %s failed", job_id)
        failed = job_service.update(
            job_id,
            status=JobStatus.FAILED,
            progress=0,
            stage="Failed",
            message="Video processing failed. Please try again.",
            error=str(exc),
        )
        log_job(logger, job_id, str(original), str(result), failed.status, failed.progress)
    finally:
        intermediate.unlink(missing_ok=True)


def submit_video_job(job_id: str, manual_region: ManualRegion | None = None):
    return executor.submit(process_video_job, job_id, manual_region)
