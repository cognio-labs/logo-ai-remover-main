"""Reproducible, model-isolated quality comparison; no implicit fallback."""
import argparse
import hashlib
import io
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'watermark-backend'))
os.environ.setdefault('U2NET_HOME', r'D:\models\rembg')
os.environ.setdefault('OMP_NUM_THREADS', '4')
import numpy as np
from PIL import Image, ImageDraw

PUBLIC = 'logo-ai-remover-main/public/'
CASES = [
    ('portrait', PUBLIC+'hero-portrait-before.png'),
    ('portrait-hair', PUBLIC+'upscale/skin_detail.jpg'),
    ('family', 'samples/input/family.png'),
    ('pets', PUBLIC+'videos/pets_poster.jpg'),
    ('glass-product', PUBLIC+'videos/perfume_poster.jpg'),
    ('shoe', PUBLIC+'upscale/showcase/product_before.jpg'),
    ('wildlife', PUBLIC+'upscale/wildlife.png'),
    ('graphics', PUBLIC+'upscale/typography.png'),
    ('logo', 'logo-ai-remover-main/src/assets/navbar-logo-original.png'),
    ('logo-transparent', 'logo-ai-remover-main/src/assets/navbar-logo.png'),
    ('screenshot-rings', 'samples/input/dupatta_fashion.png'),
    ('screenshot-cards', 'samples/input/cards3.png'),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='isnet-general-use')
    parser.add_argument('--limit', type=int, default=len(CASES))
    parser.add_argument('--montage', action='store_true')
    parser.add_argument('--fixed', action='store_true')
    parser.add_argument('--case')
    args = parser.parse_args()
    out = ROOT / 'scratch/bg-model-comparison'
    out.mkdir(parents=True, exist_ok=True)
    if args.montage:
        montage(out)
        return
    import onnxruntime as ort
    from rembg import new_session
    # Bound CPU resources; disable arena retention for large BiRefNet graphs.
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 1
    opts.inter_op_num_threads = 1
    opts.enable_cpu_mem_arena = True
    opts.enable_mem_pattern = True
    t0 = time.perf_counter()
    session = new_session(args.model, sess_opts=opts, providers=['CPUExecutionProvider'])
    variant = args.model + ('-fixed' if args.fixed else '')
    print(f'Loaded {args.model} in {time.perf_counter()-t0:.2f}s', flush=True)
    report_file = out/(variant+'.json')
    report = json.loads(report_file.read_text()) if report_file.exists() else []
    for label, relative in CASES[:args.limit]:
        if args.case and args.case != label:
            continue
        row = {'case': label, 'source': relative, 'model': args.model,
               'providers': session.inner_session.get_providers()}
        folder = out / label / variant
        folder.mkdir(parents=True, exist_ok=True)
        try:
            data = (ROOT / relative).read_bytes()
            from bg_remover_advanced import _decode_image, _pil_to_png_bytes
            original = _decode_image(data)
            rgb = original.convert('RGB')
            t0 = time.perf_counter()
            # Direct prediction: raw mask, never alpha from a composited cutout.
            if args.fixed:
                from bg_model_inference import predict_foreground_mask
                mask, diagnostics = predict_foreground_mask(session, original, args.model)
                row['inference'] = diagnostics
            else:
                mask = session.predict(rgb)[0].convert('L')
            row['latency_seconds'] = round(time.perf_counter()-t0, 3)
            alpha = np.asarray(mask)
            from bg_model_inference import combine_source_alpha
            alpha = combine_source_alpha(mask, original)
            result = Image.fromarray(np.dstack([np.asarray(rgb), alpha]))
            png = _pil_to_png_bytes(result)
            decoded = np.asarray(Image.open(io.BytesIO(png)))
            assert result.size == original.size
            assert np.array_equal(decoded[:, :, :3], np.asarray(rgb))
            assert np.array_equal(decoded[:, :, 3], alpha)
            original.save(folder/'original.png')
            mask.save(folder/'raw-mask.png')
            Image.fromarray(alpha).save(folder/'alpha.png')
            (folder/'result.png').write_bytes(png)
            row.update({'source_sha256': hashlib.sha256(data).hexdigest(),
                        'size': original.size, 'rgb_exact': True, 'png_alpha_exact': True,
                        'transparent_pixels': int((alpha==0).sum()),
                        'opaque_pixels': int((alpha==255).sum()),
                        'soft_pixels': int(((alpha>0)&(alpha<255)).sum())})
        except Exception as exc:
            row['error'] = str(exc)
        report = [old for old in report if old['case'] != label] + [row]
        report_file.write_text(json.dumps(report, indent=2))
        (folder/'metrics.json').write_text(json.dumps(row, indent=2))
        print(json.dumps(row), flush=True)


def montage(out):
    models = ['isnet-general-use', 'birefnet-general-lite', 'birefnet-general-lite-fixed', 'birefnet-general-fixed', 'graphics-preserve']
    for label, _ in CASES:
        present = []
        for model in models:
            report_path = out/(model+'.json')
            entries = json.loads(report_path.read_text()) if report_path.exists() else []
            entry = next((r for r in entries if r.get('case') == label), {})
            if (out/label/model/'original.png').exists() or entry:
                present.append((model, entry))
        sheet = Image.new('RGB', (1200, max(1, 250*len(present))), '#282828')
        draw = ImageDraw.Draw(sheet)
        for y, (model, entry) in enumerate(present):
            if entry.get('error'):
                draw.text((5, y*250+5), model+' FAILED: '+entry['error'][:145], fill='#ff9999')
                continue
            for x, filename in enumerate(['original.png', 'raw-mask.png', 'alpha.png', 'result.png']):
                path = out/label/model/filename
                draw.text((x*300+5, y*250+5), model+' / '+filename, fill='white')
                if not path.exists():
                    draw.text((x*300+5, y*250+50), 'NO OUTPUT - see model report', fill='#ff9999')
                    continue
                im = Image.open(path).convert('RGBA')
                im.thumbnail((290, 215))
                # High-contrast solid backdrop makes residual background visible.
                bg = Image.new('RGBA', im.size, '#d190b0')
                bg.alpha_composite(im)
                sheet.paste(bg.convert('RGB'), (x*300+5, y*250+27))
        sheet.save(out/(label+'-compare.jpg'))


if __name__ == '__main__':
    main()
