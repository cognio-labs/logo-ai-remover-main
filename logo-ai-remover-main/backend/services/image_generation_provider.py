from abc import ABC, abstractmethod
import urllib.parse
from pathlib import Path
from typing import Optional
import httpx


class ImageGenerationProvider(ABC):
    """
    Abstract interface for AI image generation providers.
    Server-side only to ensure secure API key handling.
    """

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        output_path: Path,
        width: int = 1280,
        height: int = 720,
        seed: Optional[int] = None,
    ) -> Path:
        """Generate an image from prompt and save to disk."""
        pass


class NeuralStudioImageProvider(ImageGenerationProvider):
    """
    Production-grade neural image generation provider.
    Generates high-resolution photographic and cinematic assets.
    """

    def __init__(self, base_url: str = "https://image.pollinations.ai/prompt/"):
        self.base_url = base_url

    async def generate_image(
        self,
        prompt: str,
        output_path: Path,
        width: int = 1280,
        height: int = 720,
        seed: Optional[int] = None,
    ) -> Path:
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"{self.base_url}{encoded_prompt}?width={width}&height={height}&nologo=true&model=flux"
        if seed is not None:
            url += f"&seed={seed}"

        output_path.parent.mkdir(parents=True, exist_ok=True)

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            if len(response.content) < 1000:
                raise ValueError("Image generation response was too small or invalid")

            output_path.write_bytes(response.content)

        return output_path
