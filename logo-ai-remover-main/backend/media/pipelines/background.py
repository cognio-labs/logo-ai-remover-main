"""Soft-alpha matting and foreground estimation at original resolution."""
import cv2
import numpy as np
from PIL import Image

from .tiles import feather


def trimap_from_alpha(alpha, radius=3):
    radius = max(1, int(radius))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    foreground = cv2.erode((alpha >= .98).astype(np.uint8), kernel)
    background = cv2.erode((alpha <= .02).astype(np.uint8), kernel)
    trimap = np.full(alpha.shape, .5, np.float64)
    trimap[background == 1] = 0
    trimap[foreground == 1] = 1
    return trimap


def clean_small_components(alpha, max_area=4):
    # Never keep just the largest subject: multiple people and thin parts survive.
    result = alpha.copy()
    binary = (alpha > .5).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] <= max_area:
            region = labels == label
            # Keep soft/semitransparent islands rather than inventing certainty.
            if float(alpha[region].mean()) > .98:
                result[region] = 0
    inverse = (alpha < .02).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(inverse, 8)
    for label in range(1, count):
        x, y, w, h, area = stats[label]
        if area <= max_area and x > 0 and y > 0 and x + w < alpha.shape[1] and y + h < alpha.shape[0]:
            result[labels == label] = 1
    return result


def predict_mask(models, image, quality, working_size=None):
    import torch
    size = working_size or (2048 if quality == "ultra_hd" else 1024)
    while True:
        try:
            rgb = np.asarray(image.resize((size, size), Image.Resampling.LANCZOS)).astype(np.float32) / 255
            rgb = (rgb - [.485, .456, .406]) / [.229, .224, .225]
            tensor = torch.from_numpy(np.ascontiguousarray(rgb.transpose(2, 0, 1))).unsqueeze(0).to(models.device)
            tensor = tensor.half() if models.half else tensor.float()
            with torch.inference_mode():
                prediction = models.segmentation[quality](tensor)[-1].sigmoid().float()
            mask = prediction[0, 0].cpu().numpy()
            if not np.isfinite(mask).all():
                raise ValueError("Segmentation returned non-finite pixels")
            return np.clip(cv2.resize(mask, image.size, interpolation=cv2.INTER_CUBIC), 0, 1), size
        except torch.cuda.OutOfMemoryError:
            if size <= 512:
                raise
            del tensor
            torch.cuda.empty_cache()
            size //= 2


def refine_matte(rgb, alpha, progress=lambda *args: None, tile_size=512, overlap=32):
    from pymatting import estimate_alpha_cf, estimate_foreground_ml
    # CPU matting uses bounded patches. Overlapping weighted reconstruction
    # preserves original resolution without solving a 25-megapixel sparse system.
    h, w = alpha.shape
    output_alpha = np.zeros((h, w), np.float32)
    foreground = np.zeros((h, w, 3), np.float32)
    weights = np.zeros((h, w), np.float32)
    xs, ys = list(range(0, w, tile_size - overlap)), list(range(0, h, tile_size - overlap))
    count, done = len(xs) * len(ys), 0
    for y in ys:
        for x in xs:
            bottom, right = min(h, y + tile_size), min(w, x + tile_size)
            source = rgb[y:bottom, x:right].astype(np.float64) / 255
            seed = alpha[y:bottom, x:right].astype(np.float64)
            trimap = trimap_from_alpha(seed)
            # Closed form requires anchors in both classes and >=3px dimensions.
            if min(seed.shape) >= 3 and np.any(trimap == 0) and np.any(trimap == 1):
                try:
                    matte = estimate_alpha_cf(source, trimap, cg_kwargs={"maxiter": 150, "rtol": 1e-5})
                except (ValueError, RuntimeError):
                    # Retain model probabilities on ill-conditioned tiles; never hard-threshold glass/hair.
                    matte = seed
            else:
                matte = seed
            matte = np.clip(matte, 0, 1)
            if min(seed.shape) >= 3 and np.any((matte > .001) & (matte < .999)):
                fg = np.clip(estimate_foreground_ml(source, matte), 0, 1)
            else:
                fg = source
            weight = feather(*seed.shape, overlap)
            output_alpha[y:bottom, x:right] += matte * weight
            foreground[y:bottom, x:right] += fg * weight[:, :, None]
            weights[y:bottom, x:right] += weight
            done += 1
            progress(35 + int(45 * done / count), "Refining alpha and foreground colors")
    return np.clip(output_alpha / weights, 0, 1), np.clip(foreground / weights[:, :, None], 0, 1)


