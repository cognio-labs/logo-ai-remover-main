import os
import sys
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W = 540
H = 960
FPS = 30
TOTAL_FRAMES = 195  # 6.5 seconds

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
PUBLIC_DIR = os.path.join(PROJECT_DIR, "public")
VIDEOS_DIR = os.path.join(PUBLIC_DIR, "videos")
UPSCALE_DIR = os.path.join(PUBLIC_DIR, "upscale")
os.makedirs(VIDEOS_DIR, exist_ok=True)

FONT_BOLD_PATH = os.path.join(PROJECT_DIR, "arialbd.ttf")
FONT_REG_PATH = os.path.join(PROJECT_DIR, "arial.ttf")

try:
    font_badge = ImageFont.truetype(FONT_BOLD_PATH, 16)
    font_badge_small = ImageFont.truetype(FONT_BOLD_PATH, 12)
    font_hud_title = ImageFont.truetype(FONT_BOLD_PATH, 14)
    font_tag = ImageFont.truetype(FONT_BOLD_PATH, 11)
except Exception:
    font_badge = ImageFont.load_default()
    font_badge_small = ImageFont.load_default()
    font_hud_title = ImageFont.load_default()
    font_tag = ImageFont.load_default()

def create_checkerboard(w, h, sq_size=18):
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(0, h, sq_size):
        for x in range(0, w, sq_size):
            if ((x // sq_size) + (y // sq_size)) % 2 == 0:
                arr[y:y+sq_size, x:x+sq_size] = [248, 250, 252]
            else:
                arr[y:y+sq_size, x:x+sq_size] = [226, 232, 240]
    return Image.fromarray(arr, "RGB")

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

# ==============================================================================
# VIDEO 1: The "Magic Product Reveal" (E-Commerce Sneaker)
# ==============================================================================
def render_video_sneaker():
    final_mp4 = os.path.join(VIDEOS_DIR, "trust-sneaker-product.mp4")
    raw_video = os.path.join(VIDEOS_DIR, "temp_sneaker_video.mp4")
    audio_path = os.path.join(VIDEOS_DIR, "temp_sneaker_audio.m4a")
    orig_path = os.path.join(UPSCALE_DIR, "idea1_sneaker_desk.jpg")
    cutout_path = os.path.join(UPSCALE_DIR, "idea1_sneaker_cutout.png")
    
    print(f"\n[1/3] Rendering Video 1: The Magic Product Reveal (Sneaker)...")
    orig_raw = Image.open(orig_path).convert("RGB")
    cutout_raw = Image.open(cutout_path).convert("RGBA")
    
    orig_img = orig_raw.resize((W, H), Image.Resampling.LANCZOS)
    cutout_img = cutout_raw.resize((W, H), Image.Resampling.LANCZOS)
    
    checker_img = create_checkerboard(W, H, sq_size=16)
    
    # Pure White Studio Backdrop with Soft Ground Ambient Shadow
    pure_white_bg = Image.new("RGB", (W, H), (255, 255, 255))
    draw_shadow = ImageDraw.Draw(pure_white_bg, "RGBA")
    shadow_box = [int(W * 0.12), int(H * 0.58), int(W * 0.88), int(H * 0.68)]
    for radius_expand in range(25, 0, -2):
        alpha = int(35 * (1.0 - radius_expand / 25.0))
        draw_shadow.ellipse([
            shadow_box[0] - radius_expand, shadow_box[1] - radius_expand,
            shadow_box[2] + radius_expand, shadow_box[3] + radius_expand
        ], fill=(30, 41, 59, alpha))
    
    comp_checker = checker_img.copy()
    comp_checker.paste(cutout_img, (0, 0), cutout_img)
    
    comp_white = pure_white_bg.copy()
    comp_white.paste(cutout_img, (0, 0), cutout_img)
    
    arr_orig = np.array(orig_img)
    arr_comp_checker = np.array(comp_checker)
    arr_comp_white = np.array(comp_white)
    
    # Render video stream
    cmd_vid = [
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
        raw_video
    ]
    pipe = subprocess.Popen(cmd_vid, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    for f in range(TOTAL_FRAMES):
        if f < 35:
            # Stage 1: Cluttered desk
            frame_arr = arr_orig.copy()
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            scan_y = int((f / 35.0) * H)
            draw.line([(0, scan_y), (W, scan_y)], fill=(225, 29, 72, 200), width=3)
            draw.rectangle([(0, max(0, scan_y - 20)), (W, scan_y)], fill=(225, 29, 72, 40))
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(225, 29, 72, 180), width=1)
            draw.text((36, 28), "1. CLUTTERED DESK & TOOLS", font=font_hud_title, fill=(255, 255, 255))
        elif f < 115:
            # Stage 2: Laser wipe revealing transparent checkerboard
            p = smoothstep(35, 115, f)
            wipe_x = int(p * W)
            frame_arr = arr_orig.copy()
            if wipe_x > 0:
                frame_arr[:, 0:wipe_x] = arr_comp_checker[:, 0:wipe_x]
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rectangle([(wipe_x - 10, 0), (wipe_x + 10, H)], fill=(225, 29, 72, 50))
            draw.line([(wipe_x, 0), (wipe_x, H)], fill=(255, 255, 255), width=2)
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 230), outline=(244, 63, 94, 200), width=1)
            draw.text((36, 28), "2. SUB-PIXEL ALPHA MATTE ISOLATION", font=font_hud_title, fill=(244, 63, 94))
        else:
            # Stage 3: Smooth dissolve to Pure White Amazon / Shopify commercial background
            p = smoothstep(115, 155, f)
            frame_arr = (arr_comp_checker * (1.0 - p) + arr_comp_white * p).astype(np.uint8)
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(16, 185, 129, 200), width=1)
            draw.text((36, 28), "3. PURE WHITE #FFFFFF · E-COMMERCE READY", font=font_hud_title, fill=(52, 211, 153))

        draw.rounded_rectangle([24, H - 54, W - 24, H - 20], radius=17, fill=(15, 23, 42, 220), outline=(255, 255, 255, 30), width=1)
        draw.text((34, H - 47), "MACRO REVEAL · SHARP TEXTURES · 0 EDGE HALOS", font=font_tag, fill=(226, 232, 240))
        
        pipe.stdin.write(frame_im.tobytes())
    
    pipe.stdin.close()
    pipe.wait()
    
    # Synthesize Audio (whoosh + ding + electronic background music)
    cmd_aud = [
        "ffmpeg", "-y",
        "-filter_complex",
        "anoisesrc=d=6.5:c=pink:r=44100,volume=eval=frame:volume='if(between(t,1.3,2.5), 0.7*sin(PI*(t-1.3)/1.2), 0.04)'[whoosh];"
        "sine=f=1760:d=6.5,volume=eval=frame:volume='if(between(t,3.5,5.5), 0.65*exp(-4*(t-3.5)), 0)'[ding1];"
        "sine=f=2640:d=6.5,volume=eval=frame:volume='if(between(t,3.55,5.5), 0.45*exp(-5*(t-3.55)), 0)'[ding2];"
        "sine=f=440:d=6.5,volume=eval=frame:volume='0.08*(1+0.5*sin(2*PI*2*t))'[subtone];"
        "[whoosh][ding1][ding2][subtone]amix=inputs=4:duration=first:dropout_transition=2[aout]",
        "-map", "[aout]",
        "-c:a", "aac", "-b:a", "128k",
        audio_path
    ]
    subprocess.run(cmd_aud, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Mux into final MP4
    cmd_mux = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "copy",
        "-movflags", "+faststart",
        final_mp4
    ]
    subprocess.run(cmd_mux, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists(raw_video): os.remove(raw_video)
    if os.path.exists(audio_path): os.remove(audio_path)
    print(f"[OK] Video 1 finished: {final_mp4}")

# ==============================================================================
# VIDEO 2: The "Dynamic Car Ad" (Sports Car Sunset to Studio)
# ==============================================================================
def render_video_car():
    final_mp4 = os.path.join(VIDEOS_DIR, "trust-car-dynamic.mp4")
    raw_video = os.path.join(VIDEOS_DIR, "temp_car_video.mp4")
    audio_path = os.path.join(VIDEOS_DIR, "temp_car_audio.m4a")
    orig_path = os.path.join(UPSCALE_DIR, "idea2_car_coastal.jpg")
    cutout_path = os.path.join(UPSCALE_DIR, "idea2_car_cutout.png")
    
    print(f"\n[2/3] Rendering Video 2: The Dynamic Car Ad (Coastal Highway to Studio)...")
    orig_raw = Image.open(orig_path).convert("RGB")
    cutout_raw = Image.open(cutout_path).convert("RGBA")
    
    orig_img = orig_raw.resize((W, H), Image.Resampling.LANCZOS)
    cutout_img = cutout_raw.resize((W, H), Image.Resampling.LANCZOS)
    
    # Create Infinite Dark Studio Background with Reflective Floor
    studio_bg = Image.new("RGB", (W, H), (11, 15, 25))
    draw_s = ImageDraw.Draw(studio_bg, "RGBA")
    for r in range(400, 50, -25):
        alpha = int(45 * (1.0 - r / 400.0))
        draw_s.ellipse([W//2 - r, int(H * 0.45) - int(r*0.6), W//2 + r, int(H * 0.45) + int(r*0.6)], fill=(59, 130, 246, alpha))
    
    draw_s.rectangle([0, int(H * 0.65), W, H], fill=(8, 10, 16))
    
    # Flipped vertical reflection of car cutout on floor
    flipped_cutout = cutout_img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    flipped_arr = np.array(flipped_cutout).astype(np.float32)
    flipped_arr[:, :, 3] *= 0.35
    ref_img = Image.fromarray(flipped_arr.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(3))
    
    comp_studio = studio_bg.copy()
    comp_studio.paste(ref_img, (0, int(H * 0.28)), ref_img)
    comp_studio.paste(cutout_img, (0, 0), cutout_img)
    
    arr_orig = np.array(orig_img)
    arr_comp_studio = np.array(comp_studio)
    
    cmd_vid = [
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
        raw_video
    ]
    pipe = subprocess.Popen(cmd_vid, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    for f in range(TOTAL_FRAMES):
        if f < 55:
            # 1. High Speed Coastal Highway
            shift_x = int(math.sin(f * 1.2) * 2)
            frame_arr = np.roll(arr_orig, shift_x, axis=1)
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(245, 158, 11, 180), width=1)
            draw.text((36, 28), "1. COASTAL HIGHWAY · GOLDEN SUNSET", font=font_hud_title, fill=(251, 191, 36))
        elif f < 105:
            # 2. Digital Glitch Transition & Diagonal Wipe
            p = smoothstep(55, 105, f)
            wipe_diag = int(p * (W + H))
            frame_arr = arr_orig.copy()
            y_coords, x_coords = np.mgrid[0:H, 0:W]
            mask = (x_coords + y_coords) < wipe_diag
            frame_arr[mask] = arr_comp_studio[mask]
            
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.line([(wipe_diag - H, H), (wipe_diag, 0)], fill=(59, 130, 246, 230), width=4)
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 230), outline=(59, 130, 246, 220), width=1)
            draw.text((36, 28), "2. INSTANT NEURAL ENVIRONMENT SWAP", font=font_hud_title, fill=(96, 165, 250))
        else:
            # 3. Clean Infinite Dark Studio with Floor Reflection
            frame_arr = arr_comp_studio.copy()
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(59, 130, 246, 200), width=1)
            draw.text((36, 28), "3. INFINITE STUDIO · PRESERVED REFLECTION", font=font_hud_title, fill=(147, 197, 253))
        
        draw.rounded_rectangle([24, H - 54, W - 24, H - 20], radius=17, fill=(15, 23, 42, 220), outline=(255, 255, 255, 30), width=1)
        draw.text((34, H - 47), "HIGH-SPEED TRACKING · 4K SHARP METALLIC EDGES", font=font_tag, fill=(226, 232, 240))
        
        pipe.stdin.write(frame_im.tobytes())
        
    pipe.stdin.close()
    pipe.wait()
    
    # Synthesize Audio (engine roar + synthwave + digital glitch)
    cmd_aud = [
        "ffmpeg", "-y",
        "-filter_complex",
        "sine=f=68:d=6.5,volume=0.35[drone];"
        "anoisesrc=d=6.5:c=brown:r=44100,lowpass=f=220,volume=0.45[engine];"
        "anoisesrc=d=6.5:c=white:r=44100,volume=eval=frame:volume='if(between(t,2.2,2.7), 0.7*sin(PI*(t-2.2)/0.5), 0)'[glitch];"
        "sine=f=220:d=6.5,volume=eval=frame:volume='if(gte(t,2.4), 0.25*exp(-1.5*(t-2.4)), 0)'[synth1];"
        "sine=f=330:d=6.5,volume=eval=frame:volume='if(gte(t,2.4), 0.20*exp(-1.5*(t-2.4)), 0)'[synth2];"
        "[drone][engine][glitch][synth1][synth2]amix=inputs=5:duration=first:dropout_transition=2[aout]",
        "-map", "[aout]",
        "-c:a", "aac", "-b:a", "128k",
        audio_path
    ]
    subprocess.run(cmd_aud, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    cmd_mux = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "copy",
        "-movflags", "+faststart",
        final_mp4
    ]
    subprocess.run(cmd_mux, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists(raw_video): os.remove(raw_video)
    if os.path.exists(audio_path): os.remove(audio_path)
    print(f"[OK] Video 2 finished: {final_mp4}")

# ==============================================================================
# VIDEO 3: The "Creator's Confidence" (Portrait Living Room to Soft Teal Studio)
# ==============================================================================
def render_video_creator():
    final_mp4 = os.path.join(VIDEOS_DIR, "trust-creator-portrait.mp4")
    raw_video = os.path.join(VIDEOS_DIR, "temp_creator_video.mp4")
    audio_path = os.path.join(VIDEOS_DIR, "temp_creator_audio.m4a")
    orig_path = os.path.join(UPSCALE_DIR, "idea3_creator_livingroom.jpg")
    cutout_path = os.path.join(UPSCALE_DIR, "idea3_creator_cutout.png")
    
    print(f"\n[3/3] Rendering Video 3: The Creator's Confidence (Living Room to Teal Studio)...")
    orig_raw = Image.open(orig_path).convert("RGB")
    cutout_raw = Image.open(cutout_path).convert("RGBA")
    
    orig_img = orig_raw.resize((W, H), Image.Resampling.LANCZOS)
    cutout_img = cutout_raw.resize((W, H), Image.Resampling.LANCZOS)
    
    # Soft Teal Studio Backdrop
    y_coords, x_coords = np.mgrid[0:H, 0:W]
    cx, cy = W * 0.5, H * 0.4
    dist = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2) / (W * 0.8)
    dist = np.clip(dist, 0.0, 1.0)
    arr_teal = np.zeros((H, W, 3), dtype=np.uint8)
    arr_teal[:, :, 0] = np.clip(94 * (1 - dist) + 17 * dist, 0, 255).astype(np.uint8)
    arr_teal[:, :, 1] = np.clip(234 * (1 - dist) + 94 * dist, 0, 255).astype(np.uint8)
    arr_teal[:, :, 2] = np.clip(212 * (1 - dist) + 89 * dist, 0, 255).astype(np.uint8)
    teal_bg_img = Image.fromarray(arr_teal, "RGB")
    
    comp_teal = teal_bg_img.copy()
    comp_teal.paste(cutout_img, (0, 0), cutout_img)
    
    arr_orig = np.array(orig_img)
    arr_comp_teal = np.array(comp_teal)
    
    cmd_vid = [
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
        raw_video
    ]
    pipe = subprocess.Popen(cmd_vid, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    for f in range(TOTAL_FRAMES):
        if f < 48:
            # 1. Warm Cozy Living Room
            frame_arr = arr_orig.copy()
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(225, 29, 72, 180), width=1)
            draw.text((36, 28), "1. SMARTPHONE SELFIE · WARM LIVING ROOM", font=font_hud_title, fill=(255, 255, 255))
        elif f < 54:
            # 2. Camera Shutter Click Flash
            flash_p = (54 - f) / 6.0
            frame_arr = (arr_orig * (1.0 - flash_p) + 255 * flash_p).astype(np.uint8)
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(225, 29, 72, 240))
            draw.text((36, 28), "📸 PHOTO CAPTURED · AI SEGMENTING...", font=font_hud_title, fill=(255, 255, 255))
        elif f < 110:
            # 3. Radial Circle Expanding Wipe to Soft Teal Studio
            p = smoothstep(54, 110, f)
            rcx, rcy = int(W * 0.8), int(H * 0.5)
            max_radius = math.hypot(max(rcx, W - rcx), max(rcy, H - rcy))
            curr_r = p * max_radius
            
            y_coords, x_coords = np.mgrid[0:H, 0:W]
            dist_map = np.sqrt((x_coords - rcx)**2 + (y_coords - rcy)**2)
            mask = dist_map < curr_r
            
            frame_arr = arr_orig.copy()
            frame_arr[mask] = arr_comp_teal[mask]
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            edge_mask_r = int(curr_r)
            draw.ellipse([rcx - edge_mask_r, rcy - edge_mask_r, rcx + edge_mask_r, rcy + edge_mask_r], outline=(20, 184, 166, 230), width=3)
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 230), outline=(20, 184, 166, 200), width=1)
            draw.text((36, 28), "2. PRESERVING FLYAWAY HAIR & SWEATER FIBERS", font=font_hud_title, fill=(45, 212, 191))
        else:
            # 4. Pristine Soft Teal Studio Portrait
            frame_arr = arr_comp_teal.copy()
            frame_im = Image.fromarray(frame_arr, "RGB")
            draw = ImageDraw.Draw(frame_im, "RGBA")
            draw.rounded_rectangle([20, 20, W - 20, 56], radius=18, fill=(15, 23, 42, 220), outline=(20, 184, 166, 200), width=1)
            draw.text((36, 28), "3. CLEAN SOFT TEAL STUDIO · 100% HAIR INTACT", font=font_hud_title, fill=(94, 234, 212))
            
        draw.rounded_rectangle([24, H - 54, W - 24, H - 20], radius=17, fill=(15, 23, 42, 220), outline=(255, 255, 255, 30), width=1)
        draw.text((34, H - 47), "SUB-PIXEL MATTING · NATURAL SKIN & EDGE RETENTION", font=font_tag, fill=(226, 232, 240))
        
        pipe.stdin.write(frame_im.tobytes())
        
    pipe.stdin.close()
    pipe.wait()
    
    # Synthesize Audio (acoustic melody + shutter click + swoosh)
    cmd_aud = [
        "ffmpeg", "-y",
        "-filter_complex",
        "sine=f=329.63:d=6.5,volume=0.15[e4];"
        "sine=f=392.00:d=6.5,volume=0.15[g4];"
        "sine=f=493.88:d=6.5,volume=0.12[b4];"
        "anoisesrc=d=6.5:c=white:r=44100,volume=eval=frame:volume='if(between(t,1.55,1.75), 0.9*exp(-25*(t-1.55)), 0)'[shutter];"
        "anoisesrc=d=6.5:c=pink:r=44100,volume=eval=frame:volume='if(between(t,1.8,2.7), 0.45*sin(PI*(t-1.8)/0.9), 0)'[swoosh];"
        "[e4][g4][b4][shutter][swoosh]amix=inputs=5:duration=first:dropout_transition=2[aout]",
        "-map", "[aout]",
        "-c:a", "aac", "-b:a", "128k",
        audio_path
    ]
    subprocess.run(cmd_aud, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    cmd_mux = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "copy",
        "-movflags", "+faststart",
        final_mp4
    ]
    subprocess.run(cmd_mux, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists(raw_video): os.remove(raw_video)
    if os.path.exists(audio_path): os.remove(audio_path)
    print(f"[OK] Video 3 finished: {final_mp4}")

def main():
    render_video_sneaker()
    render_video_car()
    render_video_creator()
    print("\n[ALL COMPLETE] All 3 videos successfully rendered!")

if __name__ == "__main__":
    main()
