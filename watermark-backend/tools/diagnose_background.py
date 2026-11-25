"""Local, opt-in stage audit. Reuses captured probabilities for paired comparisons.

No inferred semantic accuracy scores: without labelled truth, residue and damage
are reported as separate alpha changes for human inspection.
"""
import argparse
import io
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'watermark-backend'))
import bg_remover_advanced as bg
from bg_model_inference import predict_foreground_mask

PUBLIC = ROOT / 'logo-ai-remover-main/public'
CASES = {
    'portrait': PUBLIC / 'gallery_samples/people-14_orig.jpg',
    'hair': PUBLIC / 'upscale/skin_detail.jpg',
    'dog': PUBLIC / 'videos/pets_poster.jpg',
    'product': PUBLIC / 'showcase/products_original.jpg',
    'logo': ROOT / 'logo-ai-remover-main/src/assets/navbar-logo-original.png',
    'landscape': PUBLIC / 'upscale/mountain_lake.jpg',
    'family': ROOT / 'samples/input/family.png',
    'transparent': ROOT / 'scratch/bellix-audit/authored-alpha.png',
    'complex': ROOT / 'samples/input/dupatta_fashion.png',
    'full-body': PUBLIC / 'gallery_samples/people-18_orig.jpg',
    'fur': PUBLIC / 'upscale/card_fur_high.jpg',
    'graphic': PUBLIC / 'upscale/typography.png',
}


def composite(image, color='#dc9cb8'):
    image = image.convert('RGBA')
    base = Image.new('RGBA', image.size, color)
    base.alpha_composite(image)
    return base.convert('RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--variant', default='before')
    parser.add_argument('--model', default='isnet-general-use')
    parser.add_argument('--case')
    args = parser.parse_args()
    output = ROOT / 'scratch/bellix-audit-verified' / args.model
    output.mkdir(parents=True, exist_ok=True)
    authored = Image.new('RGBA', (600, 300), (20, 85, 65, 0))
    pen = ImageDraw.Draw(authored)
    pen.text((70, 90), 'BELLIX  Transparent typography', fill=(20, 85, 65, 128), stroke_width=1)
    pen.ellipse((40, 40, 550, 250), outline=(200, 155, 40, 190), width=2)
    authored.save(CASES['transparent'])
    session = None
    rows = []
    for name, source in CASES.items():
        if args.case and args.case != name:
            continue
        folder = output / name
        folder.mkdir(exist_ok=True)
        image = bg._decode_image(source.read_bytes())
        rgb = np.asarray(image.convert('RGB'))
        raw_path = folder / 'restored.png'
        fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()
        identity = folder/'source.sha256'
        started = time.perf_counter()
        if raw_path.exists() and identity.exists() and identity.read_text() == fingerprint:
            alpha = np.asarray(Image.open(raw_path)).copy()
        else:
            session = session or bg._get_session(args.model)
            if session is None:
                raise RuntimeError('Requested model unavailable; audit never falls back silently')
            mask, diagnostics = predict_foreground_mask(session, image, args.model, folder)
            mask.save(raw_path)
            alpha = np.asarray(mask).copy()
            (folder / 'inference.json').write_text(json.dumps(diagnostics, indent=2))
            identity.write_text(fingerprint)
        binary = (alpha > 128).astype('uint8') * 255
        if args.variant == 'before':
            clean, _ = bg.apply_scdtr_component_refinement(
                bg.fill_holes_and_small_notches(binary), bg.detect_faces_yunet(rgb))
            matte = bg.refine_matting(rgb, clean, alpha)
        else:
            clean = alpha.copy()
            matte = bg.refine_foreground_alpha(rgb, alpha)
        from bg_model_inference import combine_source_alpha
        final = combine_source_alpha(Image.fromarray(matte), image)
        if args.variant != 'before' and 'A' in image.getbands() and np.any(np.asarray(image.getchannel('A')) < 255):
            final = np.asarray(image.getchannel('A'))
        result = Image.fromarray(np.dstack([rgb, final]))
        pipeline_valid = None
        pipeline_error = None
        if args.variant != 'before':
            get_session, predict = bg._get_session, bg.predict_foreground_mask
            try:
                # Exercise the full current orchestration/export with the exact
                # captured inference. No fake segmentation or repeated inference.
                bg._get_session = lambda *_: object()
                bg.predict_foreground_mask = lambda *a, **kw: (Image.fromarray(alpha), {})
                png, meta = bg.remove_background_pipeline(source.read_bytes(), model=args.model)
                decoded = Image.open(io.BytesIO(png))
                assert decoded.size == image.size and decoded.mode == 'RGBA'
                assert np.array_equal(np.asarray(decoded)[:,:,:3], rgb)
                assert np.array_equal(np.asarray(decoded.getchannel('A')), final)
                result = decoded
                pipeline_valid = True
            except RuntimeError as exc:
                pipeline_valid = False
                pipeline_error = str(exc)
            finally:
                bg._get_session, bg.predict_foreground_mask = get_session, predict
        variant = folder / args.variant
        variant.mkdir(exist_ok=True)
        stages = [image, Image.open(folder/'normalized_mask.png'), Image.fromarray(alpha),
                  Image.fromarray(binary), Image.fromarray(clean), Image.fromarray(final), result]
        labels = ['original', 'raw-probability', 'restored', 'binary-candidate', 'refined', 'final-alpha', 'result']
        sheet = Image.new('RGB', (1680, 250), '#f6f7f8')
        draw = ImageDraw.Draw(sheet)
        for idx, (stage, label) in enumerate(zip(stages, labels)):
            stage.save(variant / (label+'.png'))
            preview = composite(stage) if stage.mode == 'RGBA' else stage.convert('RGB')
            preview.thumbnail((230, 210))
            sheet.paste(preview, (idx*240+5, 30))
            draw.text((idx*240+5, 8), label, fill='#17211e')
        sheet.save(variant/'stages.jpg')
        baseline = folder/'before/final-alpha.png'
        row = {'category': name, 'source': str(source.relative_to(ROOT)), 'dimensions': image.size,
               'seconds': round(time.perf_counter()-started, 3),
               'opaque': int((final==255).sum()), 'transparent': int((final==0).sum()),
               'soft': int(((final>0)&(final<255)).sum()), 'rgb_exact': True}
        row.update(source_sha256=fingerprint, pipeline_valid=pipeline_valid, pipeline_error=pipeline_error)
        if baseline.exists():
            previous = np.asarray(Image.open(baseline)).astype('int16')
            delta = final.astype('int16')-previous
            row.update(alpha_reduced_pixels=int((delta<0).sum()), alpha_restored_pixels=int((delta>0).sum()))
        rows.append(row)
        print(json.dumps(row), flush=True)
    (output/(args.variant+'.json')).write_text(json.dumps(rows, indent=2))
    # Paired presentation on contrasting backgrounds, at full stage size separately.
    overview = Image.new('RGB', (1000, len(rows)*240), '#f6f7f8')
    draw = ImageDraw.Draw(overview)
    for idx, row in enumerate(rows):
        folder = output/row['category']
        paths = [folder/args.variant/'original.png', folder/'before/result.png', folder/args.variant/'result.png']
        for col, path in enumerate(paths):
            if not path.exists():
                continue
            im = composite(Image.open(path))
            im.thumbnail((320, 205))
            overview.paste(im, (col*330+5, idx*240+25))
        draw.text((5, idx*240+5), row['category']+' | original / checkpoint / '+args.variant, fill='#17211e')
    overview.save(output/(args.variant+'-montage.jpg'))


if __name__ == '__main__':
    main()
