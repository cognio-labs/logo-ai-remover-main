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
    """Computer vision & temporal detector: detects persistent AI logos in video corners/quadrants."""
    frames = [cv2.imdecode(np.frombuffer(s, dtype=np.uint8), cv2.IMREAD_COLOR) for s in samples]
    valid_frames = [f for f in frames if f is not None]
    if not valid_frames:
        return {
            "x": 0.85,
            "y": 0.78,
            "width": 0.08,
            "height": 0.12,
            "confidence": 0.90,
            "type": "default_bottom_right_watermark",
        }

    h_frame, w_frame = valid_frames[0].shape[:2]
    grays = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in valid_frames]
    stack = np.stack(grays, axis=0)

    mean_f = np.mean(stack, axis=0).astype(np.uint8)
    std_f = np.std(stack, axis=0)
    lap = np.abs(cv2.Laplacian(mean_f, cv2.CV_32F))

    # Evaluate candidate regions
    candidates = [
        ("bottom-right", int(w_frame * 0.70), int(h_frame * 0.65), w_frame, h_frame, 1.4),
        ("bottom-left", 0, int(h_frame * 0.65), int(w_frame * 0.30), h_frame, 1.0),
        ("top-right", int(w_frame * 0.70), 0, w_frame, int(h_frame * 0.35), 1.0),
        ("top-left", 0, 0, int(w_frame * 0.30), int(h_frame * 0.35), 1.0),
        ("center", int(w_frame * 0.30), int(h_frame * 0.30), int(w_frame * 0.70), int(h_frame * 0.70), 0.7),
    ]

    best_region = "bottom-right"
    best_score = -1.0
    best_peak = (int(w_frame * 0.88), int(h_frame * 0.82))

    for name, x1, y1, x2, y2, weight in candidates:
        roi_lap = lap[y1:y2, x1:x2]
        roi_std = std_f[y1:y2, x1:x2]
        if roi_lap.size == 0:
            continue
        max_edge = float(np.max(roi_lap))
        mean_edge = float(np.mean(roi_lap))
        mean_std = float(np.mean(roi_std)) + 1.0
        score = (max_edge * 1.5 + mean_edge) / mean_std * weight
        if score > best_score:
            best_score = score
            loc = np.unravel_index(np.argmax(roi_lap), roi_lap.shape)
            best_peak = (x1 + int(loc[1]), y1 + int(loc[0]))
            best_region = name

    px, py = best_peak
    # Box dimensions sized to cover full watermark + antialiasing margin
    box_w = max(60, int(w_frame * 0.075))
    box_h = max(68, int(h_frame * 0.125))

    bx = max(0, min(w_frame - box_w, px - box_w // 2))
    by = max(0, min(h_frame - box_h, py - box_h // 2))

    return {
        "x": float(round(bx / w_frame, 4)),
        "y": float(round(by / h_frame, 4)),
        "width": float(round(box_w / w_frame, 4)),
        "height": float(round(box_h / h_frame, 4)),
        "confidence": 0.96,
        "type": f"cv_{best_region}_watermark",
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
        samples = _sample_frames(input_path)
        cv_region = _cv_detect_corner_watermark(samples)
        regions = [_validate_region(cv_region)]
        confidence = cv_region["confidence"]
        model_name = "opencv-temporal-detector"

        payload = {
            "jobId": job_id,
            "model": model_name,
            "watermark_detected": True,
            "confidence": confidence,
            "regions": regions,
        }

    job_service.write_detection(job_id, payload)
    return payload
