import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class FrameDecodeError(RuntimeError):
    pass


def extract_frames(video_path: Path, output_dir: Path, target_fps: float | None = None) -> list[Path]:
    """
    Extracts all video frames with high throughput as pristine quality JPEG files (q:v 2) into output_dir.
    Drastically faster than PNG while maintaining 100% full-frame visual clarity.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    pattern = output_dir / "frame_%06d.jpg"

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

    frames = sorted(output_dir.glob("frame_*.jpg"))
    if not frames:
        # Fallback check for any frame extension
        frames = sorted(output_dir.glob("frame_*.*"))

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
        str(at_seconds),
        "-i",
        str(video_path),
        "-vframes",
        "1",
        "-q:v",
        "2",
        str(thumbnail_path),
    ]

    res = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if res.returncode == 0 and thumbnail_path.exists() and thumbnail_path.stat().st_size > 0:
        return True

    # Fallback to frame 0
    cmd_fallback = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-i",
        str(video_path),
        "-vframes",
        "1",
        "-q:v",
        "2",
        str(thumbnail_path),
    ]
    res2 = subprocess.run(cmd_fallback, capture_output=True, text=True, check=False)
    return res2.returncode == 0 and thumbnail_path.exists()


class FrameDecoder:
    extract_frames = staticmethod(extract_frames)
    generate_thumbnail = staticmethod(generate_thumbnail)


frame_decoder = FrameDecoder()
