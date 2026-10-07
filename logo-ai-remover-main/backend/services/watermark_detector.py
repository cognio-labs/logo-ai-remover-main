import json
import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from backend.schemas.video import ManualRegion
from backend.services.job_service import job_service
from backend.utils.file_utils import job_dir

logger = logging.getLogger(__name__)

class DetectionError(RuntimeError):
    pass

@dataclass(frozen=True)
class FrameSample:
    frame_index: int
    frame: np.ndarray


def _sample_frames(path: Path, count: int = 9) -> list[FrameSample]:
    """Decode representative frames without retaining the full video in memory."""
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise DetectionError("The uploaded video could not be decoded")
    total = max(1, int(capture.get(cv2.CAP_PROP_FRAME_COUNT)))
    indices = np.linspace(0, total - 1, min(count, total), dtype=int)
    samples: list[FrameSample] = []
    try:
        for index in indices:
            capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            ok, frame = capture.read()
            if ok:
                samples.append(FrameSample(int(index), frame))
    finally:
        capture.release()
    if not samples:
        raise DetectionError("No frames could be sampled from the uploaded video")
    return samples


def _procedural_gemini_alpha(size: int = 256) -> np.ndarray:
    axis = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    xx, yy = np.meshgrid(axis, axis)
    inside = np.power(np.abs(xx), 0.58) + np.power(np.abs(yy), 0.58) <= 1.0
    alpha = np.zeros((size, size), dtype=np.uint8)
    alpha[inside] = 255
    return alpha


def gemini_alpha_template() -> np.ndarray:
    """Load the official sparkle alpha, with a procedural worker fallback."""
    project_root = Path(__file__).resolve().parents[2]
    candidates = (
        project_root / "src" / "assets" / "gemini-logo-transparent.png",
        project_root / "backend" / "assets" / "gemini-logo-transparent.png",
    )
    for path in candidates:
        image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if image is None or image.ndim != 3 or image.shape[2] != 4:
            continue
        alpha = image[:, :, 3]
        points = cv2.findNonZero((alpha > 3).astype(np.uint8))
        if points is not None:
            x, y, w, h = cv2.boundingRect(points)
            return alpha[y : y + h, x : x + w]
    return _procedural_gemini_alpha()


def gemini_mask_for_box(frame_shape: tuple[int, ...], box: tuple[int, int, int, int], dilation: int | None = None) -> np.ndarray:
    """Build a tight logo-shaped mask including antialiasing and a small halo."""
    height, width = frame_shape[:2]
    x, y, w, h = box
    x = max(0, min(width - 1, int(x)))
    y = max(0, min(height - 1, int(y)))
    w = max(1, min(width - x, int(w)))
    h = max(1, min(height - y, int(h)))
    alpha = cv2.resize(gemini_alpha_template(), (w, h), interpolation=cv2.INTER_AREA)
    binary = (alpha > 5).astype(np.uint8) * 255
    radius = dilation if dilation is not None else max(2, round(min(w, h) * 0.055))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    binary = cv2.dilate(binary, kernel, iterations=1)
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[y : y + h, x : x + w] = binary
    return mask


def _edge_template(size: int) -> np.ndarray:
    alpha = cv2.resize(gemini_alpha_template(), (size, size), interpolation=cv2.INTER_AREA)
    binary = (alpha > 20).astype(np.uint8) * 255
    return cv2.morphologyEx(binary, cv2.MORPH_GRADIENT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))


def _search_window(width: int, height: int, hint: ManualRegion | None) -> tuple[int, int, int, int]:
    if hint is None:
        return 0, 0, width, height
    x1 = max(0, min(width - 1, round(hint.x * width)))
    y1 = max(0, min(height - 1, round(hint.y * height)))
    x2 = max(x1 + 1, min(width, round((hint.x + hint.width) * width)))
    y2 = max(y1 + 1, min(height, round((hint.y + hint.height) * height)))
    return x1, y1, x2, y2


def locate_gemini_logo(frame: np.ndarray, hint: ManualRegion | None = None) -> tuple[tuple[int, int, int, int], float]:
    """Locate the four-point Gemini mark by silhouette, not generic corner edges."""
    original_height, original_width = frame.shape[:2]
    scale = min(1.0, 960.0 / max(original_width, original_height))
    working = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1.0 else frame
    height, width = working.shape[:2]
    gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0.7), 18, 62)
    sx1, sy1, sx2, sy2 = _search_window(width, height, hint)
    search = edges[sy1:sy2, sx1:sx2]
    min_size = max(18, round(height * 0.025))
    max_size = max(min_size + 2, round(height * 0.115))
    sizes = sorted(set(int(value) for value in np.linspace(min_size, max_size, 12)))
    best_score = -1.0
    best_box = (0, 0, min_size, min_size)
    for size in sizes:
        if search.shape[0] < size or search.shape[1] < size:
            continue
        response = cv2.matchTemplate(search, _edge_template(size), cv2.TM_CCOEFF_NORMED)
        _, score, _, location = cv2.minMaxLoc(response)
        if score > best_score:
            best_score = float(score)
            best_box = (sx1 + location[0], sy1 + location[1], size, size)
    inverse = 1.0 / scale
    x, y, w, h = best_box
    return (round(x * inverse), round(y * inverse), max(1, round(w * inverse)), max(1, round(h * inverse))), best_score


