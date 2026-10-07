import os
import io
import urllib.request
from PIL import Image, ImageDraw

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def generate_4k_ring_backdrop():
    url = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=2560&q=95&auto=format&fit=crop'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()

    ring_img = Image.open(io.BytesIO(data)).convert('RGB')
    target_w, target_h = 2560, 992

    # Scale ring image height to match target_h
    scale = target_h / ring_img.height
    new_w = int(ring_img.width * scale)
    ring_crop = ring_img.resize((new_w, target_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGB', (target_w, target_h), (255, 247, 237))
    canvas.paste(ring_crop.crop((0, 0, min(new_w, 1500), target_h)), (0, 0))

    # Create smooth gradient alpha mask fading into warm background (#FFF7ED)
    mask = Image.new('L', (target_w, target_h), 0)
    draw = ImageDraw.Draw(mask)
    fade_start = 850
    fade_end = 1500

    for x in range(fade_start, fade_end):
        alpha = int(255 * (x - fade_start) / (fade_end - fade_start))
        draw.line([(x, 0), (x, target_h)], fill=alpha)
    draw.rectangle([(fade_end, 0), (target_w, target_h)], fill=255)

    warm_layer = Image.new('RGB', (target_w, target_h), (255, 247, 237))
    canvas = Image.composite(warm_layer, canvas, mask)

    canvas.save('public/creative-suite/clean_section_ring_backdrop.png', 'PNG')
    canvas.save('public/creative-suite/clean_section_ring_backdrop.webp', 'WEBP', quality=95)
    print(f'4K Ring backdrop saved successfully: {target_w}x{target_h} ({os.path.getsize("public/creative-suite/clean_section_ring_backdrop.png")/1024:.1f} KB)')

if __name__ == '__main__':
    generate_4k_ring_backdrop()
