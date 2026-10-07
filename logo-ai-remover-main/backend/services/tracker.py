import cv2
import numpy as np


class WatermarkTracker:
    """Conservative local tracker for the detected logo, including small scale changes."""

    def __init__(
        self,
        frame: np.ndarray,
        box: tuple[int, int, int, int],
        focus_mask: np.ndarray | None = None,
    ) -> None:
        self.box = tuple(float(value) for value in box)
        x, y, w, h = box
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        crop = gray[y : y + h, x : x + w]
        self.template = cv2.Canny(cv2.GaussianBlur(crop, (3, 3), 0.7), 18, 62)
        if focus_mask is not None:
            local_mask = focus_mask[y : y + h, x : x + w]
            if local_mask.shape == self.template.shape:
                self.template = cv2.bitwise_and(self.template, local_mask)
        self.frame_width = frame.shape[1]
        self.frame_height = frame.shape[0]

    def update(self, frame: np.ndarray) -> tuple[int, int, int, int]:
        x, y, w, h = (int(round(value)) for value in self.box)
        if self.template.size == 0 or np.count_nonzero(self.template) < 8:
            return x, y, w, h
        radius = max(10, int(max(w, h) * 0.32))
        x1, y1 = max(0, x - radius), max(0, y - radius)
        x2 = min(self.frame_width, x + w + radius)
        y2 = min(self.frame_height, y + h + radius)
        gray = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
        search = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0.7), 18, 62)

        best_score = -1.0
        best_candidate = (x, y, w, h)
        for scale in (0.94, 1.0, 1.06):
            tw, th = max(8, round(w * scale)), max(8, round(h * scale))
            if search.shape[1] < tw or search.shape[0] < th:
                continue
            template = cv2.resize(self.template, (tw, th), interpolation=cv2.INTER_AREA)
            response = cv2.matchTemplate(search, template, cv2.TM_CCOEFF_NORMED)
            _, score, _, location = cv2.minMaxLoc(response)
            if score > best_score:
                best_score = float(score)
                best_candidate = (x1 + location[0], y1 + location[1], tw, th)

        if best_score >= 0.25:
            cx, cy, cw, ch = best_candidate
            self.box = (
                0.72 * self.box[0] + 0.28 * cx,
                0.72 * self.box[1] + 0.28 * cy,
                0.88 * self.box[2] + 0.12 * cw,
                0.88 * self.box[3] + 0.12 * ch,
            )
        bx, by, bw, bh = (int(round(value)) for value in self.box)
        bx = max(0, min(self.frame_width - bw, bx))
        by = max(0, min(self.frame_height - bh, by))
        return bx, by, bw, bh
