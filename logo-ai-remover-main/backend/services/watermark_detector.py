import json
import logging
from pathlib import Path

import cv2
import numpy as np

from backend.config import settings
from backend.schemas.video import ManualRegion
from backend.services.job_service import job_service
from backend.services.openrouter_service import openrouter_service
from backend.utils.file_utils import job_dir


logger = logging.getLogger(__name__)


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
        or region["width"] * region["height"] > 0.25
    ):
        raise DetectionError("Detected region is unsafe or outside the frame")
    return region


def _cv_detect_corner_watermark(samples: list[bytes]) -> dict:
    """Computer vision detector: detects persistent AI logos in video corners (e.g. Gemini watermark)."""
    frames = [cv2.imdecode(np.frombuffer(s, dtype=np.uint8), cv2.IMREAD_COLOR) for s in samples]
    valid_frames = [f for f in frames if f is not None]
    if not valid_frames:
        return {
            "x": 0.84,
            "y": 0.86,
            "width": 0.13,
            "height": 0.09,
            "confidence": 0.88,
            "type": "gemini_watermark_default",
        }

    h_frame, w_frame = valid_frames[0].shape[:2]
    grays = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in valid_frames]

    candidates = [
        {"name": "bottom-right", "x": 0.84, "y": 0.86, "width": 0.13, "height": 0.09, "priority": 1.3},
        {"name": "bottom-left",  "x": 0.03, "y": 0.86, "width": 0.13, "height": 0.09, "priority": 1.0},
        {"name": "top-right",    "x": 0.84, "y": 0.04, "width": 0.13, "height": 0.09, "priority": 1.0},
        {"name": "top-left",     "x": 0.03, "y": 0.04, "width": 0.13, "height": 0.09, "priority": 1.0},
    ]

    best_candidate = candidates[0]
    best_score = -1.0

    for c in candidates:
        x1 = int(c["x"] * w_frame)
        y1 = int(c["y"] * h_frame)
        w = int(c["width"] * w_frame)
        h = int(c["height"] * h_frame)

        crops = [g[y1 : y1 + h, x1 : x1 + w] for g in grays if g.shape[0] >= y1 + h and g.shape[1] >= x1 + w]
        if len(crops) < 2:
            continue

        stack = np.stack(crops, axis=0).astype(np.float32)
        temporal_variance = float(np.mean(np.var(stack, axis=0))) + 1.0
        edges = [float(np.mean(cv2.Laplacian(crop, cv2.CV_32F) ** 2)) for crop in crops]
        spatial_contrast = float(np.mean(edges)) + 1.0

        score = (spatial_contrast / temporal_variance) * c["priority"]
        if score > best_score:
            best_score = score
            best_candidate = c

    return {
        "x": best_candidate["x"],
        "y": best_candidate["y"],
        "width": best_candidate["width"],
        "height": best_candidate["height"],
        "confidence": 0.90,
        "type": f"cv_{best_candidate['name']}_watermark",
    }


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
        raw = None
        samples = _sample_frames(input_path)
        if settings.openrouter_api_key:
            try:
                raw = openrouter_service.detect_watermark(samples)
            except Exception as exc:
                logger.warning("OpenRouter detection failed, using computer vision fallback: %s", exc)
                raw = None

        if raw and raw.get("watermark_detected") and raw.get("regions"):
            regions = [_validate_region(r) for r in raw["regions"]]
            confidence = float(raw.get("confidence", max((r["confidence"] for r in regions), default=0.85)))
            model_name = raw.get("model", settings.openrouter_model)
        else:
            cv_region = _cv_detect_corner_watermark(samples)
            regions = [_validate_region(cv_region)]
            confidence = cv_region["confidence"]
            model_name = "opencv-corner-detector"

        payload = {
            "jobId": job_id,
            "model": model_name,
            "watermark_detected": True,
            "confidence": confidence,
            "regions": regions,
        }

    job_service.write_detection(job_id, payload)
    return payload
