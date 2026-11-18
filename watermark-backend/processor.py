"""Restore translucent Gemini sparkles and encode the repaired video."""

import json
import os
import subprocess
import tempfile
import time
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

from logo_target import detect_target
from video_stream import (
    YUV_COEFFICIENTS, apply_yuv_delta, encode_colors, encoded_box, frame_rate, read_frame,
    rotation, video_stream, video_timing, yuv_crop,
)


@lru_cache(maxsize=1)
def _sparkle_mattes():
    root = Path(__file__).parent
    alpha = cv2.imread(str(root / "alpha_mask.png"), cv2.IMREAD_UNCHANGED)
    if alpha is None or alpha.ndim != 2 or alpha.dtype != np.uint16:
        raise RuntimeError("The worker needs a 16-bit grayscale alpha_mask.png.")
    primary = alpha.astype(np.float32) / 65535
    shadow_path = root / "shadow_mask.png"
    if shadow_path.is_file():
        shadow = cv2.imread(str(shadow_path), cv2.IMREAD_UNCHANGED)
        if shadow is None or shadow.shape != alpha.shape or shadow.dtype != np.uint16:
            raise RuntimeError("shadow_mask.png must match the 16-bit alpha_mask.png.")
        primary = np.where(primary > 0.02, primary, -shadow.astype(np.float32) / 65535)
    maps = json.loads((root / "gemini_alpha_maps.json").read_text(encoding="utf-8"))
    return (primary,) + tuple(
        np.array(maps[key], dtype=np.float32).reshape(size, size)
        for key, size in (("96", 96), ("36-v2", 36), ("96-20260520", 96))
    )


def _white_response(gray):
    # White compositing becomes an additive signal in log distance from white.
    return -np.log(np.maximum(255.0 - gray.astype(np.float32), 12.0))


def _fit_opacity(patches, matte):
    response = _white_response(patches)
    axes = (1, 0)
    edges = [np.abs(np.diff(matte, axis=axis)) > 0.10 for axis in axes]
    observed = np.concatenate(
        [np.diff(response, axis=axis + 1)[:, edge] for axis, edge in zip(axes, edges)],
        axis=1,
    )
    if not observed.size:
        return None

    def loss(gain):
        predicted = -np.log1p(-matte * gain)
        contour = np.concatenate(
            [np.diff(predicted, axis=axis)[edge] for axis, edge in zip(axes, edges)],
        )
        return np.minimum(np.abs(observed - contour), 0.12).mean()

    max_gain = min(3.0, 0.95 / np.abs(matte).max())
    gain = min(np.linspace(0.2, max_gain, 85), key=loss)
    baseline = loss(0.0)
    error = loss(gain)
    if baseline < 0.03 or error >= baseline * 0.72:
        return None
    return error / baseline, _refine_matte(patches, matte * gain)


def _refine_matte(patches, matte, halo_radius=3):
    """Refine opacity on frames with smooth, locally predictable background."""
    yy, xx = np.mgrid[:matte.shape[0], :matte.shape[1]]
    design = np.stack((np.ones_like(xx), xx, yy), axis=-1)
    support = (matte > 0.02).astype(np.uint8)
    diameter = 2 * halo_radius + 1
    footprint = cv2.dilate(support, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (diameter, diameter))) > 0
    ring = ~footprint
    core = matte > matte.max() * 0.94
    if ring.sum() < 12 or not core.any():
        return matte

    observations = []
    for patch in patches:
        coefficients = np.linalg.lstsq(design[ring], patch[ring], rcond=None)[0]
        background = design @ coefficients
        residual = np.abs(patch[ring] - background[ring])
        error = np.quantile(residual, 0.8)
        if error > 6 or np.mean(background[core]) > 215:
            continue
        delta = patch - background
        estimate = delta / np.where(delta >= 0, np.maximum(255 - background, 24), np.maximum(background, 24))
        if abs(np.median(estimate[core]) - np.median(matte[core])) <= 0.08:
            observations.append((error, estimate))
    if len(observations) < 3:
        return matte
    estimates = np.stack([estimate for _, estimate in sorted(observations, key=lambda item: item[0])[:12]])
    measured = np.median(estimates, axis=0)
    # Keep localized, consistent low-opacity glow and shadow observations.
    negative = np.mean(estimates < -0.012, axis=0) >= 0.8
    positive = np.mean(estimates > 0.012, axis=0) >= 0.8
    outside = footprint & ~support & (negative | positive)
    gain = np.clip(np.median(measured[core]) / np.median(matte[core]), 0.85, 1.15)
    refined = matte * gain
    edge = support.astype(bool) & ~core
    refined[edge] += np.clip(measured[edge] - refined[edge], -0.03, 0.03) * 0.5
    # A negative white response is a dark overlay. Convert its strength using
    # the fitted background level, with a tight bound on faint halo corrections.
    refined[outside] = np.clip(measured[outside], -0.035, 0.035)
    return np.clip(refined, min(-0.035, matte.min()), 0.95).astype(np.float32)


