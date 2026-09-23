import logging
from pathlib import Path
import subprocess

logger = logging.getLogger(__name__)


class VideoEncoderError(RuntimeError):
    pass


class VideoEncoder:
    """
    High-performance video encoder using FFmpeg subprocess arrays.
    Supports H.264, H.265 (HEVC), and VP9 with CRF rate control, web-streaming faststart flags,
    and synchronized audio track muxing.
    """

    CODEC_MAP = {
        "h264": "libx264",
        "h265": "libx265",
        "vp9": "libvpx-vp9",
    }

    CRF_MAP = {
        "balanced": 22,
        "high": 18,
        "maximum": 14,
    }

    def encode_frames(
        self,
        frame_dir: Path,
        output_file: Path,
        fps: float,
        codec: str = "h264",
        quality: str = "high",
        audio_path: Path | None = None,
        frame_pattern: str = "enhanced_%06d.jpg",
    ) -> Path:
        """
        Encodes sequence of frames in frame_dir into output_file.
        Uses fast presets for quick turnaround while delivering pristine visual quality.
        """
        output_file.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg_codec = self.CODEC_MAP.get(codec.lower(), "libx264")
        crf_val = str(self.CRF_MAP.get(quality.lower(), 18))

        input_pattern = str(frame_dir / frame_pattern)

        cmd = [
            "ffmpeg",
            "-y",
            "-nostdin",
            "-framerate",
            f"{fps:.3f}",
            "-i",
            input_pattern,
        ]

        has_audio = audio_path is not None and audio_path.exists() and audio_path.stat().st_size > 0
        if has_audio:
            cmd.extend(["-i", str(audio_path)])

        cmd.extend([
            "-threads",
            "0",
            "-c:v",
            ffmpeg_codec,
            "-crf",
            crf_val,
            "-pix_fmt",
            "yuv420p",
        ])

        # Additional codec-specific flags: 'fast' preset + film tuning for high-detail video
        if ffmpeg_codec == "libx264":
            cmd.extend(["-preset", "fast", "-tune", "film", "-profile:v", "high", "-movflags", "+faststart"])
        elif ffmpeg_codec == "libx265":
            cmd.extend(["-preset", "fast", "-tag:v", "hvc1", "-movflags", "+faststart"])
        elif ffmpeg_codec == "libvpx-vp9":
            cmd.extend(["-b:v", "0", "-deadline", "good"])

        if has_audio:
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-shortest"])
        else:
            cmd.append("-an")

        cmd.append(str(output_file))

        logger.info(f"Running video encoder: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=False,
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg encoding failed: {result.stderr}")
            raise VideoEncoderError(f"Video encoding failed: {result.stderr[-500:]}")

        if not output_file.exists() or output_file.stat().st_size < 1000:
            raise VideoEncoderError(f"Output video file is missing or invalid: {output_file}")

        return output_file


video_encoder = VideoEncoder()
