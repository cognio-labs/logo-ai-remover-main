import os
import glob
import shutil
from PIL import Image
import rembg

BRAIN_DIR = r"C:\Users\PC\.gemini\antigravity-ide\brain\8bd497e6-80c8-438e-a699-f3a25f327191"
PROJECT_DIR = r"D:\logo-ai-remover-main\logo-ai-remover-main"
ROOT_DIR = r"D:\logo-ai-remover-main"

targets = [
    {
        "pattern": "new_model_portrait*.jpg",
        "name": "new_portrait",
    },
    {
        "pattern": "new_sneaker_product*.jpg",
        "name": "new_product",
    },
    {
        "pattern": "new_dog_pet*.jpg",
        "name": "new_wildlife",
    }
]

out_dirs = [
    os.path.join(PROJECT_DIR, "public", "upscale"),
    os.path.join(ROOT_DIR, "public", "upscale"),
]

for d in out_dirs:
    os.makedirs(d, exist_ok=True)

for t in targets:
    matches = glob.glob(os.path.join(BRAIN_DIR, t["pattern"]))
    if not matches:
        print(f"Error: No match for {t['pattern']}")
        continue
    latest_img = max(matches, key=os.path.getmtime)
    print(f"\nProcessing {t['name']} from {latest_img}...")
    
    # Load and save original
    img = Image.open(latest_img).convert("RGB")
    for d in out_dirs:
        orig_out = os.path.join(d, f"{t['name']}.jpg")
        img.save(orig_out, quality=95)
        print(f"Saved original -> {orig_out}")
    
    # Generate cutout with rembg
    print(f"Removing background with rembg for {t['name']}...")
    cutout = rembg.remove(img)
    
    for d in out_dirs:
        cutout_out = os.path.join(d, f"{t['name']}_cutout.png")
        cutout.save(cutout_out, "PNG")
        print(f"Saved transparent cutout -> {cutout_out}")

print("\nAll 3 pairs successfully generated!")
