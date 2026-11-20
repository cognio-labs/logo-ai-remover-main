"""
Automated Test Harness for Bellix Neural Background Removal Pipeline
======================================================================
Validates Step 1 pipeline against ground-truth expected samples:
- banner1.png (Subject Mode: Sakshi Shree banner)
- cards3.png (Design Mode: 3 blog cards with photos and text)
- family.png (Subject Mode: Family of 4 walking on grass)

Computes quantitative metrics:
- IoU (Intersection over Union, target >= 0.95)
- Internal Hole Count (target = 0)
- Boundary Notch Count
- Cut-off Subject Area %
- Leftover Background Area %
- Resolution Verification (W_out == W_in, H_out == H_in)
- Processing Latency (seconds)
- Output Mode / Model Tier

Generates 3-panel side-by-side composite:
[ Input | Expected Ground Truth | Our Pipeline Result ] -> ./debug/compare/<name>_compare.png
"""
from __future__ import annotations

import io
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import bg_remover_advanced

SAMPLES_INPUT_DIR = Path("d:/logo-ai-remover-main/samples/input")
SAMPLES_EXPECTED_DIR = Path("d:/logo-ai-remover-main/samples/expected")
SCRATCH_ROOT = Path(os.getenv("BELLIX_SCRATCH_DIR", r"D:\logo-ai-remover-scratch"))
COMPARE_DIR = SCRATCH_ROOT / "debug" / "compare"
COMPARE_DIR.mkdir(parents=True, exist_ok=True)


