import os
import io
import urllib.request
from PIL import Image

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def upgrade_mountain_lake():
    # Moraine Lake crystal turquoise reflection in Canadian Rockies
    url = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2400&q=95&auto=format&fit=crop"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    
    # Crop to 1:1 square 2048x2048
    side = min(img.width, img.height)
    ox = (img.width - side) // 2
    oy = (img.height - side) // 2
    img_square = img.crop((ox, oy, ox + side, oy + side)).resize((2048, 2048), Image.Resampling.LANCZOS)
    
    img_square.save("public/upscale/mountain_lake.jpg", "JPEG", quality=95, optimize=True)
    img_square.save("public/upscale/mountain_lake.webp", "WEBP", quality=95)
    print(f"Saved mountain_lake: 2048x2048 ({os.path.getsize('public/upscale/mountain_lake.jpg')/1024:.1f} KB)")

if __name__ == '__main__':
    upgrade_mountain_lake()
