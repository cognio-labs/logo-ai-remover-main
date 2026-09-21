import cv2
import numpy as np


def normalized_to_pixels(region: dict, width: int, height: int) -> tuple[int, int, int, int]:
    x = max(0, min(width - 1, round(region["x"] * width)))
    y = max(0, min(height - 1, round(region["y"] * height)))
    w = max(2, min(width - x, round(region["width"] * width)))
    h = max(2, min(height - y, round(region["height"] * height)))
    return x, y, w, h


def create_mask(shape: tuple[int, int], box: tuple[int, int, int, int], dilation: int = 5) -> np.ndarray:
    height, width = shape
    x, y, w, h = box
    mask = np.zeros((height, width), dtype=np.uint8)
    x1, y1 = max(0, x - dilation), max(0, y - dilation)
    x2, y2 = min(width, x + w + dilation), min(height, y + h + dilation)
    mask[y1:y2, x1:x2] = 255
    return mask


def feather_mask(mask: np.ndarray, radius: int = 9) -> np.ndarray:
    kernel = radius if radius % 2 == 1 else radius + 1
    return cv2.GaussianBlur(mask, (kernel, kernel), 0).astype(np.float32) / 255.0
