import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.image_generation_provider import NeuralStudioImageProvider

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public" / "creative-suite"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

ASSETS = [
    {
        "filename": "watermark_remover_city.jpg",
        "prompt": "Panoramic golden hour view of a modern glass skyscraper overlooking a tranquil bay, pristine architectural photography with flawless glass facades, zero blemishes, crisp reflection on calm water, warm sunset sky, ultra-clear 8k",
        "seed": 101,
    },
    {
        "filename": "pdf_cleaner_blueprint.jpg",
        "prompt": "Technical architectural blueprint and engineering schematic of a modern pavilion on dark blueprint paper, laser-sharp white vector lines, clean annotations, dimension lines, structural details, zero noise or smudges, high resolution",
        "seed": 102,
    },
    {
        "filename": "inpainter_landscape.jpg",
        "prompt": "Breathtaking Nordic fjord landscape with majestic snowy mountains, crystalline turquoise lake, and vibrant autumn foliage, seamless natural texture, soft morning mist, pristine nature photography, National Geographic style",
        "seed": 103,
    },
    {
        "filename": "portrait_restorer.jpg",
        "prompt": "High fashion studio portrait of an elegant woman with intricate braided hair, illuminated by dual crimson and soft cyan studio lighting, natural sharp skin pores, vivid catchlight in eyes, dark moody studio background, 8k portrait photography",
        "seed": 104,
    },
    {
        "filename": "motion_interpolator.jpg",
        "prompt": "High-speed sleek futuristic hypercar racing through an illuminated tunnel, smooth dynamic motion light trails, glowing wheels, aerodynamic carbon fiber body, razor-sharp front grille, 60fps cinematic freeze frame",
        "seed": 105,
    },
    {
        "filename": "vector_typography.jpg",
        "prompt": "3D dimensional geometric typography letters crafted from polished chromatic metal and glowing magenta neon acrylic, floating in dark space with subtle reflections, razor-sharp anti-aliased edges, typographic design art",
        "seed": 106,
    },
    {
        "filename": "color_grade_hdr.jpg",
        "prompt": "Cinematic landscape of volcanic black sand dunes meeting a dramatic ocean surf under a glowing magenta and deep violet twilight sky, 10-bit HDR wide color gamut, breathtaking contrast, ultra-sharp",
        "seed": 107,
    },
    {
        "filename": "audio_temporal_studio.jpg",
        "prompt": "Futuristic digital audio visualizer with glowing pink and turquoise soundwave waveform frequencies radiating across an acoustic dark soundstage, floating glowing particles, modern music production studio",
        "seed": 108,
    },
    {
        "filename": "document_schema_clean.jpg",
        "prompt": "Minimalist executive typography layout and certification document mockup on matte graphite paper with embossed metallic foil seal, clean typography hierarchy, crisp layout design, premium graphic identity",
        "seed": 109,
    },
    {
        "filename": "neural_texture_synth.jpg",
        "prompt": "Generative organic crystalline obsidian sculpture with glowing internal magenta energy veins, microscopic intricate fractal facets, polished dark gemstone, cinematic studio macro photography",
        "seed": 110,
    },
    {
        "filename": "gpu_tensor_cloud.jpg",
        "prompt": "High-performance enterprise AI datacenter server racks with glowing magenta and cool cyan LED indicators, sleek cable management, glossy reflective floor, futuristic neural computing facility",
        "seed": 111,
    },
    {
        "filename": "privacy_vault_shield.jpg",
        "prompt": "3D holographic security shield icon composed of geometric glass facets and glowing circuit paths, floating securely in a dark tech vault with subtle pink neon ambient glow, cybersecurity aesthetic",
        "seed": 112,
    },
]


async def main():
    provider = NeuralStudioImageProvider()
    print(f"Generating creative suite assets to: {PUBLIC_DIR}")

    for item in ASSETS:
        target_path = PUBLIC_DIR / item["filename"]
        if target_path.exists() and target_path.stat().st_size > 5000:
            print(f"Already exists: {item['filename']} ({target_path.stat().st_size} bytes)")
            continue

        print(f"Generating: {item['filename']}...")
        try:
            await provider.generate_image(
                prompt=item["prompt"],
                output_path=target_path,
                width=1280,
                height=720,
                seed=item["seed"],
            )
            print(f"-> Successfully saved {item['filename']} ({target_path.stat().st_size} bytes)")
        except Exception as e:
            print(f"Error generating {item['filename']}: {e}")
        await asyncio.sleep(1)

    print("All creative suite assets generated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
