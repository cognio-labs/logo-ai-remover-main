import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

def run():
    print("Starting Playwright woman loupe test...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 950})
        
        print("Navigating to page...", flush=True)
        page.goto("http://127.0.0.1:5678/gemini-image-watermark-remover", wait_until="networkidle")
        
        inp = page.locator("input[type='file']").first
        img_path = Path("woman_photo_from_b611.png").resolve()
        print(f"Uploading {img_path}...", flush=True)
        inp.set_input_files(str(img_path))
        
        print("Waiting for comparison slider...", flush=True)
        page.wait_for_selector(".gemini-compare", timeout=15000)
        time.sleep(2)
        
        # Click 4x Loupe button
        loupe_btn = page.locator("button:has-text('4x Loupe')").first
        if loupe_btn.count() > 0:
            print("Activating 4x Loupe...", flush=True)
            loupe_btn.click()
            time.sleep(1)
            
        # Drag slider to left to reveal AFTER
        comp = page.locator(".gemini-compare").bounding_box()
        if comp:
            print("Dragging slider to reveal AFTER...", flush=True)
            page.mouse.move(comp["x"] + comp["width"] * 0.5, comp["y"] + comp["height"] * 0.5)
            page.mouse.down()
            page.mouse.move(comp["x"] + comp["width"] * 0.15, comp["y"] + comp["height"] * 0.5)
            page.mouse.up()
            time.sleep(1)
            
        out_path = Path(r"C:\Users\PC\.gemini\antigravity\brain\75266caf-28aa-4da6-afa3-a16e6a263e1b\woman_clean_after_verified.png")
        page.screenshot(path=str(out_path))
        print(f"Saved: {out_path} ({out_path.stat().st_size} bytes)", flush=True)
        browser.close()

if __name__ == "__main__":
    run()
