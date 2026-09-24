import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from backend.models.job import JobStatus
from backend.schemas.video import ManualRegion
from backend.services.ffmpeg_service import encode_preview, encode_resolutions
from backend.services.frame_processor import process_frames
from backend.services.job_service import job_service
from backend.services.quality_verifier import verify_output
from backend.services.watermark_detector import detect
from backend.utils.file_utils import assert_job_owned_path, job_dir
from backend.utils.logging_utils import log_job


logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="video-job")


def _progress(
    job_id: str,
    processed_frames: int,
    total_frames: int,
    progress_val: int,
    stage: str,
    message: str = "",
) -> None:
    job_service.update(
        job_id,
        status=JobStatus.PROCESSING,
        progress=progress_val,
        processed_frames=processed_frames,
        total_frames=total_frames,
        stage=stage,
        message=message or stage,
    )


def process_video_job(job_id: str, manual_region: ManualRegion | None = None) -> None:
    if job_service.is_cancelled(job_id):
        return

    job = job_service.get(job_id)
    original = assert_job_owned_path(job_id, job.original_path)
    root = job_dir(job_id)
    result = assert_job_owned_path(job_id, root / "output" / "cleaned.mp4")
    preview_output = assert_job_owned_path(job_id, root / "output" / "preview.mp4")
    intermediate = assert_job_owned_path(job_id, root / "temp" / "cleaned-video-track.mp4")
    tracking = assert_job_owned_path(job_id, root / "masks" / "tracking.json")

    try:
        if not original.is_file():
            raise RuntimeError("The original video file for this job is missing")

        # STAGE 1: Video Analysis
        job_service.update(
            job_id,
            status=JobStatus.ANALYZING,
            progress=5,
            stage="Analyzing video",
            message="Extracting container metadata and frame timings",
        )

        metadata = job.metadata
        if metadata is None:
            raise RuntimeError("The job has no video metadata")

        total_frames = metadata.frame_count or 1

        if job_service.is_cancelled(job_id):
            return

        # STAGE 2: Detection
        job_service.update(
            job_id,
            status=JobStatus.DETECTING,
            progress=15,
            stage="Detecting watermark",
            message="Sampling frames and tracking temporal persistence",
        )

        detection = detect(job_id, original, manual_region)
        region = max(detection["regions"], key=lambda item: item.get("confidence", 0))

        if job_service.is_cancelled(job_id):
            return

        # STAGE 3: Tracking & Mask Preparation
        job_service.update(
            job_id,
            status=JobStatus.TRACKING,
            progress=22,
            stage="Building mask",
            message=f"Creating contoured mask for {region.get('type', 'watermark')}",
        )

        # Callback to encode early preview
        def on_early_preview(raw_preview_track: Path):
            if job_service.is_cancelled(job_id):
                return
            try:
                encode_preview(raw_preview_track, original, preview_output, metadata.audio_present)
                if preview_output.is_file():
                    job_service.update(
                        job_id,
                        preview_path=str(preview_output),
                        preview_ready=True,
                        message="Cleaned preview ready",
                    )
                    logger.info("Early preview generated for job %s", job_id)
            except Exception as err:
                logger.warning("Could not encode early preview: %s", err)
            finally:
                raw_preview_track.unlink(missing_ok=True)

        # STAGE 4: Reconstructing Frames
        process_frames(
            original,
            intermediate,
            tracking,
            region,
            metadata.fps,
            total_frames,
            progress_callback=lambda proc, tot, pct, stg, msg: _progress(job_id, proc, tot, pct, stg, msg),
            preview_output_path=preview_output,
            preview_callback=on_early_preview,
            is_cancelled=lambda: job_service.is_cancelled(job_id),
        )

        if job_service.is_cancelled(job_id):
            return

        # STAGE 5: Multi-Resolution Encoding (720p, 1080p, 4K) & Audio Preservation
        job_service.update(
            job_id,
            status=JobStatus.ENCODING,
            progress=80,
            stage="Encoding outputs",
            message="Generating 720p, 1080p & 4K master outputs with synced audio",
        )

        outputs = encode_resolutions(
            intermediate,
            original,
            root / "output",
            metadata.audio_present,
            metadata.width,
            metadata.height,
        )

        base_cleaned = Path(outputs.get("original", str(result)))

        # STAGE 6: Verification
        job_service.update(
            job_id,
            status=JobStatus.VERIFYING,
            progress=95,
            stage="Verifying output",
            message="Validating frame count, color consistency, and audio synchronization",
        )
        verify_output(metadata, base_cleaned)

        # STAGE 7: Complete
        completed = job_service.update(
            job_id,
            status=JobStatus.COMPLETED,
            progress=100,
            processed_frames=total_frames,
            total_frames=total_frames,
            stage="Complete",
            message="Watermark successfully removed. Video is ready for download.",
            result_path=str(base_cleaned),
            outputs=outputs,
            completed_at=datetime.now(timezone.utc),
        )
        log_job(logger, job_id, str(original), str(base_cleaned), completed.status, completed.progress)

    except Exception as exc:
        if job_service.is_cancelled(job_id):
            logger.info("Video job %s cancelled", job_id)
            return

        logger.exception("Video job %s failed: %s", job_id, exc)
        failed = job_service.update(
            job_id,
            status=JobStatus.FAILED,
            progress=0,
            stage="Failed",
            message=f"Processing could not be completed. Your original video has not been modified.",
            error=str(exc),
        )
        log_job(logger, job_id, str(original), str(result), failed.status, failed.progress)
    finally:
        intermediate.unlink(missing_ok=True)
        raw_preview = root / "temp" / "preview_raw.mp4"
        raw_preview.unlink(missing_ok=True)


def submit_video_job(job_id: str, manual_region: ManualRegion | None = None):
    return executor.submit(process_video_job, job_id, manual_region)


def cancel_video_job(job_id: str):
    job_service.cancel(job_id)
    root = job_dir(job_id)
    intermediate = root / "temp" / "cleaned-video-track.mp4"
    intermediate.unlink(missing_ok=True)
