import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from backend.models.image_job import ImageJobStatus
from backend.services.image_job_service import image_job_service
from backend.services.image_upscaler import process_upscale

logger = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="image-worker")


def _run_job(job_id: str) -> None:
    job = image_job_service.get(job_id)
    input_path = Path(job.original_path)
    ext = "jpg" if job.output_format.lower() in {"jpg", "jpeg"} else "png"
    output_path = input_path.parent.parent / "output" / f"upscaled.{ext}"

    def on_progress(progress: int, stage: str, message: str) -> None:
        status = ImageJobStatus.COMPLETED if progress >= 100 else ImageJobStatus.UPSCALING
        if progress < 20:
            status = ImageJobStatus.ANALYZING
        elif progress >= 80 and progress < 95:
            status = ImageJobStatus.ENCODING
        elif progress >= 95 and progress < 100:
            status = ImageJobStatus.VERIFYING
        image_job_service.update(
            job_id,
            status=status,
            progress=progress,
            stage=stage,
            message=message,
        )

    try:
        upscaled_meta = process_upscale(
            input_path=input_path,
            output_path=output_path,
            scale=job.scale,
            mode=job.mode,
            output_format=job.output_format,
            progress_callback=on_progress,
        )
        image_job_service.update(
            job_id,
            status=ImageJobStatus.COMPLETED,
            progress=100,
            stage="Complete",
            message=f"Upscaled to {upscaled_meta.width}×{upscaled_meta.height}",
            result_path=str(output_path),
            upscaled_metadata=upscaled_meta,
        )
        logger.info("Image job %s completed successfully (%sx)", job_id, job.scale)
    except Exception as exc:
        logger.exception("Image job %s failed: %s", job_id, exc)
        image_job_service.update(
            job_id,
            status=ImageJobStatus.FAILED,
            progress=0,
            stage="Failed",
            message="Processing failed",
            error=str(exc),
        )


def submit_image_job(job_id: str) -> None:
    _pool.submit(_run_job, job_id)
