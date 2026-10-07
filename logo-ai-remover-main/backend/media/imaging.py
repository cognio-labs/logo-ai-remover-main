"""Decode before trust: file signatures, dimensions, orientation and color management."""
import io
import math
import warnings
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageOps

try:
    import pillow_avif  # noqa: F401
except ImportError:
    pass
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

Image.MAX_IMAGE_PIXELS = 64_000_000
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


class InvalidImage(ValueError):
    pass


@dataclass
class DecodedImage:
    rgb: Image.Image
    alpha: Image.Image | None
    icc: bytes
    source_format: str


def sniff(data: bytes):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"
    if data[:6] in {b"GIF87a", b"GIF89a"}:
        return "GIF"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    if data[4:8] == b"ftyp":
        brands = data[8:64]
        if b"avif" in brands or b"avis" in brands:
            return "AVIF"
        if any(brand in brands for brand in (b"heic", b"heix", b"heif", b"mif1")):
            return "HEIF"
    raise InvalidImage("Unsupported file content. Upload a supported image.")


def decode(source: bytes | Path, max_pixels: int, kind: str = "upscale") -> DecodedImage:
    data = source if isinstance(source, bytes) else source.read_bytes()
    signature = sniff(data[:64])
    allowed = {"PNG", "JPEG", "WEBP", "GIF", "AVIF"} if kind == "upscale" else {"PNG", "JPEG", "WEBP", "HEIF", "AVIF"}
    if signature not in allowed:
        raise InvalidImage("This image format is not supported by this tool")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as raw:
                if raw.width * raw.height > max_pixels:
                    raise InvalidImage("Image exceeds the maximum input pixel count")
                if getattr(raw, "n_frames", 1) > 1:
                    raise InvalidImage("Animated images are not supported. Export a single frame first.")
                expected = "HEIF" if raw.format in {"HEIC", "HEIF"} else raw.format
                if signature != expected:
                    raise InvalidImage("Image signature and decoded format do not match")
                raw.load()
                img = ImageOps.exif_transpose(raw)
                if img.mode in {"I", "F", "I;16", "I;16B", "I;16L"}:
                    raise InvalidImage("Please convert high-bit-depth images to 8-bit RGB first")
                alpha = img.convert("RGBA").getchannel("A") if "A" in img.getbands() or "transparency" in img.info else None
                profile = img.info.get("icc_profile")
                rgb = img.convert("RGB")
                if profile:
                    color = img if img.mode in {"RGB", "CMYK", "LAB"} else rgb
                    rgb = ImageCms.profileToProfile(color, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                                                   ImageCms.createProfile("sRGB"), outputMode="RGB")
                return DecodedImage(rgb.copy(), alpha, SRGB, signature)
    except InvalidImage:
        raise
    except Exception as exc:
        raise InvalidImage("Image is corrupt, too large, or has an unsupported color profile") from exc


def output_size(width, height, scale, max_pixels=64_000_000, max_dimension=8192):
    if width < 1 or height < 1 or scale not in {2, 4, 8}:
        raise ValueError("Invalid dimensions or scale")
    factor = min(float(scale), math.sqrt(max_pixels / (width * height)), max_dimension / max(width, height))
    result = (max(1, math.floor(width * factor)), max(1, math.floor(height * factor)))
    return result, factor < scale


def encode(image: Image.Image, path: Path, fmt: str, icc=SRGB):
    if fmt == "jpg" and image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    image.save(path, format="JPEG" if fmt == "jpg" else "PNG", quality=95, subsampling=0,
               optimize=True, icc_profile=icc)
    with Image.open(path) as check:
        check.load()
        if check.size != image.size or check.format != ("JPEG" if fmt == "jpg" else "PNG"):
            raise InvalidImage("Encoded output failed verification")


def checkerboard(rgba: Image.Image):
    y, x = np.indices((rgba.height, rgba.width))
    values = np.where((x // 16 + y // 16) % 2, 220, 245).astype(np.uint8)
    bg = Image.fromarray(np.repeat(values[:, :, None], 3, axis=2))
    bg.paste(rgba, mask=rgba.getchannel("A"))
    return bg
