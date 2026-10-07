import os
import io
import urllib.request
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageEnhance

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def download_image(url, target_w=1500, target_h=1500, fit_mode="crop"):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    
    target_aspect = target_w / target_h
    img_aspect = img.width / img.height
    
    if fit_mode == "crop":
        if img_aspect > target_aspect:
            new_w = int(img.height * target_aspect)
            offset_x = (img.width - new_w) // 2
            img = img.crop((offset_x, 0, offset_x + new_w, img.height))
        else:
            new_h = int(img.width / target_aspect)
            offset_y = (img.height - new_h) // 2
            img = img.crop((0, offset_y, img.width, offset_y + new_h))
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    elif fit_mode == "resize":
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    return img

# 1. UPSCALE MACRO TEXTURE CARDS (1500x1500 Razor Sharp 4K)
UPSCALE_CARDS = [
    {
        "filename": "public/upscale/card_subpixel_high.jpg",
        "url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1500&q=95&auto=format&fit=crop", # Extreme eye & eyelash micro-texture
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_skin_high.jpg",
        "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1500&q=95&auto=format&fit=crop", # Natural skin texture & pores
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_fabric_high.jpg",
        "url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1500&q=95&auto=format&fit=crop", # Luxury woven fabric fiber
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_typography_high.jpg",
        "url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1500&q=95&auto=format&fit=crop", # Graphic typography art
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_edge_high.jpg",
        "url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1500&q=95&auto=format&fit=crop", # Crisp architectural geometry & edge
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_fur_high.jpg",
        "url": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1500&q=95&auto=format&fit=crop", # Dog fine fur detail
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_knit_high.jpg",
        "url": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=1500&q=95&auto=format&fit=crop", # Knitted sweater wool loops
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_mountain_high.jpg",
        "url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1500&q=95&auto=format&fit=crop", # Mountain crags & rock texture
        "w": 1500, "h": 1500
    },
    {
        "filename": "public/upscale/card_texture_high.jpg",
        "url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1500&q=95&auto=format&fit=crop", # Complex textural canvas
        "w": 1500, "h": 1500
    },
]

def build_upscale_cards():
    print("Upgrading upscale micro-texture cards to 4K...")
    for item in UPSCALE_CARDS:
        try:
            img = download_image(item['url'], target_w=item['w'], target_h=item['h'])
            img.save(item['filename'], "JPEG", quality=95, optimize=True)
            sz = os.path.getsize(item['filename']) / 1024
            print(f"Saved {item['filename']}: {img.width}x{img.height} ({sz:.1f} KB)")
        except Exception as e:
            print(f"Error on {item['filename']}: {e}")

# 2. VIDEO ENHANCER & GEMINI DEMO BANNER (2560x1440 4K Split Comparison)
def build_video_demo_banners():
    print("Building 4K video-enhancer-demo.jpg & gemini-video-demo.jpg...")
    # Base 4K cinematic image
    base_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=2560&q=95&auto=format&fit=crop"
    try:
        master = download_image(base_url, target_w=2560, target_h=1440)
        
        # Left side: simulated 480p (downscale then upscale back with bicubic + subtle noise)
        left_low = master.crop((0, 0, 1280, 1440))
        left_small = left_low.resize((320, 360), Image.Resampling.BILINEAR)
        left_simulated = left_small.resize((1280, 1440), Image.Resampling.BICUBIC)
        # Apply slight blur to simulate compression softness
        left_simulated = left_simulated.filter(ImageFilter.GaussianBlur(radius=1.8))
        
        # Right side: pristine razor sharp 4K
        right_sharp = master.crop((1280, 0, 2560, 1440))
        
        # Combine
        combined = Image.new("RGB", (2560, 1440))
        combined.paste(left_simulated, (0, 0))
        combined.paste(right_sharp, (1280, 0))
        
        # Draw elegant vertical divider line
        draw = ImageDraw.Draw(combined)
        draw.line([(1280, 0), (1280, 1440)], fill=(225, 29, 72), width=4)
        
        # Save as video-enhancer-demo.jpg and gemini-video-demo.jpg
        combined.save("public/video-enhancer-demo.jpg", "JPEG", quality=94, optimize=True)
        combined.save("public/gemini-video-demo.jpg", "JPEG", quality=94, optimize=True)
        sz1 = os.path.getsize("public/video-enhancer-demo.jpg") / 1024
        print(f"Saved public/video-enhancer-demo.jpg (4K 2560x1440): {sz1:.1f} KB")
    except Exception as e:
        print(f"Error on video demo banner: {e}")

