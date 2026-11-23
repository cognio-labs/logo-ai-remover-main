"""Local review run: four artifacts per source, original pixels never overwritten."""
import io
import json
import logging
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault('BELLIX_SCRATCH_DIR', str(ROOT / 'scratch' / 'bg-quality'))
sys.path.insert(0, str(ROOT / 'watermark-backend'))
import numpy as np
from PIL import Image
from bg_remover_advanced import remove_background_pipeline, _decode_image

logging.basicConfig(level=logging.INFO)
sources = sorted((ROOT / 'samples/input').glob('*.png'))
public = ROOT / 'logo-ai-remover-main/public'
sources += [public / name for name in [
    'videos/pets_poster.jpg', 'videos/perfume_poster.jpg', 'videos/model_poster.jpg',
    'upscale/wildlife.png', 'upscale/typography.png', 'upscale/subpixel_face.jpg',
    'upscale/skin_detail.jpg', 'upscale/showcase/travel_before.jpg',
    'upscale/showcase/product_before.jpg']]
outdir = ROOT / 'scratch/bg-quality'
outdir.mkdir(parents=True, exist_ok=True)
report = []
for source in sources:
    row = {'source': str(source.relative_to(ROOT))}
    try:
        data = source.read_bytes()
        png, meta = remove_background_pipeline(data, save_debug=True)
        result = np.asarray(Image.open(io.BytesIO(png)))
        original = np.asarray(_decode_image(data).convert('RGB'))
        assert result.shape[:2] == original.shape[:2]
        assert np.array_equal(result[:, :, :3], original), 'RGB changed'
        assert np.any(result[:, :, 3] == 0), 'No transparent background'
        (outdir / (source.stem + '-result.png')).write_bytes(png)
        row.update(meta)
        row['structural_checks'] = 'passed; visual review required'
    except Exception as exc:
        row['error'] = str(exc)
    report.append(row)
    (outdir / 'report.json').write_text(json.dumps(report, indent=2))
    print(row, flush=True)
print(f'{len(report)} sources attempted. Structural checks do not establish visual quality.')