def _search_region(width, height, search_box):
    # Anchor the search to the displayed corner, with enough room for the
    # entire largest catalog mark and its padding.
    edge = round(min(width, height) * 0.23)
    left, top, right, bottom = width - edge, height - edge, width, height
    if search_box is not None:
        x, y, w, h = search_box
        left, top = max(0, x - w // 2), max(0, y - h // 2)
        right, bottom = min(width, x + w + w // 2), min(height, y + h + h // 2)
    return left, top, right, bottom


def _find_calibrated_sparkle(gray, short, origin, hints=False):
    if min(gray.shape[1:]) < 17:
        return None
    left, top = origin
    detail = np.median(
        [plane - cv2.GaussianBlur(plane, (0, 0), 2) for plane in _white_response(gray)],
        axis=0,
    )

    candidates = []
    for template in _sparkle_mattes():
        native = template.shape[0]
        for size in sorted({native, round(native * short / 720), round(short / 15),
                            round(short / 18), round(short / 12)}):
            if not 9 <= size <= min(detail.shape) - 8:
                continue
            matte = np.pad(cv2.resize(template, (size, size)), 4)
            if matte.max() <= 0.02:
                continue
            signature = -np.log1p(-0.3 * np.maximum(matte, 0) / matte.max())
            signature -= cv2.GaussianBlur(signature, (0, 0), 2)
            matches = cv2.matchTemplate(detail, signature, cv2.TM_CCOEFF_NORMED)
            _, score, _, (x, y) = cv2.minMaxLoc(matches)
            if score >= (0.38 if hints else 0.48):
                candidates.append((score, x, y, matte))

    best = None
    best_error = float("inf")
    for _, x, y, matte in sorted(candidates, key=lambda item: -item[0])[:8]:
        h, w = matte.shape
        fit = _fit_opacity(gray[:, y:y+h, x:x+w], matte)
        if fit is not None and fit[0] < best_error:
            best_error, calibrated = fit
            best = (left + x, top + y, w, h), calibrated
    return best


def _restore_calibrated(frame, box, matte, contour, previous=None):
    x, y, w, h = box
    patch = frame[y:y+h, x:x+w]
    matte = matte[:, :, None]
    restored = np.clip((patch - 255.0 * np.maximum(matte, 0)) / np.maximum(1.0 - np.abs(matte), 0.05), 0, 255)
    if not contour.any():
        patch[:] = np.rint(restored).astype(np.uint8)
        return None

    # Repair codec ringing only along the fixed contour. Feather toward the
    # already-restored pixels, keeping the interior texture and exterior intact.
    filled = cv2.inpaint(np.rint(restored).astype(np.uint8), contour, 2, cv2.INPAINT_TELEA)
    delta = filled.astype(np.float32) - restored
    weight = np.minimum(cv2.distanceTransform(contour, cv2.DIST_L2, 3) * 0.8, 1.0)
    weight = np.maximum(weight, (matte[:, :, 0] > 0.85).astype(np.float32))
    correction = delta * weight[:, :, None]
    if previous is not None:
        last_restored, last_correction = previous
        change = np.max(np.abs(restored - last_restored), axis=2)
        stable = (cv2.dilate(change, np.ones((5, 5), np.uint8)) <= 2.0) & (contour > 0)
        correction[stable] = 0.8 * correction[stable] + 0.2 * last_correction[stable]
    patch[:] = np.clip(np.rint(restored + correction), 0, 255).astype(np.uint8)
    return restored, correction


def _restore_tracked(frame, box):
    """Repair the local footprint of a confirmed non-catalog sparkle."""
    x, y, w, h = box
    cx, cy = x + w // 2, y + h // 2
    radius = max(2, (min(w, h) - 5) // 2)
    diagonal = max(1, radius // 4)
    pad = radius + 5
    left, top = max(0, cx - pad), max(0, cy - pad)
    patch = frame[top:cy+pad+1, left:cx+pad+1]
    mask = np.zeros(patch.shape[:2], np.uint8)
    points = np.array([
        (0, -radius), (diagonal, -diagonal), (radius, 0), (diagonal, diagonal),
        (0, radius), (-diagonal, diagonal), (-radius, 0), (-diagonal, -diagonal),
    ], dtype=np.int32)
    cv2.fillPoly(mask, [points + (cx - left, cy - top)], 255)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    patch[:] = cv2.inpaint(patch, mask, 2, cv2.INPAINT_NS)


def _sample_gray(src, region, total):
    left, top, right, bottom = region
    width, height = right - left, bottom - top
    last = total - 1
    indices = np.linspace(0, last, min(total, 41), dtype=int)
    select = "+".join(f"eq(n,{i})" for i in indices)
    filters = f"select='{select}',format=bgr24,crop={width}:{height}:{left}:{top}:exact=1"
    data = subprocess.check_output([
        "ffmpeg", "-nostdin", "-v", "error", "-threads", "2", "-noautorotate",
        "-i", src, "-map", "0:V:0", "-filter_threads", "2", "-vf", filters,
        "-fps_mode", "passthrough", "-c:v", "rawvideo", "-threads", "1",
        "-f", "rawvideo", "pipe:1",
    ])
    if len(data) != len(indices) * height * width * 3:
        raise RuntimeError("Could not decode the watermark calibration frames.")
    crops = np.frombuffer(data, np.uint8).reshape(-1, height, width, 3)
    return np.stack([cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) for crop in crops])


def _find_tracked_start(src, total, manual_box):
    capture = cv2.VideoCapture(src)
    capture.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0)
    try:
        for index in np.linspace(0, total - 1, min(total, 12), dtype=int):
            capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            ok, frame = capture.read()
            if ok and (box := detect_target(frame, manual_box)) is not None:
                return box
    finally:
        capture.release()
    raise ValueError("No confident Gemini sparkle was detected. Try Manual position over the visible sparkle.")


def _write_debug_crop(directory, index, frame, box, raw_crop):
    x, y, w, h = box
    left, top = max(0, x - 12), max(0, y - 12)
    after = frame[top:y+h+12, left:x+w+12]
    zoomed = cv2.resize(np.hstack((raw_crop, after)), None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(str(directory / f"frame-{index:05d}-before-after.png"), zoomed)
    overlay = raw_crop.copy()
    cv2.rectangle(overlay, (x - left, y - top), (x + w - left - 1, y + h - top - 1), (0, 255, 255), 1)
    cv2.imwrite(str(directory / f"frame-{index:05d}-box.png"), overlay)


def remove_watermark(src, dst, progress_cb=None, manual_box=None, alpha=0.30,
                     *, normalized_box=None, debug_dir=None, allow_tracking=True, lama_path=None):
    """Recover the visible sparkle on a bounded crop and stream the full video."""
    def report(percent, frames, message):
        if progress_cb:
            progress_cb(percent, frames, message)

    src, dst = str(Path(src).resolve()), Path(dst).resolve()
    report(2, 0, "Reading source frame timing and color information")
    stream = video_stream(src)
    width, height = stream["width"], stream["height"]
    if stream.get("color_transfer") in {"smpte2084", "arib-std-b67"}:
        raise ValueError("HDR input needs an SDR export for color-accurate cleanup.")
    rate = frame_rate(stream)
    total, timing_filters, input_offset, raw_rate, encoder_time_base = video_timing(src, stream, rate)

    degrees = rotation(stream)
    if normalized_box is not None:
        manual_box = encoded_box(normalized_box, width, height, degrees)
    edge = round(min(width, height) * 0.23)
    if degrees and manual_box is None:
        display_w, display_h = (height, width) if round(degrees / 90) % 2 else (width, height)
        manual_search = encoded_box((1-edge/display_w, 1-edge/display_h, edge/display_w, edge/display_h),
                                    width, height, degrees)
        x, y, w, h = manual_search
        region = x, y, x + w, y + h
    else:
        region = _search_region(width, height, manual_box)
    left, top, right, bottom = region
    if min(right - left, bottom - top) < 17:
        raise ValueError("The watermark selection is too small.")

    report(5, 0, "Finding the sparkle and calibrating opacity across the video")
    samples = _sample_gray(src, region, total)
    calibrated = _find_calibrated_sparkle(samples, min(width, height), (left, top),
                                          hints=manual_box is not None)
    weights = lama_path or os.environ.get("LAMA_MODEL_PATH")
    if not weights:
        candidates = [
            Path(__file__).resolve().parent.parent / "artifacts" / "big-lama.pt",
            Path(__file__).resolve().parent / "big-lama.pt",
            Path(__file__).resolve().parent / "artifacts" / "big-lama.pt",
        ]
        for candidate in candidates:
            if candidate.is_file():
                weights = str(candidate)
                break
    lama = None
    if calibrated is None:
        if not allow_tracking:
            raise ValueError("No fixed Gemini sparkle was detected. Try Manual position over the visible sparkle.")
        box = _find_tracked_start(src, total, manual_box)
        matte = contour = None
    else:
        box, matte = calibrated
        if weights:
            from lama_residual import LamaResidual

            x, y, w, h = box
            x0, y0 = max(left, x - 14), max(top, y - 14)
            x1, y1 = min(right, x + w + 14), min(bottom, y + h + 14)
            matte = np.pad(matte, ((y-y0, y1-y-h), (x-x0, x1-x-w)))
            expanded = _refine_matte(samples[:, y0-top:y1-top, x0-left:x1-left], matte, halo_radius=10)
            matte = np.where(np.abs(matte) < 0.012, expanded, matte).astype(np.float32)
            box = (x0, y0, x1 - x0, y1 - y0)
            lama = LamaResidual(str(Path(weights).resolve()), matte)
        support = (matte > matte.max() * 0.5).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        contour = cv2.morphologyEx(support, cv2.MORPH_GRADIENT, kernel) * 255
        contour[matte > 0.85] = 255
    del samples

    debug = Path(debug_dir) if debug_dir else None
    if debug is not None:
        debug.mkdir(parents=True, exist_ok=True)
        if calibrated is not None:
            cv2.imwrite(str(debug / "alpha.png"), np.rint(np.maximum(matte, 0) * 65535).astype(np.uint16))
            cv2.imwrite(str(debug / "shadow-alpha.png"), np.rint(np.maximum(-matte, 0) * 65535).astype(np.uint16))
            cv2.imwrite(str(debug / "residual-mask.png"), lama.mask.astype(np.uint8) * 255 if lama else contour)
            if lama:
                cv2.imwrite(str(debug / "feather-mask.png"), np.rint(lama.feather * 65535).astype(np.uint16))

    report(8, 0, "Sparkle detected. Restoring and encoding video")
    started = time.monotonic()
    coefficients = YUV_COEFFICIENTS.get(stream.get("color_space") or "unknown")
    native_yuv = (
        calibrated is not None and stream.get("pix_fmt") == "yuv420p"
        and width % 2 == height % 2 == 0 and coefficients is not None
    )
    full_range = stream.get("color_range") == "pc"
    if native_yuv:
        x, y, w, h = box
        x0, y0 = max(0, x - 12) & ~1, max(0, y - 12) & ~1
        x1, y1 = min(width, (x + w + 13) & ~1), min(height, (y + h + 13) & ~1)
        native_region = (x0, y0, x1, y1)
        local_box = (x - x0, y - y0, w, h)
    colors, color_filters = encode_colors(stream, native_yuv)
    frame_count = 0
    tracked = box
    previous = None
    debug_indices = {0, total // 2, total - 1}
    with tempfile.TemporaryDirectory(prefix="encode-", dir=dst.parent) as temp:
        temp = Path(temp)
        encoded = temp / "encoded.mp4"
        filters = timing_filters + color_filters
        filter_args = []
        if filters:
            filter_path = temp / "filter.txt"
            filter_path.write_text(",".join(filters), encoding="ascii")
            filter_args = ["-filter_script:v", str(filter_path)]
        timing_args = ["-enc_time_base", str(encoder_time_base)] if encoder_time_base else []
        # yuv420p requires even dimensions. Use 4:4:4 for a source with an odd side.
        pixel_format = "yuv420p" if width % 2 == height % 2 == 0 else "yuv444p"
        pipe_format = "yuv420p" if native_yuv else "bgr24"
        decode = [
            "ffmpeg", "-nostdin", "-v", "error", "-threads", "2", "-noautorotate", "-i", src,
            "-map", "0:V:0", "-fps_mode", "passthrough", "-filter_threads", "2",
            "-pix_fmt", pipe_format, "-c:v", "rawvideo", "-threads", "1", "-f", "rawvideo", "pipe:1",
        ]
        encode = [
            "ffmpeg", "-nostdin", "-y", "-v", "error", "-copyts", *input_offset,
            "-f", "rawvideo", "-pixel_format", pipe_format, "-video_size", f"{width}x{height}",
            "-framerate", str(raw_rate), "-i", "pipe:0", "-i", src,
            "-map", "0:v:0", "-map", "1:a?", "-map_metadata", "1",
            "-filter_threads", "2", *filter_args, *timing_args,
            "-fps_mode", "passthrough", "-c:v", "libx264", "-threads", "4",
            "-crf", "14", "-preset", "slow", "-pix_fmt", pixel_format, *colors,
            "-c:a", "copy", "-movflags", "+faststart", str(encoded),
        ]
        with subprocess.Popen(decode, stdout=subprocess.PIPE) as decoder:
            try:
                with subprocess.Popen(encode, stdin=subprocess.PIPE) as encoder:
                    try:
                        while (frame := read_frame(decoder.stdout, width, height, native_yuv)) is not None:
                            current = box
                            working = frame
                            if native_yuv:
                                working, planes = yuv_crop(frame, width, height, native_region, coefficients,
                                                           full_range, floating=lama is not None)
                                original = working.copy()
                                current = local_box
                            if calibrated is None:
                                current = detect_target(frame, tracked)
                                if current is not None:
                                    tracked = current
                            raw_crop = None
                            if debug is not None and frame_count in debug_indices:
                                x, y, w, h = current or tracked
                                raw_crop = working[max(0,y-12):y+h+12, max(0,x-12):x+w+12].copy()
                            if lama is not None:
                                x, y, w, h = current
                                patch = working[y:y+h, x:x+w]
                                repaired = lama.repair(patch, matte)
                                patch[:] = repaired if native_yuv else np.rint(repaired).astype(np.uint8)
                            elif calibrated is not None:
                                previous = _restore_calibrated(working, current, matte, contour, previous)
                            elif current is not None:
                                _restore_tracked(frame, current)
                            if native_yuv:
                                apply_yuv_delta(original, working, planes, coefficients, full_range)
                            if raw_crop is not None:
                                _write_debug_crop(debug, frame_count, np.rint(working).astype(np.uint8),
                                                  current or tracked, np.rint(raw_crop).astype(np.uint8))
                            encoder.stdin.write(memoryview(frame).cast("B"))
                            frame_count += 1
                            if frame_count % 12 == 0 or frame_count == total:
                                report(min(98, 8 + int(frame_count * 90 / total)), frame_count,
                                       f"Restoring and encoding frame {frame_count}/{total}")
                        encoder.stdin.close()
                        if encoder.wait() or decoder.wait() or frame_count != total:
                            raise RuntimeError("Video encoding failed or the output frame count changed.")
                    finally:
                        if encoder.poll() is None:
                            encoder.kill()
            finally:
                if decoder.poll() is None:
                    decoder.kill()

        if degrees:
            rotated = temp / "rotated.mp4"
            subprocess.run([
                "ffmpeg", "-nostdin", "-y", "-v", "error", "-copyts",
                "-display_rotation:v:0", str(degrees),
                "-i", str(encoded), "-map", "0", "-c", "copy", "-movflags", "+faststart", str(rotated),
            ], check=True)
            encoded = rotated
        os.replace(encoded, dst)

    quality = {
        "method": ("calibrated-inverse-alpha-lama" if lama else "calibrated-inverse-alpha"
                   if calibrated is not None else "tracked-sparkle-inpainting"),
        "frames_processed": frame_count, "total_frames": total,
        "width": width, "height": height, "fps": float(rate),
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "watermark_box": list(box), "rotation": degrees,
    }
    Path(str(dst) + ".quality.json").write_text(json.dumps(quality, indent=2), encoding="utf8")
    report(100, frame_count, "MP4 is ready for review")
    return str(dst)