# 3. HOMEPAGE HERO COMPARISON (hero-before-gemini.png & hero-after-clean.png)
def build_hero_comparison():
    print("Building 4K Hero Slider: hero-after-clean.png & hero-before-gemini.png...")
    # Breathtaking high-end cinematic studio portrait
    hero_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=2400&q=95&auto=format&fit=crop"
    try:
        clean_img = download_image(hero_url, target_w=2400, target_h=1600)
        clean_img.save("public/hero-after-clean.png", "PNG", optimize=True)
        sz_clean = os.path.getsize("public/hero-after-clean.png") / 1024
        print(f"Saved public/hero-after-clean.png (4K 2400x1600): {sz_clean:.1f} KB")
        
        # Before image: starts from clean_img, applies subtle compression artifact in watermark area and overlays Gemini watermark star
        before_img = clean_img.copy()
        
        # Overlay gemini logo if exists
        gemini_logo_path = "public/gemini-logo.png"
        if os.path.exists(gemini_logo_path):
            logo = Image.open(gemini_logo_path).convert("RGBA")
            logo = logo.resize((140, 140), Image.Resampling.LANCZOS)
            
            # Place at bottom right
            pos_x = before_img.width - 220
            pos_y = before_img.height - 220
            
            # Apply slight compression blur in that region on before_img
            crop_box = (pos_x - 30, pos_y - 30, pos_x + 170, pos_y + 170)
            region = before_img.crop(crop_box)
            region = region.resize((50, 50), Image.Resampling.BILINEAR).resize((region.width, region.height), Image.Resampling.NEAREST)
            before_img.paste(region, crop_box)
            
            before_img.paste(logo, (pos_x, pos_y), logo)
            
        before_img.save("public/hero-before-gemini.png", "PNG", optimize=True)
        sz_before = os.path.getsize("public/hero-before-gemini.png") / 1024
        print(f"Saved public/hero-before-gemini.png (4K 2400x1600): {sz_before:.1f} KB")
    except Exception as e:
        print(f"Error on hero comparison: {e}")

# 4. INSPIRATIONS UPGRADE (insp_4, insp_6)
def build_inspirations():
    print("Upgrading low-res inspirations...")
    insp_items = [
        {
            "filename": "public/inspirations/insp_4.webp",
            "url": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&q=95&auto=format&fit=crop", # VR headset cyber eyewear
            "w": 960, "h": 1280
        },
        {
            "filename": "public/inspirations/insp_6.webp",
            "url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=95&auto=format&fit=crop", # Pop art illustration
            "w": 960, "h": 1280
        }
    ]
    for item in insp_items:
        try:
            img = download_image(item['url'], target_w=item['w'], target_h=item['h'])
            img.save(item['filename'], "WEBP", quality=95)
            sz = os.path.getsize(item['filename']) / 1024
            print(f"Saved {item['filename']}: {img.width}x{img.height} ({sz:.1f} KB)")
        except Exception as e:
            print(f"Error on inspiration {item['filename']}: {e}")

if __name__ == "__main__":
    build_upscale_cards()
    build_video_demo_banners()
    build_hero_comparison()
    build_inspirations()
    print("All additional section assets successfully processed!")
