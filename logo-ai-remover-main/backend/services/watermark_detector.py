import json
from pathlib import Path

import cv2
import numpy as np

from backend.schemas.video import ManualRegion
from backend.services.job_service import job_service
from backend.services.openrouter_service import OpenRouterUnavailable, openrouter_service
from backend.utils.file_utils import job_dir


class DetectionError(RuntimeError):
    pass


def _sample_frames(path: Path, count: int = 8) -> list[bytes]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise DetectionError("The uploaded video could not be decoded")
    total = max(1, int(capture.get(cv2.CAP_PROP_FRAME_COUNT)))
    indices = np.linspace(0, total - 1, min(count, total), dtype=int)
    samples: list[bytes] = []
    for index in indices:
        capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
        ok, frame = capture.read()
        if not ok:
            continue
        height, width = frame.shape[:2]
        scale = min(1.0, 1280 / max(width, height))
        if scale < 1:
            frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
        if encoded:
            samples.append(buffer.tobytes())
    capture.release()
    if not samples:
        raise DetectionError("No frames could be sampled from the uploaded video")
    return samples


def _validate_region(raw: dict) -> dict:
    try:
        region = {
            "x": float(raw["x"]),
            "y": float(raw["y"]),
            "width": float(raw["width"]),
            "height": float(raw["height"]),
            "confidence": float(raw.get("confidence", 0)),
            "type": str(raw.get("type", "ai_watermark")),
        }
    except (KeyError, TypeError, ValueError) as exc:
        raise DetectionError("Detection returned an invalid watermark region") from exc
    if (
        region["x"] < 0
        or region["y"] < 0
        or region["width"] <= 0
        or region["height"] <= 0
        or region["x"] + region["width"] > 1
        or region["y"] + region["height"] > 1
        or region["width"] * region["height"] > 0.20
    ):
        raise DetectionError("Detected region is unsafe or outside the frame")
    return region


def detect(job_id: str, input_path: Path, manual_region: ManualRegion | None = None) -> dict:
    detection_path = job_dir(job_id) / "detection.json"
    if manual_region is None and detection_path.is_file():
        cached = json.loads(detection_path.read_text(encoding="utf-8"))
        if cached.get("regions"):
            return cached
    if manual_region is not None:
        payload = {
            "jobId": job_id,
            "model": "manual-selection",
            "watermark_detected": True,
            "confidence": 1.0,
            "regions": [{**manual_region.model_dump(), "confidence": 1.0, "type": "manual"}],
        }
    else:
        try:
            raw = openrouter_service.detect_watermark(_sample_frames(input_path))
        except OpenRouterUnavailable as exc:
            raise DetectionError(str(exc)) from exc
        regions = [_validate_region(region) for region in raw.get("regions", [])]
        confidence = float(raw.get("confidence", max((r["confidence"] for r in regions), default=0)))
        if not raw.get("watermark_detected") or not regions:
            raise DetectionError("No AI watermark was confidently detected. Use manual selection and retry.")
        if confidence < 0.5:
            raise DetectionError("Watermark confidence is too low for safe automatic removal.")
        payload = {
            "jobId": job_id,
            "model": raw.get("model"),
            "watermark_detected": True,
            "confidence": confidence,
            "regions": regions,
        }
    job_service.write_detection(job_id, payload)
    return payload
