"""
Benchmark Comparison Harness for Bellix.us AI Background Remover
Measures: IoU, Alpha MAE, Boundary F-score, Holes, % Cut-off, % Leftover Background, Resolution, Latency, Winning Model
Generates: Side-by-side comparison images in ./debug/compare/
"""
import io
import json
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.append(str(Path(__file__).parent))
from bg_remover_advanced import remove_background_pipeline

INPUT_DIR = Path("samples/input")
EXPECTED_DIR = Path("samples/expected")
COMPARE_DIR = Path("debug/compare")
COMPARE_DIR.mkdir(parents=True, exist_ok=True)

SAMPLES = [
    # Tuning Set
    ("banner1.png", "tuning"),
    ("banner2.png", "tuning"),
    ("family.png", "tuning"),
    ("cards3.png", "tuning"),
    # Held-Out Set
    ("portrait_glasses.png", "held-out"),
    ("dupatta_fashion.png", "held-out"),
    ("product_shoe.png", "held-out"),
    ("pet_whiskers.png", "held-out"),
    ("holding_object.png", "held-out"),
    ("group_photo.png", "held-out"),
    ("headphones_wire.png", "held-out"),
]

def make_checkerboard(h, w, square_size=16):
    grid = np.indices((h, w))
    checker = ((grid[0] // square_size + grid[1] // square_size) % 2 == 0)
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[checker] = [230, 230, 230]
    img[~checker] = [255, 255, 255]
    return img

def compute_boundary_fscore(pred_mask, gt_mask, bound_th=3):
    # Dilate and erode to get boundary
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (bound_th*2+1, bound_th*2+1))
    p_b = cv2.morphologyEx(pred_mask, cv2.MORPH_GRADIENT, k) > 0
    g_b = cv2.morphologyEx(gt_mask, cv2.MORPH_GRADIENT, k) > 0
    
    inter = np.logical_and(p_b, g_b).sum()
    prec = inter / max(1, p_b.sum())
    rec = inter / max(1, g_b.sum())
    if prec + rec == 0:
        return 0.0
    return float(2 * prec * rec / (prec + rec))

def run_benchmark():
    results = []
    
    for filename, split in SAMPLES:
        in_path = INPUT_DIR / filename
        if not in_path.exists():
            continue
            
        with open(in_path, "rb") as f:
            in_bytes = f.read()
            
        pil_in = Image.open(io.BytesIO(in_bytes))
        in_w, in_h = pil_in.size
        
        t0 = time.time()
        out_bytes, meta = remove_background_pipeline(in_bytes)
        latency = time.time() - t0
        
        pil_out = Image.open(io.BytesIO(out_bytes)).convert("RGBA")
        out_w, out_h = pil_out.size
        
        res_match = (in_w == out_w and in_h == out_h)
        alpha = np.array(pil_out)[:, :, 3]
        bin_mask = (alpha > 128).astype(np.uint8) * 255
        
        # Check expected ground truth if exists
        exp_path = EXPECTED_DIR / filename
        iou = None
        alpha_mae = None
        boundary_f = None
        pct_cutoff = 0.0
        pct_leftover = 0.0
        
        if exp_path.exists():
            exp_pil = Image.open(exp_path).convert("RGBA")
            exp_alpha = np.array(exp_pil)[:, :, 3]
            exp_bin = (exp_alpha > 128).astype(np.uint8) * 255
            
            inter = np.logical_and(bin_mask > 0, exp_bin > 0).sum()
            union = np.logical_or(bin_mask > 0, exp_bin > 0).sum()
            iou = float(inter / max(1, union))
            
            alpha_mae = float(np.mean(np.abs(alpha.astype(float) - exp_alpha.astype(float))) / 255.0)
            boundary_f = compute_boundary_fscore(bin_mask, exp_bin)
            
            gt_fg = (exp_bin > 0).sum()
            if gt_fg > 0:
                cutoff_px = np.logical_and(exp_bin > 0, bin_mask == 0).sum()
                pct_cutoff = float(cutoff_px / gt_fg * 100.0)
                
            gt_bg = (exp_bin == 0).sum()
            if gt_bg > 0:
                leftover_px = np.logical_and(exp_bin == 0, bin_mask > 0).sum()
                pct_leftover = float(leftover_px / gt_bg * 100.0)
                
        # Holes & Notches
        cnts, hier = cv2.findContours(bin_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        holes = 0
        if hier is not None:
            for h_info in hier[0]:
                if h_info[3] != -1:
                    holes += 1
                    
        # Generate Side-by-Side Image
        # 1. Original RGB
        # 2. Cutout on Checkerboard
        # 3. Clean Mask (Alpha)
        rgb_in = np.array(pil_in.convert("RGB"))
        checker = make_checkerboard(in_h, in_w)
        norm_a = alpha.astype(float)[:, :, None] / 255.0
        cutout_on_checker = (rgb_in.astype(float) * norm_a + checker.astype(float) * (1.0 - norm_a)).astype(np.uint8)
        
        # Scale to max height 400 for side-by-side
        thumb_h = 360
        scale = thumb_h / float(in_h)
        thumb_w = int(in_w * scale)
        
        s_orig = cv2.resize(rgb_in, (thumb_w, thumb_h))
        s_comp = cv2.resize(cutout_on_checker, (thumb_w, thumb_h))
        s_mask = cv2.resize(cv2.cvtColor(alpha, cv2.COLOR_GRAY2BGR), (thumb_w, thumb_h))
        
        # Add labels
        cv2.putText(s_orig, "1. INPUT ORIGINAL", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
        cv2.putText(s_orig, "1. INPUT ORIGINAL", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.putText(s_comp, "2. BELLIX CUTOUT", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
        cv2.putText(s_comp, "2. BELLIX CUTOUT", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (208, 244, 113), 2)
        
        cv2.putText(s_mask, "3. ALPHA MASK", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
        cv2.putText(s_mask, "3. ALPHA MASK", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        divider = np.ones((thumb_h, 4, 3), dtype=np.uint8) * 80
        side_by_side = np.hstack([s_orig, divider, s_comp, divider, s_mask])
        
        cmp_out_path = COMPARE_DIR / f"{Path(filename).stem}_compare.png"
        cv2.imwrite(str(cmp_out_path), cv2.cvtColor(side_by_side, cv2.COLOR_RGB2BGR))
        
        record = {
            "image": filename,
            "split": split,
            "resolution_in": f"{in_w}x{in_h}",
            "resolution_out": f"{out_w}x{out_h}",
            "res_match": res_match,
            "iou": round(iou, 4) if iou is not None else "N/A (Visual)",
            "alpha_mae": round(alpha_mae, 4) if alpha_mae is not None else "N/A",
            "boundary_f": round(boundary_f, 4) if boundary_f is not None else "N/A",
            "holes": holes,
            "pct_cutoff": f"{pct_cutoff:.2f}%" if iou is not None else "0.0%",
            "pct_leftover": f"{pct_leftover:.2f}%" if iou is not None else "0.0%",
            "latency_s": round(latency, 2),
            "model_won": meta.get("model_used", "isnet-general-use"),
            "fallback_used": meta.get("fallback_used", False),
            "quality_pass": meta.get("quality_pass", True),
            "has_gradient": meta.get("has_gradient_note", False),
            "compare_img": str(cmp_out_path),
        }
        results.append(record)
        print(f"[{split.upper()}] {filename:22s} | IoU: {str(record['iou']):7s} | Holes: {holes:2d} | Time: {latency:.2f}s | Model: {record['model_won']}")

    with open(COMPARE_DIR / "benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Benchmark complete! Results saved to debug/compare/benchmark_results.json")

if __name__ == "__main__":
    run_benchmark()
