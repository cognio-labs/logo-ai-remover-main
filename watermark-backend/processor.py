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
    """
    Remove video watermark with Navier-Stokes inpainting, local sensor grain/texture
    restoration, and edge feathering. Produces natural, sharp, flicker-free video without blur.

    progress_cb(percent, frames_done, stage_text)
    manual_box = (x, y, w, h) in pixels overrides auto-detection.
    """
    def report(p, n, stage):
        if progress_cb:
            progress_cb(p, n, stage)

    cap = cv2.VideoCapture(src)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    cap.release()

    report(1, 0, "Detecting watermark candidates...")
    if manual_box:
        bx, by, bw, bh = manual_box
        x0, y0 = max(0, bx), max(0, by)
        x1, y1 = min(bx + bw, w), min(by + bh, h)
        rw = max(1, x1 - x0)
        rh = max(1, y1 - y0)

        # Sample frames inside manual box to isolate actual watermark strokes
        # rather than wiping out the entire rectangular bounding box as a blur.
        cap_box = cv2.VideoCapture(src)
        sample_indices = np.linspace(2, max(total - 3, 2), min(12, total)).astype(int)
        box_frames = []
        for idx in sample_indices:
            cap_box.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, bframe = cap_box.read()
            if ok:
                box_frames.append(bframe[y0:y1, x0:x1])
        cap_box.release()

        if box_frames:
            stack = np.stack(box_frames).astype(np.float32)
            temporal_low = np.percentile(stack, 15, axis=0).astype(np.uint8)
            detected = detect_mask_bgr(temporal_low)
            if cv2.countNonZero(detected) >= 6:
                mask = detected
            else:
                # Secondary bright/white filter for clean stroke isolation
                hsv = cv2.cvtColor(temporal_low, cv2.COLOR_BGR2HSV)
                bright = cv2.inRange(hsv, np.array([0, 0, 150], np.uint8), np.array([180, 120, 255], np.uint8))
                if cv2.countNonZero(bright) >= 6:
                    mask = cv2.dilate(bright, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
                else:
                    # Subtle elliptical center mask rather than harsh solid rectangle
                    mask = np.zeros((rh, rw), dtype=np.uint8)
                    cv2.circle(mask, (rw // 2, rh // 2), max(6, int(min(rw, rh) * 0.38)), 255, -1)
        else:
            mask = np.full((rh, rw), 255, np.uint8)
    else:
        mask, (x0, y0, x1, y1) = detect_mask(src)

    # Precomputations for fast per-frame execution (avoids allocations inside the loop)
    # 1. Soft feathering for seamless edge blending
    feather = cv2.GaussianBlur(mask, (3, 3), 0).astype(np.float32) / 255.0
    feather_3d = np.expand_dims(feather, axis=2)
    inv_feather = 1.0 - feather_3d
    mask_float = (mask.astype(np.float32) / 255.0)[:, :, None]

    # 2. Local surrounding ring to measure natural background grain / camera sensor noise
    surround = cv2.dilate(mask, np.ones((7, 7), np.uint8)) - mask
    surround_idx = surround > 0
    has_surround = np.count_nonzero(surround_idx) > 20

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "-",
        "-i", src,
        "-map", "0:v:0", "-map", "1:a?",
        "-c:v", "libx264", "-crf", "16", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        "-movflags", "+faststart", dst,
    ]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    cap = cv2.VideoCapture(src)
    n = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        roi = frame[y0:y1, x0:x1]

        # 1. High-fidelity Navier-Stokes inpaint (preserves edge geometry and natural lines)
        inp = cv2.inpaint(roi, mask, 2, cv2.INPAINT_NS)

        # 2. Texture & grain restoration: sample noise from local surroundings and blend in
        if has_surround:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (3, 3), 0)
            hf = gray.astype(np.float32) - blur.astype(np.float32)
            noise_std = float(np.std(hf[surround_idx]))
            if noise_std > 0.4:
                noise = np.random.normal(0, min(noise_std * 0.8, 6.0), roi.shape).astype(np.float32)
                inp = np.clip(inp.astype(np.float32) + noise * mask_float, 0, 255).astype(np.uint8)

        # 3. Feathered alpha blending: guarantees zero hard seams or boundary lines
        frame[y0:y1, x0:x1] = (roi.astype(np.float32) * inv_feather + inp.astype(np.float32) * feather_3d).astype(np.uint8)

        ff.stdin.write(frame.tobytes())
        n += 1
        if n % 6 == 0 or n == total:
            report(min(98, 5 + int(n * 93 / total)), n,
                   f"Exporting video, processed {n}/{total} frames.")

    cap.release()
    ff.stdin.close()
    ff.wait()

    if ff.returncode != 0:
        raise RuntimeError("FFmpeg encoding failed")
    report(100, n, "Done")
