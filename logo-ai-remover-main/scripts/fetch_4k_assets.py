import os
import io
import urllib.request
from PIL import Image, ImageFilter, ImageDraw, ImageFont

# Headers to ensure clean Unsplash API / CDN access
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def download_image(url, target_w=2560, target_h=1440, fit_mode="crop"):
    """Downloads an image from url and centers crops or resizes to target_w, target_h."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    
    # Calculate aspect ratios
    target_aspect = target_w / target_h
    img_aspect = img.width / img.height
    
    if fit_mode == "crop":
        if img_aspect > target_aspect:
            # Image is wider than target: crop left and right
            new_w = int(img.height * target_aspect)
            offset_x = (img.width - new_w) // 2
            img = img.crop((offset_x, 0, offset_x + new_w, img.height))
        else:
            # Image is taller than target: crop top and bottom
            new_h = int(img.width / target_aspect)
            offset_y = (img.height - new_h) // 2
            img = img.crop((0, offset_y, img.width, offset_y + new_h))
            
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    elif fit_mode == "resize":
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
    return img

# Curated high-res Unsplash photo IDs (each with w=2560, q=95)
CREATIVE_SUITE_SPECS = [
    {
        "filename": "public/creative-suite/video_enhancer_cyberpunk.jpg",
        "url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/background_remover_studio.jpg",
        "url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/upscaler_macro_8k.jpg",
        "url": "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/watermark_remover_city.jpg",
        "url": "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/pdf_cleaner_blueprint.jpg",
        "url": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/motion_interpolator.jpg",
        "url": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/vector_typography.jpg",
        "url": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/color_grade_hdr.jpg",
        "url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/audio_temporal_studio.jpg",
        "url": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/document_schema_clean.jpg",
        "url": "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/neural_texture_synth.jpg",
        "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/gpu_tensor_cloud.jpg",
        "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/privacy_vault_shield.jpg",
        "url": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/cinematic_drone_8k.jpg",
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/attractive_couple_portrait.jpg",
        "url": "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/anime_dog_cutout.jpg",
        "url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/macro_jewelry_diamond.jpg",
        "url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/night_vision_denoise.jpg",
        "url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/hero_ai_cyber_city.jpg",
        "url": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/hero_neural_mastermind.jpg",
        "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/hero_portrait_luxury.jpg",
        "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
    {
        "filename": "public/creative-suite/anime_neural_remaster.jpg",
        "url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=2560&q=95&auto=format&fit=crop",
        "w": 2560, "h": 1440
    },
]

print("Starting Creative Suite 4K download and upgrade...")
success_count = 0
for item in CREATIVE_SUITE_SPECS:
    try:
        print(f"Downloading {item['filename']}...")
        img = download_image(item['url'], target_w=item['w'], target_h=item['h'])
        img.save(item['filename'], "JPEG", quality=92, optimize=True)
        sz = os.path.getsize(item['filename']) / 1024
        print(f"Saved {item['filename']}: {img.width}x{img.height} ({sz:.1f} KB)")
        success_count += 1
    except Exception as e:
        print(f"Error downloading {item['filename']}: {e}")

print(f"Completed Creative Suite: {success_count}/{len(CREATIVE_SUITE_SPECS)} upgraded to 4K.")
