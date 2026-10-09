import os
import glob
from PIL import Image
import rembg

PROJECT_DIR = r"D:\logo-ai-remover-main\logo-ai-remover-main"
ROOT_DIR = r"D:\logo-ai-remover-main"
BRAIN_DIR = r"C:\Users\PC\.gemini\antigravity-ide\brain\8bd497e6-80c8-438e-a699-f3a25f327191"

weights_dir = os.path.join(PROJECT_DIR, "backend", "models", "weights")
os.environ["U2NET_HOME"] = weights_dir

print("Initializing local u2net session from", weights_dir)
session = rembg.new_session("u2net")

tasks = [
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

for t in tasks:
    matches = glob.glob(os.path.join(BRAIN_DIR, t["pattern"]))
    if not matches:
        print(f"Error: No match found for {t['pattern']}")
        continue
    latest_img = max(matches, key=os.path.getmtime)
    print(f"\nProcessing {t['name']} from {latest_img}...")
    
    img = Image.open(latest_img).convert("RGB")
    
    for d in out_dirs:
        orig_path = os.path.join(d, f"{t['name']}.png")
        img.save(orig_path, "PNG")
        print(f"  [OK] Saved original image -> {orig_path}")
        
    print(f"  Running local u2net background cutout for {t['name']}...")
    cutout = rembg.remove(img, session=session)
    
    for d in out_dirs:
        cutout_path = os.path.join(d, f"{t['name']}_cutout.png")
        cutout.save(cutout_path, "PNG")
        print(f"  [OK] Saved cutout PNG -> {cutout_path}")

print("\nAll 3 image pairs processed and saved!")
