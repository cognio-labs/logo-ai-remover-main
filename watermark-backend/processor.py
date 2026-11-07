"""
Video watermark remover (local processing, no external API).
Uses OpenCV (detect + natural Navier-Stokes inpaint + texture grain restoration)
and FFmpeg (encode + preserve original audio).
"""
import subprocess
import cv2
import numpy as np

# Gemini / Veo marks sit in the bottom-right corner.
# Default search area as a fraction of the frame (width, height).
ROI_W = 0.20
ROI_H = 0.15


def get_roi(width, height, roi_w=ROI_W, roi_h=ROI_H):
    rw = max(40, int(round(width * roi_w)))
    rh = max(30, int(round(height * roi_h)))
    x0 = width - rw
    y0 = height - rh
    return x0, y0, width, height


def _known_gemini_sparkle_mask(width: int, height: int) -> np.ndarray:
    """Return a tight mask for the standard Gemini/Veo corner sparkle.

    The mask is only enabled when the expected location actually contains a
    bright, low-saturation mark; this avoids painting ordinary video detail.
    """
    mask = np.zeros((height, width), dtype=np.uint8)
    short_side = min(width, height)
    cx = int(round(width - 0.156 * short_side))
    cy = int(round(height - 0.156 * short_side))
    radius = max(4, int(round(0.037 * short_side)))
    y0, y1 = max(0, cy - radius), min(height, cy + radius + 1)
    x0, x1 = max(0, cx - radius), min(width, cx + radius + 1)
    patch = np.zeros((y1 - y0, x1 - x0), dtype=np.uint8)
    pcx, pcy = cx - x0, cy - y0
    arm = max(1, int(round(radius * 0.10)))
    points = np.array([
        [pcx, pcy - radius], [pcx + arm, pcy - arm],
        [pcx + radius, pcy], [pcx + arm, pcy + arm],
        [pcx, pcy + radius], [pcx - arm, pcy + arm],
        [pcx - radius, pcy], [pcx - arm, pcy - arm],
    ], dtype=np.int32)
    cv2.fillPoly(patch, [points], 255)
    mask[y0:y1, x0:x1] = patch
    return mask


def _validated_known_sparkle(frame: np.ndarray) -> np.ndarray:
    """Use the known sparkle geometry only when its pixels look like a mark."""
    height, width = frame.shape[:2]
    candidate = _known_gemini_sparkle_mask(width, height)
    ys, xs = np.where(candidate > 0)
    if not len(xs):
        return candidate
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    pixels = hsv[ys, xs]
    # Gemini's sparkle is white/grey: bright and comparatively unsaturated.
    bright_ratio = float(np.mean(pixels[:, 2] >= 175))
    neutral_ratio = float(np.mean(pixels[:, 1] <= 135))
    if bright_ratio >= 0.24 and neutral_ratio >= 0.55:
        return candidate
    return np.zeros_like(candidate)


def _odd(value: int, minimum: int = 3) -> int:
    value = max(minimum, int(value))
    return value if value % 2 else value + 1


def _sparkle_template(size: int) -> np.ndarray:
    """Create a generic four-point sparkle template."""
    size = _odd(size, 9)
    canvas = np.zeros((size, size), dtype=np.uint8)
    center = size // 2
    radius = max(3, int(size * 0.43))
    narrow = max(1, int(size * 0.045))
    points = np.array([
        [center, center - radius], [center + narrow, center - narrow],
        [center + radius, center], [center + narrow, center + narrow],
        [center, center + radius], [center - narrow, center + narrow],
        [center - radius, center], [center - narrow, center - narrow],
    ], dtype=np.int32)
    cv2.fillPoly(canvas, [points], 255)
    return canvas


