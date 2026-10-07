from typing import Literal
from pydantic import BaseModel, Field, model_validator


class UpscaleOptions(BaseModel):
    scale: Literal[2, 4, 8] = 4
    mode: Literal["natural", "portrait", "art", "product"] = "natural"
    format: Literal["png", "jpg"] = "png"
    grain: bool = False
    denoise: bool = False


class BackgroundOptions(BaseModel):
    bg_mode: Literal["transparent", "solid", "studio"] = "transparent"
    bg_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9a-fA-F]{6}$")
    studio_preset: Literal["soft-gradient", "gray-studio", "warm-wall"] = "soft-gradient"
    quality: Literal["fast", "balanced", "ultra_hd"] = "balanced"
    format: Literal["png", "jpg"] = "png"
    center_pad: bool = False
    shadow: bool = True

    @model_validator(mode="after")
    def transparency_requires_png(self):
        if self.bg_mode == "transparent":
            self.format = "png"
        return self
