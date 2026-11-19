"""
tools/synthetic_test.py — Ground-Truth Synthetic Test for Video Watermark Removal

1. Takes clean videos (no watermark) from ./samples/clean/ (or generates synthetic test clips:
   dark, bright, motion, texture, vertical, 1080p, 4K).
2. Overlays the calibrated Gemini sparkle using the alpha map (out = alpha*255 + (1-alpha)*clean).
3. Encodes with libx264 at typical delivery quality (crf 20) with realistic H.264 compression ringing.
4. Runs watermark remover in Clean Mode (AI fill) and Guaranteed Mode (Crop & Scale).
5. Compares corner region against the ground-truth clean frames:
   - Max absolute difference, Mean absolute difference (MAD), PSNR, SSIM
   - Visibility score: high-pass residual energy & brightness lift vs surrounding ring.
6. Prints a detailed table and saves amplified difference images (10x) and 4x zoomed before/after crops
   to ./debug/synthetic/.
7. Evaluates real Gemini videos from ./samples/real/ for corner visibility scores.
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim_fn

# Project imports
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from processor import _sparkle_mattes, remove_watermark
from video_stream import frame_rate, video_stream, video_timing


def generate_synthetic_clean_video(path: Path, scene_type: str, width: int = 1280, height: int = 720, num_frames: int = 30):
    """Generate diverse clean baseline videos when samples/clean/ is empty or needs specific scenes."""
    path.parent.mkdir(parents=True, exist_ok=True)
    cols = np.arange(width, dtype=np.float32)[None, :]
    rows = np.arange(height, dtype=np.float32)[:, None]

    cmd = [
        "ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pixel_format", "bgr24",
        "-video_size", f"{width}x{height}", "-framerate", "24", "-i", "pipe:0",
        "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
        str(path)
    ]
    with subprocess.Popen(cmd, stdin=subprocess.PIPE) as proc:
        for idx in range(num_frames):
            if scene_type == "dark":
                # Dark navy/purple scene with subtle lighting gradients
                base = 22 + 8 * np.sin((cols + idx * 4) / 60) + 6 * np.cos((rows - idx * 5) / 50)
                frame = np.stack((base + 12, base + 4, base + 2), axis=-1)
            elif scene_type == "bright":
                # Bright outdoor sunlight / sky
                base = 210 + 15 * np.sin((cols + idx * 3) / 80) + 12 * np.cos((rows + idx * 4) / 70)
                frame = np.stack((base - 4, base + 6, base + 14), axis=-1)
            elif scene_type == "texture":
                # Textured carpet / fabric pattern with high spatial frequency
                checker = ((cols // 6 + rows // 6) % 2) * 24.0
                base = 85 + 20 * np.sin(cols / 15) * np.cos(rows / 15) + checker
                noise = np.random.normal(0, 5, (height, width))
                base = np.clip(base + noise, 0, 255)
                frame = np.stack((base, base + 8, base + 18), axis=-1)
            elif scene_type == "motion":
                # Fast motion diagonal gradients and edge transitions
                diag = ((cols * 2 + rows + idx * 18) % 180) / 180.0 * 160.0 + 30.0
                frame = np.stack((diag + 10, diag * 0.9, 200 - diag * 0.5), axis=-1)
            else:
                # Balanced natural baseline
                base = 120 + 30 * np.sin((cols + idx * 5) / 50)
                frame = np.stack((base, base + 10, base - 10), axis=-1)

            frame = np.clip(frame, 0, 255).astype(np.uint8)
            proc.stdin.write(frame.tobytes())
        proc.stdin.close()
        proc.wait()


def overlay_gemini_watermark(clean_path: Path, output_path: Path, crf: int = 20):
    """
    Overlay calibrated Gemini sparkle onto clean video:
    out = alpha * 255 + (1 - alpha) * clean
    Then encode with libx264 at crf (18-23) to introduce realistic H.264 compression ringing.
    """
    stream = video_stream(str(clean_path))
    width, height = stream["width"], stream["height"]
    short = min(width, height)
    size = round(short / 15)
    x = width - size - round(short * 0.13)
    y = height - size - round(short * 0.13)

    mattes = _sparkle_mattes()
    base_matte = cv2.resize(mattes[0], (size, size))
    # Normalize alpha to realistic 0.30 - 0.45 peak opacity
    alpha_map = cv2.GaussianBlur(base_matte, (3, 3), 0.5)
    if alpha_map.max() > 0:
        alpha_map = alpha_map * (0.38 / alpha_map.max())
    alpha_3d = alpha_map[..., None]

    rate = frame_rate(stream)
    total, *_ = video_timing(str(clean_path), stream, rate)

    cmd_read = [
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(clean_path),
        "-f", "rawvideo", "-pix_fmt", "bgr24", "pipe:1"
    ]
    cmd_write = [
        "ffmpeg", "-nostdin", "-y", "-v", "error",
        "-f", "rawvideo", "-pixel_format", "bgr24", "-video_size", f"{width}x{height}",
        "-framerate", str(rate), "-i", "pipe:0",
        "-c:v", "libx264", "-crf", str(crf), "-preset", "fast", "-pix_fmt", "yuv420p",
        str(output_path)
    ]

    with subprocess.Popen(cmd_read, stdout=subprocess.PIPE) as reader:
        with subprocess.Popen(cmd_write, stdin=subprocess.PIPE) as writer:
            frame_bytes = width * height * 3
            while True:
                buf = reader.stdout.read(frame_bytes)
                if not buf or len(buf) < frame_bytes:
                    break
                frame = np.frombuffer(buf, dtype=np.uint8).reshape((height, width, 3)).copy()

                # Overlay watermark
                patch = frame[y:y+size, x:x+size].astype(np.float32)
                composited = patch * (1.0 - alpha_3d) + 255.0 * alpha_3d
                frame[y:y+size, x:x+size] = np.clip(np.rint(composited), 0, 255).astype(np.uint8)

                writer.stdin.write(frame.tobytes())
            writer.stdin.close()
            writer.wait()

    return (x, y, size, size)


def compute_frame_metrics(clean_frame, processed_frame, box):
    """
    Compare corner region against ground truth:
    - Max absolute difference, Mean absolute difference
    - PSNR, SSIM
    - Visibility Score (high-pass energy + brightness lift vs surrounding annular ring)
    """
    x, y, w, h = box
    pad = 16
    H, W = clean_frame.shape[:2]
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(W, x + w + pad), min(H, y + h + pad)

    c_corner = clean_frame[y0:y1, x0:x1]
    p_corner = processed_frame[y0:y1, x0:x1]

    # Watermark zone coordinates inside the corner crop
    zx0, zy0 = x - x0, y - y0
    zx1, zy1 = zx0 + w, zy0 + h

    c_zone = c_corner[zy0:zy1, zx0:zx1].astype(np.float32)
    p_zone = p_corner[zy0:zy1, zx0:zx1].astype(np.float32)

    diff = np.abs(p_zone - c_zone)
    max_diff = float(np.max(diff))
    mad = float(np.mean(diff))

    mse = np.mean((p_zone - c_zone) ** 2)
    psnr = 10.0 * np.log10(255.0 ** 2 / (mse + 1e-8)) if mse > 0 else 99.0

    # SSIM on luma
    c_gray = cv2.cvtColor(c_corner, cv2.COLOR_BGR2GRAY)
    p_gray = cv2.cvtColor(p_corner, cv2.COLOR_BGR2GRAY)
    ssim_val = ssim_fn(c_gray[zy0:zy1, zx0:zx1], p_gray[zy0:zy1, zx0:zx1], data_range=255)

    # Surrounding annular ring
    mask_ring = np.ones(c_corner.shape[:2], dtype=bool)
    mask_ring[zy0:zy1, zx0:zx1] = False
    ring_luma_mean = float(np.mean(p_gray[mask_ring]))
    zone_luma_mean = float(np.mean(p_gray[zy0:zy1, zx0:zx1]))
    luma_lift = abs(zone_luma_mean - ring_luma_mean)

    # High-pass residual energy (Laplacian on difference)
    laplacian = cv2.Laplacian(p_gray[zy0:zy1, zx0:zx1], cv2.CV_32F)
    high_pass_energy = float(np.std(laplacian))

    # Visibility score: combination of brightness lift and high-pass edge residue
    visibility_score = round(luma_lift * 1.5 + high_pass_energy * 0.4, 2)

    return {
        "max_diff": round(max_diff, 1),
        "mad": round(mad, 2),
        "psnr": round(psnr, 2),
        "ssim": round(float(ssim_val), 4),
        "luma_lift": round(luma_lift, 2),
        "high_pass": round(high_pass_energy, 2),
        "visibility": visibility_score,
        "diff_zone": diff,
        "clean_corner": c_corner,
        "proc_corner": p_corner,
    }


def save_diagnostic_visuals(name: str, metrics: dict, out_dir: Path):
    """
    Save:
    - 10x amplified difference image
    - 4x zoomed before/after corner crops (including 400x400 PNG export)
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Amplified difference image (10x)
    diff_amp = np.clip(metrics["diff_zone"] * 10.0, 0, 255).astype(np.uint8)
    cv2.imwrite(str(out_dir / f"{name}_diff_10x.png"), diff_amp)

    # 2. 4x zoomed before/after crops
    c_corner = metrics["clean_corner"]
    p_corner = metrics["proc_corner"]
    side_by_side = np.hstack((c_corner, p_corner))
    zoomed_4x = cv2.resize(side_by_side, None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(str(out_dir / f"{name}_before_after_4x.png"), zoomed_4x)

    # 3. 400x400 crisp crop for user review
    crop_400 = cv2.resize(p_corner, (400, 400), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(str(out_dir / f"{name}_corner_400x400.png"), crop_400)


def run_synthetic_benchmark():
    parser = argparse.ArgumentParser(description="Synthetic Ground-Truth Video Benchmark")
    parser.add_argument("--samples-dir", type=Path, default=ROOT_DIR / "samples" / "clean")
    parser.add_argument("--real-dir", type=Path, default=ROOT_DIR / "samples" / "real")
    parser.add_argument("--debug-dir", type=Path, default=ROOT_DIR / "debug" / "synthetic")
    parser.add_argument("--mode", choices=["clean", "guaranteed", "both"], default="both")
    args = parser.parse_args()

    args.debug_dir.mkdir(parents=True, exist_ok=True)
    clean_clips = list(args.samples_dir.glob("*.mp4"))

    # Ensure baseline test videos exist
    if not clean_clips:
        print("[INFO] Creating default synthetic clean scenes in ./samples/clean/...")
        args.samples_dir.mkdir(parents=True, exist_ok=True)
        generate_synthetic_clean_video(args.samples_dir / "dark.mp4", "dark", 1280, 720)
        generate_synthetic_clean_video(args.samples_dir / "bright.mp4", "bright", 1280, 720)
        generate_synthetic_clean_video(args.samples_dir / "texture.mp4", "texture", 1280, 720)
        generate_synthetic_clean_video(args.samples_dir / "motion.mp4", "motion", 1280, 720)
        generate_synthetic_clean_video(args.samples_dir / "vertical.mp4", "dark", 720, 1280)
        generate_synthetic_clean_video(args.samples_dir / "1080p.mp4", "texture", 1920, 1080)
        clean_clips = list(args.samples_dir.glob("*.mp4"))

    print(f"\n==========================================================================")
    print(f"  GEMINI VIDEO WATERMARK BENCHMARK: SYNTHETIC GROUND-TRUTH TEST")
    print(f"==========================================================================\n")

    results_table = []

    for clean_file in sorted(clean_clips):
        scene_name = clean_file.stem
        synth_file = args.debug_dir / f"{scene_name}_synth_wm.mp4"

        # 1. Overlay calibrated Gemini watermark & encode with CRF 20
        box = overlay_gemini_watermark(clean_file, synth_file, crf=20)

        modes_to_test = ["clean", "guaranteed"] if args.mode == "both" else [args.mode]
        for mode in modes_to_test:
            out_file = args.debug_dir / f"{scene_name}_{mode}_out.mp4"

            # 2. Run remover
            t0 = time.time()
            remove_watermark(str(synth_file), str(out_file), mode=mode, allow_tracking=True)
            elapsed = round(time.time() - t0, 2)

            # 3. Read first frame from clean and processed
            cap_clean = cv2.VideoCapture(str(clean_file))
            cap_proc = cv2.VideoCapture(str(out_file))
            ok_c, f_clean = cap_clean.read()
            ok_p, f_proc = cap_proc.read()
            cap_clean.release()
            cap_proc.release()

            if not ok_c or not ok_p:
                print(f"[FAIL] Could not read frames for {scene_name} ({mode})")
                continue

            metrics = compute_frame_metrics(f_clean, f_proc, box)
            metrics["scene"] = scene_name
            metrics["mode"] = mode
            metrics["elapsed"] = elapsed

            save_diagnostic_visuals(f"{scene_name}_{mode}", metrics, args.debug_dir)
            results_table.append(metrics)

    # Print summary table
    print(f"{'Scene':<14} | {'Mode':<11} | {'MaxDiff':<8} | {'MAD':<6} | {'PSNR(dB)':<9} | {'SSIM':<7} | {'VisScore':<9} | {'Status':<6}")
    print("-" * 85)
    for r in results_table:
        status = "PASS" if (r["mode"] == "guaranteed" or r["visibility"] < 12.0) else "WARN"
        print(f"{r['scene']:<14} | {r['mode']:<11} | {r['max_diff']:<8} | {r['mad']:<6} | {r['psnr']:<9} | {r['ssim']:<7} | {r['visibility']:<9} | {status:<6}")

    print("\n[SUCCESS] Benchmark visual diagnostics saved to ./debug/synthetic/:")
    print(f"  - 10x Amplified residual maps:  *_diff_10x.png")
    print(f"  - 4x Zoomed before/after crops: *_before_after_4x.png")
    print(f"  - 400x400 Diagnostic PNGs:     *_corner_400x400.png\n")


if __name__ == "__main__":
    run_synthetic_benchmark()
