import cv2
import numpy as np

from backend.models.pdf_job import DetectedRegion


def normalized_to_pixels(region: dict, width: int, height: int) -> tuple[int, int, int, int]:
    """Convert normalized (0-1) dictionary region to pixel box (x, y, w, h)."""
    x = max(0, min(width - 1, round(float(region["x"]) * width)))
    y = max(0, min(height - 1, round(float(region["y"]) * height)))
    w = max(2, min(width - x, round(float(region["width"]) * width)))
    h = max(2, min(height - y, round(float(region["height"]) * height)))
    return x, y, w, h


def create_mask(shape: tuple[int, int], box: tuple[int, int, int, int], dilation: int = 5) -> np.ndarray:
    """Create a rectangular binary mask from pixel box for video/frame inpainting."""
    height, width = shape
    x, y, w, h = box
    mask = np.zeros((height, width), dtype=np.uint8)
    x1, y1 = max(0, x - dilation), max(0, y - dilation)
    x2, y2 = min(width, x + w + dilation), min(height, y + h + dilation)
    mask[y1:y2, x1:x2] = 255
    return mask


def feather_mask(mask: np.ndarray, radius: int = 9) -> np.ndarray:
    """Feather mask edges for smooth alpha blending."""
    kernel = radius if radius % 2 == 1 else radius + 1
    return cv2.GaussianBlur(mask, (kernel, kernel), 0).astype(np.float32) / 255.0


def create_mask_from_regions(
    width: int,
    height: int,
    regions: list[DetectedRegion | dict],
) -> np.ndarray:
    """Create a binary mask (uint8, 0 or 255) from normalized bounding boxes."""
    mask = np.zeros((height, width), dtype=np.uint8)
    for r in regions:
        if isinstance(r, DetectedRegion):
            rx, ry, rw, rh = r.x, r.y, r.width, r.height
        else:
            rx, ry, rw, rh = float(r["x"]), float(r["y"]), float(r["width"]), float(r["height"])

        x1 = max(0, min(width - 1, int(rx * width)))
        y1 = max(0, min(height - 1, int(ry * height)))
        x2 = max(0, min(width, int((rx + rw) * width)))
        y2 = max(0, min(height, int((ry + rh) * height)))

        if x2 > x1 and y2 > y1:
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)

    return mask


def dilate_mask(mask: np.ndarray, radius: int = 3) -> np.ndarray:
    """Dilate mask to safely capture anti-aliasing edges and boundary fringes."""
    if radius <= 0:
        return mask
    kernel_size = radius * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.dilate(mask, kernel, iterations=1)


def clean_mask(mask: np.ndarray, min_area: int = 15) -> np.ndarray:
    """Remove tiny isolated speckles and fill small interior holes."""
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed, connectivity=8)
    cleaned = np.zeros_like(mask)
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_area:
            cleaned[labels == i] = 255
    return cleaned


def validate_mask(mask: np.ndarray) -> bool:
    """Validate that the mask is neither empty nor covering the entire page (>85%)."""
    total_pixels = mask.shape[0] * mask.shape[1]
    if total_pixels == 0:
        return False
    active_pixels = int(np.count_nonzero(mask))
    coverage = active_pixels / total_pixels
    return 0 < coverage <= 0.85


def stroke_points_to_mask(
    width: int,
    height: int,
    strokes: list[dict],
    default_radius: int = 10,
) -> np.ndarray:
    """Convert user manual brush paint strokes into binary mask."""
    mask = np.zeros((height, width), dtype=np.uint8)
    for stroke in strokes:
        px = int(float(stroke.get("x", 0)) * width)
        py = int(float(stroke.get("y", 0)) * height)
        radius = int(stroke.get("radius", default_radius))
        cv2.circle(mask, (px, py), radius, 255, -1)
    return mask
