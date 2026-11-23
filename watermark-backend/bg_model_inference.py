"""Model adapters and shared float-mask restoration; RGB is never composited here."""
from __future__ import annotations

from pathlib import Path
import logging

import numpy as np
from PIL import Image

BIREFNET_MODELS = {'birefnet-general', 'birefnet-general-lite'}
SUPPORTED_MODELS = BIREFNET_MODELS | {'isnet-general-use', 'u2net'}
logger = logging.getLogger(__name__)


def mask_statistics(values: np.ndarray) -> dict:
    values = np.asarray(values)
    if values.ndim != 2 or not values.size or not np.isfinite(values).all():
        raise ValueError(f'Invalid foreground mask: shape={values.shape}, expected finite HxW')
    return {
        'dimensions': [values.shape[1], values.shape[0]],
        'min': float(values.min()), 'max': float(values.max()),
        'mean': float(values.mean()),
        'percentiles': dict(zip(['p0', 'p1', 'p5', 'p50', 'p95', 'p99', 'p100'],
                                map(float, np.percentile(values, [0, 1, 5, 50, 95, 99, 100])))),
    }


def restore_foreground_mask(raw: np.ndarray, size: tuple[int, int], *, logits: bool = False):
    """Use declared model semantics, never infer polarity/range from image extrema.

    ISNet/U2Net export sigmoid probabilities; BiRefNet exports logits. All supported
    models use high=foreground. Constant predictions must not divide by zero or
    have weak numerical noise amplified into opaque foreground.
    """
    raw = np.asarray(raw, dtype=np.float32)
    stats = mask_statistics(raw)
    if logits:
        normalized = 1.0 / (1.0 + np.exp(-np.clip(raw, -80, 80)))
    else:
        if stats['min'] < -1e-5 or stats['max'] > 1.00001:
            raise ValueError('Probability model returned values outside [0, 1]')
        normalized = np.clip(raw, 0, 1)
    restored = Image.fromarray(normalized).resize(size, Image.Resampling.BILINEAR)
    alpha = Image.fromarray(np.rint(np.clip(np.asarray(restored), 0, 1)*255).astype(np.uint8))
    return alpha, normalized, stats


def predict_foreground_mask(session, image: Image.Image, model: str,
                            debug_dir: Path | None = None) -> tuple[Image.Image, dict]:
    if model not in SUPPORTED_MODELS:
        raise ValueError(f'No validated foreground-mask adapter for {model}')
    rgb = image.convert('RGB')
    runtime = session.inner_session
    if model == 'u2net':
        # U2Net training uses image-maximum scaling; retain its own preprocessing.
        feed = session.normalize(rgb, (.485, .456, .406), (.229, .224, .225), (320, 320))
        input_size = [320, 320]
    else:
        input_size = [1024, 1024]
        pixels = np.asarray(rgb.resize(tuple(input_size), Image.Resampling.BILINEAR), dtype=np.float32)/255.0
        mean = np.array([.485, .456, .406] if model in BIREFNET_MODELS else [.5]*3, dtype=np.float32)
        std = np.array([.229, .224, .225] if model in BIREFNET_MODELS else [1.]*3, dtype=np.float32)
        tensor = np.ascontiguousarray(((pixels-mean)/std).transpose(2, 0, 1)[None])
        feed = {runtime.get_inputs()[0].name: tensor}
    outputs = runtime.run(None, feed)
    prediction = np.asarray(outputs[0], dtype=np.float32)
    if prediction.ndim != 4 or prediction.shape[:2] != (1, 1):
        raise ValueError(f'Invalid {model} output: {prediction.shape}')
    raw = prediction[0, 0]
    mask, normalized, raw_stats = restore_foreground_mask(raw, rgb.size, logits=model in BIREFNET_MODELS)
    diagnostics = {
        'adapter': 'float-mask-before-quantization', 'polarity': 'white-foreground',
        'output_kind': 'logits' if model in BIREFNET_MODELS else 'probabilities',
        'original_dimensions': list(rgb.size), 'model_input': input_size,
        'raw_mask': raw_stats, 'normalized_mask': mask_statistics(normalized),
        'restored_mask': mask_statistics(np.asarray(mask)),
        'providers': runtime.get_providers() if hasattr(runtime, 'get_providers') else [],
    }
    logger.info('Inference mask diagnostics %s: %s', model, diagnostics)
    if debug_dir is not None:
        debug_dir.mkdir(parents=True, exist_ok=True)
        # PNG cannot represent signed float logits: retain exact tensor in NPY
        # and use a documented fixed-scale preview (no image-dependent stretch).
        np.save(debug_dir / 'raw_mask.npy', raw)
        preview = np.clip(raw, -20, 20)/40 + .5 if model in BIREFNET_MODELS else raw
        Image.fromarray(np.rint(np.clip(preview, 0, 1)*65535).astype(np.uint16)).save(debug_dir / 'raw_mask.png')
        Image.fromarray(np.rint(normalized*65535).astype(np.uint16)).save(debug_dir / 'normalized_mask.png')
        diagnostics['raw_png_encoding'] = 'uint16: logits clipped [-20,20]' if model in BIREFNET_MODELS else 'uint16: probability [0,1]'
    return mask, diagnostics


def combine_source_alpha(mask: Image.Image, original: Image.Image) -> np.ndarray:
    alpha = np.asarray(mask.convert('L'))
    if mask.size != original.size:
        raise ValueError('Foreground mask dimensions differ from original')
    if 'A' in original.getbands() or 'transparency' in original.info:
        source = np.asarray(original.convert('RGBA').getchannel('A'), dtype=np.uint16)
        alpha = ((alpha.astype(np.uint16)*source+127)//255).astype(np.uint8)
    return alpha
