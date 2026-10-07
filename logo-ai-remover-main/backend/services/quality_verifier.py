import json
from pathlib import Path

import cv2
import numpy as np

from backend.models.job import VideoMetadata
from backend.services.ffmpeg_service import probe
from backend.services.watermark_detector import gemini_mask_for_box, score_gemini_box


class OutputValidationError(RuntimeError):
    pass


def _validate_pixels(original_path: Path, output_path: Path, tracking_path: Path) -> dict[str, float]:
    if not tracking_path.is_file():
        raise OutputValidationError("Watermark tracking data is missing")
    tracking = json.loads(tracking_path.read_text(encoding="utf-8"))
    boxes = tracking.get("boxes") or []
    if not boxes:
        raise OutputValidationError("Watermark tracking data contains no frames")

    sample_positions = np.linspace(0, len(boxes) - 1, min(9, len(boxes)), dtype=int)
    original = cv2.VideoCapture(str(original_path))
    cleaned = cv2.VideoCapture(str(output_path))
    if not original.isOpened() or not cleaned.isOpened():
        original.release()
        cleaned.release()
        raise OutputValidationError("Representative output frames could not be decoded")

    input_scores: list[float] = []
    output_scores: list[float] = []
    masked_changes: list[float] = []
    preserved_changes: list[float] = []
    try:
        for position in sample_positions:
            item = boxes[int(position)]
            frame_index = int(item.get("frameIndex", position))
            box = (int(item["x"]), int(item["y"]), int(item["width"]), int(item["height"]))
            original.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            cleaned.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok_original, original_frame = original.read()
            ok_cleaned, cleaned_frame = cleaned.read()
            if not ok_original or not ok_cleaned or original_frame.shape != cleaned_frame.shape:
                raise OutputValidationError(f"Could not compare output frame {frame_index}")

            mask = gemini_mask_for_box(original_frame.shape, box)
            comparison_mask = cv2.dilate(
                mask,
                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)),
                iterations=1,
            )
            difference = cv2.absdiff(original_frame, cleaned_frame).astype(np.float32)
            inside = mask > 0
            outside = comparison_mask == 0
            input_scores.append(score_gemini_box(original_frame, box))
            output_scores.append(score_gemini_box(cleaned_frame, box))
            masked_changes.append(float(np.mean(difference[inside])))
            preserved_changes.append(float(np.mean(difference[outside])))
    finally:
        original.release()
        cleaned.release()

    if len(input_scores) < 2:
        raise OutputValidationError("Too few output frames were available for validation")
    input_score = float(np.median(input_scores))
    output_score = float(np.median(output_scores))
    masked_change = float(np.median(masked_changes))
    preserved_change = float(np.median(preserved_changes))

    if masked_change < 2.0:
        raise OutputValidationError("Processing validation failed: target watermark pixels were not changed")
    required_score = max(0.04, input_score * 0.82)
    if output_score >= required_score and output_score >= input_score - 0.035:
        raise OutputValidationError("Processing validation failed: the Gemini watermark is still visible")
    if preserved_change > 9.0:
        raise OutputValidationError("Processing validation failed: unrelated frame content changed too much")
    return {
        "input_logo_score": input_score,
        "output_logo_score": output_score,
        "masked_mean_change": masked_change,
        "unmasked_mean_change": preserved_change,
    }


def verify_output(
    original: VideoMetadata,
    output_path: Path,
    original_path: Path | None = None,
    tracking_path: Path | None = None,
) -> VideoMetadata:
    if not output_path.is_file() or output_path.stat().st_size <= 0:
        raise OutputValidationError("Cleaned output file is missing or empty")
    cleaned = probe(output_path)
    if (cleaned.width, cleaned.height) != (original.width, original.height):
        raise OutputValidationError("Output resolution does not match the uploaded video")
    if abs(cleaned.fps - original.fps) > 0.05:
        raise OutputValidationError("Output FPS does not match the uploaded video")
    tolerance = max(0.15, 1.5 / max(original.fps, 1))
    if abs(cleaned.duration - original.duration) > tolerance:
        raise OutputValidationError("Output duration does not match the uploaded video")
    if cleaned.audio_present != original.audio_present:
        raise OutputValidationError("Output audio presence does not match the uploaded video")
    if original_path is not None and tracking_path is not None:
        _validate_pixels(original_path, output_path, tracking_path)
    return cleaned
