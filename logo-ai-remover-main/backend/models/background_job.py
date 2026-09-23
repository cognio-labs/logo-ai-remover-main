from datetime import datetime, timezone
from enum import StrEnum
from typing import List, Tuple, Optional, Dict, Any
from pydantic import BaseModel, Field


class BackgroundJobStatus(StrEnum):
    CREATED = "created"
    VALIDATING = "validating"
    PREPARING = "preparing"
    SEGMENTING = "segmenting"
    REFINING = "refining"
    COMPOSITING = "compositing"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


class QualityMode(StrEnum):
    STANDARD = "standard"  # High quality, balanced speed (U2Net/BiRefNet)
    FAST = "fast"          # Ultra low latency (Silueta/RMBG)
    ULTRA_HD = "ultra_hd"  # Multi-scale tiled inference for 4K/8K images


class BackgroundType(StrEnum):
    TRANSPARENT = "transparent"
    COLOR = "color"
    IMAGE = "image"
    BACKDROP = "backdrop"


class ExportFormat(StrEnum):
    PNG = "png"
    JPG = "jpg"
    WEBP = "webp"


class ManualStroke(BaseModel):
    mode: str = Field(description="'keep' to retain foreground, 'remove' to erase to background")
    points: List[Tuple[float, float]] = Field(description="Normalized [[x, y], ...] points in range [0, 1]")
    brush_size: float = Field(default=20.0, ge=1.0, le=200.0)


class ShadowConfig(BaseModel):
    enabled: bool = False
    offset_x: int = 0
    offset_y: int = 15
    blur: int = 25
    opacity: float = Field(default=0.35, ge=0.0, le=1.0)


class BackgroundConfig(BaseModel):
    bg_type: BackgroundType = BackgroundType.TRANSPARENT
    bg_color: str = "#FFFFFF"
    backdrop_id: str = "luxury-studio"
    export_format: ExportFormat = ExportFormat.PNG
    quality_mode: QualityMode = QualityMode.STANDARD
    edge_refinement: bool = True
    color_decontamination: bool = True
    shadow: ShadowConfig = Field(default_factory=ShadowConfig)


class BackgroundImageMetadata(BaseModel):
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    channels: int = Field(default=3)
    format: str
    size_bytes: int = Field(ge=0)


class BackgroundJobRecord(BaseModel):
    id: str
    status: BackgroundJobStatus = BackgroundJobStatus.CREATED
    progress: int = Field(default=0, ge=0, le=100)
    stage: str = "Created"
    message: str = "Initialized job"
    original_filename: str
    original_path: str
    mask_path: Optional[str] = None
    result_path: Optional[str] = None
    preview_path: Optional[str] = None
    config: BackgroundConfig = Field(default_factory=BackgroundConfig)
    original_metadata: Optional[BackgroundImageMetadata] = None
    result_metadata: Optional[BackgroundImageMetadata] = None
    processing_time_ms: int = 0
    engine_used: str = "local_onnx"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    error: str = ""


class RefineMaskRequest(BaseModel):
    job_id: str
    strokes: List[ManualStroke] = Field(default_factory=list)
    edge_refine: bool = True


class CompositeRequest(BaseModel):
    job_id: str
    config: BackgroundConfig
