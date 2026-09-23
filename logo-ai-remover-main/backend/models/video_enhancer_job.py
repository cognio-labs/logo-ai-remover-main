from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field


class VideoEnhancerJobStatus(str, Enum):
    QUEUED = "QUEUED"
    VALIDATING = "VALIDATING"
    PROBING = "PROBING"
    EXTRACTING = "EXTRACTING"
    ENHANCING = "ENHANCING"
    UPSCALING = "UPSCALING"
    INTERPOLATING = "INTERPOLATING"
    ENCODING = "ENCODING"
    VALIDATING_OUTPUT = "VALIDATING_OUTPUT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class VideoStreamMetadata(BaseModel):
    width: int
    height: int
    fps: float
    duration: float
    frame_count: int
    pixel_format: str | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    audio_present: bool = False
    sample_rate: int | None = None
    channels: int | None = None
    file_size_bytes: int = 0
    bitrate: int | None = None


class ProcessOptions(BaseModel):
    scale: int = Field(default=2, ge=1, le=4)
    target_resolution: str = Field(default="4k")  # 'original', '720p', '1080p', '1440p', '4k'
    enhancement: str = Field(default="balanced")  # 'fast', 'balanced', 'high'
    denoise: str = Field(default="medium")  # 'off', 'low', 'medium', 'high'
    deblock: bool = Field(default=True)
    sharpen: str = Field(default="medium")  # 'off', 'low', 'medium', 'high'
    interpolation: bool = Field(default=False)
    target_fps: float | None = Field(default=None)  # e.g., 30.0, 60.0, 120.0
    output_format: str = Field(default="mp4")  # 'mp4', 'mov', 'webm'
    codec: str = Field(default="h264")  # 'h264', 'h265', 'vp9'
    quality: str = Field(default="high")  # 'balanced', 'high', 'maximum'
    preserve_audio: bool = Field(default=True)


class ProcessRequestPayload(BaseModel):
    job_id: str
    scale: int = 2
    target_resolution: str = "4k"
    enhancement: str = "balanced"
    denoise: str = "medium"
    deblock: bool = True
    sharpen: str = "medium"
    interpolation: bool = False
    target_fps: float | None = None
    output_format: str = "mp4"
    codec: str = "h264"
    quality: str = "high"
    preserve_audio: bool = True


class VideoEnhancerJobRecord(BaseModel):
    id: str
    status: VideoEnhancerJobStatus = VideoEnhancerJobStatus.QUEUED
    stage: str = "Queued"
    message: str = "Waiting for processor worker"
    progress: float = 0.0
    current_frame: int = 0
    total_frames: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    original_filename: str
    original_path: str
    original_mime: str
    original_size_bytes: int
    input_metadata: VideoStreamMetadata | None = None
    target_metadata: dict[str, Any] | None = None
    options: ProcessOptions = Field(default_factory=ProcessOptions)
    result_path: str | None = None
    preview_path: str | None = None
    output_metadata: VideoStreamMetadata | None = None
    error: str | None = None
    cancelled: bool = False
