import cv2
import numpy as np
from gemini_corner_inpainter import detect_and_align_gemini_sparkle

video_path = 'cartoon-source.mp4'
cap = cv2.VideoCapture(video_path)
ret, first_frame = cap.read()
assert ret, "Could not read frame"
H, W = first_frame.shape[:2]
print(f"Portrait video dimensions: {W}x{H}")

alignment = detect_and_align_gemini_sparkle(first_frame, min_confidence=0.20)
print("Alignment:", alignment["box"] if alignment else None, "Confidence:", alignment["confidence"] if alignment else None)
assert alignment is not None, "Failed to detect watermark on portrait video"

rx0, ry0, rx1, ry1 = alignment["patch_bounds"]
optimal_alpha = alignment["optimal_alpha"]
refined_mask = (optimal_alpha > 0.02).astype(np.uint8) * 255
refined_mask = cv2.dilate(refined_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

orig_patch = first_frame[ry0:ry1, rx0:rx1].copy()
cv2.imwrite('C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/cartoon_before_patch.png', orig_patch)

border_pixels = orig_patch[refined_mask == 0]
cleaned_patch = cv2.inpaint(orig_patch, refined_mask, inpaintRadius=2, flags=cv2.INPAINT_NS)
if len(border_pixels) > 20:
    std_bg = float(np.std(border_pixels))
    if std_bg > 1.2:
        noise = np.random.normal(0.0, min(std_bg * 0.40, 2.5), cleaned_patch.shape)
        alpha_w = (optimal_alpha[:, :, None] / 0.5).clip(0.0, 1.0)
        cleaned_patch = np.clip(cleaned_patch.astype(np.float32) + noise * alpha_w, 0.0, 255.0).astype(np.uint8)

cv2.imwrite('C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/cartoon_after_cleaned_patch.png', cleaned_patch)
print("Saved cartoon_before_patch.png and cartoon_after_cleaned_patch.png")
