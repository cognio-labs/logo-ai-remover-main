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


def remove_watermark(src: str, dst: str, progress_cb=None, manual_box=None, alpha: float = 0.30):
    """High-fidelity temporal and reverse-alpha video watermark removal.

    Automatically detects white OR dark Gemini / Veo sparkle watermarks and
    removes them frame-by-frame using calibrated reverse-alpha unblending and
    motion-compensated temporal inpainting.
    """
    import json
    from logo_target import detect_target, measure_alpha_and_polarity

    def report(p, n, stage):
        if progress_cb:
            progress_cb(p, n, stage)

    cap = cv2.VideoCapture(src)
    ok, first = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError("Cannot decode the first video frame")
    h, w = first.shape[:2]
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1

    # Try to detect on first frame; if that fails, sample a few more frames
    box = manual_box
    if box is None:
        box = detect_target(first)

    if box is None:
        # Sample frames at 5%, 10%, 20%, 30% through video to find watermark
        sample_positions = [int(total * f) for f in (0.05, 0.10, 0.20, 0.30, 0.50)]
        for pos in sample_positions:
            cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
            ok_s, sample_frame = cap.read()
            if ok_s:
                box = detect_target(sample_frame)
                if box is not None:
                    break
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        cap.read()  # re-read first frame (already stored)

    if box is None:
        # Last resort: use known Gemini corner geometry
        short_side = min(w, h)
        cx_fb = int(round(w - 0.156 * short_side))
        cy_fb = int(round(h - 0.156 * short_side))
        r_fb = max(4, int(round(0.037 * short_side)))
        sz = r_fb * 2 + 5
        box = (cx_fb - r_fb - 2, cy_fb - r_fb - 2, sz, sz)

    # Auto-measure alpha and polarity (bright vs. dark watermark)
    measured_alpha, is_dark = measure_alpha_and_polarity(first, box)
    # Use measured alpha; override with job alpha if explicitly set away from default
    if abs(alpha - 0.30) > 0.01:
        # Caller explicitly set alpha — use it, but keep polarity
        effective_alpha = float(alpha)
    else:
        effective_alpha = measured_alpha

    # Read all frames into memory (if reasonable) or frame batches
    frames = [first]
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
        if len(frames) % 20 == 0:
            report(min(20, int(len(frames) * 20 / total)), len(frames), "Reading and analyzing video frames")
    cap.release()

    bx, by, bw, bh = box
    cx_wm = bx + bw / 2.0
    cy_wm = by + bh / 2.0
    r_wm = max(bw, bh) / 2.0 * 1.05
    p_wm = 0.68
    # Use effective_alpha (auto-measured) scaled relative to baseline 0.304
    alpha_scale = (effective_alpha / 0.304)

    yy, xx = np.mgrid[:h, :w]
    dx = np.abs(xx - cx_wm) / r_wm
    dy = np.abs(yy - cy_wm) / r_wm
    dist_wm = dx**p_wm + dy**p_wm

    wm_mask_tight = dist_wm <= 1.05
    wm_mask_dilated = cv2.dilate(wm_mask_tight.astype(np.uint8) * 255, np.ones((5, 5), np.uint8)) > 0

    xp = np.array([0.00,  0.20,  0.85,  0.92,  0.97,  1.02,  1.07,  1.11])
    fp = np.array([0.304, 0.302, 0.294, 0.278, 0.185, 0.055, 0.012, 0.000]) * alpha_scale
    a_unblend = np.interp(dist_wm, xp, fp)[:, :, None]

    crop_pad = int(r_wm * 2.2)
    x0 = max(0, int(cx_wm - crop_pad))
    x1 = min(w, int(cx_wm + crop_pad + 1))
    y0 = max(0, int(cy_wm - crop_pad))
    y1 = min(h, int(cy_wm + crop_pad + 1))

    crop_mask = wm_mask_dilated[y0:y1, x0:x1]
    edge_thin = ((dist_wm[y0:y1, x0:x1] >= 0.94) & (dist_wm[y0:y1, x0:x1] <= 1.04)).astype(np.uint8) * 255

    track_y0 = max(0, int(cy_wm - 220))
    track_y1 = min(h, int(cy_wm + 100))
    track_x0 = max(0, int(cx_wm - 350))
    track_x1 = min(w, int(cx_wm + 120))

    command = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "-", "-i", src,
        "-map", "0:v:0", "-map", "1:a?",
        "-c:v", "libx264", "-crf", "14", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-c:a", "copy",
        "-movflags", "+faststart", dst,
    ]
    ff = subprocess.Popen(command, stdin=subprocess.PIPE)

    donor_covered_count = 0
    try:
        for i in range(len(frames)):
            target_f = frames[i]
            target_crop = target_f[y0:y1, x0:x1].copy()

            # High-fidelity unblending with edge refinement
            # Dark watermark: I = (1-a)*B  =>  B = I / (1-a)
            # Bright watermark: I = (1-a)*B + a*255  =>  B = (I - a*255) / (1-a)
            a_local = a_unblend[y0:y1, x0:x1]
            if is_dark:
                unblended_crop = np.clip(
                    target_crop.astype(float) / np.maximum(1.0 - a_local, 0.01),
                    0, 255,
                ).astype(np.uint8)
            else:
                unblended_crop = np.clip(
                    (target_crop.astype(float) - 255.0 * a_local)
                    / np.maximum(1.0 - a_local, 0.01),
                    0, 255,
                ).astype(np.uint8)
            unblended_repaired = cv2.inpaint(unblended_crop, edge_thin, 1, cv2.INPAINT_TELEA)

            # Motion-compensated donor search from neighboring frames
            target_roi = target_f[track_y0:track_y1, track_x0:track_x1]
            t_mask = np.ones(target_roi.shape[:2], np.uint8) * 255
            t_mask[
                int(cy_wm - 30 - track_y0):int(cy_wm + 30 - track_y0),
                int(cx_wm - 30 - track_x0):int(cx_wm + 30 - track_x0),
            ] = 0

            pts0 = cv2.goodFeaturesToTrack(
                cv2.cvtColor(target_roi, cv2.COLOR_BGR2GRAY), 150, 0.01, 7, mask=t_mask
            )

            candidates = []
            if pts0 is not None and len(pts0) >= 8:
                for offset in [-12, -8, -5, -3, -2, -1, 1, 2, 3, 5, 8, 12, 16, 20]:
                    j = i + offset
                    if j < 0 or j >= len(frames):
                        continue
                    other_f = frames[j]
                    other_roi = other_f[track_y0:track_y1, track_x0:track_x1]

                    pts1, status, _ = cv2.calcOpticalFlowPyrLK(
                        cv2.cvtColor(target_roi, cv2.COLOR_BGR2GRAY),
                        cv2.cvtColor(other_roi, cv2.COLOR_BGR2GRAY),
                        pts0,
                        None,
                    )
                    good = status.ravel() == 1
                    if good.sum() < 8:
                        continue

                    p0 = pts0[good].reshape(-1, 2)
                    p1 = pts1[good].reshape(-1, 2)

                    M, inliers = cv2.estimateAffinePartial2D(
                        p1, p0, method=cv2.RANSAC, ransacReprojThreshold=1.2
                    )
                    if M is None or inliers.sum() < 8 or inliers.mean() < 0.65:
                        continue

                    disp = np.linalg.norm(M[:, 2])
                    if disp < 2.5:
                        continue

                    warped_other = cv2.warpAffine(other_f, M, (w, h), flags=cv2.INTER_LINEAR)
                    warped_wm = (
                        cv2.warpAffine(
                            wm_mask_dilated.astype(np.uint8) * 255,
                            M,
                            (w, h),
                            flags=cv2.INTER_NEAREST,
                        )
                        > 0
                    )

                    other_crop = warped_other[y0:y1, x0:x1]
                    valid_donor = ~warped_wm[y0:y1, x0:x1]

                    border_ring = (~crop_mask) & valid_donor
                    if border_ring.sum() < 40:
                        continue

                    diff = target_crop.astype(float) - other_crop.astype(float)
                    offset_col = np.median(diff[border_ring], axis=0)
                    err = float(np.median(np.abs(diff[border_ring] - offset_col)))
                    if err > 5.5 or np.max(np.abs(offset_col)) > 15:
                        continue

                    adj = np.clip(other_crop.astype(float) + offset_col, 0, 255).astype(np.uint8)
                    cov = float((valid_donor & crop_mask).sum() / crop_mask.sum())
                    candidates.append((err, cov, adj, valid_donor))

            out_crop = unblended_repaired.copy()
            remaining = crop_mask.copy()
            if candidates:
                for err, cov, adj, val in sorted(candidates, key=lambda c: (c[0], -c[1])):
                    fill = remaining & val
                    if fill.sum() > 0:
                        out_crop[fill] = adj[fill]
                        remaining[fill] = False

            if remaining.sum() == 0:
                donor_covered_count += 1

            out_frame = target_f.copy()
            out_frame[y0:y1, x0:x1] = out_crop
            ff.stdin.write(out_frame.tobytes())
            report(20 + int((i + 1) * 78 / len(frames)), i + 1, f"Reconstructing frame {i + 1}/{len(frames)}")

    finally:
        ff.stdin.close()
        ff.wait()

    if ff.returncode != 0:
        raise RuntimeError("Video encoding failed.")

    quality = {
        "method": "temporal-motion-compensated-and-unblend",
        "frames": len(frames),
        "donor_coverage_frames": donor_covered_count,
        "donor_coverage_pct": round(donor_covered_count / max(1, len(frames)) * 100, 1),
    }
    with open(dst + ".quality.json", "w", encoding="utf8") as handle:
        json.dump(quality, handle, indent=2)

    report(100, len(frames), "Export completed; inspect clean video preview")
