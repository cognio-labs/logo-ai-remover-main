from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent


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
    job_retention_hours: int = 24
    max_upload_mb: int = 500
    max_duration_seconds: float = 60.0
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


settings = Settings()
settings.storage_root.mkdir(parents=True, exist_ok=True)