def linearize(rgb):
    return np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)


def delinearize(rgb):
    return np.where(rgb <= .0031308, rgb * 12.92, 1.055 * np.maximum(rgb, 0) ** (1 / 2.4) - .055)


def composite(foreground, alpha, background):
    # Straight foreground -> premultiplied linear-light composition -> sRGB.
    a = alpha[:, :, None]
    mixed = linearize(foreground) * a + linearize(background) * (1 - a)
    result = np.rint(np.clip(delinearize(mixed), 0, 1) * 255).astype(np.uint8)
    # Guarantee exact chosen color at fully transparent pixels.
    result[alpha == 0] = np.rint(background[alpha == 0] * 255).astype(np.uint8)
    return result


def studio_background(size, preset, alpha, shadow=True):
    w, h = size
    colors = {"soft-gradient": ((.97, .97, .99), (.82, .85, .91)),
              "gray-studio": ((.91, .91, .91), (.72, .73, .75)),
              "warm-wall": ((.98, .94, .88), (.82, .74, .64))}
    top, bottom = map(np.array, colors[preset])
    ramp = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    background = np.broadcast_to(top[None, None] * (1 - ramp) + bottom[None, None] * ramp, (h, w, 3)).copy()
    if shadow:
        offset = max(1, round(min(w, h) * .015))
        shifted = cv2.warpAffine(alpha, np.float32([[1, 0, offset // 2], [0, 1, offset]]), (w, h))
        drop = cv2.GaussianBlur(shifted, (0, 0), max(.5, min(w, h) * .012))
        # A restrained drop shadow; not claimed to infer scene illumination.
        background *= 1 - .16 * drop[:, :, None]
    return background


def center_square(foreground, alpha):
    ys, xs = np.where(alpha > .01)
    if not len(xs):
        return foreground, alpha
    x1, y1, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    size = max(alpha.shape)
    ratio = min(size * .86 / (x2 - x1), size * .86 / (y2 - y1))
    width, height = max(1, round((x2 - x1) * ratio)), max(1, round((y2 - y1) * ratio))
    fg = cv2.resize(foreground[y1:y2, x1:x2], (width, height), interpolation=cv2.INTER_LANCZOS4)
    matte = cv2.resize(alpha[y1:y2, x1:x2], (width, height), interpolation=cv2.INTER_LANCZOS4)
    out, a = np.zeros((size, size, 3), np.float32), np.zeros((size, size), np.float32)
    left, top = (size - width) // 2, (size - height) // 2
    out[top:top + height, left:left + width] = np.clip(fg, 0, 1)
    a[top:top + height, left:left + width] = np.clip(matte, 0, 1)
    return out, a


def remove_background(decoded, options, models, progress=lambda *args: None):
    rgb = np.asarray(decoded.rgb)
    progress(10, "Segmenting subject")
    alpha, resolution = predict_mask(models, decoded.rgb, options.quality)
    alpha = clean_small_components(alpha)
    alpha, foreground = refine_matte(rgb, alpha, progress)
    if decoded.alpha is not None:
        alpha *= np.asarray(decoded.alpha).astype(np.float32) / 255
    if options.center_pad:
        foreground, alpha = center_square(foreground, alpha)
    cutout = Image.fromarray(np.dstack((np.rint(foreground * 255).astype(np.uint8),
                                        np.rint(alpha * 255).astype(np.uint8))))
    if options.bg_mode == "transparent":
        result = cutout
    else:
        if options.bg_mode == "solid":
            color = np.array([int(options.bg_color[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
            bg = np.broadcast_to(color, foreground.shape)
        else:
            bg = studio_background(cutout.size, options.studio_preset, alpha, options.shadow)
        result = Image.fromarray(composite(foreground, alpha, bg))
    return result, {"model": "BiRefNet", "working_resolution": resolution,
                    "alpha": options.bg_mode == "transparent", "warnings": []}
