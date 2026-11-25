import os
import sys
from pathlib import Path
import cv2
import numpy as np

# Add backend directory
sys.path.insert(0, str(Path(__file__).parent))
from gemini_corner_inpainter import clean_gemini_watermark_precision, remove_gemini_corner_sparkle

def run_tests():
    print("========================================")
    print("RUNNING GEMINI PRECISION PIPELINE TESTS")
    print("========================================")

    # Test 1: Ground-truth black image
    black_path = Path("C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/.user_uploaded/media_1795505678786_bc4fc7c7.jpg")
    if black_path.exists():
        black_img = cv2.imread(str(black_path))
        res_black, box_black, meta_black = clean_gemini_watermark_precision(black_img)
        print("1. Ground-Truth Black Image:")
        print("   Applied:", meta_black.get("applied"))
        print("   Confidence:", meta_black.get("confidence"))
        print("   Box:", box_black)
        rx0, ry0, w, h = box_black
        patch = res_black[ry0:ry0+h, rx0:rx0+w]
        print(f"   Patch max brightness: {patch.max()}, mean brightness: {patch.mean():.4f}")
        assert patch.mean() < 1.0, f"Residual brightness too high: {patch.mean()}"
        print("   -> PASS! Residual is practically 0 (< 1.0 brightness out of 255).")

    # Test 2: Portrait glasses
    port_path = Path("d:/logo-ai-remover-main/samples/input/portrait_glasses.png")
    if port_path.exists():
        port_img = cv2.imread(str(port_path))
        res_port, box_port, meta_port = clean_gemini_watermark_precision(port_img)
        print("\n2. Portrait Glasses Image:")
        print("   Applied:", meta_port.get("applied"))
        print("   Confidence:", meta_port.get("confidence"))
        print("   Box:", box_port)
        assert meta_port.get("applied"), "Failed to detect and clean watermark in portrait"
        cv2.imwrite("d:/logo-ai-remover-main/samples/output/portrait_cleaned_precision.png", res_port)
        print("   -> PASS! Output saved to samples/output/portrait_cleaned_precision.png")

    # Test 3: Family
    fam_path = Path("d:/logo-ai-remover-main/samples/input/family.png")
    if fam_path.exists():
        fam_img = cv2.imread(str(fam_path))
        res_fam, box_fam, meta_fam = clean_gemini_watermark_precision(fam_img)
        print("\n3. Family Image:")
        print("   Applied:", meta_fam.get("applied"))
        print("   Confidence:", meta_fam.get("confidence"))
        print("   Box:", box_fam)
        assert meta_fam.get("applied"), "Failed to detect and clean watermark in family"
        cv2.imwrite("d:/logo-ai-remover-main/samples/output/family_cleaned_precision.png", res_fam)
        print("   -> PASS! Output saved to samples/output/family_cleaned_precision.png")

    # Test 4: Pure noise / clean image with NO watermark
    clean_synth = np.full((512, 512, 3), 128, dtype=np.uint8)
    res_synth, box_synth, meta_synth = clean_gemini_watermark_precision(clean_synth)
    print("\n4. Image with NO Watermark:")
    print("   Applied:", meta_synth.get("applied"))
    assert not meta_synth.get("applied"), "Should not apply to clean image"
    assert np.array_equal(clean_synth, res_synth), "Untouched guarantee violated!"
    print("   -> PASS! Untouched guarantee verified: 100% byte-for-byte identical.")

    print("\nALL BACKEND PRECISION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
