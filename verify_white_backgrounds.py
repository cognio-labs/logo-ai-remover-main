import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = Path(r"C:\Users\PC\.gemini\antigravity\brain\75266caf-28aa-4da6-afa3-a16e6a263e1b")

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # 1. Image Watermark Remover (Initial)
        print("Capturing gemini image cleaner initial...")
        page.goto("http://127.0.0.1:5678/gemini-image-watermark-remover", wait_until="networkidle")
        time.sleep(1.5)
        page.screenshot(path=str(ARTIFACT_DIR / "white_bg_gemini_image_initial.png"))

        # 1b. Image Watermark Remover (With Image Loaded)
        print("Uploading woman photo to gemini image cleaner...")
        file_inp = page.locator("input[type='file']").first
        img_path = Path("woman_photo_from_b611.png").resolve()
        if img_path.exists():
            file_inp.set_input_files(str(img_path))
            time.sleep(3)
            page.screenshot(path=str(ARTIFACT_DIR / "white_bg_gemini_image_with_photo.png"))

        # 2. Video Watermark Remover
        print("Capturing gemini video cleaner...")
        page.goto("http://127.0.0.1:5678/gemini-video-watermark-remover", wait_until="networkidle")
        time.sleep(1.5)
        page.screenshot(path=str(ARTIFACT_DIR / "white_bg_gemini_video.png"))

        browser.close()
        print("All white background screenshots captured!")

if __name__ == "__main__":
    verify()
