import os
import io
import urllib.request
from PIL import Image
from rembg import remove

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def upgrade_jewelry():
    url = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1920&q=95&auto=format&fit=crop"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    
    # 1672 x 941 target
    target_w, target_h = 1672, 941
    target_aspect = target_w / target_h
    img_aspect = img.width / img.height
    
    if img_aspect > target_aspect:
        new_w = int(img.height * target_aspect)
        ox = (img.width - new_w) // 2
        img_cropped = img.crop((ox, 0, ox + new_w, img.height))
    else:
        new_h = int(img.width / target_aspect)
        oy = (img.height - new_h) // 2
        img_cropped = img.crop((0, oy, img.width, oy + new_h))
        
    orig = img_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    orig.save("public/upscale/jewelry.png", "PNG")
    print(f"Saved public/upscale/jewelry.png: {orig.width}x{orig.height} ({os.path.getsize('public/upscale/jewelry.png')/1024:.1f} KB)")
    
    # Generate cutout with rembg
    print("Generating alpha cutout with rembg...")
    cutout = remove(orig)
    cutout.save("public/upscale/jewelry_cutout.png", "PNG")
    print(f"Saved public/upscale/jewelry_cutout.png: {cutout.width}x{cutout.height} ({os.path.getsize('public/upscale/jewelry_cutout.png')/1024:.1f} KB)")

if __name__ == '__main__':
    upgrade_jewelry()
