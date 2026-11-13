"""
Pixel-based sparkle detection shared by first-frame preview and export.
Handles BOTH white/bright Gemini watermarks AND dark/black Gemini watermarks.
"""
import cv2
import numpy as np


def _make_astroid_template(radius: int, exponent: float = 0.68) -> np.ndarray:
    """Create astroid sparkle template of given radius for template matching."""
    size = 2 * radius + 5
    yy, xx = np.mgrid[-(radius + 2):(radius + 3), -(radius + 2):(radius + 3)]
    shape = np.maximum(0.0, 1.0 - (np.abs(xx) / radius) ** exponent - (np.abs(yy) / radius) ** exponent)
    return np.clip(shape * 6, 0, 1).astype(np.float32)


def _run_template_match(response: np.ndarray, x0: int, y0: int, short: int):
    """
    Match astroid templates against a float response map.
    Returns (score, (abs_x, abs_y, size, size)) or (0, None).
    """
    best = (0.0, None)
    for radius in sorted(set(max(3, round(short * f)) for f in (0.024, 0.030, 0.037, 0.045))):
        for exp in (0.55, 0.68, 0.85):
            tmpl = _make_astroid_template(radius, exp)
            size = tmpl.shape[0]
            if min(response.shape) < size:
                continue
            scores = cv2.matchTemplate(response, tmpl, cv2.TM_CCOEFF_NORMED)
            _, score, _, loc = cv2.minMaxLoc(scores)
            if score > best[0]:
                best = (score, (x0 + loc[0], y0 + loc[1], size, size))
    return best


