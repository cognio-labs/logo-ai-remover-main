"""Real local LaMa repair and exact outside-mask contract on a known overlay."""
import json
import sys
import time
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'watermark-backend'))
from text_remover import inpaint_with_local_lama

out = ROOT/'scratch/bellix-inpainting'
out.mkdir(parents=True, exist_ok=True)
original = Image.open(ROOT/'logo-ai-remover-main/public/showcase/products_original.jpg').convert('RGB')
original.thumbnail((800,800))
overlay = original.copy()
mask = Image.new('L', overlay.size)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 48)
position = (80,100)
ImageDraw.Draw(overlay).text(position, 'SALE 2026', font=font, fill='black', stroke_width=1)
ImageDraw.Draw(mask).text(position, 'SALE 2026', font=font, fill=255, stroke_width=3)
started = time.perf_counter()
pixels = np.asarray(overlay)[:,:,::-1].copy()
result = inpaint_with_local_lama(pixels, np.asarray(mask))
if result is None:
    raise RuntimeError('Local LaMa did not execute; refusing to label a fallback as neural repair')
result = result[:,:,::-1]
np.testing.assert_array_equal(result[np.asarray(mask)==0], np.asarray(overlay)[np.asarray(mask)==0])
original.save(out/'ground-truth.png');overlay.save(out/'original-with-text.png');mask.save(out/'selection.png')
Image.fromarray(result).save(out/'repaired.png')
sheet = Image.new('RGB',(1200,430),'white');pen=ImageDraw.Draw(sheet)
for index,(label,image) in enumerate([('known original',original),('selected text overlay',overlay),('real LaMa repair',Image.fromarray(result))]):
    image=image.copy();image.thumbnail((390,390));sheet.paste(image,(index*400,30));pen.text((index*400+5,8),label,fill='black')
sheet.save(out/'comparison.jpg')
row={'engine':'local-lama','seconds':round(time.perf_counter()-started,3),'outside_mask_exact':True,
     'dimensions':original.size,'selected_rgb_mae':float(np.abs(result.astype(float)-np.asarray(original)).mean(axis=2)[np.asarray(mask)>0].mean())}
(out/'metrics.json').write_text(json.dumps(row,indent=2));print(json.dumps(row),flush=True)
