import os
import json
import logging
from pathlib import Path
from backend.workers.celery_app import celery_app
from backend.engines.upscaler_engine import upscaler_engine
from backend.engines.birefnet_engine import birefnet_engine
from backend.engines.lama_cleaner_engine import lama_cleaner_engine
from backend.engines.pdf_cleaner_engine import pdf_cleaner_engine
from backend.storage.s3_storage import storage_service

logger = logging.getLogger(__name__)

# In-memory / file-based job status store
JOB_STATES = {}

def update_job_status(job_id: str, status: str, progress: int, stage: str, result_data: dict = None, error: str = None):
    JOB_STATES[job_id] = {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "stage": stage,
        "result": result_data,
        "error": error
    }

def get_job_status(job_id: str) -> dict:
    return JOB_STATES.get(job_id, {"job_id": job_id, "status": "queued", "progress": 0, "stage": "Waiting in queue"})

@celery_app.task(name="tasks.upscale_task", bind=True)
def upscale_task(self, job_id: str, input_path: str, output_path: str, scale: int, mode: str, output_format: str):
    logger.info(f"Starting upscale task: job_id={job_id}, scale={scale}, mode={mode}")
    update_job_status(job_id, "processing", 10, "Initializing upscaler...")

    def progress_callback(pct: int, msg: str):
        update_job_status(job_id, "processing", pct, msg)
        self.update_state(state="PROGRESS", meta={"progress": pct, "stage": msg})

    try:
        res = upscaler_engine.upscale_image(
            Path(input_path),
            Path(output_path),
            scale=scale,
            mode=mode,
            output_format=output_format,
            progress_cb=progress_callback
        )
        signed_url = storage_service.get_signed_url(str(output_path))
        res["download_url"] = signed_url
        update_job_status(job_id, "done", 100, "Upscaling completed", result_data=res)
        return res
    except Exception as exc:
        logger.error(f"Upscale task failed: {exc}", exc_info=True)
        update_job_status(job_id, "failed", 0, "Failed", error=str(exc))
        raise

@celery_app.task(name="tasks.remove_bg_task", bind=True)
def remove_bg_task(self, job_id: str, input_path: str, output_path: str, quality: str, bg_mode: str, bg_color: str, studio_preset: str):
    logger.info(f"Starting background removal task: job_id={job_id}, quality={quality}, bg_mode={bg_mode}")
    update_job_status(job_id, "processing", 10, "Initializing segmentation...")

    def progress_callback(pct: int, msg: str):
        update_job_status(job_id, "processing", pct, msg)
        self.update_state(state="PROGRESS", meta={"progress": pct, "stage": msg})

    try:
        res = birefnet_engine.remove_background(
            Path(input_path),
            Path(output_path),
            quality=quality,
            bg_mode=bg_mode,
            bg_color=bg_color,
            studio_preset=studio_preset,
            progress_cb=progress_callback
        )
        signed_url = storage_service.get_signed_url(str(output_path))
        res["download_url"] = signed_url
        update_job_status(job_id, "done", 100, "Background removed", result_data=res)
        return res
    except Exception as exc:
        logger.error(f"Background removal task failed: {exc}", exc_info=True)
        update_job_status(job_id, "failed", 0, "Failed", error=str(exc))
        raise

@celery_app.task(name="tasks.clean_image_task", bind=True)
def clean_image_task(self, job_id: str, image_path: str, mask_path: str, output_path: str, quality: str, output_format: str):
    logger.info(f"Starting image clean task: job_id={job_id}")
    update_job_status(job_id, "processing", 10, "Initializing inpainter...")

    def progress_callback(pct: int, msg: str):
        update_job_status(job_id, "processing", pct, msg)
        self.update_state(state="PROGRESS", meta={"progress": pct, "stage": msg})

    try:
        res = lama_cleaner_engine.clean_image(
            Path(image_path),
            Path(mask_path),
            Path(output_path),
            quality=quality,
            output_format=output_format,
            progress_cb=progress_callback
        )
        signed_url = storage_service.get_signed_url(str(output_path))
        res["download_url"] = signed_url
        update_job_status(job_id, "done", 100, "Image cleaned", result_data=res)
        return res
    except Exception as exc:
        logger.error(f"Image clean task failed: {exc}", exc_info=True)
        update_job_status(job_id, "failed", 0, "Failed", error=str(exc))
        raise

@celery_app.task(name="tasks.clean_pdf_task", bind=True)
def clean_pdf_task(self, job_id: str, input_path: str, output_path: str, mode: str, quality: str):
    logger.info(f"Starting PDF clean task: job_id={job_id}, mode={mode}")
    update_job_status(job_id, "processing", 10, "Analyzing PDF structure...")

    def progress_callback(pct: int, msg: str):
        update_job_status(job_id, "processing", pct, msg)
        self.update_state(state="PROGRESS", meta={"progress": pct, "stage": msg})

    try:
        if mode == "auto_inpaint":
            res = pdf_cleaner_engine.clean_auto_inpaint(
                Path(input_path),
                Path(output_path),
                dpi=300 if quality != "ultra_hd" else 400,
                progress_cb=progress_callback
            )
        else:
            res = pdf_cleaner_engine.clean_vector_lossless(
                Path(input_path),
                Path(output_path),
                progress_cb=progress_callback
            )
        signed_url = storage_service.get_signed_url(str(output_path))
        res["download_url"] = signed_url
        update_job_status(job_id, "done", 100, "PDF cleaned", result_data=res)
        return res
    except Exception as exc:
        logger.error(f"PDF clean task failed: {exc}", exc_info=True)
        update_job_status(job_id, "failed", 0, "Failed", error=str(exc))
        raise
