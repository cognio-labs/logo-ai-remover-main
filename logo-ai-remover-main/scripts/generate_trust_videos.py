import os
import sys
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W = 1280
H = 720
FPS = 30
TOTAL_FRAMES = 225  # 7.5 seconds

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)  # d:\logo-ai-remover-main\logo-ai-remover-main
ROOT_DIR = os.path.dirname(PROJECT_DIR)    # d:\logo-ai-remover-main

FONT_BOLD_PATH = os.path.join(PROJECT_DIR, "arialbd.ttf")
FONT_REG_PATH = os.path.join(PROJECT_DIR, "arial.ttf")

try:
    font_hud_title = ImageFont.truetype(FONT_BOLD_PATH, 20)
    font_hud_sub = ImageFont.truetype(FONT_REG_PATH, 14)
    font_badge = ImageFont.truetype(FONT_BOLD_PATH, 16)
    font_badge_small = ImageFont.truetype(FONT_BOLD_PATH, 12)
    font_tag = ImageFont.truetype(FONT_BOLD_PATH, 13)
except Exception as e:
    print("Warning loading font, falling back:", e)
    font_hud_title = ImageFont.load_default()
    font_hud_sub = ImageFont.load_default()
    font_badge = ImageFont.load_default()
    font_badge_small = ImageFont.load_default()
    font_tag = ImageFont.load_default()

def create_checkerboard(w, h, sq_size=20):
    """Creates a transparent designer checkerboard pattern image."""
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(0, h, sq_size):
        for x in range(0, w, sq_size):
            if ((x // sq_size) + (y // sq_size)) % 2 == 0:
                arr[y:y+sq_size, x:x+sq_size] = [248, 250, 252] # #f8fafc
            else:
                arr[y:y+sq_size, x:x+sq_size] = [226, 232, 240] # #e2e8f0
    return Image.fromarray(arr, "RGB")

def create_gradient_bg(w, h, kind="portrait"):
    """Creates replacement background for each category."""
    arr = np.zeros((h, w, 3), dtype=np.float32)
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    
    if kind == "portrait":
        # Warm luxury studio glow (soft coral / blush peach lighting)
        cx, cy = w * 0.5, h * 0.4
        dist = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2) / (w * 0.7)
        dist = np.clip(dist, 0.0, 1.0)
        # Center glow #fce7f3 to edge #3b0764
        r = 255 * (1 - dist) + 50 * dist
        g = 220 * (1 - dist) + 20 * dist
        b = 235 * (1 - dist) + 60 * dist
        arr[:, :, 0] = r
        arr[:, :, 1] = g
        arr[:, :, 2] = b
    elif kind == "product":
        # Pure Amazon White (#FFFFFF) with subtle radial studio spotlight
        cx, cy = w * 0.5, h * 0.45
        dist = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2) / (w * 0.6)
        dist = np.clip(dist, 0.0, 1.0)
        v = 255 - dist * 12
        arr[:, :, 0] = v
        arr[:, :, 1] = v
        arr[:, :, 2] = v + 4
    elif kind == "wildlife":
        # Cinematic emerald forest bokeh
        cx, cy = w * 0.5, h * 0.5
        dist = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2) / (w * 0.7)
        dist = np.clip(dist, 0.0, 1.0)
        arr[:, :, 0] = 15 * (1 - dist) + 6 * dist
        arr[:, :, 1] = 55 * (1 - dist) + 25 * dist
        arr[:, :, 2] = 45 * (1 - dist) + 20 * dist
    
    return Image.fromarray(np.uint8(np.clip(arr, 0, 255)), "RGB")

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

