import os
import math
import numpy as np
import cv2
from PIL import Image, ImageFilter

def create_cinematic_video():
    input_path = r"C:\Users\PC\.gemini\antigravity-ide\brain\8df23950-74cf-4309-a1be-552e24e59501\.user_uploaded\media_1791791397180.png"
    output_video_path = r"d:\logo-ai-remover-main\logo-ai-remover-main\public\videos\category_navbar_cinematic.mp4"
    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)

    # 1. Load original navbar image
    orig_img = Image.open(input_path).convert("RGB")
    orig_w, orig_h = orig_img.size

    # Video specs: 16:9 Full HD (1920x1080), 60 FPS, 6 seconds
    W, H = 1920, 1080
    fps = 60
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    # Optimal target width in 1920 canvas
    target_width = 1520
    scale_factor = target_width / orig_w
    target_height = int(orig_h * scale_factor)

    # Resize with high quality Lanczos
    scaled_nav = orig_img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    nav_np = np.array(scaled_nav, dtype=np.float32)

    # Smooth horizontal edge feathering so it blends seamlessly into pure white
    feather_px = 30
    feather_mask = np.ones((target_height, target_width), dtype=np.float32)
    for x in range(feather_px):
        alpha = (x / feather_px)
        feather_mask[:, x] = alpha
        feather_mask[:, target_width - 1 - x] = alpha

    # Soft top/bottom feathering
    v_feather = 6
    for y in range(v_feather):
        alpha = (y / v_feather)
        feather_mask[y, :] *= alpha
        feather_mask[target_height - 1 - y, :] *= alpha

    temp_avi = r"d:\logo-ai-remover-main\logo-ai-remover-main\public\videos\temp_raw.avi"
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    out = cv2.VideoWriter(temp_avi, fourcc, fps, (W, H))

    print(f"Rendering {total_frames} frames at {W}x{H} (60fps, 16:9)...")

    for i in range(total_frames):
        t = i / total_frames
        cycle = t * 2 * math.pi
        smooth_t = (1.0 - math.cos(cycle)) / 2.0

        # Subtle cinematic camera motion:
        # 1. Slow, gentle push-in / pull-out (1.0 to 1.035)
        zoom = 1.0 + 0.032 * smooth_t

        # 2. Smooth floating micro-drift
        pan_x = math.sin(cycle) * 14.0
        pan_y = math.sin(cycle * 2.0) * 4.0

        # Clean, modern white backdrop with very subtle studio ambient vignette
        canvas = np.full((H, W, 3), 255, dtype=np.float32)
        Y, X = np.ogrid[:H, :W]
        dist = np.sqrt(((X - W/2) / (W/2))**2 + ((Y - H/2) / (H/2))**2)
        vignette = np.clip(1.0 - 0.035 * dist, 0.955, 1.0)
        canvas = canvas * vignette[:, :, np.newaxis]

        # 3. Soft cinematic specular shimmer gliding smoothly from left to right
        # Highlights text and elements naturally without altering their colors
        shimmer_progress = (t * 1.5 - 0.25)
        shimmer_x = shimmer_progress * target_width
        shimmer_width = 160.0

        cur_nav = nav_np.copy()
        if -100 <= shimmer_x <= target_width + 100:
            x_indices = np.arange(target_width)
            gleam = np.exp(-((x_indices - shimmer_x) ** 2) / (2 * (shimmer_width / 2.2) ** 2))
            # Subtract from white / brighten dark elements smoothly
            # Dark pill and text get a soft radiant gloss
            dark_mask = (255.0 - cur_nav.mean(axis=2)) / 255.0  # 1 on dark pixels (text/pill), 0 on white
            gleam_effect = gleam[np.newaxis, :, np.newaxis] * dark_mask[:, :, np.newaxis] * 45.0
            cur_nav = np.clip(cur_nav + gleam_effect, 0, 255)

        # 4. Blend navbar into canvas using feather_mask
        cur_w = int(target_width * zoom)
        cur_h = int(target_height * zoom)

        # Resize navbar and mask
        nav_pil = Image.fromarray(cur_nav.astype(np.uint8)).resize((cur_w, cur_h), Image.Resampling.LANCZOS)
        mask_pil = Image.fromarray((feather_mask * 255).astype(np.uint8)).resize((cur_w, cur_h), Image.Resampling.BILINEAR)

        nav_resized = np.array(nav_pil, dtype=np.float32)
        mask_resized = (np.array(mask_pil, dtype=np.float32) / 255.0)[:, :, np.newaxis]

        # Placement coordinates
        pos_x = int((W - cur_w) / 2 + pan_x)
        pos_y = int((H - cur_h) / 2 + pan_y)

        # Safe bounding slice
        x1, x2 = max(0, pos_x), min(W, pos_x + cur_w)
        y1, y2 = max(0, pos_y), min(H, pos_y + cur_h)

        mx1 = x1 - pos_x
        mx2 = mx1 + (x2 - x1)
        my1 = y1 - pos_y
        my2 = my1 + (y2 - y1)

        # Alpha composite
        sub_canvas = canvas[y1:y2, x1:x2]
        sub_nav = nav_resized[my1:my2, mx1:mx2]
        sub_mask = mask_resized[my1:my2, mx1:mx2]

        canvas[y1:y2, x1:x2] = sub_canvas * (1.0 - sub_mask) + sub_nav * sub_mask

        # Write frame (BGR)
        frame_bgr = cv2.cvtColor(canvas.astype(np.uint8), cv2.COLOR_RGB2BGR)
        out.write(frame_bgr)

    out.release()
    print("AVI rendered. Compressing to MP4 via FFmpeg...")

    ffmpeg_cmd = f'ffmpeg -y -i "{temp_avi}" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 16 -movflags +faststart "{output_video_path}"'
    os.system(ffmpeg_cmd)

    if os.path.exists(temp_avi):
        os.remove(temp_avi)

    print(f"Done! Broadcast quality 16:9 video ready at: {output_video_path}")

if __name__ == "__main__":
    create_cinematic_video()
