import os
import tempfile
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent

# Ensure temporary files are stored on Drive D: with ample disk space
_STORAGE_TEMP = BACKEND_DIR / "storage" / "temp"
_STORAGE_TEMP.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(_STORAGE_TEMP)
os.environ["TEMP"] = str(_STORAGE_TEMP)
os.environ["TMP"] = str(_STORAGE_TEMP)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemma-4-26b-a4b-it:free"
    openrouter_fallback_model: str = "openrouter/free"
    openrouter_timeout_seconds: float = 45.0
    storage_root: Path = BACKEND_DIR / "storage" / "jobs"
    image_storage_root: Path = BACKEND_DIR / "storage" / "image_jobs"
    pdf_storage_root: Path = BACKEND_DIR / "storage" / "pdf_jobs"
    background_storage_root: Path = BACKEND_DIR / "storage" / "background_jobs"
    video_enhancer_storage_root: Path = BACKEND_DIR / "storage" / "video_enhancer_jobs"
    weights_root: Path = BACKEND_DIR / "models" / "weights"
    bg_model_name: str = "u2net.onnx"
    bg_fast_model_name: str = "silueta.onnx"
    bg_device: str = "auto"
    bg_max_upload_mb: int = 35
    bg_tile_size: int = 1024
    bg_tile_overlap: int = 128
    job_retention_hours: int = 24
    max_upload_mb: int = 500
    max_video_upload_mb: int = 500
    max_image_upload_mb: int = 35
    max_pdf_upload_mb: int = 50
    max_pdf_pages: int = 100
    max_safe_image_pixels: int = 100_000_000  # 100 Megapixels max safe output (covers 12000x8000 = 96M)
    max_safe_image_dimension: int = 16_000  # 16,000 px max dimension on any axis
    max_duration_seconds: float = 60.0
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:8080"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


settings = Settings()
settings.storage_root.mkdir(parents=True, exist_ok=True)
settings.image_storage_root.mkdir(parents=True, exist_ok=True)
settings.pdf_storage_root.mkdir(parents=True, exist_ok=True)
settings.background_storage_root.mkdir(parents=True, exist_ok=True)
settings.video_enhancer_storage_root.mkdir(parents=True, exist_ok=True)
settings.weights_root.mkdir(parents=True, exist_ok=True)