def draw_hud(draw, frame_idx, mode_name, status_text, category_badge, wipe_pos_x=None):
    """Draws sleek HUD elements, status bar, and laser beam."""
    # Top Left Badge (Category)
    pad_x, pad_y = 30, 26
    badge_text = category_badge.upper()
    tw = draw.textlength(badge_text, font=font_tag)
    draw.rounded_rectangle([pad_x, pad_y, pad_x + tw + 24, pad_y + 32], radius=16, fill=(15, 23, 42, 220), outline=(255, 255, 255, 40), width=1)
    draw.text((pad_x + 12, pad_y + 7), badge_text, font=font_tag, fill=(244, 63, 94))

    # Top Center Neural HUD Capsule
    hud_w, hud_h = 480, 44
    hud_x = (W - hud_w) // 2
    hud_y = 24
    draw.rounded_rectangle([hud_x, hud_y, hud_x + hud_w, hud_y + hud_h], radius=22, fill=(10, 15, 30, 230), outline=(225, 29, 72, 120), width=1)
    
    # Animated pulsing indicator dot
    pulse = (math.sin(frame_idx * 0.25) + 1.0) * 0.5
    dot_radius = 5 + pulse * 2
    dot_cx, dot_cy = hud_x + 24, hud_y + hud_h // 2
    draw.ellipse([dot_cx - dot_radius, dot_cy - dot_radius, dot_cx + dot_radius, dot_cy + dot_radius], fill=(225, 29, 72))
    draw.ellipse([dot_cx - 3, dot_cy - 3, dot_cx + 3, dot_cy + 3], fill=(255, 255, 255))
    
    draw.text((hud_x + 40, hud_y + 11), status_text, font=font_hud_title, fill=(255, 255, 255))

    # Top Right Resolution & Latency Pill
    latency_text = "BELLIX AI · 4K ULTRA-HD · < 0.8s"
    lw = draw.textlength(latency_text, font=font_badge_small)
    lx = W - lw - 50
    draw.rounded_rectangle([lx, pad_y, W - pad_x, pad_y + 32], radius=16, fill=(15, 23, 42, 220), outline=(255, 255, 255, 40), width=1)
    draw.text((lx + 10, pad_y + 8), latency_text, font=font_badge_small, fill=(148, 163, 184))

    # Bottom Stage Progress Bar
    bar_w = W - 60
    bar_h = 5
    bar_x = 30
    bar_y = H - 24
    draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=3, fill=(30, 41, 59, 180))
    prog = min(1.0, frame_idx / TOTAL_FRAMES)
    if prog > 0:
        draw.rounded_rectangle([bar_x, bar_y, bar_x + int(bar_w * prog), bar_y + bar_h], radius=3, fill=(225, 29, 72))

