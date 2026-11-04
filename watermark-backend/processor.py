"""
Video watermark remover (local processing, no external API).
Uses OpenCV (detect + inpaint) and FFmpeg (encode + keep audio).
"""
import subprocess
import cv2
import numpy as np

# Gemini / Veo marks usually sit in the bottom-right corner.
# Search area as a fraction of the frame (width, height).
ROI_W = 0.28
ROI_H = 0.22


def get_roi(width, height, roi_w=ROI_W, roi_h=ROI_H):
    x0 = int(width * (1 - roi_w))
    y0 = int(height * (1 - roi_h))
    return x0, y0, width, height


def detect_mask(video_path, samples=30):
    """Find the watermark pixels in the bottom-right corner.
    The mark is static + brighter than its surroundings, so we use
    the temporal median of sampled frames and a white top-hat filter."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    x0, y0, x1, y1 = get_roi(w, h)

    frames = []
    for idx in np.linspace(0, max(total - 1, 0), samples).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = cap.read()
        if ok:
            frames.append(cv2.cvtColor(frame[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY))
    cap.release()

    if not frames:
        raise RuntimeError("Could not read video frames")

    stack = np.stack(frames).astype(np.float32)
    # A semi-transparent white mark makes a pixel at least (alpha * 255)
    # bright in EVERY frame, even when the background moves. So the low
    # percentile over time keeps the mark but drops moving content.
    low = np.percentile(stack, 10, axis=0).astype(np.uint8)

    # kernel must be larger than the mark so its whole body is detected
    k = max(15, int(min(low.shape) * 0.6) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    tophat = cv2.morphologyEx(low, cv2.MORPH_TOPHAT, kernel)
    thr = max(15, int(0.35 * float(tophat.max())))
    _, mask = cv2.threshold(tophat, thr, 255, cv2.THRESH_BINARY)

    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8), iterations=1)

    # Fallback: if nothing reliable found, use a compact box in the corner
    if cv2.countNonZero(mask) < 40:
        mask[:] = 0
        bh, bw = mask.shape
        mask[int(bh * 0.55):, int(bw * 0.45):] = 255

    return mask, (x0, y0, x1, y1)


def remove_watermark(src, dst, progress_cb=None, manual_box=None):
    """progress_cb(percent, frames_done, stage_text)
    manual_box = (x, y, w, h) in pixels overrides auto-detection."""
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
        x0, y0, x1, y1 = bx, by, min(bx + bw, w), min(by + bh, h)
        mask = np.full((y1 - y0, x1 - x0), 255, np.uint8)
    else:
        mask, (x0, y0, x1, y1) = detect_mask(src)

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "-",
        "-i", src,
        "-map", "0:v:0", "-map", "1:a?",
        "-c:v", "libx264", "-crf", "16", "-preset", "medium",
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
        frame[y0:y1, x0:x1] = cv2.inpaint(roi, mask, 3, cv2.INPAINT_TELEA)
        ff.stdin.write(frame.tobytes())
        n += 1
        if n % 3 == 0:
            report(min(98, 5 + int(n * 93 / total)), n,
                   f"Exporting video, processed {n} frames.")

    cap.release()
    ff.stdin.close()
    ff.wait()

    if ff.returncode != 0:
        raise RuntimeError("FFmpeg encoding failed")
    report(100, n, "Done")
