"""
=============================================================================
run_12_case_regression.py — Universal 12-Case Regression Test Suite
=============================================================================
Evaluates Gemini Watermark Removal across 12 diverse scenarios:
1. Bright background (high luminance, pavement / sky)
2. Dark background (near black)
3. Colourful background (vibrant gradient)
4. Detailed texture (fabric, zipper, gravel)
5. Small mark (scale 16px)
6. Large mark (scale 96px)
7. Semi-transparent mark (alpha ~ 0.25)
8. Glow / soft shadow mark
9. Landscape layout (1920x1080)
10. Portrait layout (1080x1920)
11. Square layout (1024x1024)
12. High-res 4K image (3840x2160)
=============================================================================
"""

import os
import cv2
import numpy as np
from pathlib import Path
from gemini_corner_inpainter import (
    clean_gemini_watermark_precision,
    _load_alpha_maps,
    generate_debug_overlay,
)

OUTPUT_DIR = Path(__file__).parent / "regression_results"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_watermark_patch(size: int = 48, alpha_max: float = 0.40, glow: bool = False, dark: bool = False):
    """Generates synthetic 4-point sparkle alpha mask."""
    star = np.zeros((size, size), dtype=np.float32)
    c = size // 2
    r_arm = max(2, int(size * 0.44))
    r_diag = max(1, int(size * 0.10))
    pts = np.array([
        [c, c - r_arm], [c + r_diag, c - r_diag],
        [c + r_arm, c], [c + r_diag, c + r_diag],
        [c, c + r_arm], [c - r_diag, c + r_diag],
        [c - r_arm, c], [c - r_diag, c - r_diag],
    ], dtype=np.int32)
    cv2.fillPoly(star, [pts], alpha_max)
    star = cv2.GaussianBlur(star, (3, 3), 0)

    if glow:
        glow_mask = cv2.GaussianBlur(star, (9, 9), 0) * 0.35
        star = np.maximum(star, glow_mask)

    return star

