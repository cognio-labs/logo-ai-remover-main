from abc import ABC, abstractmethod
from typing import Any
import numpy as np


class BackgroundRemovalEngine(ABC):
    """
    Abstract base class for all background removal / image matting engines.
    Allows seamlessly swapping local AI models (U2Net, BiRefNet, RMBG)
    or cloud APIs (RemoveBg) without changing application or pipeline code.
    """

    @abstractmethod
    def remove_background(
        self,
        image_bgr: np.ndarray,
        quality_mode: str = "balanced",
    ) -> np.ndarray:
        """
        Process an input BGR image (H, W, 3) and return a high-precision
        1-channel alpha matte (H, W) with values in range [0, 255].
        """
        pass

    @abstractmethod
    def get_model_info(self) -> dict[str, Any]:
        """Return information about the current model, version, and execution provider."""
        pass
