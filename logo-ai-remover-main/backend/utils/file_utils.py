from pathlib import Path
from uuid import UUID

from fastapi import HTTPException

from backend.config import settings


ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mpg", ".mpeg", ".mkv"}


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