def _template_mask(response: np.ndarray, roi_shape) -> np.ndarray:
    """Find a high-confidence generic sparkle shape at plausible sizes."""
    height, width = roi_shape
    found = np.zeros((height, width), dtype=np.uint8)
    short_side = min(height, width)
    best_score, best_rect = -1.0, None
    sizes = sorted({s for s in (int(short_side * f) for f in (0.10, 0.14, 0.18, 0.23, 0.29)) if 9 <= s < short_side})
    for size in sizes:
        size = _odd(size)
        if size >= height or size >= width:
            continue
        template = _sparkle_template(size)
        score_map = cv2.matchTemplate(response, template, cv2.TM_CCOEFF_NORMED)
        _, score, _, location = cv2.minMaxLoc(score_map)
        if score > best_score:
            best_score = float(score)
            best_rect = (location[0], location[1], size, size)
    if best_rect is not None and best_score >= 0.58:
        x, y, w, h = best_rect
        found[y:y + h, x:x + w] = 255
    return found


def detect_mask_bgr(crop: np.ndarray) -> np.ndarray:
    """Detect small bright sparkle/watermark marks using multi-cue filtering."""
    height, width = crop.shape[:2]
    if height < 5 or width < 5:
        return np.zeros((height, width), np.uint8)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    short_side = min(height, width)

    # 1. White top-hat isolates strokes smaller than structuring element
    ksize = min(_odd(max(9, int(short_side * 0.22))), _odd(max(3, short_side - 1)))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    top_hat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    otsu_threshold, _ = cv2.threshold(top_hat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    response_threshold = max(12, int(otsu_threshold))
    bright_detail = cv2.threshold(top_hat, response_threshold, 255, cv2.THRESH_BINARY)[1]

    # 2. Neutral-bright filter (watermarks are white/light gray; filters out green grass, sky, skin)
    neutral_bright = cv2.inRange(hsv, np.array([0, 0, 160], np.uint8), np.array([180, 130, 255], np.uint8))
    color_detail = cv2.bitwise_and(bright_detail, neutral_bright)

    # 3. Connected components: discard large scene objects or tiny single-pixel specks
    n, labels, stats, _centroids = cv2.connectedComponentsWithStats(color_detail, 8)
    components = np.zeros_like(color_detail)
    min_area = max(4, int(short_side * short_side * 0.0005))
    max_area = max(min_area, int(height * width * 0.10))
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        bw, bh = int(stats[i, cv2.CC_STAT_WIDTH]), int(stats[i, cv2.CC_STAT_HEIGHT])
        aspect = max(bw, bh) / max(1, min(bw, bh))
        if min_area <= area <= max_area and aspect <= 8.0:
            components[labels == i] = 255

    # 4. Template matching for sparkle arms
    templ = _template_mask(top_hat, (height, width))
    if cv2.countNonZero(templ):
        templ = cv2.dilate(templ, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        components = cv2.bitwise_or(components, cv2.bitwise_and(templ, cv2.dilate(bright_detail, np.ones((3, 3), np.uint8))))

    if not cv2.countNonZero(components):
        return components

    dilation_size = min(_odd(max(3, int(short_side * 0.015))), _odd(max(3, short_side - 1)))
    dilation = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation_size, dilation_size))
    return cv2.dilate(components, dilation, iterations=1)


