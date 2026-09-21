from pathlib import Path

from backend.models.job import VideoMetadata
from backend.services.ffmpeg_service import probe


def verify_output(original: VideoMetadata, output_path: Path) -> VideoMetadata:
    if not output_path.is_file() or output_path.stat().st_size <= 0:
        raise RuntimeError("Cleaned output file is missing or empty")
    cleaned = probe(output_path)
    if (cleaned.width, cleaned.height) != (original.width, original.height):
        raise RuntimeError("Output resolution does not match the uploaded video")
    if abs(cleaned.fps - original.fps) > 0.05:
        raise RuntimeError("Output FPS does not match the uploaded video")
    tolerance = max(0.15, 1.5 / max(original.fps, 1))
    if abs(cleaned.duration - original.duration) > tolerance:
        raise RuntimeError("Output duration does not match the uploaded video")
    if cleaned.audio_present != original.audio_present:
        raise RuntimeError("Output audio presence does not match the uploaded video")
    return cleaned
