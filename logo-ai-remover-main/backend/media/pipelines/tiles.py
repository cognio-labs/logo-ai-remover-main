"""Overlapping, padded tiles; testable independently of GPU libraries."""
import math
import cv2
import numpy as np


def feather(height, width, overlap):
    y = np.ones(height, np.float32)
    x = np.ones(width, np.float32)
    for axis in (y, x):
        band = min(overlap, len(axis) // 2)
        if band:
            ramp = np.linspace(1 / (band + 1), 1, band, dtype=np.float32)
            axis[:band], axis[-band:] = ramp, ramp[::-1]
    return y[:, None] * x[None, :]


def blend_tiles(image, infer, target_size, tile=512, overlap=32, pad=32, progress=lambda value: None):
    height, width = image.shape[:2]
    tw, th = target_size
    if tile <= overlap or min(tw, th, width, height) < 1:
        raise ValueError("Invalid tiling geometry")
    output = np.zeros((th, tw, 3), np.float32)
    weights = np.zeros((th, tw), np.float32)
    xs, ys = list(range(0, width, tile - overlap)), list(range(0, height, tile - overlap))
    total, done = len(xs) * len(ys), 0
    for y in ys:
        for x in xs:
            right, bottom = min(x + tile, width), min(y + tile, height)
            px, py, pr, pb = max(0, x - pad), max(0, y - pad), min(width, right + pad), min(height, bottom + pad)
            prediction = infer(image[py:pb, px:pr])
            if prediction.shape != ((pb - py) * 4, (pr - px) * 4, 3) or not np.isfinite(prediction).all():
                raise ValueError("Invalid model output")
            prediction = prediction[(y - py) * 4:(bottom - py) * 4, (x - px) * 4:(right - px) * 4]
            ox, oy = round(x * tw / width), round(y * th / height)
            ow, oh = round(right * tw / width) - ox, round(bottom * th / height) - oy
            if ow and oh:
                prediction = cv2.resize(prediction, (ow, oh), interpolation=cv2.INTER_LANCZOS4)
                weight = feather(oh, ow, max(1, math.ceil(overlap * max(tw / width, th / height))))
                output[oy:oy + oh, ox:ox + ow] += prediction * weight[:, :, None]
                weights[oy:oy + oh, ox:ox + ow] += weight
            done += 1
            progress(done / total)
    if np.any(weights == 0):
        raise ValueError("Uncovered pixels in tiled output")
    output /= weights[:, :, None]
    return np.rint(np.clip(output, 0, 255)).astype(np.uint8)
