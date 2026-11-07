"""Pixel-based sparkle detection shared by first-frame preview and export."""
import cv2
import numpy as np


def detect_target(frame, previous=None):
    h, w = frame.shape[:2]
    short = min(h, w)
    if previous:
        x, y, bw, bh = previous
        pad = max(bw, bh)
        x0, y0, x1, y1 = max(0, x-pad), max(0, y-pad), min(w, x+bw+pad), min(h, y+bh+pad)
    else:
        x0, y0, x1, y1 = int(w*.55), int(h*.55), w, h
    crop = frame[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    # Local contrast works for translucent white marks over colored backgrounds.
    response = gray.astype(np.float32) - cv2.GaussianBlur(gray, (0, 0), max(2, short*.018))
    best = (0.0, None)
    for radius in sorted(set(max(3, round(short*f)) for f in (.024, .030, .037, .045))):
        size = 2*radius+5
        if min(gray.shape) < size:
            continue
        yy, xx = np.mgrid[-radius-2:radius+3, -radius-2:radius+3]
        for exponent in (.55, .85):
            shape = np.maximum(0, 1-(np.abs(xx)/radius)**exponent-(np.abs(yy)/radius)**exponent)
            template = np.clip(shape*6, 0, 1).astype(np.float32)
            scores = cv2.matchTemplate(response, template, cv2.TM_CCOEFF_NORMED)
            _, score, _, loc = cv2.minMaxLoc(scores)
            if score > best[0]:
                best = (score, (x0+loc[0], y0+loc[1], size, size))
    if best[0] < .74:
        return None
    if previous is None:
        if best[0] < .77:
            return None
        bx, by, bw, bh = best[1]
        cx, cy = bx+bw//2, by+bh//2
        core = max(1, min(bw, bh)//12)
        center = frame[cy-core:cy+core+1, cx-core:cx+core+1]
        hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)
        # Initial acquisition needs visibly light, neutral pixels as well as shape.
        # Once acquired, tracking can follow the same translucent mark over dark scenes.
        if float(hsv[:, :, 2].mean()) < 100 or float(hsv[:, :, 1].mean()) > 160:
            return None
    return best[1]


def repair(frame, box):
    x, y, w, h = box
    mask = np.zeros(frame.shape[:2], np.uint8)
    # Include the full halo; never blend original logo pixels back into the repair.
    mask[y:y+h, x:x+w] = 255
    return cv2.inpaint(frame, mask, 3, cv2.INPAINT_NS)
