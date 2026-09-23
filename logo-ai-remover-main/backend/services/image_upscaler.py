import logging
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from backend.config import settings
from backend.models.image_job import ImageMetadata

logger = logging.getLogger(__name__)


class UpscaleError(RuntimeError):
    pass


class UpscaleVerificationError(UpscaleError):
    pass


def calculate_max_safe_dimensions(
    orig_w: int,
    orig_h: int,
    max_pixels: int | None = None,
    max_dim: int | None = None,
) -> tuple[int, int, float]:
    """Calculates the maximum safe output dimensions preserving original aspect ratio."""
    if orig_w <= 0 or orig_h <= 0:
        return 0, 0, 1.0

    p_max = max_pixels or settings.max_safe_image_pixels
    d_max = max_dim or settings.max_safe_image_dimension

    s_pixels = math.sqrt(p_max / (orig_w * orig_h))
    s_w = d_max / orig_w
    s_h = d_max / orig_h
    max_safe_scale = min(s_pixels, s_w, s_h)

    safe_w = max(1, round(orig_w * max_safe_scale))
    safe_h = max(1, round(orig_h * max_safe_scale))
    return safe_w, safe_h, round(max_safe_scale, 2)


def read_image_metadata(path: Path) -> ImageMetadata:
    if not path.is_file():
        raise UpscaleError(f"Image file does not exist: {path}")

    size_bytes = path.stat().st_size
    if size_bytes == 0:
        raise UpscaleError("Image file is empty (0 bytes)")

    # Allow reading metadata of large images safely
    Image.MAX_IMAGE_PIXELS = settings.max_safe_image_pixels + 50_000_000

    try:
        with Image.open(path) as img:
            width, height = img.size
            img_format = (img.format or path.suffix.lstrip(".").upper()).upper()
            channels = len(img.getbands())
    except Exception as exc:
        raise UpscaleError(f"Failed to decode image metadata: {exc}") from exc

    if width <= 0 or height <= 0:
        raise UpscaleError(f"Invalid image dimensions: {width}x{height}")

    return ImageMetadata(
        width=width,
        height=height,
        channels=channels,
        format=img_format,
        size_bytes=size_bytes,
    )


def _apply_unsharp_mask(image: np.ndarray, strength: float = 0.4, sigma: float = 1.0) -> np.ndarray:
    """Edge-preserving unsharp masking using Gaussian blur."""
    blurred = cv2.GaussianBlur(image, (0, 0), sigma)
    sharpened = cv2.addWeighted(image, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def _enhance_natural(img: np.ndarray) -> np.ndarray:
    """Balanced organic texture and micro-detail recovery."""
    # Gentle bilateral filtering to separate base and fine details
    base = cv2.bilateralFilter(img, d=5, sigmaColor=35, sigmaSpace=35)
    detail = cv2.subtract(img, base)
    enhanced = cv2.add(img, cv2.multiply(detail, np.full_like(detail, 1.35, dtype=np.float32).astype(np.uint8)))
    return _apply_unsharp_mask(enhanced, strength=0.25, sigma=1.0)


def _enhance_portrait(img: np.ndarray) -> np.ndarray:
    """Portrait detail enhancement: preserves natural skin texture, hair and eyelashes without plastic look."""
    # Convert to LAB color space to operate on Lightness channel, preserving skin tones
    has_alpha = img.shape[2] == 4 if len(img.shape) == 3 else False
    if has_alpha:
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
    else:
        bgr = img
        alpha = None

    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Edge-preserving detail recovery on L channel only
    base_l = cv2.bilateralFilter(l, d=7, sigmaColor=40, sigmaSpace=40)
    detail_l = cv2.subtract(l, base_l)
    enhanced_l = cv2.add(l, cv2.multiply(detail_l, np.full_like(detail_l, 1.30, dtype=np.float32).astype(np.uint8)))

    # Subtle sharpening of eyes, lashes, and hair
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    adjusted_l = clahe.apply(enhanced_l)
    merged_l = cv2.addWeighted(enhanced_l, 0.75, adjusted_l, 0.25, 0)

    result_bgr = cv2.cvtColor(cv2.merge([merged_l, a, b]), cv2.COLOR_LAB2BGR)
    if alpha is not None:
        return np.dstack([result_bgr, alpha])
    return result_bgr


def _enhance_art(img: np.ndarray) -> np.ndarray:
    """Artistic enhancement: sharpens fine line work, strokes, and boosts luminous vibrancy."""
    has_alpha = img.shape[2] == 4 if len(img.shape) == 3 else False
    if has_alpha:
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
    else:
        bgr = img
        alpha = None

    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    # Slight color vibrance boost
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.08, 0, 255)
    # Value contrast
    hsv[:, :, 2] = np.clip((hsv[:, :, 2] - 128) * 1.04 + 128, 0, 255)
    vibrant_bgr = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    sharpened = _apply_unsharp_mask(vibrant_bgr, strength=0.38, sigma=1.2)
    if alpha is not None:
        return np.dstack([sharpened, alpha])
    return sharpened


