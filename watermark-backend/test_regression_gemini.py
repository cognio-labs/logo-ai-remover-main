import sys
import json
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, r"d:\logo-ai-remover-main\watermark-backend")
from gemini_corner_inpainter import clean_gemini_watermark_precision

OUT_DIR = Path(r"C:\Users\PC\.gemini\antigravity\brain\75266caf-28aa-4da6-afa3-a16e6a263e1b\regression_outputs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

with open(r"d:\logo-ai-remover-main\watermark-backend\gemini_alpha_maps.json") as f:
    alpha_maps = json.load(f)

def get_alpha(name="48"):
    arr = np.array(alpha_maps[name], dtype=np.float32)
    d = int(round(np.sqrt(len(arr))))
    return np.clip(arr.reshape(d, d), 0.0, 1.0)

def stamp_watermark(bg: np.ndarray, alpha_name: str, star_size: int, margin_right: int, margin_bottom: int, color=(255, 255, 255), opacity_mult=1.0, glow=False):
    H, W = bg.shape[:2]
    a_base = get_alpha(alpha_name)
    a = cv2.resize(a_base, (star_size, star_size), interpolation=cv2.INTER_CUBIC)
    a = np.clip(a * opacity_mult, 0.0, 0.95)
    if glow:
        a = np.maximum(a, cv2.GaussianBlur(a, (5, 5), 1.5) * 0.65)
    x0 = W - margin_right - star_size
    y0 = H - margin_bottom - star_size
    out = bg.copy().astype(np.float32)
    a3 = a[:, :, None]
    col = np.array(color, dtype=np.float32).reshape(1, 1, 3)
    out[y0:y0 + star_size, x0:x0 + star_size] = out[y0:y0 + star_size, x0:x0 + star_size] * (1.0 - a3) + col * a3
    return np.clip(out, 0, 255).astype(np.uint8), (x0, y0, star_size, star_size)

def make_grass(H, W):
    rng = np.random.default_rng(42)
    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:, :, 0] = 45   # B
    base[:, :, 1] = 135  # G
    base[:, :, 2] = 115  # R (yellow-green)
    noise = rng.normal(0, 18, (H, W, 3)).astype(np.float32)
    grass = cv2.GaussianBlur(np.clip(base + noise, 0, 255), (3, 3), 0.8)
    # Add diagonal grass blades
    for _ in range(300):
        x = int(rng.integers(0, W))
        y = int(rng.integers(0, H))
        cv2.line(grass, (x, y), (x + int(rng.integers(-12, 12)), y - int(rng.integers(8, 25))), (35, float(rng.integers(110, 175)), float(rng.integers(95, 165))), 1)
    return np.clip(grass, 0, 255).astype(np.uint8)

def make_gradient(H, W, c1, c2):
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    grad = np.array(c1, dtype=np.float32) * (1 - t) + np.array(c2, dtype=np.float32) * t
    return np.broadcast_to(grad, (H, W, 3)).copy().astype(np.uint8)

cases = []

# 1. Landscape 16:9 (1920x1080) tight corner (margin 32, size 48) - previously rejected by rx<0.04!
bg1 = make_gradient(1080, 1920, (30, 50, 90), (200, 130, 80))
img1, gt1 = stamp_watermark(bg1, "48", 48, 32, 32, (255, 255, 255), 1.0)
cases.append(("01_landscape_1920x1080_tight", img1, bg1, gt1, True))

# 2. Portrait 9:16 (768x1408) dark background with faint grey sparkle (like user screenshot 1)
bg2 = np.full((1408, 768, 3), 18, dtype=np.uint8)
bg2 = np.clip(bg2.astype(np.float32) + np.random.default_rng(7).normal(0, 4, bg2.shape), 0, 255).astype(np.uint8)
img2, gt2 = stamp_watermark(bg2, "96", 72, 48, 48, (255, 255, 255), 0.55)
cases.append(("02_portrait_768x1408_dark_faint", img2, bg2, gt2, True))

# 3. Square 1:1 (1024x1024) textured yellow-green grass with low-opacity sparkle (like user screenshot 2)
bg3 = make_grass(1024, 1024)
img3, gt3 = stamp_watermark(bg3, "48", 48, 32, 32, (255, 255, 255), 0.70)
cases.append(("03_square_1024_grass_textured", img3, bg3, gt3, True))

# 4. White background (1024x1024) with dark grey sparkle
bg4 = np.full((1024, 1024, 3), 248, dtype=np.uint8)
img4, gt4 = stamp_watermark(bg4, "48", 56, 40, 40, (20, 20, 20), 0.85)
cases.append(("04_white_bg_dark_sparkle", img4, bg4, gt4, True))