def render_video(orig_path, cutout_path, out_mp4_path, category_name, new_bg_kind):
    print(f"\n--- Generating Video for {category_name} -> {out_mp4_path} ---")
    orig_raw = Image.open(orig_path).convert("RGB")
    cutout_raw = Image.open(cutout_path).convert("RGBA")
    
    # Resize to video resolution
    orig_img = orig_raw.resize((W, H), Image.Resampling.LANCZOS)
    cutout_img = cutout_raw.resize((W, H), Image.Resampling.LANCZOS)
    
    checker_img = create_checkerboard(W, H, sq_size=20)
    new_bg_img = create_gradient_bg(W, H, kind=new_bg_kind)
    
    # Pre-composite cutout onto checkerboard and new background
    comp_checker = checker_img.copy()
    comp_checker.paste(cutout_img, (0, 0), cutout_img)
    
    comp_new_bg = new_bg_img.copy()
    comp_new_bg.paste(cutout_img, (0, 0), cutout_img)
    
    # Numpy arrays for fast slicing
    arr_orig = np.array(orig_img)
    arr_comp_checker = np.array(comp_checker)
    arr_comp_new_bg = np.array(comp_new_bg)
    
    # Setup ffmpeg process
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-movflags", "+faststart",
        out_mp4_path
    ]
    
    pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    for f in range(TOTAL_FRAMES):
        t_sec = f / FPS
        frame_arr = arr_orig.copy()
        laser_x = None
        status = ""
        
        # -------------------------------------------------------------
        # STAGE 1: Target Acquisition (0s to 1.2s, frames 0-36)
        # -------------------------------------------------------------
        if f < 36:
            frame_arr = arr_orig.copy()
            status = "ANALYZING SUBJECT MATTE..."
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            
            # Scanning horizontal sweep bar
            scan_y = int((f / 36.0) * H)
            draw.line([(0, scan_y), (W, scan_y)], fill=(225, 29, 72, 180), width=2)
            draw.rectangle([(0, max(0, scan_y - 25)), (W, scan_y)], fill=(225, 29, 72, 35))
            
            # Corner reticles framing subject
            bx0, by0, bx1, by1 = int(W * 0.22), int(H * 0.12), int(W * 0.78), int(H * 0.88)
            corner_len = 36
            # Top-left
            draw.line([(bx0, by0), (bx0 + corner_len, by0)], fill=(244, 63, 94, 230), width=3)
            draw.line([(bx0, by0), (bx0, by0 + corner_len)], fill=(244, 63, 94, 230), width=3)
            # Top-right
            draw.line([(bx1, by0), (bx1 - corner_len, by0)], fill=(244, 63, 94, 230), width=3)
            draw.line([(bx1, by0), (bx1, by0 + corner_len)], fill=(244, 63, 94, 230), width=3)
            # Bottom-left
            draw.line([(bx0, by1), (bx0 + corner_len, by1)], fill=(244, 63, 94, 230), width=3)
            draw.line([(bx0, by1), (bx0, by1 - corner_len)], fill=(244, 63, 94, 230), width=3)
            # Bottom-right
            draw.line([(bx1, by1), (bx1 - corner_len, by1)], fill=(244, 63, 94, 230), width=3)
            draw.line([(bx1, by1), (bx1, by1 - corner_len)], fill=(244, 63, 94, 230), width=3)
            
            draw_hud(draw, f, "scan", status, category_badge=category_name)
            
        # -------------------------------------------------------------
        # STAGE 2: Laser Wipe & Background Erase (1.2s to 4.2s, frames 36-126)
        # -------------------------------------------------------------
        elif f < 126:
            progress = smoothstep(36, 126, f)
            laser_x = int(progress * W)
            
            frame_arr = arr_orig.copy()
            if laser_x > 0:
                frame_arr[:, 0:laser_x] = arr_comp_checker[:, 0:laser_x]
            
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            
            # Glowing Laser Beam at laser_x
            if 0 <= laser_x < W:
                # Outer glow
                draw.rectangle([(laser_x - 12, 0), (laser_x + 12, H)], fill=(225, 29, 72, 45))
                draw.rectangle([(laser_x - 5, 0), (laser_x + 5, H)], fill=(244, 63, 94, 110))
                # Intense core
                draw.line([(laser_x, 0), (laser_x, H)], fill=(255, 255, 255, 255), width=2)
                
                # Floating badge anchored to laser line
                lbl = "TRANSPARENT PNG (ALPHA)"
                lw = draw.textlength(lbl, font=font_badge_small)
                bx = max(10, min(W - lw - 30, laser_x - int(lw / 2)))
                by = H - 90
                draw.rounded_rectangle([bx, by, bx + lw + 20, by + 28], radius=14, fill=(15, 23, 42, 240), outline=(225, 29, 72, 200), width=1)
                draw.text((bx + 10, by + 6), lbl, font=font_badge_small, fill=(255, 255, 255))
            
            status = "REAL-TIME REMOVAL: SUB-PIXEL MATTING"
            draw_hud(draw, f, "erase", status, category_badge=category_name, wipe_pos_x=laser_x)
            
        # -------------------------------------------------------------
        # STAGE 3: 1-Click Backdrop Replacement (4.2s to 6.2s, frames 126-186)
        # -------------------------------------------------------------
        elif f < 186:
            progress = smoothstep(126, 186, f)
            swap_x = int(progress * W)
            
            frame_arr = arr_comp_checker.copy()
            if swap_x > 0:
                frame_arr[:, 0:swap_x] = arr_comp_new_bg[:, 0:swap_x]
            
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            
            # Glowing Swap Beam at swap_x
            if 0 <= swap_x < W:
                draw.rectangle([(swap_x - 10, 0), (swap_x + 10, H)], fill=(16, 185, 129, 50))
                draw.line([(swap_x, 0), (swap_x, H)], fill=(255, 255, 255, 240), width=2)
                
                lbl = "1-CLICK STUDIO BACKDROP"
                lw = draw.textlength(lbl, font=font_badge_small)
                bx = max(10, min(W - lw - 30, swap_x - int(lw / 2)))
                by = H - 90
                draw.rounded_rectangle([bx, by, bx + lw + 20, by + 28], radius=14, fill=(15, 23, 42, 240), outline=(16, 185, 129, 200), width=1)
                draw.text((bx + 10, by + 6), lbl, font=font_badge_small, fill=(52, 211, 153))
            
            status = "INSTANT STUDIO BACKDROP REPLACEMENT"
            draw_hud(draw, f, "replace", status, category_badge=category_name)
            
        # -------------------------------------------------------------
        # STAGE 4: Final Quality Verification & Smooth Loop (6.2s to 7.5s, frames 186-225)
        # -------------------------------------------------------------
        else:
            frame_arr = arr_comp_new_bg.copy()
            
            # Loop dissolve fade toward start for flawless seamless looping
            if f >= 210:
                alpha_loop = (f - 210) / 15.0
                frame_arr = np.uint8((1.0 - alpha_loop) * frame_arr + alpha_loop * arr_orig)
            
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            
            # Big Gold / Emerald Quality Stamp in bottom left
            badge_text = "✓ VERIFIED: ZERO HALOS · 100% EDGE FIDELITY"
            bw = draw.textlength(badge_text, font=font_badge)
            draw.rounded_rectangle([30, H - 90, 30 + bw + 24, H - 52], radius=18, fill=(15, 23, 42, 245), outline=(16, 185, 129, 220), width=2)
            draw.text((42, H - 83), badge_text, font=font_badge, fill=(52, 211, 153))
            
            status = "PERFECT QUALITY RETAINED · READY TO EXPORT"
            draw_hud(draw, f, "verified", status, category_badge=category_name)
            
        # Write frame to pipe
        pipe.stdin.write(frame_im.tobytes())
        
        if (f + 1) % 45 == 0:
            print(f"  Frame {f+1}/{TOTAL_FRAMES} rendered ({int((f+1)/TOTAL_FRAMES*100)}%)")
            
    pipe.stdin.close()
    pipe.wait()
    print(f"[OK] Video successfully saved to {out_mp4_path} (Exit code {pipe.returncode})")

