"""Conservative reconstruction on demonstrably smooth backgrounds.

No constant alpha or assumed sparkle opacity. A plane is fitted to unmasked
context and checked on held-out pixels. Textured scenes are explicitly rejected.
This is not a general video inpainter or proof of visual cleanliness.
"""
import cv2
import numpy as np


def reconstruct_smooth(frame, box):
    x, y, bw, bh = box
    pad = max(8, max(bw, bh))
    h, w = frame.shape[:2]
    x0, y0 = max(0, x-pad), max(0, y-pad)
    x1, y1 = min(w, x+bw+pad), min(h, y+bh+pad)
    crop = frame[y0:y1, x0:x1].astype(np.float64)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    # Exclude the entire detected box plus compression/antialiasing margin.
    support = (xx >= x-3) & (xx < x+bw+3) & (yy >= y-3) & (yy < y+bh+3)
    context = ~support
    train = context & ((xx+yy) % 2 == 0)
    check = context & ~train
    if min(train.sum(), check.sum()) < 40:
        return None
    design = np.stack([np.ones_like(xx), (xx-x)/max(bw, 1), (yy-y)/max(bh, 1)], axis=-1)
    coefficients = np.linalg.lstsq(design[train], crop[train], rcond=None)[0]
    background = design @ coefficients
    errors = np.abs(crop-background)
    validation = float(np.percentile(errors[check], 95))
    if validation > 3:
        return None
    # Signed deviation includes both white glyph and dark halo. Only pixels
    # inconsistent with the validated context model are reconstructed.
    residual = np.max(errors, axis=2)
    mask = (support & (residual > max(3., validation*1.5))).astype(np.uint8)
    mask = (cv2.dilate(mask, np.ones((3, 3), np.uint8)) > 0) & support
    output = frame.copy()
    patch = output[y0:y1, x0:x1]
    patch[mask] = np.clip(np.rint(background[mask]), 0, 255).astype(np.uint8)
    full_mask = np.zeros((h, w), np.uint8)
    full_mask[y0:y1, x0:x1] = mask.astype(np.uint8)*255
    return output, full_mask, validation
