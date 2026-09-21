import json
import subprocess
from fractions import Fraction
from pathlib import Path

from backend.models.job import VideoMetadata


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


def encode_and_mux(intermediate: Path, original: Path, output: Path, has_audio: bool) -> None:
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
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio:
        command += ["-c:a", "aac", "-b:a", "192k"]
    command += ["-movflags", "+faststart", "-shortest", str(output)]
    _run(command)
