import logging
from pathlib import Path
import subprocess

logger = logging.getLogger(__name__)


class AudioProcessorError(RuntimeError):
    pass


class AudioProcessor:
    """
    Manages audio extraction, preservation, and synchronization for video jobs.
    Uses safe argument arrays with subprocess and FFmpeg.
    """

    def extract_audio(self, video_path: Path, output_audio_path: Path) -> bool:
        """
        Extracts audio from video_path to output_audio_path.
        Returns True if audio exists and was extracted, False if no audio stream exists.
        """
        if not video_path.exists():
            raise AudioProcessorError(f"Source video not found: {video_path}")

        output_audio_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            "ffmpeg",
            "-y",
            "-nostdin",
            "-i",
            str(video_path),
            "-vn",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(output_audio_path),
        ]

        logger.info(f"Extracting audio: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=False,
        )

        if result.returncode != 0:
            # If no audio stream was present, ffmpeg outputs error "Output file does not contain any stream"
            if "does not contain any stream" in result.stderr or "Output file #0 does not contain any stream" in result.stderr:
                logger.info(f"Video {video_path.name} contains no audio stream")
                if output_audio_path.exists():
                    output_audio_path.unlink()
                return False
            logger.warning(f"Audio extraction non-zero return code: {result.stderr[:300]}")
            if output_audio_path.exists():
                output_audio_path.unlink()
            return False

        if output_audio_path.exists() and output_audio_path.stat().st_size > 500:
            return True

        return False


audio_processor = AudioProcessor()
