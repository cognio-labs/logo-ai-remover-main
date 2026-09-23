from datetime import datetime, timezone
from enum import StrEnum
from pydantic import BaseModel, Field


class PdfJobStatus(StrEnum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    DETECTING = "detecting"
    RESTORING = "restoring"
    REBUILDING = "rebuilding"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


class DetectedRegion(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    width: float = Field(gt=0.0, le=1.0)
    height: float = Field(gt=0.0, le=1.0)
    type: str = Field(default="user_annotation")  # "blue_marker", "user_annotation", "watermark", "manual_selection"
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    page: int = Field(default=1, ge=1)


class PdfPageMetadata(BaseModel):
    page_number: int = Field(ge=1)
    width: float = Field(gt=0.0)
    height: float = Field(gt=0.0)
    has_text_layer: bool = Field(default=False)
    annot_count: int = Field(default=0, ge=0)
    has_blue_marker: bool = Field(default=False)


class PdfMetadata(BaseModel):
    page_count: int = Field(gt=0)
    file_size_bytes: int = Field(ge=0)
    is_pdf: bool = Field(default=True)
    format: str = Field(default="PDF")
    pages: list[PdfPageMetadata] = Field(default_factory=list)


class PdfProcessOptions(BaseModel):
    mode: str = Field(default="balanced")  # "fast" | "balanced" | "high_quality"
    remove_annotations: bool = Field(default=True)
    remove_blue_marker: bool = Field(default=True)
    target_pages: list[int] = Field(default_factory=list)  # Empty means all pages
    manual_regions: list[DetectedRegion] = Field(default_factory=list)


class PdfJobRecord(BaseModel):
    id: str
    status: PdfJobStatus = PdfJobStatus.QUEUED
    progress: int = Field(default=0, ge=0, le=100)
    stage: str = "Queued"
    message: str = "Waiting in processing queue"
    original_filename: str
    original_path: str
    result_path: str | None = None
    is_pdf: bool = True
    page_count: int = Field(default=1, ge=1)
    options: PdfProcessOptions = Field(default_factory=PdfProcessOptions)
    detected_regions: list[DetectedRegion] = Field(default_factory=list)
    metadata: PdfMetadata | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None
    error: str = ""
