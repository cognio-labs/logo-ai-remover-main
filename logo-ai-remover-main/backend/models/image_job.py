from datetime import datetime, timezone
from enum import StrEnum
from pydantic import BaseModel, Field


class ImageJobStatus(StrEnum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    UPSCALING = "upscaling"
    ENHANCING = "enhancing"
    ENCODING = "encoding"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageMetadata(BaseModel):
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    channels: int = Field(default=3)
    format: str
    size_bytes: int = Field(ge=0)


class ImageJobRecord(BaseModel):
    id: str
    status: ImageJobStatus = ImageJobStatus.QUEUED
    progress: int = Field(default=0, ge=0, le=100)
    stage: str = "Queued"
    message: str = "Waiting in processing queue"
    original_filename: str
    original_path: str
    result_path: str | None = None
    scale: int = Field(default=4)
    mode: str = Field(default="natural")
    output_format: str = Field(default="png")
    original_metadata: ImageMetadata | None = None
    upscaled_metadata: ImageMetadata | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None
    error: str = ""