def _cluster_detections(detections: list[tuple[tuple[int, int, int, int], float]]) -> tuple[tuple[int, int, int, int], float, int]:
    if not detections:
        raise DetectionError("Gemini watermark was not detected")
    best_cluster: list[tuple[tuple[int, int, int, int], float]] = []
    for candidate in detections:
        (x, y, w, h), _ = candidate
        cluster = []
        for other in detections:
            (ox, oy, ow, oh), _ = other
            tolerance = max(10, round(max(w, h) * 0.45))
            size_ratio = max(w, ow) / max(1, min(w, ow))
            if abs(x - ox) <= tolerance and abs(y - oy) <= tolerance and size_ratio <= 1.35:
                cluster.append(other)
        if len(cluster) > len(best_cluster) or (len(cluster) == len(best_cluster) and np.median([item[1] for item in cluster]) > np.median([item[1] for item in best_cluster])):
            best_cluster = cluster
    boxes = np.asarray([item[0] for item in best_cluster], dtype=np.float32)
    box = tuple(int(round(value)) for value in np.median(boxes, axis=0))
    score = float(np.median([item[1] for item in best_cluster]))
    return box, score, len(best_cluster)


def _validate_region(raw: dict) -> dict:
    try:
        region = {"x": float(raw["x"]), "y": float(raw["y"]), "width": float(raw["width"]), "height": float(raw["height"]), "confidence": float(raw.get("confidence", 0)), "type": str(raw.get("type", "gemini_sparkle")), "template_score": float(raw.get("template_score", 0))}
    except (KeyError, TypeError, ValueError) as exc:
        raise DetectionError("Detection returned an invalid watermark region") from exc
    if region["x"] < 0 or region["y"] < 0 or region["width"] <= 0 or region["height"] <= 0 or region["x"] + region["width"] > 1.01 or region["y"] + region["height"] > 1.01 or region["width"] * region["height"] > 0.04:
        raise DetectionError("Detected Gemini region is unsafe or outside the frame")
    return region


def detect(job_id: str, input_path: Path, manual_region: ManualRegion | None = None) -> dict:
    detection_path = job_dir(job_id) / "detection.json"
    if manual_region is None and detection_path.is_file():
        cached = json.loads(detection_path.read_text(encoding="utf-8"))
        if cached.get("regions") and cached.get("model") == "gemini-shape-temporal-v2":
            return cached
    samples = _sample_frames(input_path)
    detections = [locate_gemini_logo(sample.frame, manual_region) for sample in samples]
    box, score, support = _cluster_detections(detections)
    minimum_support = max(2, (len(samples) + 2) // 3)
    if score < 0.20 or support < minimum_support:
        where = " inside the selected search area" if manual_region is not None else ""
        raise DetectionError(f"A persistent Gemini watermark could not be detected{where}; no pixels were modified")
    frame_height, frame_width = samples[0].frame.shape[:2]
    x, y, w, h = box
    region = _validate_region({"x": round(x / frame_width, 6), "y": round(y / frame_height, 6), "width": round(w / frame_width, 6), "height": round(h / frame_height, 6), "confidence": round(min(0.99, 0.45 + score + support / len(samples) * 0.25), 4), "template_score": round(score, 5), "type": "gemini_sparkle"})
    payload = {"jobId": job_id, "model": "gemini-shape-temporal-v2", "watermark_detected": True, "confidence": region["confidence"], "sampled_frames": [sample.frame_index for sample in samples], "temporal_support": support, "regions": [region]}
    job_service.write_detection(job_id, payload)
    return payload


def score_gemini_box(frame: np.ndarray, box: tuple[int, int, int, int]) -> float:
    """Measure Gemini silhouette evidence at an already tracked location."""
    x, y, w, h = box
    height, width = frame.shape[:2]
    x, y = max(0, x), max(0, y)
    w, h = min(w, width - x), min(h, height - y)
    if w < 8 or h < 8:
        return 0.0
    gray = cv2.cvtColor(frame[y : y + h, x : x + w], cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0.7), 18, 62)
    template = cv2.resize(_edge_template(max(w, h)), (w, h), interpolation=cv2.INTER_AREA)
    result = cv2.matchTemplate(edges, template, cv2.TM_CCOEFF_NORMED)
    return float(result[0, 0]) if result.size else 0.0