def detect_target(frame, previous=None):
    """
    Detect the Gemini / Veo sparkle watermark in `frame`.

    Works for BOTH bright/white marks (overlay blending: I = (1-a)*B + a*255)
    and dark/black marks (overlay blending: I = (1-a)*B + a*0).

    Returns (bx, by, bw, bh) bounding box in full-frame coordinates, or None.
    """
    h, w = frame.shape[:2]
    short = min(h, w)

    if previous:
        x, y, bw, bh = previous
        pad = max(bw, bh)
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(w, x + bw + pad)
        y1 = min(h, y + bh + pad)
    else:
        # Initial search: bottom-right quadrant
        x0, y0, x1, y1 = int(w * 0.55), int(h * 0.55), w, h

    crop = frame[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    sigma = max(2.0, short * 0.018)
    blurred = cv2.GaussianBlur(gray, (0, 0), sigma)

    # Bright response: local contrast (white mark appears brighter than surroundings)
    response_bright = gray - blurred  # positive where bright mark exists

    # Dark response: inverted local contrast (dark mark appears darker than surroundings)
    response_dark = blurred - gray  # positive where dark mark exists

    # Run template match on both responses
    score_b, box_b = _run_template_match(response_bright, x0, y0, short)
    score_d, box_d = _run_template_match(response_dark, x0, y0, short)

    # Pick best candidate
    if score_b >= score_d:
        best_score, best_box, is_dark_mark = score_b, box_b, False
    else:
        best_score, best_box, is_dark_mark = score_d, box_d, True

    # Confidence threshold
    min_score = 0.74 if previous else 0.77
    if best_score < min_score or best_box is None:
        return None

    # On initial acquisition (no previous), verify pixel content in center
    if previous is None:
        bx, by, bw, bh = best_box
        cx, cy = bx + bw // 2, by + bh // 2
        core = max(1, min(bw, bh) // 12)
        cy0 = max(0, cy - core)
        cy1 = min(h, cy + core + 1)
        cx0 = max(0, cx - core)
        cx1 = min(w, cx + core + 1)
        center_patch = frame[cy0:cy1, cx0:cx1]
        if center_patch.size == 0:
            return None

        hsv = cv2.cvtColor(center_patch, cv2.COLOR_BGR2HSV)
        mean_v = float(hsv[:, :, 2].mean())
        mean_s = float(hsv[:, :, 1].mean())

        if is_dark_mark:
            # Dark mark: center should be dark (V ≤ 155) and low-saturation (S ≤ 100)
            if mean_v > 155 or mean_s > 100:
                return None
        else:
            # White/bright mark: center should be bright (V ≥ 80) and low-saturation (S ≤ 180)
            if mean_v < 80 or mean_s > 180:
                return None

    return best_box


def measure_alpha_and_polarity(frame, box) -> tuple[float, bool]:
    """
    Automatically measure alpha strength and determine if watermark is bright or dark.

    Returns (alpha, is_dark):
      - alpha: float in [0.15, 0.55] — blending strength
      - is_dark: True if dark overlay (I = (1-a)*B), False if bright overlay (I = (1-a)*B + a*255)
    """
    h, w = frame.shape[:2]
    bx, by, bw, bh = box
    cx = bx + bw / 2.0
    cy = by + bh / 2.0
    r = max(bw, bh) / 2.0 * 1.05
    p = 0.68

    # Build distance map for the local patch
    pad = int(r * 2.0)
    rx0, rx1 = max(0, int(cx - pad)), min(w, int(cx + pad + 1))
    ry0, ry1 = max(0, int(cy - pad)), min(h, int(cy + pad + 1))

    yy, xx = np.mgrid[ry0:ry1, rx0:rx1]
    dx = np.abs(xx - cx) / r
    dy = np.abs(yy - cy) / r
    dist = dx**p + dy**p

    crop = frame[ry0:ry1, rx0:rx1].astype(float)

    # Center region (dist ≤ 0.2): watermark pixels
    center_mask = dist <= 0.2
    # Border ring (dist 1.2–1.6): background estimate
    border_mask = (dist >= 1.2) & (dist <= 1.6)

    if center_mask.sum() < 4 or border_mask.sum() < 10:
        return 0.30, False  # fallback defaults

    center_pixels = crop[center_mask]      # shape (N, 3)
    border_pixels = crop[border_mask]      # shape (M, 3)

    mean_center = np.median(center_pixels, axis=0)   # BGR at watermark center
    mean_border = np.median(border_pixels, axis=0)   # BGR at background ring (median prevents outlier skew)

    # Determine polarity
    brightness_diff = float(mean_center.mean()) - float(mean_border.mean())
    is_dark = brightness_diff < 0  # center darker than border = dark overlay

    if is_dark:
        # Dark overlay: I = (1-a)*B + a*0  =>  B = I / (1-a)
        # mean_center ≈ (1-a)*mean_border  =>  a ≈ 1 - mean_center/mean_border
        ratio = np.clip(mean_center / np.maximum(mean_border, 1.0), 0.0, 1.0)
        alpha = float(np.clip(1.0 - ratio.mean(), 0.10, 0.55))
    else:
        # Bright overlay: I = (1-a)*B + a*255  =>  B = (I - a*255)/(1-a)
        # mean_center ≈ (1-a)*mean_border + a*255
        # a ≈ (mean_center - mean_border) / (255 - mean_border)
        num = mean_center - mean_border
        den = np.maximum(255.0 - mean_border, 1.0)
        ratio = np.clip(num / den, 0.0, 1.0)
        alpha = float(np.clip(ratio.mean(), 0.10, 0.55))

    return alpha, is_dark


def repair(frame, box, alpha_scale=1.0, is_dark=False):
    """
    Remove a Gemini watermark at `box` from `frame`.

    is_dark: True  → dark overlay: unblend with B = I / (1-a)
             False → bright overlay: unblend with B = (I - a*255) / (1-a)
    """
    h, w = frame.shape[:2]
    bx, by, bw, bh = box
    cx = bx + bw / 2.0
    cy = by + bh / 2.0
    r = max(bw, bh) / 2.0 * 1.05
    p = 0.68

    pad = int(r * 1.5)
    x0, x1 = max(0, int(cx - pad)), min(w, int(cx + pad + 1))
    y0, y1 = max(0, int(cy - pad)), min(h, int(cy + pad + 1))

    crop = frame[y0:y1, x0:x1].copy()
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx = np.abs(xx - cx) / r
    dy = np.abs(yy - cy) / r
    dist = dx**p + dy**p

    # Calibrated piecewise alpha (measured from real Gemini sparkle)
    xp = np.array([0.00,  0.20,  0.85,  0.92,  0.97,  1.02,  1.07,  1.11])
    fp = np.array([0.304, 0.302, 0.294, 0.278, 0.185, 0.055, 0.012, 0.000]) * alpha_scale

    a = np.interp(dist, xp, fp)[:, :, None]  # shape (H, W, 1)

    if is_dark:
        # Dark overlay: I = (1-a)*B  =>  B = I / (1-a)
        unblended = np.clip(
            crop.astype(float) / np.maximum(1.0 - a, 0.01),
            0, 255
        ).astype(np.uint8)
    else:
        # Bright overlay: I = (1-a)*B + a*255  =>  B = (I - a*255) / (1-a)
        unblended = np.clip(
            (crop.astype(float) - 255.0 * a) / np.maximum(1.0 - a, 0.01),
            0, 255
        ).astype(np.uint8)

    # TELEA inpainting on the thin edge boundary to smooth seam
    edge_thin = ((dist >= 0.94) & (dist <= 1.04)).astype(np.uint8) * 255
    cleaned_patch = cv2.inpaint(unblended, edge_thin, 1, cv2.INPAINT_TELEA)

    out = frame.copy()
    out[y0:y1, x0:x1] = cleaned_patch
    return out
