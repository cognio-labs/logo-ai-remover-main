import logging
import os
from typing import Any
import cv2
import httpx
import numpy as np

from backend.engines.base import BackgroundRemovalEngine
from backend.engines.local_birefnet import LocalBiRefNetEngine

logger = logging.getLogger(__name__)


class RemoveBgApiEngine(BackgroundRemovalEngine):
    """
    Cloud fallback engine using Remove.bg API when an external API key is provided.
    Falls back to LocalBiRefNetEngine if the API key is absent or unreachable.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY", "")
        self.fallback = LocalBiRefNetEngine()

    def remove_background(
        self,
        image_bgr: np.ndarray,
        quality_mode: str = "balanced",
    ) -> np.ndarray:
        if not self.api_key:
            return self.fallback.remove_background(image_bgr, quality_mode)

        try:
            success, enc = cv2.imencode(".png", image_bgr)
            if not success:
                return self.fallback.remove_background(image_bgr, quality_mode)

            headers = {"X-Api-Key": self.api_key}
            files = {"image_file": ("input.png", enc.tobytes(), "image/png")}
            data = {"size": "auto", "format": "png"}

            with httpx.Client(timeout=30.0) as client:
                res = client.post("https://api.remove.bg/v1.0/removebg", headers=headers, files=files, data=data)
                if res.status_code == 200:
                    nparr = np.frombuffer(res.content, np.uint8)
                    rgba = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
                    if rgba is not None and rgba.shape[2] == 4:
                        return rgba[:, :, 3]
                logger.warning("RemoveBg API returned status %d. Using local engine fallback.", res.status_code)
        except Exception as exc:
            logger.warning("RemoveBg API call failed: %s. Falling back to local engine.", exc)

        return self.fallback.remove_background(image_bgr, quality_mode)

    def get_model_info(self) -> dict[str, Any]:
        return {
            "name": "RemoveBgAPI",
            "type": "cloud_api_with_local_fallback",
            "has_api_key": bool(self.api_key),
            "fallback": self.fallback.get_model_info(),
        }
