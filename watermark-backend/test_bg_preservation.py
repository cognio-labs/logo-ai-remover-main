"""Regressions for post-inference damage, independent of model semantics."""
import io

import cv2
import numpy as np
import pytest
from PIL import Image

import bg_remover_advanced as bg
from text_remover import build_text_mask, inpaint_text_and_objects, remove_text_pipeline


def encode(image):
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    return stream.getvalue()


@pytest.mark.parametrize('detail', ['hands-feet', 'distant-person', 'whiskers', 'text-counters'])
def test_no_component_size_or_proximity_pruning(monkeypatch, detail):
    alpha = np.zeros((180, 280), dtype=np.uint8)
    alpha[25:160, 160:245] = 255
    if detail == 'hands-feet':
        alpha[70, 115:165] = 211
        alpha[158:175, 163:166] = 200
    elif detail == 'distant-person':
        alpha[20:50, 10:15] = 230
        alpha[50:65, 10] = 192
    elif detail == 'whiskers':
        alpha[60, 80:165] = 37
        alpha[20, 20:70] = 71  # detached fine strands
    else:
        cv2.putText(alpha, 'B 08', (2, 120), cv2.FONT_HERSHEY_SIMPLEX, .6, 240, 1)
        alpha[70:73, 190:193] = 0
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.fromarray(alpha), {}))
    result, _ = bg.remove_background_pipeline(encode(Image.new('RGB', (280,180), '#745e3f')))
    np.testing.assert_array_equal(np.asarray(Image.open(io.BytesIO(result)).getchannel('A')), alpha)


def test_uncertain_background_never_promoted_to_opaque():
    alpha = np.zeros((60, 80), dtype=np.uint8)
    alpha[8:52, 10:70] = 155  # retained by >128 threshold but not opaque evidence
    old = bg.refine_matting(np.zeros((60,80,3), np.uint8), (alpha>128).astype('uint8')*255, alpha)
    assert old[30,40] == 255  # reproduces the exact inflation defect
    fixed = bg.refine_foreground_alpha(np.zeros((60,80,3), np.uint8), alpha)
    assert fixed[30,40] == 155
    np.testing.assert_array_equal(fixed, alpha)


def test_low_confidence_landscape_does_not_claim_success(monkeypatch):
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.new('L', (23,17), 12), {}))
    with pytest.raises(RuntimeError):
        bg.remove_background_pipeline(encode(Image.new('RGB', (23,17))))


def test_authored_alpha_without_fully_clear_pixels_is_valid(monkeypatch):
    rgba = np.full((12, 23, 4), 128, dtype=np.uint8)
    monkeypatch.setattr(bg, '_get_session', lambda _: pytest.fail('Must preserve authored alpha'))
    result, meta = bg.remove_background_pipeline(encode(Image.fromarray(rgba)))
    np.testing.assert_array_equal(np.asarray(Image.open(io.BytesIO(result))), rgba)
    assert meta['operation'] == 'preserved-existing-transparency'


def test_explicit_inpainting_mask_does_not_expand_or_change_neighbours():
    image = np.random.default_rng(3).integers(0, 255, (40,60,3), dtype=np.uint8)
    mask = np.zeros((40,60), np.uint8)
    mask[15:20, 25:30] = 255
    actual = build_text_mask(image, custom_mask=mask, auto_detect=False)
    np.testing.assert_array_equal(actual, mask)
    result = inpaint_text_and_objects(image, actual, use_grain_matching=False)
    np.testing.assert_array_equal(result[mask==0], image[mask==0])


def test_inpainting_preserves_authored_alpha_dimensions_and_unselected_rgb():
    pixels = np.random.default_rng(4).integers(0, 255, (40,60,4), dtype=np.uint8)
    mask = np.zeros((40,60), np.uint8); mask[15:20, 25:30] = 255
    output = remove_text_pipeline(encode(Image.fromarray(pixels)), mask_bytes=encode(Image.fromarray(mask)))
    decoded = np.asarray(Image.open(io.BytesIO(output)))
    assert decoded.shape == pixels.shape
    np.testing.assert_array_equal(decoded[:,:,3], pixels[:,:,3])
    np.testing.assert_array_equal(decoded[mask==0], pixels[mask==0])
