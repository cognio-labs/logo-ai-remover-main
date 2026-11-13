"""
Benchmark and prototype comparing watermark removal methods:
1. Reverse-Alpha Calibrated Unblend (Current Engine)
2. OpenCV TELEA Inpainting
3. OpenCV Navier-Stokes (NS) Inpainting
4. Temporal Motion-Compensated Flow Inpainting (ProPainter Flow-Guided Architecture)

Test video: gemini_generated_video_8b06dd52.mp4
Target frames: 0, 63, 120, 180, 239
"""

import os
import sys
import time
import json
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo_target import detect_target, measure_alpha_and_polarity

def run_benchmark():
    video_path = os.path.expandvars(r"%USERPROFILE%\Downloads\gemini_generated_video_8b06dd52.mp4")
    out_dir = r"C:\Users\PC\.gemini\antigravity\brain\75266caf-28aa-4da6-afa3-a16e6a263e1b\benchmark"
    os.makedirs(out_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Loaded {video_path}: {total_frames} frames, {fps} fps")

    # Read all frames into memory
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    cap.release()
    print(f"Read {len(frames)} frames into memory.")

    h, w = frames[0].shape[:2]

    # Detect watermark box on frame 63 or 0
    box = detect_target(frames[63]) or detect_target(frames[0])
    if not box:
        box = (1131, 571, 59, 59)
    print(f"Target watermark box: {box}")

    bx, by, bw, bh = box
    cx = bx + bw / 2.0
    cy = by + bh / 2.0
    r = max(bw, bh) / 2.0 * 1.05
    p = 0.68

    # Create coordinate grid and distance map
    pad = int(r * 2.2)
    x0, x1 = max(0, int(cx - pad)), min(w, int(cx + pad + 1))
    y0, y1 = max(0, int(cy - pad)), min(h, int(cy + pad + 1))

    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx = np.abs(xx - cx) / r
    dy = np.abs(yy - cy) / r
    dist = dx**p + dy**p

    # Mask for inpainting (dist <= 1.05)
    inpaint_mask = (dist <= 1.05).astype(np.uint8) * 255
    inpaint_mask_dilated = cv2.dilate(inpaint_mask, np.ones((5, 5), np.uint8))

    # Reverse-alpha map
    xp = np.array([0.00,  0.20,  0.85,  0.92,  0.97,  1.02,  1.07,  1.11])
    fp = np.array([0.304, 0.302, 0.294, 0.278, 0.185, 0.055, 0.012, 0.000])
    alpha_map = np.interp(dist, xp, fp)[:, :, None]

    target_frames = [0, 63, 120, 180, 239]
    metrics = {
        "telea_time_ms": [],
        "ns_time_ms": [],
        "unblend_time_ms": [],
        "flow_inpaint_time_ms": [],
    }

    # Store results per frame
    results = {}

    for f_idx in target_frames:
        frame = frames[f_idx]
        orig_crop = frame[y0:y1, x0:x1].copy()

        # 1. Reverse-Alpha Calibrated Unblend
        t0 = time.perf_counter()
        ring_mask = (dist >= 1.2) & (dist <= 1.6)
        border_pixels = orig_crop[ring_mask]
        b_ref = np.median(border_pixels, axis=0) if len(border_pixels) > 10 else orig_crop.mean(axis=(0, 1))
        floor_b = 0.88 * b_ref
        a_limit = np.clip((orig_crop.astype(float) - floor_b) / np.maximum(255.0 - floor_b, 1.0), 0.0, 0.99)
        eff_a = np.minimum(alpha_map, a_limit)
        unblended_crop = np.clip(
            (orig_crop.astype(float) - 255.0 * eff_a) / np.maximum(1.0 - eff_a, 0.02),
            0, 255
        ).astype(np.uint8)
        # Thin edge polish
        edge_thin = ((dist >= 0.92) & (dist <= 1.05)).astype(np.uint8) * 255
        unblend_result = cv2.inpaint(unblended_crop, edge_thin, 2, cv2.INPAINT_TELEA)
        metrics["unblend_time_ms"].append((time.perf_counter() - t0) * 1000)

        # 2. OpenCV TELEA Inpainting
        t0 = time.perf_counter()
        telea_crop = cv2.inpaint(orig_crop, inpaint_mask_dilated, 3, cv2.INPAINT_TELEA)
        metrics["telea_time_ms"].append((time.perf_counter() - t0) * 1000)

        # 3. OpenCV Navier-Stokes Inpainting
        t0 = time.perf_counter()
        ns_crop = cv2.inpaint(orig_crop, inpaint_mask_dilated, 3, cv2.INPAINT_NS)
        metrics["ns_time_ms"].append((time.perf_counter() - t0) * 1000)

        # 4. Temporal Motion-Compensated Flow Inpainting (ProPainter Flow-Guided Paradigm)
        t0 = time.perf_counter()
        # Search neighboring frames for flow-aligned donor patch
        track_y0 = max(0, int(cy - 200))
        track_y1 = min(h, int(cy + 100))
        track_x0 = max(0, int(cx - 300))
        track_x1 = min(w, int(cx + 100))

        target_roi = frame[track_y0:track_y1, track_x0:track_x1]
        t_mask = np.ones(target_roi.shape[:2], np.uint8) * 255
        t_mask[int(cy - 30 - track_y0):int(cy + 30 - track_y0), int(cx - 30 - track_x0):int(cx + 30 - track_x0)] = 0
        pts0 = cv2.goodFeaturesToTrack(cv2.cvtColor(target_roi, cv2.COLOR_BGR2GRAY), 120, 0.01, 7, mask=t_mask)

        flow_crop = unblend_result.copy()
        best_candidate = None
        best_err = 999.0

        if pts0 is not None and len(pts0) >= 8:
            for offset in [-15, -10, -6, -3, -1, 1, 3, 6, 10, 15]:
                j = f_idx + offset
                if j < 0 or j >= len(frames):
                    continue
                other_frame = frames[j]
                other_roi = other_frame[track_y0:track_y1, track_x0:track_x1]
                pts1, st, _ = cv2.calcOpticalFlowPyrLK(
                    cv2.cvtColor(target_roi, cv2.COLOR_BGR2GRAY),
                    cv2.cvtColor(other_roi, cv2.COLOR_BGR2GRAY),
                    pts0, None
                )
                good = st.ravel() == 1
                if good.sum() < 8:
                    continue
                M, inliers = cv2.estimateAffinePartial2D(pts1[good], pts0[good], method=cv2.RANSAC, ransacReprojThreshold=1.2)
                if M is None or inliers.sum() < 8 or inliers.mean() < 0.65:
                    continue
                disp = np.linalg.norm(M[:, 2])
                if disp < 2.0:
                    continue
                warped_other = cv2.warpAffine(other_frame, M, (w, h), flags=cv2.INTER_LINEAR)
                warped_wm = cv2.warpAffine(inpaint_mask_dilated, M, (w, h), flags=cv2.INTER_NEAREST) > 0
                warped_valid = cv2.warpAffine(np.ones((h, w), dtype=np.uint8)*255, M, (w, h), flags=cv2.INTER_NEAREST) == 255
                donor_patch = warped_other[y0:y1, x0:x1]
                valid_donor = (~warped_wm[y0:y1, x0:x1]) & warped_valid[y0:y1, x0:x1]
                border_valid = (~(inpaint_mask_dilated > 0)) & valid_donor
                if border_valid.sum() < 30:
                    continue
                diff = orig_crop.astype(float) - donor_patch.astype(float)
                col_offset = np.median(diff[border_valid], axis=0)
                err = float(np.median(np.abs(diff[border_valid] - col_offset)))
                if err < best_err:
                    best_err = err
                    adj_donor = np.clip(donor_patch.astype(float) + col_offset, 0, 255).astype(np.uint8)
                    best_candidate = (adj_donor, valid_donor)

        if best_candidate is not None:
            adj_donor, valid_donor = best_candidate
            fill_mask = (inpaint_mask_dilated > 0) & valid_donor
            flow_crop[fill_mask] = adj_donor[fill_mask]

        metrics["flow_inpaint_time_ms"].append((time.perf_counter() - t0) * 1000)

        # Save individual method crops
        cv2.imwrite(os.path.join(out_dir, f"f{f_idx}_1_orig.png"), orig_crop)
        cv2.imwrite(os.path.join(out_dir, f"f{f_idx}_2_unblend.png"), unblend_result)
        cv2.imwrite(os.path.join(out_dir, f"f{f_idx}_3_telea.png"), telea_crop)
        cv2.imwrite(os.path.join(out_dir, f"f{f_idx}_4_ns.png"), ns_crop)
        cv2.imwrite(os.path.join(out_dir, f"f{f_idx}_5_flow_propainter_paradigm.png"), flow_crop)

        # Build comparison strip: [Original | Reverse-Alpha | TELEA | Navier-Stokes | Flow-Inpaint]
        strip = cv2.hconcat([orig_crop, unblend_result, telea_crop, ns_crop, flow_crop])
        cv2.imwrite(os.path.join(out_dir, f"comparison_strip_f{f_idx}.png"), strip)
        print(f"Frame {f_idx} processed and saved.")

    # Compute average times
    avg_times = {k: float(np.mean(v)) for k, v in metrics.items()}
    print("\nBenchmark Timing (Average ms per frame):")
    for k, v in avg_times.items():
        print(f"  {k}: {v:.2f} ms")

    # Evaluate consecutive sequence (f60 to f66) for temporal flickering variance
    flicker_scores = {"unblend": [], "telea": [], "ns": [], "flow": []}
    prev_crops = None
    for seq_idx in range(60, 67):
        curr_frame = frames[seq_idx]
        c_orig = curr_frame[y0:y1, x0:x1].copy()

        # Unblend
        r_mask = (dist >= 1.2) & (dist <= 1.6)
        b_p = c_orig[r_mask]
        b_r = np.median(b_p, axis=0) if len(b_p) > 10 else c_orig.mean(axis=(0, 1))
        f_b = 0.88 * b_r
        a_lim = np.clip((c_orig.astype(float) - f_b) / np.maximum(255.0 - f_b, 1.0), 0.0, 0.99)
        e_a = np.minimum(alpha_map, a_lim)
        c_unblend = np.clip((c_orig.astype(float) - 255.0 * e_a) / np.maximum(1.0 - e_a, 0.02), 0, 255).astype(np.uint8)
        c_unblend = cv2.inpaint(c_unblend, edge_thin, 2, cv2.INPAINT_TELEA)

        # TELEA
        c_telea = cv2.inpaint(c_orig, inpaint_mask_dilated, 3, cv2.INPAINT_TELEA)

        # NS
        c_ns = cv2.inpaint(c_orig, inpaint_mask_dilated, 3, cv2.INPAINT_NS)

        if prev_crops is not None:
            # Measure inter-frame difference inside the watermark mask (dist <= 0.8)
            core_mask = dist <= 0.8
            flicker_scores["unblend"].append(float(np.mean(np.abs(c_unblend[core_mask].astype(float) - prev_crops["unblend"][core_mask].astype(float)))))
            flicker_scores["telea"].append(float(np.mean(np.abs(c_telea[core_mask].astype(float) - prev_crops["telea"][core_mask].astype(float)))))
            flicker_scores["ns"].append(float(np.mean(np.abs(c_ns[core_mask].astype(float) - prev_crops["ns"][core_mask].astype(float)))))

        prev_crops = {"unblend": c_unblend, "telea": c_telea, "ns": c_ns}

    avg_flicker = {k: float(np.mean(v)) for k, v in flicker_scores.items()}
    print("\nTemporal Flickering Metric (Mean Absolute Inter-Frame Difference inside mask):")
    for k, v in avg_flicker.items():
        print(f"  {k}: {v:.2f}")

    # Save summary report JSON
    summary = {
        "video": "gemini_generated_video_8b06dd52.mp4",
        "resolution": f"{w}x{h}",
        "frames_tested": target_frames,
        "timing_ms": avg_times,
        "flicker_scores": avg_flicker
    }
    with open(os.path.join(out_dir, "benchmark_report.json"), "w") as f:
        json.dump(summary, f, indent=2)
    print("Benchmark completed successfully.")

if __name__ == "__main__":
    run_benchmark()