# 5. Coloured blue sparkle on bright light-grey background
bg5 = np.full((800, 1200, 3), 225, dtype=np.uint8)
img5, gt5 = stamp_watermark(bg5, "96", 64, 50, 50, (220, 90, 30), 1.0)
cases.append(("05_coloured_blue_sparkle", img5, bg5, gt5, True))

# 6. High-res 2048x2048 with large 96px watermark
bg6 = make_gradient(2048, 2048, (20, 30, 40), (60, 110, 100))
img6, gt6 = stamp_watermark(bg6, "96", 96, 64, 64, (255, 255, 255), 1.0, glow=True)
cases.append(("06_highres_2048_96px_glow", img6, bg6, gt6, True))

# 7. Small image 512x512 with 24px watermark
bg7 = make_gradient(512, 512, (80, 40, 120), (190, 160, 210))
img7, gt7 = stamp_watermark(bg7, "36-v2", 24, 24, 24, (255, 255, 255), 1.0)
cases.append(("07_small_512_24px", img7, bg7, gt7, True))

# 8. Very low opacity (0.35x) on colourful sunset
bg8 = make_gradient(900, 1200, (50, 80, 220), (20, 210, 250))
img8, gt8 = stamp_watermark(bg8, "48", 54, 70, 70, (255, 255, 255), 0.35)
cases.append(("08_low_opacity_035_sunset", img8, bg8, gt8, True))

# 9. Deeper margin (16% from corner)
bg9 = make_gradient(1000, 1000, (40, 40, 40), (90, 90, 90))
img9, gt9 = stamp_watermark(bg9, "48", 48, 140, 140, (255, 255, 255), 1.0)
cases.append(("09_deep_margin_16pct", img9, bg9, gt9, True))

# 10. Negative control: clean grass image with NO watermark
bg10 = make_grass(800, 800)
cases.append(("10_negative_clean_grass", bg10.copy(), bg10, (0, 0, 0, 0), False))

# 11. Real repo Gemini samples (public/gemini-samples/)
for idx in range(1, 9):
    sp = rf"d:\logo-ai-remover-main\logo-ai-remover-main\public\gemini-samples\sample_{idx}_before.webp"
    real_img = cv2.imread(sp)
    if real_img is not None:
        cases.append((f"11_real_sample_{idx}", real_img, None, None, True))

# 12. Negative control: UI screenshot (8x Loupe button in bottom-right)
ui_img = cv2.imread(r"d:\logo-ai-remover-main\woman_portrait_full.png")
if ui_img is not None:
    cases.append(("12_negative_ui_screenshot", ui_img, None, None, False))

print(f"{'Case':<32} | {'Expect':<6} | {'Applied':<7} | {'Conf':<6} | {'Pol':<5} | {'Box':<22} | {'OutsideDiff':<11} | {'PSNR_ROI':<8}")
print("-" * 115)

all_passed = True
for name, img, clean_gt, gt_box, expect_wm in cases:
    out, box, meta = clean_gemini_watermark_precision(img, min_confidence=0.62, return_debug=True)
    applied = meta.get("applied", False)
    conf = meta.get("confidence", 0.0)
    pol = meta.get("polarity", "-")

    # Check outside box pixel preservation
    if applied and box[2] > 0:
        rx, ry, rw, rh = box
        mask_out = np.ones(img.shape[:2], dtype=bool)
        mask_out[ry:ry + rh, rx:rx + rw] = False
        outside_diff = float(np.max(np.abs(out[mask_out].astype(np.int32) - img[mask_out].astype(np.int32))))
    else:
        outside_diff = float(np.max(np.abs(out.astype(np.int32) - img.astype(np.int32))))

    psnr_str = "-"
    if clean_gt is not None and gt_box is not None and gt_box[2] > 0:
        gx, gy, gw, gh = gt_box
        mse = float(np.mean((out[gy:gy + gh, gx:gx + gw].astype(np.float32) - clean_gt[gy:gy + gh, gx:gx + gw].astype(np.float32)) ** 2))
        psnr = 99.9 if mse < 1e-4 else 10.0 * np.log10((255.0 ** 2) / mse)
        psnr_str = f"{psnr:.1f}dB"
        if not applied or outside_diff > 0 or psnr < 26.0:
            all_passed = False
    elif not expect_wm:
        if applied or outside_diff > 0:
            all_passed = False
    else:
        if not applied or outside_diff > 0:
            all_passed = False

    if meta.get("debug_overlay") is not None:
        cv2.imwrite(str(OUT_DIR / f"{name}_debug.png"), meta["debug_overlay"])

    print(f"{name:<32} | {str(expect_wm):<6} | {str(applied):<7} | {conf:<6.3f} | {pol:<5} | {str(box):<22} | {outside_diff:<11.1f} | {psnr_str:<8}")

print("\nALL_PASSED:", all_passed)