def detect_mask(video_path: str, samples: int = 24):
    """
    Isolates the static watermark in the bottom-right corner across video frames.
    Uses temporal 15th percentile to discard all moving background scenery (grass, water, subjects).
    """
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    x0, y0, x1, y1 = get_roi(w, h)
    rw = x1 - x0
    rh = y1 - y0

    sample_indices = np.linspace(2, max(total - 3, 2), min(samples, total)).astype(int)
    frames = []
    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = cap.read()
        if ok:
            frames.append(frame[y0:y1, x0:x1])
    cap.release()

    if not frames:
        raise RuntimeError("Could not read video frames")

    stack = np.stack(frames).astype(np.float32)
    # Static watermark stays bright across frames, while moving grass/scenery fluctuates
    temporal_low = np.percentile(stack, 15, axis=0).astype(np.uint8)

    # Detect with multi-cue algorithm
    mask = detect_mask_bgr(temporal_low)
    count = cv2.countNonZero(mask)

    # If valid watermark detected (between 8 and 12% of corner ROI)
    if 8 <= count <= int(rw * rh * 0.12):
        return mask, (x0, y0, x1, y1)

    # Secondary check: search lower-right quadrant of corner ROI with slightly lower HSV threshold
    hsv = cv2.cvtColor(temporal_low, cv2.COLOR_BGR2HSV)
    neutral_bright = cv2.inRange(hsv, np.array([0, 0, 140], np.uint8), np.array([180, 125, 255], np.uint8))
    sub_y0 = int(rh * 0.45)
    sub_x0 = int(rw * 0.45)
    sub_nb = neutral_bright[sub_y0:, sub_x0:]
    n, labels, stats, _ = cv2.connectedComponentsWithStats(sub_nb, 8)
    sub_mask = np.zeros_like(sub_nb)
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if 6 <= area <= int(rw * rh * 0.08):
            sub_mask[labels == i] = 255

    if cv2.countNonZero(sub_mask) >= 8:
        mask = np.zeros((rh, rw), dtype=np.uint8)
        mask[sub_y0:, sub_x0:] = cv2.dilate(sub_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        return mask, (x0, y0, x1, y1)

    # Compact fallback: very small box (e.g. ~32x22px), NEVER a giant solid 50,000px block!
    mask = np.zeros((rh, rw), dtype=np.uint8)
    fw = min(rw - 6, max(20, int(w * 0.035)))
    fh = min(rh - 6, max(16, int(h * 0.035)))
    margin_x = max(8, int(w * 0.015))
    margin_y = max(8, int(h * 0.015))
    mask[rh - margin_y - fh:rh - margin_y, rw - margin_x - fw:rw - margin_x] = 255
    return mask, (x0, y0, x1, y1)


def remove_watermark(src: str, dst: str, progress_cb=None, manual_box=None):
    """Detect/track the actual icon and inpaint decoded frames before MP4 encoding."""
    from logo_target import detect_target, repair
    cap = cv2.VideoCapture(src)
    ok, first = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError("Cannot decode the first video frame")
    h, w = first.shape[:2]
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    box = manual_box or detect_target(first)
    if box is None:
        cap.release()
        raise RuntimeError("No confident white sparkle detected; no arbitrary region was removed.")
    initial_width, initial_height = box[2:]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
           "-s", f"{w}x{h}", "-r", str(fps), "-i", "-", "-i", src,
           "-map", "0:v:0", "-map", "1:a?", "-c:v", "libx264", "-crf", "14",
           "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy",
           "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = 0
    frame = first
    previous_scene = None
    tracking_active = True
    try:
        while True:
            scene = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (32, 32))
            scene_cut = previous_scene is not None and np.mean(
                np.abs(scene.astype(float)-previous_scene.astype(float))
            ) > 35
            # Match near the last accepted position, retaining it on low-confidence frames.
            candidate = detect_target(frame, box)
            if candidate is not None:
                x, y, bw, bh = candidate
                # Do not shrink the repair onto just the bright center as the
                # translucent arms fade against a changing background.
                rw, rh = max(initial_width, bw), max(initial_height, bh)
                box = (max(0, x+(bw-rw)//2), max(0, y+(bh-rh)//2), rw, rh)
                tracking_active = True
                cleaned = repair(frame, box)
            elif tracking_active and not scene_cut:
                # Translucent arms may briefly lose contrast without moving.
                cleaned = repair(frame, box)
            else:
                # A cut may remove the logo entirely. Never repair stale coordinates
                # or walk toward unrelated highlights when confidence is lost.
                cleaned = frame
                tracking_active = False
            previous_scene = scene
            ff.stdin.write(cleaned.tobytes())
            n += 1
            if progress_cb and (n % 6 == 0 or n == total):
                progress_cb(min(98, 5+int(n*93/total)), n, f"Inpainting frame {n}/{total}")
            ok, frame = cap.read()
            if not ok:
                break
    finally:
        cap.release()
        ff.stdin.close()
        ff.wait()
    if ff.returncode or n != total:
        raise RuntimeError("Video encoding failed or decoded frame count changed")
    if progress_cb:
        progress_cb(100, n, "Done")
