import os
import sys
import hashlib
from pathlib import Path
import urllib.request

MODELS_DIR = Path("backend/models/weights")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_REGISTRY = {
    "RealESRGAN_x4plus.pth": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        "description": "General purpose 4x photo upscaler"
    },
    "RealESRGAN_x4plus_anime_6B.pth": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
        "description": "Anime and generative art illustration upscaler"
    },
    "GFPGANv1.4.pth": {
        "url": "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
        "description": "Facial detail restoration & natural skin texture recovery"
    },
    "big-lama.pt": {
        "url": "https://github.com/advimman/lama/releases/download/v0.1.0/big-lama.pt",
        "description": "Large-scale Fourier inpainting for watermark & object removal"
    },
    "birefnet-general.pth": {
        "url": "https://github.com/ZhengPeng7/BiRefNet/releases/download/v1.0/BiRefNet-general-epoch_244.pth",
        "description": "High-resolution bilateral reference segmentation for background removal"
    }
}

def download_file(url: str, dest: Path):
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"[EXISTS] {dest.name} already downloaded ({dest.stat().st_size / 1e6:.1f} MB)")
        return

    print(f"[DOWNLOADING] {dest.name} from {url}...")
    temp_dest = dest.with_suffix(".tmp")
    try:
        urllib.request.urlretrieve(url, temp_dest)
        temp_dest.rename(dest)
        print(f"[COMPLETE] {dest.name} downloaded successfully!")
    except Exception as e:
        print(f"[WARN] Download for {dest.name} had error: {e}")
        if temp_dest.exists():
            temp_dest.unlink()

def main():
    print("=" * 60)
    print("BELLIX.US AI MODEL WEIGHTS DOWNLOAD MANAGER")
    print("Target Directory:", MODELS_DIR.resolve())
    print("=" * 60)

    for filename, info in MODEL_REGISTRY.items():
        dest = MODELS_DIR / filename
        print(f"\nModel: {filename} ({info['description']})")
        download_file(info["url"], dest)

    print("\nModel registry download check complete!")

if __name__ == "__main__":
    main()