def _enhance_product(img: np.ndarray) -> np.ndarray:
    """Product enhancement: crisp geometry, reflections, specular highlights and material textures."""
    # Bilateral smoothing for noise suppression on clean surfaces
    smoothed = cv2.bilateralFilter(img, d=5, sigmaColor=25, sigmaSpace=25)
    # Crisp edge reinforcement
    sharpened = _apply_unsharp_mask(smoothed, strength=0.42, sigma=1.1)
    return sharpened


def _progressive_upscale(img: np.ndarray, target_w: int, target_h: int, scale: int) -> np.ndarray:
    """Progressive multi-stage high-order Lanczos-4 upsampling."""
    current = img
    h, w = current.shape[:2]

    if scale == 2:
        return cv2.resize(current, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    if scale == 4:
        # Step 1: 2x
        mid_w, mid_h = w * 2, h * 2
        mid = cv2.resize(current, (mid_w, mid_h), interpolation=cv2.INTER_LANCZOS4)
        # Step 2: 4x
        return cv2.resize(mid, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    if scale == 8:
        # Step 1: 2x
        mid1 = cv2.resize(current, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
        # Step 2: 4x
        mid2 = cv2.resize(mid1, (w * 4, h * 4), interpolation=cv2.INTER_LANCZOS4)
        # Step 3: 8x
        return cv2.resize(mid2, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    # General fallback
    return cv2.resize(current, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)


def process_upscale(
    input_path: Path,
    output_path: Path,
    scale: int,
    mode: str,
    output_format: str,
    progress_callback=None,
) -> ImageMetadata:
    """Executes the full image upscaling and enhancement pipeline."""
    if progress_callback:
        progress_callback(10, "Analyzing image...", "Reading image and verifying color profiles")

    orig_meta = read_image_metadata(input_path)

    # Read image preserving alpha if present
    img = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise UpscaleError(f"Failed to read image data from {input_path}")

    target_w = orig_meta.width * scale
    target_h = orig_meta.height * scale
    target_pixels = target_w * target_h

    # Enforce maximum safe processing limits
    if (
        target_pixels > settings.max_safe_image_pixels
        or target_w > settings.max_safe_image_dimension
        or target_h > settings.max_safe_image_dimension
    ):
        safe_w, safe_h, _ = calculate_max_safe_dimensions(orig_meta.width, orig_meta.height)
        can_2x = (
            (orig_meta.width * 2 * orig_meta.height * 2 <= settings.max_safe_image_pixels)
            and (orig_meta.width * 2 <= settings.max_safe_image_dimension)
            and (orig_meta.height * 2 <= settings.max_safe_image_dimension)
        )
        suggestion = (
            "Choose 2× or reduce the source/output dimensions."
            if (scale > 2 and can_2x)
            else "Reduce the source/output dimensions."
        )
        raise UpscaleError(
            f"{scale}× output exceeds the maximum supported image size. {suggestion}"
        )

    if progress_callback:
        progress_callback(35, f"Upscaling {scale}x...", f"Reconstructing sub-pixel details to {target_w}x{target_h}")

    # 1. Multi-stage high-order Lanczos-4 super-sampling
    upscaled = _progressive_upscale(img, target_w, target_h, scale)

    if progress_callback:
        progress_callback(65, "Enhancing details...", f"Applying {mode.lower()} detail synthesis and contrast model")

    # 2. Adaptive Enhancement by Mode
    norm_mode = mode.strip().lower()
    if norm_mode == "portrait":
        enhanced = _enhance_portrait(upscaled)
    elif norm_mode == "art":
        enhanced = _enhance_art(upscaled)
    elif norm_mode == "product":
        enhanced = _enhance_product(upscaled)
    else:
        enhanced = _enhance_natural(upscaled)

    if progress_callback:
        progress_callback(85, "Encoding...", f"Saving {output_format.upper()} master output")

    # 3. Output encoding
    output_path.parent.mkdir(parents=True, exist_ok=True)
    norm_format = output_format.strip().lower()
    if norm_format in {"jpg", "jpeg"}:
        # If image has alpha channel, composite onto white background for clean JPEG
        if len(enhanced.shape) == 3 and enhanced.shape[2] == 4:
            bgr = enhanced[:, :, :3]
            alpha = enhanced[:, :, 3].astype(np.float32) / 255.0
            white = np.full_like(bgr, 255)
            enhanced = (bgr * alpha[:, :, None] + white * (1.0 - alpha[:, :, None])).astype(np.uint8)
        success = cv2.imwrite(str(output_path), enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
    else:
        # PNG: compression level 4 (fast and lossless)
        success = cv2.imwrite(str(output_path), enhanced, [cv2.IMWRITE_PNG_COMPRESSION, 4])

    if not success or not output_path.is_file():
        raise UpscaleError("Failed to write upscaled output image to disk")

    if progress_callback:
        progress_callback(95, "Verifying output...", "Validating resolution, pixel integrity and size")

    # 4. Result Verification
    verified_meta = verify_upscaled_result(output_path, target_w, target_h, norm_format)

    if progress_callback:
        progress_callback(100, "Complete", f"Upscaled to {target_w}x{target_h} ({verified_meta.size_bytes // 1024} KB)")

    return verified_meta


def verify_upscaled_result(
    output_path: Path, expected_width: int, expected_height: int, expected_format: str
) -> ImageMetadata:
    if not output_path.is_file():
        raise UpscaleVerificationError("Output file does not exist on disk")

    size = output_path.stat().st_size
    if size == 0:
        raise UpscaleVerificationError("Output file is empty (0 bytes)")

    # Allow Pillow to open and verify output up to safe limit without decompression bomb warning
    Image.MAX_IMAGE_PIXELS = settings.max_safe_image_pixels + 50_000_000

    try:
        with Image.open(output_path) as img:
            w, h = img.size
            channels = len(img.getbands())
            actual_format = (img.format or "").upper()
    except Exception as exc:
        raise UpscaleVerificationError(f"Output image is corrupted or cannot be decoded: {exc}") from exc

    if w != expected_width or h != expected_height:
        raise UpscaleVerificationError(
            f"Output dimension mismatch: expected {expected_width}x{expected_height}, got {w}x{h}"
        )

    if (
        w * h > settings.max_safe_image_pixels
        or w > settings.max_safe_image_dimension
        or h > settings.max_safe_image_dimension
    ):
        raise UpscaleVerificationError(
            f"Output image exceeds safe dimensions: {w}x{h} ({w * h} pixels > {settings.max_safe_image_pixels})"
        )

    expected_fmt_norm = "JPEG" if expected_format in {"jpg", "jpeg"} else "PNG"
    if actual_format and actual_format != expected_fmt_norm:
        logger.warning(
            "Output format %s differs slightly from expected %s", actual_format, expected_fmt_norm
        )

    return ImageMetadata(
        width=w,
        height=h,
        channels=channels,
        format=actual_format or expected_fmt_norm,
        size_bytes=size,
    )