def create_checkerboard_pattern(w: int, h: int, grid_size: int = 16) -> Image.Image:
    """Create a high-contrast dark checkerboard for alpha transparency visualization."""
    checker = Image.new("RGBA", (w, h), (24, 24, 27, 255))
    arr = np.array(checker)
    for y in range(0, h, grid_size):
        for x in range(0, w, grid_size):
            if ((x // grid_size) + (y // grid_size)) % 2 == 1:
                arr[y:y+grid_size, x:x+grid_size] = [45, 45, 52, 255]
    return Image.fromarray(arr, "RGBA")


def composite_on_checkerboard(pil_rgba: Image.Image) -> Image.Image:
    """Composite an RGBA image onto a checkerboard background."""
    w, h = pil_rgba.size
    bg = create_checkerboard_pattern(w, h)
    return Image.alpha_composite(bg, pil_rgba.convert("RGBA"))


def compute_metrics(
    out_rgba: np.ndarray,
    exp_rgba: np.ndarray,
    in_w: int,
    in_h: int
) -> dict:
    """Calculate IoU, holes, notches, cut-off %, leftover %, and resolution match."""
    out_h, out_w = out_rgba.shape[:2]
    exp_h, exp_w = exp_rgba.shape[:2]

    res_match = (out_w == in_w and out_h == in_h)

    # If expected has different resolution, resize for metric calculation
    if (out_w, out_h) != (exp_w, exp_h):
        exp_rgba_resized = cv2.resize(exp_rgba, (out_w, out_h), interpolation=cv2.INTER_NEAREST)
    else:
        exp_rgba_resized = exp_rgba

    out_alpha = out_rgba[:, :, 3] if out_rgba.shape[2] == 4 else np.full((out_h, out_w), 255, dtype=np.uint8)
    exp_alpha = exp_rgba_resized[:, :, 3] if exp_rgba_resized.shape[2] == 4 else np.full((out_h, out_w), 255, dtype=np.uint8)

    pred_bin = out_alpha > 128
    true_bin = exp_alpha > 128

    intersection = np.logical_and(pred_bin, true_bin)
    union = np.logical_or(pred_bin, true_bin)
    iou = float(np.sum(intersection) / max(1, np.sum(union)))

    # Cut-off subject: in expected foreground but missing in prediction
    true_fg_count = np.sum(true_bin)
    missing_fg_count = np.sum(np.logical_and(true_bin, ~pred_bin))
    cutoff_pct = float((missing_fg_count / max(1, true_fg_count)) * 100.0)

    # Leftover background: in expected background but present in prediction
    true_bg_count = np.sum(~true_bin)
    extra_bg_count = np.sum(np.logical_and(~true_bin, pred_bin))
    leftover_pct = float((extra_bg_count / max(1, true_bg_count)) * 100.0)

    # Internal defective holes in prediction (excluding expected background gaps)
    pred_uint8 = pred_bin.astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(pred_uint8, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    internal_holes = 0
    if hierarchy is not None:
        for i, h_info in enumerate(hierarchy[0]):
            if h_info[3] != -1:  # enclosed hole
                c_mask = np.zeros_like(pred_uint8)
                cv2.drawContours(c_mask, [contours[i]], -1, 255, thickness=cv2.FILLED)
                hole_pixels = int(np.sum(c_mask > 0))
                # If ground truth was solid foreground inside this hole, it's a defective hole
                exp_opaque_in_hole = int(np.sum(np.logical_and(c_mask > 0, true_bin)))
                if hole_pixels > 0 and (exp_opaque_in_hole / hole_pixels) > 0.5:
                    internal_holes += 1

    # Notches: difference between morphological convex-defect closing and mask
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    closed = cv2.morphologyEx(pred_uint8, cv2.MORPH_CLOSE, kernel_small)
    notch_pixels = int(np.sum(closed > pred_uint8))

    return {
        "res_match": res_match,
        "out_size": f"{out_w}x{out_h}",
        "in_size": f"{in_w}x{in_h}",
        "iou": round(iou, 4),
        "cutoff_pct": round(cutoff_pct, 2),
        "leftover_pct": round(leftover_pct, 2),
        "internal_holes": internal_holes,
        "notch_pixels": notch_pixels,
    }


def generate_side_by_side(
    name: str,
    pil_in: Image.Image,
    pil_exp: Image.Image,
    pil_out: Image.Image,
    metrics: dict,
    elapsed: float,
    out_path: Path
):
    """
    Generate 3-panel side-by-side composite:
    [ Panel 1: Original Input | Panel 2: Expected Ground Truth | Panel 3: Bellix Output ]
    """
    comp_in = composite_on_checkerboard(pil_in.convert("RGBA"))
    comp_exp = composite_on_checkerboard(pil_exp.convert("RGBA"))
    comp_out = composite_on_checkerboard(pil_out.convert("RGBA"))

    # Target height for panels: normalized for side-by-side display
    target_h = 360
    scale_in = target_h / float(pil_in.height)
    w_in = int(pil_in.width * scale_in)
    scale_exp = target_h / float(pil_exp.height)
    w_exp = int(pil_exp.width * scale_exp)
    scale_out = target_h / float(pil_out.height)
    w_out = int(pil_out.width * scale_out)

    panel_in = comp_in.resize((w_in, target_h), Image.Resampling.LANCZOS)
    panel_exp = comp_exp.resize((w_exp, target_h), Image.Resampling.LANCZOS)
    panel_out = comp_out.resize((w_out, target_h), Image.Resampling.LANCZOS)

    header_h = 60
    total_w = w_in + w_exp + w_out + 20
    total_h = target_h + header_h + 20

    canvas = Image.new("RGBA", (total_w, total_h), (18, 18, 20, 255))
    draw = ImageDraw.Draw(canvas)

    # Place panels
    canvas.paste(panel_in, (5, header_h))
    canvas.paste(panel_exp, (w_in + 10, header_h))
    canvas.paste(panel_out, (w_in + w_exp + 15, header_h))

    # Draw titles and stats
    status_str = "PASS" if metrics["iou"] >= 0.95 and metrics["internal_holes"] == 0 else "REVIEW"
    color_status = (74, 222, 128, 255) if status_str == "PASS" else (248, 113, 113, 255)

    title_text = f"Test: {name} | Status: {status_str} | IoU: {metrics['iou']:.4f} | Holes: {metrics['internal_holes']} | Latency: {elapsed:.2f}s"
    draw.text((12, 12), title_text, fill=color_status)

    draw.text((12, 36), "1. Original Input", fill=(200, 200, 200, 255))
    draw.text((w_in + 15, 36), "2. Expected (remove.bg / Reference)", fill=(200, 200, 200, 255))
    draw.text((w_in + w_exp + 20, 36), f"3. Bellix Neural Engine ({metrics['out_size']})", fill=(74, 222, 128, 255))

    canvas.save(out_path)
    print(f"Saved side-by-side composite to {out_path}")


def run_benchmark():
    print("=" * 80)
    print("BELLIX NEURAL BACKGROUND REMOVER — BENCHMARK TEST SUITE (STEP 2)")
    print("=" * 80)

    test_files = [f for f in SAMPLES_INPUT_DIR.glob("*.png")]
    if not test_files:
        print("No test files found in samples/input/!")
        return

    results = []

    for in_path in sorted(test_files):
        stem = in_path.stem
        exp_path = SAMPLES_EXPECTED_DIR / f"{stem}.png"
        if not exp_path.exists():
            print(f"Skipping {stem}: no expected ground truth at {exp_path}")
            continue

        print(f"\nEvaluating: {stem} ...")
        with open(in_path, "rb") as f:
            in_bytes = f.read()

        pil_in = Image.open(in_path)
        pil_exp = Image.open(exp_path)
        in_w, in_h = pil_in.size

        # Run pipeline
        t0 = time.time()
        out_bytes = bg_remover_advanced.remove_background_advanced(in_bytes, save_debug=True)
        elapsed = time.time() - t0

        pil_out = Image.open(io.BytesIO(out_bytes))

        # Arrays
        out_rgba = np.array(pil_out)
        exp_rgba = np.array(pil_exp)

        # Compute quantitative metrics
        m = compute_metrics(out_rgba, exp_rgba, in_w, in_h)
        m["name"] = stem
        m["time_s"] = round(elapsed, 2)
        m["model_used"] = bg_remover_advanced.LAST_MODEL_USED or "fallback/unknown"
        m["status"] = "PASS" if m["iou"] >= 0.95 and m["internal_holes"] == 0 else "FAIL"

        # Side-by-side composite
        comp_path = COMPARE_DIR / f"{stem}_compare.png"
        generate_side_by_side(stem, pil_in, pil_exp, pil_out, m, elapsed, comp_path)
        m["compare_path"] = str(comp_path)

        results.append(m)
        print(f"  Result: {m['status']} | IoU: {m['iou']:.4f} | Holes: {m['internal_holes']} | ResMatch: {m['res_match']} | Latency: {m['time_s']}s")

    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Sample':<12} | {'Status':<6} | {'IoU':<8} | {'Holes':<6} | {'Cutoff %':<9} | {'Leftover %':<11} | {'Resolution':<12} | {'Model':<22} | {'Time (s)':<8}")
    print("-" * 122)
    for r in results:
        print(f"{r['name']:<12} | {r['status']:<6} | {r['iou']:<8.4f} | {r['internal_holes']:<6} | {r['cutoff_pct']:<9.2f} | {r['leftover_pct']:<11.2f} | {r['out_size']:<12} | {r['model_used']:<22} | {r['time_s']:<8.2f}")
    print("=" * 80)

    all_pass = all(r["status"] == "PASS" for r in results)
    print(f"\nOVERALL RESULT: {'ALL TESTS PASSED (Target >= 0.95 IoU)' if all_pass else 'SOME TESTS REQUIRE ATTENTION'}")


if __name__ == "__main__":
    run_benchmark()
