from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class JobStatus(StrEnum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    QUEUED = "queued"
    ANALYZING = "analyzing"
    DETECTING = "detecting"
    TRACKING = "tracking"
    PROCESSING = "processing"
    ENCODING = "encoding"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


class VideoMetadata(BaseModel):
    width: int
    height: int
    fps: float
    duration: float
    frame_count: int = 0
    pixel_format: str | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    audio_present: bool = False
    sample_rate: int | None = None
    channels: int | None = None


class JobRecord(BaseModel):
    id: str
    status: JobStatus = JobStatus.UPLOADING
    progress: int = 0
    stage: str = "Upload verification"
    message: str = ""
    original_filename: str
    original_path: str
    mime_type: str
    size: int
    metadata: VideoMetadata | None = None
    result_path: str | None = None
    detection_path: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None
    error: str | None = None
