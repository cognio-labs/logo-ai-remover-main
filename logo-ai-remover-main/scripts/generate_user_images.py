import asyncio
import os
import sys
from pathlib import Path
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.image_generation_provider import NeuralStudioImageProvider

NEW_ASSETS = [
    {
        "filename": "anime_dog_cutout.jpg",
        "prompt": "Makoto Shinkai style adorable fluffy Japanese Shiba Inu anime dog sitting happily, with an AI background removal effect cleanly cut out subject against a transparent checkerboard background, clean sharp anime vector line art, vibrant colors, 8k digital anime masterpiece",
        "seed": 301,
    },
    {
        "filename": "attractive_couple_portrait.jpg",
        "prompt": "Breathtakingly gorgeous handsome man and stunningly beautiful woman couple, high fashion luxury editorial portrait, flawless glowing skin, captivating eyes, elegant designer evening couture, cinematic warm rim lighting, 8k hyper-realistic commercial portrait photography",
        "seed": 302,
    },
]

async def generate():
    provider = NeuralStudioImageProvider()
    out_dir = ROOT_DIR / "public" / "creative-suite"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    for item in NEW_ASSETS:
        filename = item["filename"]
        dest = out_dir / filename
        print(f"Generating {filename}...")
        await provider.generate_image(
            prompt=item["prompt"],
            output_path=dest,
            width=1024,
            height=576,
            seed=item["seed"],
        )
        
        # Clean watermark completely
        im = Image.open(dest).convert("RGB")
        w, h = im.size
        cropped = im.crop((0, 0, w, h - 38))
        clean_im = cropped.resize((w, h), Image.Resampling.LANCZOS)
        clean_im.save(dest, quality=95)
        print(f"Saved and cleaned {filename} ({dest.stat().st_size} bytes)")

if __name__ == "__main__":
    asyncio.run(generate())
