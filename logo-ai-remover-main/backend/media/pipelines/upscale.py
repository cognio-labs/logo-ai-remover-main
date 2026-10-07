import cv2
import numpy as np
from PIL import Image

from ..config import get_settings
from ..imaging import output_size
from .tiles import blend_tiles


def is_flat_graphic(image):
    thumb = np.asarray(image.resize((128, 128), Image.Resampling.NEAREST))
    quantized = thumb // 16
    colors = len(np.unique(quantized.reshape(-1, 3), axis=0))
    gray = cv2.cvtColor(thumb, cv2.COLOR_RGB2GRAY)
    edge_fraction = np.count_nonzero(cv2.Canny(gray, 80, 160)) / gray.size
    return colors < 80 and edge_fraction > .015


def infer_tile(models, name, rgb):
    import torch
    data = torch.from_numpy(np.ascontiguousarray(rgb.transpose(2, 0, 1))).unsqueeze(0).to(models.device)
    data = data.half() if models.half else data.float()
    with torch.inference_mode():
        result = models.sr[name](data / 255).float().clamp(0, 1)
    return result[0].permute(1, 2, 0).cpu().numpy() * 255


def tiled_pass(models, name, rgb, target, progress):
    import torch
    s = get_settings()
    tile = s.tile_size
    while True:
        try:
            return blend_tiles(rgb, lambda part: infer_tile(models, name, part), target,
                               tile, min(s.tile_overlap, tile // 4), s.tile_pad, progress)
        except torch.cuda.OutOfMemoryError:
            if tile <= 64:
                raise
            torch.cuda.empty_cache()
            tile = max(64, tile // 2)


def restore_faces(models, original, background):
    import torch
    helper = models.face_helper
    helper.clean_all()
    helper.upscale_factor = background.shape[1] / original.shape[1]
    helper.read_image(cv2.cvtColor(original, cv2.COLOR_RGB2BGR))
    helper.get_face_landmarks_5(only_center_face=False, eye_dist_threshold=5)
    helper.align_warp_face()
    for crop in helper.cropped_faces:
        tensor = torch.from_numpy(np.ascontiguousarray(crop[:, :, ::-1].transpose(2, 0, 1))).float().unsqueeze(0).to(models.device) / 127.5 - 1
        with torch.inference_mode():
            output = models.face(tensor, return_rgb=False, weight=.5)[0]
        restored = np.rint((output[0].float().clamp(-1, 1).permute(1, 2, 0).cpu().numpy() + 1) * 127.5).astype(np.uint8)[:, :, ::-1]
        # Fidelity 0.7 is explicitly a source/restored blend, not CodeFormer's w parameter.
        natural = cv2.addWeighted(crop, .7, restored, .3, 0)
        helper.add_restored_face(natural)
    helper.get_inverse_affine(None)
    pasted = helper.paste_faces_to_input_image(upsample_img=cv2.cvtColor(background, cv2.COLOR_RGB2BGR))
    return cv2.cvtColor(pasted, cv2.COLOR_BGR2RGB) if pasted is not None else background


def upscale(decoded, options, models, progress=lambda *args: None):
    s = get_settings()
    target, capped = output_size(*decoded.rgb.size, options.scale, s.max_output_pixels, s.max_output_dimension)
    rgb = np.asarray(decoded.rgb)
    flat = options.mode != "portrait" and is_flat_graphic(decoded.rgb)
    name = "art" if options.mode == "art" or flat else "natural"
    if options.denoise and decoded.source_format == "JPEG":
        rgb = cv2.bilateralFilter(rgb, 5, 12, 2)
    effective = target[0] / decoded.rgb.width
    if effective > 4:
        first = tiled_pass(models, name, rgb, (rgb.shape[1] * 4, rgb.shape[0] * 4),
                           lambda value: progress(10 + int(value * 30), "First super-resolution pass"))
        result = tiled_pass(models, name, first, target,
                            lambda value: progress(40 + int(value * 40), "Second super-resolution pass"))
    else:
        result = tiled_pass(models, name, rgb, target,
                            lambda value: progress(10 + int(value * 70), "Super-resolution tiles"))
    if options.mode == "portrait":
        progress(82, "Restoring faces conservatively")
        result = restore_faces(models, rgb, result)
        result = cv2.resize(result, target, interpolation=cv2.INTER_LANCZOS4)
    if options.mode == "product":
        # Signed float detail avoids one-sided bright halos from uint8 subtraction.
        smooth = cv2.bilateralFilter(result, 5, 8, 2)
        detail = smooth.astype(np.float32) - cv2.GaussianBlur(smooth, (0, 0), .7).astype(np.float32)
        result = np.rint(np.clip(smooth.astype(np.float32) + .12 * np.clip(detail, -12, 12), 0, 255)).astype(np.uint8)
    if options.grain and not flat:
        grain = np.random.default_rng(0).normal(0, .35, (*result.shape[:2], 1))
        result = np.clip(result.astype(np.float32) + grain, 0, 255).astype(np.uint8)
    image = Image.fromarray(result)
    if decoded.alpha is not None:
        image.putalpha(decoded.alpha.resize(target, Image.Resampling.LANCZOS))
    return image, {"capped": capped, "requested_scale": options.scale,
        "effective_scale": target[0] / decoded.rgb.width, "model": name, "flat_graphic": flat,
        "warnings": ["Output dimensions were capped to the server safety limit."] if capped else []}
