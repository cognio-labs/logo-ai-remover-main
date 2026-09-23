import logging
import cv2
import numpy as np

from backend.models.pdf_job import DetectedRegion


logger = logging.getLogger(__name__)


def detect_blue_marker_regions(
    bgr_image: np.ndarray,
    page_number: int = 1,
) -> tuple[list[DetectedRegion], np.ndarray]:
    """
    Detect blue, cyan, and purple highlighter or pen strokes over text using HSV and LAB analysis.
    Returns detected normalized regions and a binary mask (0 or 255) of the exact marker pixels.
    """
    height, width = bgr_image.shape[:2]
    if height == 0 or width == 0:
        return [], np.zeros((1, 1), dtype=np.uint8)

    # 1. Convert to HSV
    hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)

    # Blue / Cyan / Sky highlighter range
    # Hue: 80 to 135 (covers cyan, azure, royal blue, marker blue)
    lower_blue1 = np.array([80, 30, 45], dtype=np.uint8)
    upper_blue1 = np.array([135, 255, 255], dtype=np.uint8)
    mask1 = cv2.inRange(hsv, lower_blue1, upper_blue1)

    # Purple / Indigo pen stroke range
    lower_purple = np.array([135, 35, 45], dtype=np.uint8)
    upper_purple = np.array([160, 255, 255], dtype=np.uint8)
    mask2 = cv2.inRange(hsv, lower_purple, upper_purple)

    raw_mask = cv2.bitwise_or(mask1, mask2)

    # 2. LAB color confirmation: In LAB, b-channel < 120 strongly indicates blue/cyan
    lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    # Blue has low b channel (< 122 in OpenCV 0-255 scale where neutral is 128)
    lab_blue_mask = (b_chan < 122).astype(np.uint8) * 255
    combined_mask = cv2.bitwise_and(raw_mask, lab_blue_mask)

    # 3. Morphological cleanup: connect stroke fragments
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    closed = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel_close)

    # 4. Connected components analysis to identify coherent marker strokes
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(closed, connectivity=8)
    
    stroke_mask = np.zeros((height, width), dtype=np.uint8)
    regions: list[DetectedRegion] = []

    min_stroke_area = max(80, int((width * height) * 0.00008))  # scale with page resolution

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < min_stroke_area:
            continue

        x = stats[i, cv2.CC_STAT_LEFT]
        y = stats[i, cv2.CC_STAT_TOP]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]

        # Ignore accidental full-page artifacts
        if w > width * 0.95 and h > height * 0.95:
            continue

        stroke_mask[labels == i] = 255

        norm_x = max(0.0, min(1.0, x / width))
        norm_y = max(0.0, min(1.0, y / height))
        norm_w = max(0.001, min(1.0 - norm_x, w / width))
        norm_h = max(0.001, min(1.0 - norm_y, h / height))

        confidence = min(0.98, 0.70 + (area / (width * height * 0.01)) * 0.25)

        regions.append(
            DetectedRegion(
                x=round(norm_x, 4),
                y=round(norm_y, 4),
                width=round(norm_w, 4),
                height=round(norm_h, 4),
                type="blue_marker",
                confidence=round(confidence, 2),
                page=page_number,
            )
        )

    logger.info(
        "Page %d: detected %d blue marker regions (%d active pixels)",
        page_number,
        len(regions),
        int(np.count_nonzero(stroke_mask)),
    )
    return regions, stroke_mask


def detect_watermark_overlays(
    bgr_image: np.ndarray,
    page_number: int = 1,
) -> list[DetectedRegion]:
    """Detect faint diagonal or repeated watermark overlays (e.g. PAID, DRAFT, SAMPLE)."""
    regions: list[DetectedRegion] = []
    height, width = bgr_image.shape[:2]
    if height == 0 or width == 0:
        return regions

    # Convert to grayscale
    gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)

    # Watermarks are typically light-toned text with lower contrast against white background
    # Detect semi-transparent text in range [160, 235]
    faint_mask = cv2.inRange(gray, 160, 235)
    
    # Check if there are large diagonal connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(faint_mask, connectivity=8)
    for i in range(1, num_labels):
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]

        # Look for wide watermark bands (e.g. across 30%+ of page width)
        if w > width * 0.28 and area > (width * height * 0.005):
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            regions.append(
                DetectedRegion(
                    x=round(x / width, 4),
                    y=round(y / height, 4),
                    width=round(w / width, 4),
                    height=round(h / height, 4),
                    type="watermark",
                    confidence=0.88,
                    page=page_number,
                )
            )

    return regions
