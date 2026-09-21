from pathlib import Path

from backend.models.job import VideoMetadata
from backend.services.ffmpeg_service import probe


def analyze_video(path: Path, maximum_duration: float) -> VideoMetadata:
    metadata = probe(path)
    if metadata.width < 2 or metadata.height < 2 or metadata.fps <= 0:
        raise RuntimeError("The uploaded video has invalid media metadata")
    if metadata.duration <= 0 or metadata.duration > maximum_duration:
        raise RuntimeError(f"Video duration must be between 0 and {maximum_duration:g} seconds")
    return metadata
