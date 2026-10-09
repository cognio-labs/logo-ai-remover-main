import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W = 478
H = 850
FPS = 24
TOTAL_FRAMES = 240  # 10.0 seconds

PROJECT_DIR = r"D:\logo-ai-remover-main\logo-ai-remover-main"
ROOT_DIR = r"D:\logo-ai-remover-main"

orig_path = os.path.join(PROJECT_DIR, "public", "upscale", "new_portrait.png")
cutout_path = os.path.join(PROJECT_DIR, "public", "upscale", "new_portrait_cutout.png")
out_sub = os.path.join(PROJECT_DIR, "public", "videos", "trust-model-portrait.mp4")
out_root = os.path.join(ROOT_DIR, "public", "videos", "trust-model-portrait.mp4")

orig_raw = Image.open(orig_path).convert("RGB")
cutout_raw = Image.open(cutout_path).convert("RGBA")

# Crop & resize to 478x850 (center crop to maintain aspect ratio)
def cover_resize(im, target_w, target_h):
    w, h = im.size
    target_ratio = target_w / target_h
    im_ratio = w / h
    if im_ratio > target_ratio:
        # Image is wider, crop left/right
        new_w = int(h * target_ratio)
        offset_x = (w - new_w) // 2
        cropped = im.crop((offset_x, 0, offset_x + new_w, h))
    else:
        # Image is taller, crop top/bottom
        new_h = int(w / target_ratio)
        offset_y = (h - new_h) // 2
        cropped = im.crop((0, offset_y, w, offset_y + new_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

orig_img = cover_resize(orig_raw, W, H)
cutout_img = cover_resize(cutout_raw, W, H)

# Create checkerboard pattern
def create_checker(w, h, sz=14):
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(0, h, sz):
        for x in range(0, w, sz):
            if ((x // sz) + (y // sz)) % 2 == 0:
                arr[y:y+sz, x:x+sz] = [245, 247, 250]
            else:
                arr[y:y+sz, x:x+sz] = [218, 224, 233]
    return Image.fromarray(arr, "RGB")

checker_img = create_checker(W, H, sz=14)
comp_cutout = checker_img.copy()
comp_cutout.paste(cutout_img, (0, 0), cutout_img)

arr_orig = np.array(orig_img)
arr_cutout = np.array(comp_cutout)

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
    out_sub
]

pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for f in range(TOTAL_FRAMES):
    # Smooth back and forth slider motion from 20% to 80%
    # Using cosine wave for natural ease-in-out
    cycle = math.sin((f / TOTAL_FRAMES) * 2 * math.pi - math.pi / 2) * 0.5 + 0.5
    slider_x = int(W * 0.18 + (W * 0.64) * cycle)
    
    frame_arr = arr_orig.copy()
    if slider_x < W:
        frame_arr[:, slider_x:] = arr_cutout[:, slider_x:]
    
    frame_im = Image.fromarray(frame_arr, "RGB")
    draw = ImageDraw.Draw(frame_im, "RGBA")
    
    # Draw slider vertical line
    draw.line([(slider_x, 0), (slider_x, H)], fill=(255, 255, 255, 255), width=2)
    # Subtle shadow next to line
    draw.line([(slider_x - 1, 0), (slider_x - 1, H)], fill=(0, 0, 0, 60), width=1)
    draw.line([(slider_x + 1, 0), (slider_x + 1, H)], fill=(0, 0, 0, 60), width=1)
    
    # Draw circular handle < | > at center height
    cy = H // 2
    r = 20
    draw.ellipse([slider_x - r - 2, cy - r - 2, slider_x + r + 2, cy + r + 2], fill=(0, 0, 0, 70))
    draw.ellipse([slider_x - r, cy - r, slider_x + r, cy + r], fill=(255, 255, 255, 250), outline=(225, 29, 72, 220), width=2)
    
    # Draw arrows < | >
    # Left arrow <
    draw.line([(slider_x - 6, cy), (slider_x - 11, cy)], fill=(225, 29, 72, 240), width=2)
    draw.line([(slider_x - 11, cy), (slider_x - 8, cy - 4)], fill=(225, 29, 72, 240), width=2)
    draw.line([(slider_x - 11, cy), (slider_x - 8, cy + 4)], fill=(225, 29, 72, 240), width=2)
    # Center divider |
    draw.line([(slider_x, cy - 6), (slider_x, cy + 6)], fill=(200, 200, 200, 240), width=1)
    # Right arrow >
    draw.line([(slider_x + 6, cy), (slider_x + 11, cy)], fill=(225, 29, 72, 240), width=2)
    draw.line([(slider_x + 11, cy), (slider_x + 8, cy - 4)], fill=(225, 29, 72, 240), width=2)
    draw.line([(slider_x + 11, cy), (slider_x + 8, cy + 4)], fill=(225, 29, 72, 240), width=2)
    
    pipe.stdin.write(frame_im.tobytes())

pipe.stdin.close()
pipe.wait()

import shutil
shutil.copyfile(out_sub, out_root)
print("Generated trust-model-portrait.mp4 successfully!")
