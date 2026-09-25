"""
PDF Worker — thin task launcher.

All processing logic lives in backend/services/pdf/pipeline.py.
This module only dispatches the job to the pipeline and handles top-level errors.
"""
import logging

from backend.services.pdf.pipeline import run_pdf_pipeline

logger = logging.getLogger(__name__)


def process_pdf_job(job_id: str) -> None:
    """Execute the end-to-end PDF/document watermark removal worker for a job."""
    logger.info("[PDF Worker] dispatching job %s to pipeline", job_id)
    try:
        run_pdf_pipeline(job_id)
    except Exception as exc:
        logger.exception("[PDF Worker] unhandled exception for job %s: %s", job_id, exc)
