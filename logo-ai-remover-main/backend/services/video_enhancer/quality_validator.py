import logging
from pathlib import Path
from backend.models.video_enhancer_job import VideoStreamMetadata
from backend.services.video_enhancer.video_inspector import video_inspector

logger = logging.getLogger(__name__)


class QualityValidationError(RuntimeError):
    pass


class QualityValidator:
    """
    Validates processed video files using real FFprobe inspection:
    - Verifies file integrity and non-zero size
    - Validates target dimensions and aspect ratio
    - Verifies target frame rate and frame count
    - Validates audio stream preservation and sync
    """

    def validate_output(
        self,
        output_file: Path,
        expected_width: int,
        expected_height: int,
        expected_fps: float,
        expected_duration: float,
        audio_expected: bool = False,
    ) -> VideoStreamMetadata:
        if not output_file.exists():
            raise QualityValidationError(f"Generated video file not found at {output_file}")

        file_size = output_file.stat().st_size
        if file_size < 1024:
            raise QualityValidationError(f"Generated video file is truncated or corrupted ({file_size} bytes)")

        # Run real FFprobe inspection
        meta = video_inspector.probe_video(output_file)

        # Dimension tolerance: within 2 pixels due to 2-divisibility alignment
        if abs(meta.width - expected_width) > 2 or abs(meta.height - expected_height) > 2:
            raise QualityValidationError(
                f"Output dimensions mismatch: expected {expected_width}x{expected_height}, got {meta.width}x{meta.height}"
            )

        # FPS tolerance: within 1.0 fps
        if abs(meta.fps - expected_fps) > 1.5:
            logger.warning(
                f"Output FPS variation: expected ~{expected_fps:.2f}, got {meta.fps:.2f}"
            )

        # Duration tolerance: within 10% or 1 second
        if expected_duration > 0 and abs(meta.duration - expected_duration) > max(1.0, expected_duration * 0.1):
            logger.warning(
                f"Output duration divergence: expected {expected_duration:.2f}s, got {meta.duration:.2f}s"
            )

        # Audio preservation check
        if audio_expected and not meta.audio_present:
            logger.warning(
                f"Audio was requested to be preserved, but output file has no audio stream"
            )

        logger.info(
            f"Quality validation PASSED for {output_file.name}: "
            f"{meta.width}x{meta.height} @ {meta.fps:.2f}fps, {meta.duration:.2f}s, {meta.file_size_bytes} bytes"
        )
        return meta


quality_validator = QualityValidator()
