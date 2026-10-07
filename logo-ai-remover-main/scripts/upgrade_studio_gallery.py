import os
import io
import urllib.request
from PIL import Image

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def download_image(url, target_w=2400, target_h=1600):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    
    target_aspect = target_w / target_h
    img_aspect = img.width / img.height
    
    if img_aspect > target_aspect:
        new_w = int(img.height * target_aspect)
        offset_x = (img.width - new_w) // 2
        img = img.crop((offset_x, 0, offset_x + new_w, img.height))
    else:
        new_h = int(img.width / target_aspect)
        offset_y = (img.height - new_h) // 2
        img = img.crop((0, offset_y, img.width, offset_y + new_h))
        
    return img.resize((target_w, target_h), Image.Resampling.LANCZOS)

SAMPLES = [
    {
        "jpg": "public/creative-suite/gallery_portrait_luxury.jpg",
        "webp": "public/creative-suite/gallery_portrait_luxury.webp",
        "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=2400&q=95&auto=format&fit=crop"
    },
    {
        "jpg": "public/creative-suite/gallery_product_emerald.jpg",
        "webp": "public/creative-suite/gallery_product_emerald.webp",
        "url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=2400&q=95&auto=format&fit=crop"
    },
    {
        "jpg": "public/creative-suite/gallery_architecture_alpine.jpg",
        "webp": "public/creative-suite/gallery_architecture_alpine.webp",
        "url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=2400&q=95&auto=format&fit=crop" # Luxury modern villa with infinity pool
    }
]

def run():
    print("Upgrading Studio Gallery Samples to 2400x1600 4K...")
    for item in SAMPLES:
        try:
            img = download_image(item['url'], 2400, 1600)
            img.save(item['jpg'], "JPEG", quality=94, optimize=True)
            img.save(item['webp'], "WEBP", quality=94)
            sz = os.path.getsize(item['jpg']) / 1024
            print(f"Saved {item['jpg']}: 2400x1600 ({sz:.1f} KB)")
        except Exception as e:
            print(f"Error on {item['jpg']}: {e}")

if __name__ == '__main__':
    run()
