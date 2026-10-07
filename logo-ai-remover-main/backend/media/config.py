from pathlib import Path
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MEDIA_", env_file="backend/media/.env", extra="ignore")
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint: str | None = None
    s3_region: str = "auto"
    s3_bucket: str = "bellix-private"
    s3_access_key: SecretStr = SecretStr("")
    s3_secret_key: SecretStr = SecretStr("")
    s3_encryption: str = ""  # AES256 / aws:kms on S3; R2 encrypts at rest by default.
    s3_kms_key: str = ""
    signing_secret: SecretStr = SecretStr("")
    premium_api_keys: SecretStr = SecretStr("")  # comma-separated server-issued keys
    allowed_origins: str = "https://www.bellix.us,https://bellix.us"
    development: bool = False
    retention_seconds: int = Field(default=3600, ge=60, le=3600)
    signed_url_seconds: int = Field(default=120, ge=10, le=300)
    max_upload_mb: int = Field(default=35, ge=1, le=35)
    max_input_pixels: int = Field(default=25_000_000, ge=1, le=64_000_000)
    max_output_pixels: int = Field(default=64_000_000, ge=1, le=64_000_000)
    max_output_dimension: int = Field(default=8192, ge=1, le=16384)
    queue_limit: int = Field(default=64, ge=1)
    upscale_free_per_hour: int = 5
    background_free_per_hour: int = 10
    premium_per_hour: int = 100
    task_timeout: int = Field(default=120, ge=30, le=600)
    max_attempts: int = Field(default=3, ge=1, le=5)
    device: str = "cuda"
    tile_size: int = Field(default=512, ge=64, le=512)
    tile_overlap: int = Field(default=32, ge=8, le=64)
    tile_pad: int = Field(default=32, ge=10, le=64)
    models_dir: Path = Path("backend/media/models")
    scratch_dir: Path = Path("backend/media/scratch")
    samples_dir: Path = Path("public/upscale")
    sentry_dsn: SecretStr = SecretStr("")

    @model_validator(mode="after")
    def production_secrets(self):
        if not self.development:
            if len(self.signing_secret.get_secret_value()) < 32:
                raise ValueError("MEDIA_SIGNING_SECRET must contain at least 32 random characters")
            if self.s3_endpoint and not self.s3_endpoint.startswith("https://"):
                raise ValueError("Production S3 endpoint must use HTTPS")
            if any(not origin.startswith("https://") for origin in self.allowed_origins.split(",")):
                raise ValueError("Production frontend origins must use HTTPS")
        return self


from functools import lru_cache

@lru_cache
def get_settings():
    return Settings()
