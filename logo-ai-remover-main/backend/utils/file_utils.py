from pathlib import Path
from uuid import UUID

from fastapi import HTTPException

from backend.config import settings


ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mpg", ".mpeg", ".mkv"}
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}


def validate_job_id(job_id: str) -> str:
    try:
        return str(UUID(job_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid jobId") from exc


def job_dir(job_id: str) -> Path:
    safe_id = validate_job_id(job_id)
    root = settings.storage_root.resolve()
    candidate = (root / safe_id).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid job path")
    return candidate


def assert_job_owned_path(job_id: str, value: str | Path) -> Path:
    root = job_dir(job_id)
    candidate = Path(value).resolve()
    if root != candidate and root not in candidate.parents:
        raise RuntimeError("Job file ownership validation failed")
    return candidate


def safe_download_name(original_name: str) -> str:
    stem = Path(original_name).stem
    safe = "".join(character if character.isalnum() or character in "-_" else "-" for character in stem)
    return f"cleaned-{safe or 'video'}.mp4"


def image_job_dir(job_id: str) -> Path:
    safe_id = validate_job_id(job_id)
    root = settings.image_storage_root.resolve()
    candidate = (root / safe_id).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid image job path")
    return candidate


def assert_image_job_owned_path(job_id: str, value: str | Path) -> Path:
    root = image_job_dir(job_id)
    candidate = Path(value).resolve()
    if root != candidate and root not in candidate.parents:
        raise RuntimeError("Image job file ownership validation failed")
    return candidate


def safe_image_download_name(original_name: str, scale: int, ext: str) -> str:
    stem = Path(original_name).stem
    safe = "".join(character if character.isalnum() or character in "-_" else "-" for character in stem)
    clean_ext = ext.lstrip(".").lower()
    return f"{safe or 'image'}-upscaled-{scale}x.{clean_ext}"


ALLOWED_PDF_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}


def pdf_job_dir(job_id: str) -> Path:
    safe_id = validate_job_id(job_id)
    root = settings.pdf_storage_root.resolve()
    candidate = (root / safe_id).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid pdf job path")
    return candidate


def assert_pdf_job_owned_path(job_id: str, value: str | Path) -> Path:
    root = pdf_job_dir(job_id)
    candidate = Path(value).resolve()
    if root != candidate and root not in candidate.parents:
        raise RuntimeError("PDF job file ownership validation failed")
    return candidate


def safe_pdf_download_name(original_name: str, ext: str = "pdf") -> str:
    stem = Path(original_name).stem
    safe = "".join(character if character.isalnum() or character in "-_" else "-" for character in stem)
    clean_ext = ext.lstrip(".").lower()
    return f"cleaned-{safe or 'document'}.{clean_ext}"


def background_job_dir(job_id: str) -> Path:
    safe_id = validate_job_id(job_id)
    root = settings.background_storage_root.resolve()
    candidate = (root / safe_id).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid background job path")
    return candidate


def assert_background_job_owned_path(job_id: str, value: str | Path) -> Path:
    root = background_job_dir(job_id)
    candidate = Path(value).resolve()
    if root != candidate and root not in candidate.parents:
        raise RuntimeError("Background job file ownership validation failed")
    return candidate


def safe_bg_download_name(original_name: str, bg_type: str = "cutout", ext: str = "png") -> str:
    stem = Path(original_name).stem
    safe = "".join(character if character.isalnum() or character in "-_" else "-" for character in stem)
    clean_ext = ext.lstrip(".").lower()
    suffix = "cutout" if bg_type == "transparent" else bg_type
    return f"bellix-{safe or 'image'}-{suffix}.{clean_ext}"


def video_enhancer_job_dir(job_id: str) -> Path:
    safe_id = validate_job_id(job_id)
    root = settings.video_enhancer_storage_root.resolve()
    candidate = (root / safe_id).resolve()
    if root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid video job path")
    return candidate


def assert_video_enhancer_job_owned_path(job_id: str, value: str | Path) -> Path:
    root = video_enhancer_job_dir(job_id)
    candidate = Path(value).resolve()
    if root != candidate and root not in candidate.parents:
        raise RuntimeError("Video job file ownership validation failed")
    return candidate


def safe_enhanced_video_download_name(original_name: str, scale: int, ext: str = "mp4") -> str:
    stem = Path(original_name).stem
    safe = "".join(character if character.isalnum() or character in "-_" else "-" for character in stem)
    clean_ext = ext.lstrip(".").lower()
    return f"{safe or 'video'}-enhanced-{scale}x.{clean_ext}"

