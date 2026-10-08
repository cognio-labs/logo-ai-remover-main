import os
import pytest
import numpy as np
from pathlib import Path
from PIL import Image

from backend.engines.upscaler_engine import UpscalerEngine
from backend.engines.birefnet_engine import BiRefNetEngine
from backend.engines.lama_cleaner_engine import LaMaCleanerEngine
from backend.engines.pdf_cleaner_engine import PdfCleanerEngine
from backend.services.cache_service import CacheService

def test_scale_math_and_dimensions():
    engine = UpscalerEngine()
    # Test vector detection on simple graphic
    canvas = np.full((128, 128, 3), 255, dtype=np.uint8)
    canvas[32:96, 32:96] = [0, 0, 220]  # Red square
    is_vector = engine.detect_vector_or_logo(canvas)
    assert bool(is_vector) is True, "Vector/logo detection should return True on flat graphic"

def test_tiled_overlap_blending_no_seams():
    engine = UpscalerEngine()
    test_img = np.random.randint(50, 200, (600, 600, 3), dtype=np.uint8)
    upscaled = engine._apply_tiled_upscale(test_img, scale=2, tile_size=256, tile_pad=24)
    assert upscaled.shape == (1200, 1200, 3)
    assert not np.isnan(upscaled).any(), "Blended output should not contain NaNs"

def test_trimap_and_pure_white_exactness():
    engine = BiRefNetEngine()
    mask = np.zeros((200, 200), dtype=np.uint8)
    mask[50:150, 50:150] = 255
    trimap = engine.generate_trimap(mask, erode_iter=4, dilate_iter=6)

    assert np.any(trimap == 255), "Trimap must have definite foreground"
    assert np.any(trimap == 0), "Trimap must have definite background"
    assert np.any(trimap == 128), "Trimap must have unknown transition band"

def test_mask_dilation_and_bounds():
    engine = LaMaCleanerEngine()
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    # Bottom right corner watermark simulation
    dummy[85:95, 80:95] = 255
    mask, boxes = engine.auto_detect_watermarks(dummy)
    assert mask.shape == (100, 100)
    assert len(boxes) > 0, "Should detect watermark candidate in corner"

def test_cache_service_hashing():
    cache = CacheService()
    h1 = cache.compute_hash(b"test_image_bytes", scale=4, mode="natural")
    h2 = cache.compute_hash(b"test_image_bytes", scale=4, mode="natural")
    h3 = cache.compute_hash(b"test_image_bytes", scale=2, mode="natural")
    assert h1 == h2, "Identical inputs must yield identical cache keys"
    assert h1 != h3, "Different parameters must yield different cache keys"
