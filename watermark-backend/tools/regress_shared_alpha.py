"""Run the production shared pipeline, save every stage and visual comparisons.

This checks pixel/export invariants automatically. Semantic acceptance remains
pending visual review; no mask range or coverage heuristic certifies quality.
"""
import io
import argparse
import json
import logging
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'scratch/shared-alpha-regression'
os.environ.setdefault('BELLIX_SCRATCH_DIR', str(OUT))
sys.path.insert(0, str(ROOT / 'watermark-backend'))
import numpy as np
from PIL import Image, ImageDraw
import bg_remover_advanced as bg

PUBLIC = ROOT / 'logo-ai-remover-main/public'
CASES = [
    ('portrait', PUBLIC / 'upscale/skin_detail.jpg'),
    ('family-outdoor', ROOT / 'samples/input/family.png'),
    ('product', PUBLIC / 'upscale/showcase/product_before.jpg'),
    ('logo', ROOT / 'logo-ai-remover-main/src/assets/navbar-logo-original.png'),
    ('opaque-logo', OUT / 'opaque-logo-input.png'),
    ('graphics', PUBLIC / 'upscale/typography.png'),
    # Several historical fixture names are misleading; this is a screenshot of
    # the poster, not a pristine source artwork or a ground-truth alpha.
    ('poster', ROOT / 'samples/input/dupatta_fashion.png'),
    ('outdoor-wildlife', PUBLIC / 'upscale/wildlife.png'),
    ('reported-example', Path(r'C:\Users\PC\AppData\Local\Temp\codex-clipboard-umxspR.png')),
]


def comparison(original, result, path):
    sheet = Image.new('RGB', (1600, 470), '#303030')
    draw = ImageDraw.Draw(sheet)
    for i, (label, image, backdrop) in enumerate([
        ('Original', original, '#dadada'), ('Output on white', result, 'white'),
        ('Output on dark', result, '#202020'), ('Output checkerboard', result, None),
    ]):
        image = image.convert('RGBA')
        image.thumbnail((390, 430))
        base = Image.new('RGBA', image.size, backdrop or '#999999')
        if backdrop is None:
            d = ImageDraw.Draw(base)
            for y in range(0, image.height, 12):
                for x in range(0, image.width, 12):
                    if (x//12+y//12) % 2:
                        d.rectangle((x, y, x+11, y+11), fill='#dddddd')
        base.alpha_composite(image)
        sheet.paste(base.convert('RGB'), (i*400+5, 30))
        draw.text((i*400+5, 8), label, fill='white')
    sheet.save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--case', action='append', help='Repeat to rerun selected cases and retain other report rows')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if not args.case or 'opaque-logo' in args.case:
        # Label this derived fixture explicitly: tests opaque text segmentation,
        # while the original RGBA logo tests authored-alpha preservation.
        authored = Image.open(ROOT/'logo-ai-remover-main/src/assets/navbar-logo-original.png').convert('RGBA')
        flat = Image.new('RGBA', authored.size, 'white')
        flat.alpha_composite(authored)
        flat.convert('RGB').save(OUT/'opaque-logo-input.png')
    logging.basicConfig(level=logging.INFO, handlers=[logging.FileHandler(OUT/'inference.log', encoding='utf-8'), logging.StreamHandler()])
    report = json.loads((OUT/'report.json').read_text(encoding='utf-8')) if args.case and (OUT/'report.json').exists() else []
    for label, source in CASES:
        if args.case and label not in args.case:
            continue
        folder = OUT / label
        folder.mkdir(parents=True, exist_ok=True)
        row = {'case': label, 'source': str(source), 'visual_acceptance': 'pending'}
        try:
            data = source.read_bytes()
            original = bg._decode_image(data)
            png, meta = bg.remove_background_pipeline(data, save_debug=True)
            result = Image.open(io.BytesIO(png))
            original.save(folder/'original.png')
            (folder/'final_output.png').write_bytes(png)
            debug = Path(meta['debug_dir'])
            for name in ['raw_mask.png', 'normalized_mask.png', 'refined_mask.png', 'diagnostics.json']:
                (folder/name).write_bytes((debug/name).read_bytes())
            rgb = np.asarray(original.convert('RGB'))
            output = np.asarray(result)
            row.update(meta)
            row.update({'resolution_exact': result.size == original.size,
                        'rgb_exact': np.array_equal(output[:, :, :3], rgb),
                        'genuine_rgba_png': result.format == 'PNG' and result.mode == 'RGBA'})
            assert row['resolution_exact'] and row['rgb_exact'] and row['genuine_rgba_png']
            assert np.any(output[:, :, 3] == 0)
            if meta['operation'] == 'neural-background-removal':
                raw = np.load(debug/meta['model_used']/'raw_mask.npy')
                np.save(folder/'raw_mask.npy', raw)
            comparison(original, result, folder/'comparison.png')
            row['structural_checks'] = 'passed'
        except Exception as exc:
            row['error'] = str(exc)
            logging.exception('Regression failed: %s', label)
        (folder/'report.json').write_text(json.dumps(row, indent=2), encoding='utf-8')
        report = [old for old in report if old['case'] != label] + [row]
        (OUT/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(label, row.get('structural_checks', row.get('error')), flush=True)
    (OUT/'acceptance.json').write_text(json.dumps({
        'deployment_allowed': False, 'visual_acceptance': 'pending manual review',
        'structural_checks_are_not_semantic_acceptance': True,
    }, indent=2), encoding='utf-8')
    if any('error' in row for row in report):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
