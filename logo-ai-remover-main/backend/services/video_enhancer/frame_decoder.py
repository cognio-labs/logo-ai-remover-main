import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class FrameDecodeError(RuntimeError):
    pass


def extract_frames(video_path: Path, output_dir: Path, target_fps: float | None = None) -> list[Path]:
    """
    Extracts all video frames as PNG files into output_dir.
    If target_fps is provided, FFmpeg resamples frame rate during extraction.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    pattern = output_dir / "frame_%06d.png"

    cmd = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-i",
        str(video_path),
    ]

    if target_fps and target_fps > 0:
        cmd += ["-vf", f"fps={target_fps}"]

    cmd += [
        "-vsync",
        "0",
        "-q:v",
        "2",
        str(pattern),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        err = result.stderr.strip() or "FFmpeg frame extraction failed"
        raise FrameDecodeError(f"Could not extract video frames: {err}")

    frames = sorted(output_dir.glob("frame_*.png"))
    if not frames:
        raise FrameDecodeError(f"Zero frames extracted from video {video_path.name}")

    logger.info("Extracted %d frames from %s into %s", len(frames), video_path.name, output_dir)
    return frames


def generate_thumbnail(video_path: Path, thumbnail_path: Path, at_seconds: float = 1.0) -> bool:
    """Extracts a representative thumbnail from the video."""
    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-ss",
        str(max(0.1, at_seconds)),
        "-i",
        str(video_path),
        "-vframes",
        "1",
        "-vf",
        "scale=640:-1",
        "-q:v",
        "2",
        str(thumbnail_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return result.returncode == 0 and thumbnail_path.is_file()


class FrameDecoder:
    extract_frames = staticmethod(extract_frames)
    generate_thumbnail = staticmethod(generate_thumbnail)


frame_decoder = FrameDecoder()
