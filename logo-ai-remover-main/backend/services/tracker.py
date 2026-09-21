import cv2
import numpy as np


class WatermarkTracker:
    def __init__(self, frame: np.ndarray, box: tuple[int, int, int, int]) -> None:
        self.box = tuple(float(value) for value in box)
        x, y, w, h = box
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        self.template = gray[y : y + h, x : x + w].copy()
        self.frame_width = frame.shape[1]
        self.frame_height = frame.shape[0]

    def update(self, frame: np.ndarray) -> tuple[int, int, int, int]:
        x, y, w, h = (int(round(value)) for value in self.box)
        if self.template.size == 0:
            return x, y, w, h
        radius = max(12, int(max(w, h) * 0.4))
        x1, y1 = max(0, x - radius), max(0, y - radius)
        x2 = min(self.frame_width, x + w + radius)
        y2 = min(self.frame_height, y + h + radius)
        search = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
        if search.shape[0] < h or search.shape[1] < w:
            return x, y, w, h
        result = cv2.matchTemplate(search, self.template, cv2.TM_CCOEFF_NORMED)
        _, confidence, _, location = cv2.minMaxLoc(result)
        if confidence >= 0.42:
            candidate_x, candidate_y = x1 + location[0], y1 + location[1]
            # Exponential smoothing prevents isolated tracking jumps.
            self.box = (
                0.78 * self.box[0] + 0.22 * candidate_x,
                0.78 * self.box[1] + 0.22 * candidate_y,
                self.box[2],
                self.box[3],
            )
        return tuple(int(round(value)) for value in self.box)
