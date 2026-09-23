import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.image_generation_provider import NeuralStudioImageProvider

PUBLIC_DIR = ROOT_DIR / "public" / "creative-suite"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

EXTRA_ASSETS = [
    {
        "filename": "cinematic_drone_8k.jpg",
        "prompt": "Cinematic 8k aerial drone footage over dramatic emerald sea cliffs meeting crashing ocean waves, misty golden sunrise rays, razor-sharp geological textures, National Geographic style",
        "seed": 201,
    },
    {
        "filename": "fashion_ecommerce_model.jpg",
        "prompt": "Luxury editorial fashion studio photo of a model in elegant flowing silk haute couture gown, high-end studio lighting, clean background, sharp fabric micro-weave, photorealistic 8k",
        "seed": 202,
    },
    {
        "filename": "anime_neural_remaster.jpg",
        "prompt": "Makoto Shinkai style gorgeous anime girl standing on a rooftop at twilight overlooking an illuminated glowing cityscape with distant fireworks, crisp hand-drawn vector line art, breathtaking cinematic color",
        "seed": 203,
    },
    {
        "filename": "macro_jewelry_diamond.jpg",
        "prompt": "Extreme macro luxury photography of an emerald-cut flawless diamond ring resting on dark obsidian stone, dazzling prismatic rainbow light refractions, crystal clear facets, 8k commercial photo",
        "seed": 204,
    },
    {
        "filename": "night_vision_denoise.jpg",
        "prompt": "Deep twilight enchanted forest filled with glowing bioluminescent blue and violet mushrooms, ethereal misty atmosphere under a sparkling Milky Way starry sky, ultra-clean low-light photography",
        "seed": 205,
    },
]

async def main():
    provider = NeuralStudioImageProvider()
    print("Generating 5 extra creative suite assets...")
    for item in EXTRA_ASSETS:
        target = PUBLIC_DIR / item["filename"]
        if target.exists() and target.stat().st_size > 5000:
            print(f"Already exists: {item['filename']}")
            continue
        print(f"Generating {item['filename']}...")
        try:
            await provider.generate_image(
                prompt=item["prompt"],
                output_path=target,
                width=1280,
                height=720,
                seed=item["seed"]
            )
            print(f"Saved: {item['filename']} ({target.stat().st_size} bytes)")
        except Exception as e:
            print(f"Error generating {item['filename']}: {e}")
        await asyncio.sleep(1)
    print("Done generating extra assets.")

if __name__ == "__main__":
    asyncio.run(main())
