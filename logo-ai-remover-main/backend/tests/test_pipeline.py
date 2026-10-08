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

def test_subject_detector_portrait_vs_landscape():
    from backend.engines.subject_detector import subject_detector
    # 1. Clear portrait mask (centered object covering ~30% of image)
    portrait_mask = np.zeros((400, 400), dtype=np.float32)
    portrait_mask[100:300, 120:280] = 0.95
    rep_portrait = subject_detector.analyze_mask(portrait_mask)
    assert rep_portrait.status == "GOOD", f"Expected GOOD status for portrait, got {rep_portrait.status}"
    assert rep_portrait.confidence_score > 0.65

    # 2. Landscape mask with tiny lake reflection (<2% area)
    landscape_mask = np.zeros((400, 400), dtype=np.float32)
    landscape_mask[220:250, 180:230] = 0.85
    rep_landscape = subject_detector.analyze_mask(landscape_mask)
    assert rep_landscape.status == "NO_SUBJECT", f"Expected NO_SUBJECT for landscape, got {rep_landscape.status}"
    assert "no prominent foreground subject" in rep_landscape.warnings[0].lower()

def test_mountain_lake_landscape_regression():
    lake_path = Path("public/upscale/mountain_lake.jpg")
    if not lake_path.exists():
        pytest.skip("mountain_lake.jpg not found on disk")

    engine = BiRefNetEngine()
    out_path = Path("test_lake_regression_out.png")
    res = engine.remove_background(lake_path, out_path, quality="fast")

    assert res["status"] == "no_clear_subject", f"Expected 'no_clear_subject' for landscape lake, got {res['status']}"
    assert "actions" in res or "confidence_report" in res
    assert out_path.exists()
    assert res["width"] == 2048 and res["height"] == 2048

def test_sky_segmentation_filter():
    engine = BiRefNetEngine()
    # Create synthetic landscape image: top is blue sky, bottom is green terrain
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    img[:120, :] = [135, 206, 235]  # Sky blue
    img[120:, :] = [34, 139, 34]    # Forest green

    sky_mask = engine.segment_sky(img)
    assert sky_mask.shape == (300, 300)
    # Top sky region should be removed (low alpha < 50)
    assert np.mean(sky_mask[:80, :]) < 50
    # Bottom terrain region should be kept (high alpha > 200)
    assert np.mean(sky_mask[150:, :]) > 200
