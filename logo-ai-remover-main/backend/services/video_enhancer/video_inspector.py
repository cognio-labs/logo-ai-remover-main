import json
import logging
import subprocess
from fractions import Fraction
from pathlib import Path

from backend.models.video_enhancer_job import VideoStreamMetadata

logger = logging.getLogger(__name__)

# Valid video file signatures (magic bytes)
VIDEO_SIGNATURES = {
    b"ftyp": "mp4/mov",
    b"\x1a\x45\xdf\xa3": "webm/mkv",
    b"RIFF": "avi",
}


class VideoInspectionError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _parse_fraction(value: str | None) -> float:
    if not value or value == "0/0":
        return 0.0
    try:
        return float(Fraction(value))
    except Exception:
        return 0.0


def validate_file_signature(path: Path) -> str:
    """Verifies file header bytes to prevent disguised files."""
    if not path.is_file():
        raise VideoInspectionError("FILE_NOT_FOUND", "Video file not found on disk")

    if path.stat().st_size < 12:
        raise VideoInspectionError("CORRUPTED_FILE", "Video file is too small or empty")

    with path.open("rb") as f:
        header = f.read(32)

    # Check for MP4/MOV ftyp box
    if b"ftyp" in header[:16]:
        return "mp4"

    # Check for WebM / Matroska EBML
    if header.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm"

    # Check for AVI RIFF
    if header.startswith(b"RIFF") and b"AVI " in header[8:16]:
        return "avi"

    # QuickTime moov/mdat
    if b"moov" in header[:16] or b"mdat" in header[:16]:
        return "mov"

    logger.warning("Unrecognized magic signature for %s, will verify with FFprobe", path.name)
    return "unknown"


def inspect_video(path: Path, max_duration: float = 600.0) -> VideoStreamMetadata:
    """
    Executes deep FFprobe inspection of container, video streams, audio streams,
    codecs, timestamps, and actual duration.
    """
    if not path.is_file():
        raise VideoInspectionError("FILE_NOT_FOUND", "Video file not found on disk")

    file_size = path.stat().st_size
    if file_size == 0:
        raise VideoInspectionError("EMPTY_FILE", "Uploaded video file is 0 bytes")

    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        str(path),
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError as exc:
        raise VideoInspectionError("FFPROBE_UNAVAILABLE", "FFprobe executable not found on system PATH") from exc

    if result.returncode != 0:
        err = result.stderr.strip() or "Unknown error reading media"
        raise VideoInspectionError("CORRUPTED_VIDEO", f"Cannot decode video stream: {err}")

    try:
        data = json.loads(result.stdout)
    except Exception as exc:
        raise VideoInspectionError("PROBE_PARSE_ERROR", f"Failed to parse FFprobe output: {exc}") from exc

    streams = data.get("streams", [])
    format_info = data.get("format", {})

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not video_stream:
        raise VideoInspectionError("NO_VIDEO_STREAM", "File does not contain a playable video stream")

    width = int(video_stream.get("width") or 0)
    height = int(video_stream.get("height") or 0)
    if width <= 0 or height <= 0:
        raise VideoInspectionError("INVALID_DIMENSIONS", f"Invalid video dimensions: {width}x{height}")

    fps = _parse_fraction(video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate"))
    if fps <= 0.0 or fps > 240.0:
        fps = 30.0

    duration = float(video_stream.get("duration") or format_info.get("duration") or 0.0)
    if duration <= 0.0:
        raise VideoInspectionError("INVALID_DURATION", "Video reports zero or invalid duration")

    if duration > max_duration:
        raise VideoInspectionError(
            "VIDEO_TOO_LONG",
            f"Video duration ({duration:.1f}s) exceeds maximum allowed ({max_duration:.1f}s)",
        )

    # Frame count
    frame_count = int(video_stream.get("nb_frames") or round(duration * fps))
    if frame_count <= 0:
        frame_count = max(1, round(duration * fps))

    # Audio stream
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    has_audio = audio_stream is not None

    sample_rate = int(audio_stream["sample_rate"]) if has_audio and audio_stream.get("sample_rate") else None
    channels = int(audio_stream["channels"]) if has_audio and audio_stream.get("channels") else None
    audio_codec = audio_stream.get("codec_name") if has_audio else None

    bitrate = int(format_info.get("bit_rate") or video_stream.get("bit_rate") or 0) or None

    return VideoStreamMetadata(
        width=width,
        height=height,
        fps=round(fps, 3),
        duration=round(duration, 3),
        frame_count=frame_count,
        pixel_format=video_stream.get("pix_fmt"),
        video_codec=video_stream.get("codec_name"),
        audio_codec=audio_codec,
        audio_present=has_audio,
        sample_rate=sample_rate,
        channels=channels,
        file_size_bytes=file_size,
        bitrate=bitrate,
    )


class VideoInspector:
    probe_video = staticmethod(inspect_video)
    validate_video_file = staticmethod(validate_file_signature)


video_inspector = VideoInspector()
VideoInspectorError = VideoInspectionError
