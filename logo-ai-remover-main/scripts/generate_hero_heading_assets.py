import asyncio
import os
import sys
from pathlib import Path
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.image_generation_provider import NeuralStudioImageProvider

HERO_ASSETS = [
    {
        "filename": "hero_neural_mastermind.jpg",
        "prompt": "Ultra-luxury futuristic AI creative suite masterpiece, gorgeous holographic female face surrounded by glowing neon magenta and rose gold neural particles and geometric light vectors, hyper-detailed 8k octane render, soft studio lighting, cinematic luxury aesthetic",
        "seed": 801,
        "width": 1280,
        "height": 720,
    },
    {
        "filename": "hero_ai_cyber_city.jpg",
        "prompt": "Stunning cinematic sci-fi neon metropolis skyline at twilight, sleek cyberpunk towers, glowing magenta and pink light trails, volumetric fog, crystalline 8k resolution, photorealistic cinematic lighting",
        "seed": 802,
        "width": 1280,
        "height": 720,
    },
    {
        "filename": "hero_portrait_luxury.jpg",
        "prompt": "Vogue high fashion luxury editorial portrait of a stunning woman with soft elegant smile, glowing skin, wearing futuristic rose gold jewelry, cinematic warm rim lighting, clean modern studio aesthetic, 8k hyper-realistic",
        "seed": 803,
        "width": 1280,
        "height": 720,
    }
]

async def generate():
    provider = NeuralStudioImageProvider()
    out_dir = ROOT_DIR / "public" / "creative-suite"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    for item in HERO_ASSETS:
        filename = item["filename"]
        dest = out_dir / filename
        print(f"Generating {filename}...")
        try:
            await provider.generate_image(
                prompt=item["prompt"],
                output_path=dest,
                width=item["width"],
                height=item["height"],
                seed=item["seed"],
            )
            
            # Clean watermark completely if present
            im = Image.open(dest).convert("RGB")
            w, h = im.size
            # Crop 40px from bottom to eliminate any watermark
            cropped = im.crop((0, 0, w, h - 42))
            clean_im = cropped.resize((w, h), Image.Resampling.LANCZOS)
            # Optimize quality to keep file size around 100-150KB for ultra-fast loading
            clean_im.save(dest, "JPEG", quality=85, optimize=True)
            print(f"Saved and optimized {filename} ({dest.stat().st_size} bytes)")
        except Exception as e:
            print(f"Error generating {filename}: {e}")

if __name__ == "__main__":
    asyncio.run(generate())
