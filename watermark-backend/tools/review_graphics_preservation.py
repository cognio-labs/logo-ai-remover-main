"""Compare authored logo alpha with ISNet and the real preservation pipeline.

Run compare_bg_models.py with ISNet first to create paired source artifacts.
"""
import io
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'watermark-backend'))
import numpy as np
from PIL import Image
from bg_remover_advanced import remove_background_pipeline
root = ROOT / 'scratch/bg-model-comparison'
report = []
for case in ['logo', 'logo-transparent']:
    base = root/case/'isnet-general-use'
    original = Image.open(base/'original.png')
    source = io.BytesIO()
    original.save(source, format='PNG')
    output, meta = remove_background_pipeline(source.getvalue(), image_type='graphics')
    folder = root/case/'graphics-preserve'
    folder.mkdir(parents=True, exist_ok=True)
    original.save(folder/'original.png')
    original.getchannel('A').save(folder/'raw-mask.png')
    original.getchannel('A').save(folder/'alpha.png')
    (folder/'result.png').write_bytes(output)
    expected = np.asarray(original)
    actual = np.asarray(Image.open(io.BytesIO(output)))
    baseline = np.asarray(Image.open(base/'result.png'))
    row = {'case': case, 'rgba_exact': bool(np.array_equal(actual, expected)),
           'alpha_mae_fixed': float(np.abs(actual[:, :, 3].astype(float)-expected[:, :, 3]).mean()),
           'alpha_mae_isnet': float(np.abs(baseline[:, :, 3].astype(float)-expected[:, :, 3]).mean()),
           'source_foreground_pixels_damaged_by_isnet': int(((expected[:, :, 3] >= 250)&(baseline[:, :, 3] < 128)).sum()),
           'meta': meta}
    report.append(row)
print(json.dumps(report, indent=2))
(root/'graphics-preserve.json').write_text(json.dumps(report, indent=2))
