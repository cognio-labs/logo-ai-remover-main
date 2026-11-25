import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = Path(r"C:\Users\PC\.gemini\antigravity\brain\75266caf-28aa-4da6-afa3-a16e6a263e1b")
WOMAN_IMG = ARTIFACT_DIR / "user_woman_original.jpg"

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 950})
        page = context.new_page()

        # =====================================================================
        # TEST 1: Gemini Image Watermark Remover
        # =====================================================================
        print("[1/2] Navigating to /gemini-image-watermark-remover...")
        page.goto("http://127.0.0.1:5678/gemini-image-watermark-remover", wait_until="networkidle")
        time.sleep(2)

        if WOMAN_IMG.exists():
            print(f"Uploading woman test image: {WOMAN_IMG}...")
            file_input = page.locator('input[type="file"]').first
            file_input.set_input_files(str(WOMAN_IMG))
            
            # Wait for processing state to complete
            time.sleep(4)

            # Move comparison slider completely to the left (reveal 100% of AFTER side)
            slider = page.locator('input[type="range"]').first
            if slider.count() > 0:
                slider.evaluate("el => { el.value = 0; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }")
                time.sleep(1)

            # Take full screenshot
            page.screenshot(path=str(ARTIFACT_DIR / "e2e_gemini_remover_after_full.png"))
            print("Saved full screenshot: e2e_gemini_remover_after_full.png")

            # Crop exact bottom-right corner to inspect laptop zipper & pavement
            corner_crop = page.screenshot(
                path=str(ARTIFACT_DIR / "e2e_gemini_remover_corner_zoom.png"),
                clip={"x": 580, "y": 580, "width": 420, "height": 300}
            )
            print("Saved corner zoom screenshot: e2e_gemini_remover_corner_zoom.png")

        # =====================================================================
        # TEST 2: SynthID Verification Studio
        # =====================================================================
        print("[2/2] Navigating to /synthid-verification...")
        page.goto("http://127.0.0.1:5678/synthid-verification", wait_until="networkidle")
        time.sleep(2)

        page.screenshot(path=str(ARTIFACT_DIR / "e2e_synthid_initial_dropzone.png"))
        print("Saved dropzone screenshot: e2e_synthid_initial_dropzone.png")

        # Upload image to run verification
        synthid_input = page.locator('input[type="file"]').first
        synthid_input.set_input_files(str(WOMAN_IMG))
        print("Uploaded media to SynthID Studio, awaiting analysis...")
        time.sleep(5)

        # Take result screenshot
        page.screenshot(path=str(ARTIFACT_DIR / "e2e_synthid_verified_result.png"))
        print("Saved result screenshot: e2e_synthid_verified_result.png")

        browser.close()
        print("ALL PLAYWRIGHT TESTS COMPLETE!")

if __name__ == "__main__":
    run_tests()
