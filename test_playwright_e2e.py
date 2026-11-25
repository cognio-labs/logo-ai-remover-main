import time
import os
import traceback
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 850})
        
        # Listen to console
        page.on("console", lambda msg: print(f"[Browser Console {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[Browser Error] {err}"))
        
        print("Navigating to http://localhost:5678/gemini-image-watermark-remover...")
        page.goto("http://localhost:5678/gemini-image-watermark-remover", wait_until="networkidle")
        page.wait_for_timeout(1000)
        
        upload_path = os.path.abspath("woman_photo_from_b611.png")
        print("Uploading file:", upload_path)
        
        # Find file input
        file_input = page.locator("input[type='file']").first
        file_input.set_input_files(upload_path)
        
        print("File uploaded, waiting 1s...")
        time.sleep(1.0)
        page.screenshot(path="C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/chrome_3s_processing_state.png")
        print("Saved processing state screenshot!")
        
        # Wait for compare slider to appear
        print("Waiting for .gemini-compare slider...")
        page.wait_for_selector(".gemini-compare", timeout=15000)
        print("Found .gemini-compare!")
        
        page.wait_for_timeout(1500)
        page.screenshot(path="C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/chrome_final_after_slider.png")
        print("Saved final slider screenshot!")
        
        # Drag slider to reveal AFTER side
        compare_box = page.locator(".gemini-compare").bounding_box()
        if compare_box:
            # Drag slider to the left (15% from left) so AFTER side is 85% visible
            page.mouse.move(compare_box["x"] + compare_box["width"] * 0.5, compare_box["y"] + compare_box["height"] * 0.5)
            page.mouse.down()
            page.mouse.move(compare_box["x"] + compare_box["width"] * 0.15, compare_box["y"] + compare_box["height"] * 0.5)
            page.mouse.up()
            page.wait_for_timeout(600)
            page.screenshot(path="C:/Users/PC/.gemini/antigravity/brain/75266caf-28aa-4da6-afa3-a16e6a263e1b/chrome_slider_after_revealed.png")
            print("Saved after revealed screenshot!")
            
        browser.close()
        print("All done successfully!")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        traceback.print_exc()