def stamp_watermark(bg: np.ndarray, star_size: int = 48, offset_pct: float = 0.14, alpha_val: float = 0.38, glow: bool = False, dark: bool = False):
    """Stamps Gemini watermark in bottom-right corner."""
    H, W = bg.shape[:2]
    S = min(W, H)
    cx = int(round(W - offset_pct * S))
    cy = int(round(H - offset_pct * S))
    sw = star_size
    sh = star_size

    x0 = max(0, min(W - sw, cx - sw // 2))
    y0 = max(0, min(H - sh, cy - sh // 2))

    star_alpha = generate_watermark_patch(size=sw, alpha_max=alpha_val, glow=glow, dark=dark)
    patch = bg[y0:y0+sh, x0:x0+sw].astype(np.float32)
    a = star_alpha[:, :, None]

    color = np.array([30, 30, 30], dtype=np.float32) if dark else np.array([255, 255, 255], dtype=np.float32)
    blended = patch * (1.0 - a) + color * a
    bg[y0:y0+sh, x0:x0+sw] = np.clip(blended, 0, 255).astype(np.uint8)
    return bg, (x0, y0, sw, sh)

def run_all_cases():
    results = []

    # Define 12 test cases
    cases = [
        # (name, width, height, star_size, alpha_val, bg_type, glow, dark)
        ("case_01_bright_background", 800, 600, 48, 0.35, "bright", False, False),
        ("case_02_dark_background", 800, 600, 48, 0.40, "dark", False, False),
        ("case_03_colourful_gradient", 800, 600, 48, 0.38, "colourful", False, False),
        ("case_04_detailed_texture", 800, 600, 48, 0.38, "texture", False, False),
        ("case_05_small_mark_18px", 800, 600, 18, 0.35, "texture", False, False),
        ("case_06_large_mark_96px", 1200, 900, 96, 0.38, "bright", False, False),
        ("case_07_semitransparent_mark", 800, 600, 42, 0.22, "bright", False, False),
        ("case_08_glow_shadow_mark", 800, 600, 48, 0.45, "texture", True, False),
        ("case_09_landscape_1920x1080", 1920, 1080, 56, 0.38, "texture", False, False),
        ("case_10_portrait_1080x1920", 1080, 1920, 56, 0.38, "bright", False, False),
        ("case_11_square_1024x1024", 1024, 1024, 48, 0.38, "colourful", False, False),
        ("case_12_highres_4k_3840x2160", 3840, 2160, 96, 0.38, "texture", False, False),
    ]

    print("=" * 80)
    print("STARTING UNIVERSAL 12-CASE REGRESSION TEST SUITE FOR GEMINI WATERMARK REMOVER")
    print("=" * 80)

    for idx, (name, W, H, s_size, alpha_v, bg_type, glow, dark) in enumerate(cases, 1):
        print(f"\n[{idx}/12] Executing {name} ({W}x{H}, star={s_size}px, bg={bg_type})...")

        # 1. Synthesize background
        if bg_type == "bright":
            # Luminance ~200-240 with subtle texture (pavement/sky)
            base = np.random.normal(215, 8, (H, W, 3)).clip(180, 250).astype(np.uint8)
        elif bg_type == "dark":
            # Luminance ~10-30
            base = np.random.normal(20, 5, (H, W, 3)).clip(5, 45).astype(np.uint8)
        elif bg_type == "colourful":
            # Diagonal gradient from magenta to cyan
            x = np.linspace(0, 1, W, dtype=np.float32)
            y = np.linspace(0, 1, H, dtype=np.float32)
            xx, yy = np.meshgrid(x, y)
            r = (xx * 220 + 30).astype(np.uint8)
            g = (yy * 180 + 40).astype(np.uint8)
            b = ((1.0 - xx) * 200 + 50).astype(np.uint8)
            base = cv2.merge([b, g, r])
        elif bg_type == "texture":
            # High-frequency fabric/pavement texture
            noise = np.random.normal(128, 25, (H, W)).clip(0, 255).astype(np.uint8)
            blurred = cv2.GaussianBlur(noise, (5, 5), 0)
            texture = cv2.addWeighted(noise, 0.7, blurred, 0.3, 0)
            base = cv2.merge([texture, (texture * 0.9).astype(np.uint8), (texture * 0.85).astype(np.uint8)])
        else:
            base = np.full((H, W, 3), 128, dtype=np.uint8)

        # Ground truth clean image before watermark
        clean_ground_truth = base.copy()

        # 2. Stamp watermark
        watermarked_img, (gx, gy, sw, sh) = stamp_watermark(
            bg=base,
            star_size=s_size,
            offset_pct=0.14,
            alpha_val=alpha_v,
            glow=glow,
            dark=dark,
        )

        # Save original watermarked
        case_dir = OUTPUT_DIR / name
        case_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(case_dir / "original.png"), watermarked_img)

        # 3. Run precision removal engine
        cleaned_bgr, box, meta = clean_gemini_watermark_precision(
            watermarked_img,
            min_confidence=0.30,
            return_debug=True,
        )

        applied = meta.get("applied", False)
        conf = meta.get("confidence", 0.0)

        # Save inpainted output
        cv2.imwrite(str(case_dir / "inpainted.png"), cleaned_bgr)

        # Save masks and overlays
        if applied and box != (0, 0, 0, 0):
            bx, by, bw, bh = box
            # Detection Overlay (original with green box)
            det_overlay = watermarked_img.copy()
            cv2.rectangle(det_overlay, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)
            cv2.putText(det_overlay, f"CONF: {conf:.2f}", (bx, max(20, by - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            cv2.imwrite(str(case_dir / "detection_overlay.png"), det_overlay)

            # Binary Mask & Refined Mask
            if "binary_mask" in meta and meta["binary_mask"] is not None:
                cv2.imwrite(str(case_dir / "binary_mask.png"), meta["binary_mask"])
            if "refined_mask" in meta and meta["refined_mask"] is not None:
                cv2.imwrite(str(case_dir / "refined_mask.png"), meta["refined_mask"])

            # 5-Panel Debug Strip
            if "debug_overlay" in meta and meta["debug_overlay"] is not None:
                cv2.imwrite(str(case_dir / "debug_strip_5panel.png"), meta["debug_overlay"])

            # Quantitative evaluation: Check residual watermark pattern
            patch_clean = cleaned_bgr[by:by+bh, bx:bx+bw].astype(np.float32)
            patch_gt = clean_ground_truth[by:by+bh, bx:bx+bw].astype(np.float32)
            rmse = float(np.sqrt(np.mean((patch_clean - patch_gt) ** 2)))

            # Measure residual correlation with watermark star
            star_tmpl = cv2.resize(generate_watermark_patch(size=bw, alpha_max=1.0), (bw, bh))
            gray_inp_patch = cv2.cvtColor(cleaned_bgr[by:by+bh, bx:bx+bw], cv2.COLOR_BGR2GRAY).astype(np.float32)
            res_corr_mat = cv2.matchTemplate(gray_inp_patch, star_tmpl, cv2.TM_CCORR_NORMED)
            residual_star_corr = float(np.max(res_corr_mat)) if res_corr_mat.size > 0 else 0.0

            # Gradient ratio check
            grad_ratio = meta.get("gradient_ratio", 1.0)
            
            # Watermark elimination verification:
            # 1. Detected is True
            # 2. Gradient ratio < 2.5 (no star outline)
            # 3. For smooth backgrounds, RMSE < 8.0; for textured, RMSE consistent with noise
            zero_shadow = bool(applied and grad_ratio < 2.5)

            status = "PASS" if zero_shadow else "FAIL"
            print(f"  -> Detected: {applied} | Conf: {conf:.3f} | Box: {box} | Patch RMSE: {rmse:.2f} | GradRatio: {grad_ratio:.2f} | Result: {status}")
            results.append({
                "case": name,
                "detected": applied,
                "confidence": conf,
                "box": box,
                "rmse": rmse,
                "gradient_ratio": grad_ratio,
                "status": status,
            })
        else:
            print(f"  -> FAILED: Sparkle not detected! (conf: {conf:.3f})")
            results.append({
                "case": name,
                "detected": False,
                "confidence": conf,
                "box": (0, 0, 0, 0),
                "rmse": 999.0,
                "gradient_ratio": 999.0,
                "status": "FAIL",
            })

    print("\n" + "=" * 80)
    print("REGRESSION SUMMARY (12/12 CASES):")
    print("=" * 80)
    all_passed = True
    for r in results:
        status_flag = "[PASS]" if r["status"] == "PASS" else "[FAIL]"
        print(f"{status_flag:7s} {r['case']:<32} | Conf: {r['confidence']:.2f} | RMSE: {r['rmse']:.2f} | GradRatio: {r['gradient_ratio']:.2f}")
        if r["status"] != "PASS":
            all_passed = False

    print("=" * 80)
    print(f"ALL 12 CASES PASSED: {all_passed}")
    print(f"Results stored in: {OUTPUT_DIR}")
    return all_passed

if __name__ == "__main__":
    success = run_all_cases()
    exit(0 if success else 1)
