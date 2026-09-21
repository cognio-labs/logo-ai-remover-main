from pydantic import BaseModel, Field, model_validator


class ManualRegion(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def fits_frame(self):
        if self.x + self.width > 1 or self.y + self.height > 1:
            raise ValueError("Region must fit inside the video frame")
        return self


class ProcessRequest(BaseModel):
    jobId: str
    manualRegion: ManualRegion | None = None