def main():
    target_dir_sub = os.path.join(PROJECT_DIR, "public", "videos")
    target_dir_root = os.path.join(ROOT_DIR, "public", "videos")
    os.makedirs(target_dir_sub, exist_ok=True)
    os.makedirs(target_dir_root, exist_ok=True)
    
    videos = [
        {
            "orig": os.path.join(PROJECT_DIR, "public", "upscale", "new_portrait.png"),
            "cutout": os.path.join(PROJECT_DIR, "public", "upscale", "new_portrait_cutout.png"),
            "filename": "bg-trust-portrait.mp4",
            "category": "Model Portrait & Busy Street",
            "kind": "portrait"
        },
        {
            "orig": os.path.join(PROJECT_DIR, "public", "upscale", "new_product.png"),
            "cutout": os.path.join(PROJECT_DIR, "public", "upscale", "new_product_cutout.png"),
            "filename": "bg-trust-product.mp4",
            "category": "Sneaker & Tabletop Clutter",
            "kind": "product"
        },
        {
            "orig": os.path.join(PROJECT_DIR, "public", "upscale", "new_wildlife.png"),
            "cutout": os.path.join(PROJECT_DIR, "public", "upscale", "new_wildlife_cutout.png"),
            "filename": "bg-trust-wildlife.mp4",
            "category": "Golden Retriever & Park Garden",
            "kind": "wildlife"
        }
    ]
    
    for v in videos:
        out_sub = os.path.join(target_dir_sub, v["filename"])
        render_video(v["orig"], v["cutout"], out_sub, v["category"], v["kind"])
        # Copy to root public/videos as well
        out_root = os.path.join(target_dir_root, v["filename"])
        import shutil
        shutil.copyfile(out_sub, out_root)
        print(f"[OK] Copied to {out_root}")

if __name__ == "__main__":
    main()
