import json
import logging
import subprocess
from fractions import Fraction
from pathlib import Path

from backend.models.job import VideoMetadata


logger = logging.getLogger(__name__)


class MediaCommandError(RuntimeError):
    pass


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise MediaCommandError(result.stderr.strip() or "Media command failed")
    return result


def _fraction(value: str | None) -> float:
    if not value or value == "0/0":
        return 0.0
    return float(Fraction(value))


def probe(path: Path) -> VideoMetadata:
    result = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ]
    )
    payload = json.loads(result.stdout)
    streams = payload.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not video:
        raise MediaCommandError("The uploaded file does not contain a video stream")
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    duration = float(video.get("duration") or payload.get("format", {}).get("duration") or 0)
    fps = _fraction(video.get("avg_frame_rate") or video.get("r_frame_rate"))
    frame_count = int(video.get("nb_frames") or round(duration * fps))
    return VideoMetadata(
        width=int(video["width"]),
        height=int(video["height"]),
        fps=fps,
        duration=duration,
        frame_count=frame_count,
        pixel_format=video.get("pix_fmt"),
        video_codec=video.get("codec_name"),
        audio_codec=audio.get("codec_name") if audio else None,
        audio_present=audio is not None,
        sample_rate=int(audio["sample_rate"]) if audio and audio.get("sample_rate") else None,
        channels=int(audio["channels"]) if audio and audio.get("channels") else None,
    )


def encode_and_mux(intermediate: Path, original: Path, output: Path, has_audio: bool, preset: str = "veryfast") -> None:
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(intermediate),
        "-i",
        str(original),
        "-map",
        "0:v:0",
    ]
    if has_audio:
        command += ["-map", "1:a:0"]
    command += [
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio:
        command += ["-c:a", "aac", "-b:a", "192k"]
    command += ["-movflags", "+faststart", "-shortest", str(output)]
    _run(command)


def encode_preview(intermediate: Path, original: Path, output: Path, has_audio: bool) -> None:
    """Quickly encodes early preview (e.g. first 3.5s) for instant playback in UI."""
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(intermediate),
        "-i",
        str(original),
        "-map",
        "0:v:0",
    ]
    if has_audio:
        command += ["-map", "1:a:0"]
    command += [
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio:
        command += ["-c:a", "aac", "-b:a", "128k"]
    command += ["-movflags", "+faststart", "-shortest", str(output)]
    _run(command)


def encode_resolutions(
    intermediate: Path,
    original: Path,
    output_dir: Path,
    has_audio: bool,
    orig_w: int,
    orig_h: int,
) -> dict[str, str]:
    """Generates real downloadable video files for 720p, 1080p, and 4K maintaining aspect ratio."""
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, str] = {}

    # 1. Base clean MP4 (source resolution)
    base_output = output_dir / "cleaned.mp4"
    encode_and_mux(intermediate, original, base_output, has_audio, preset="veryfast")
    outputs["original"] = str(base_output)

    # 2. 720p: scale maintaining aspect ratio without stretching
    path_720 = output_dir / "cleaned_720p.mp4"
    if orig_h == 720 and orig_w <= 1280:
        # Source is already 720p, copy base file for instant result
        import shutil
        shutil.copyfile(base_output, path_720)
    else:
        cmd_720 = [
            "ffmpeg", "-y", "-i", str(base_output),
            "-vf", "scale=-2:'min(720,ih)'",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(path_720),
        ]
        try:
            _run(cmd_720)
        except Exception as e:
            logger.warning("720p encode fallback: %s", e)
            import shutil
            shutil.copyfile(base_output, path_720)
    outputs["720p"] = str(path_720)

    # 3. 1080p: scale maintaining aspect ratio
    path_1080 = output_dir / "cleaned_1080p.mp4"
    if orig_h == 1080 and orig_w <= 1920:
        import shutil
        shutil.copyfile(base_output, path_1080)
    else:
        cmd_1080 = [
            "ffmpeg", "-y", "-i", str(base_output),
            "-vf", "scale=-2:'min(1080,ih*2)'",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            str(path_1080),
        ]
        try:
            _run(cmd_1080)
        except Exception as e:
            logger.warning("1080p encode fallback: %s", e)
            import shutil
            shutil.copyfile(base_output, path_1080)
    outputs["1080p"] = str(path_1080)

    # 4. 4K: scale maintaining aspect ratio with lanczos interpolation
    path_4k = output_dir / "cleaned_4k.mp4"
    cmd_4k = [
        "ffmpeg", "-y", "-i", str(base_output),
        "-vf", "scale=-2:'min(2160,ih*4)':flags=lanczos",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(path_4k),
    ]
    try:
        _run(cmd_4k)
    except Exception as e:
        logger.warning("4K encode fallback: %s", e)
        import shutil
        shutil.copyfile(base_output, path_4k)
    outputs["4k"] = str(path_4k)

    return outputs
