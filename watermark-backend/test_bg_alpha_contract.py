import io
import numpy as np
import pytest
from PIL import Image
import bg_remover_advanced as bg


def test_soft_alpha_rgb_and_dimensions_survive(monkeypatch):
    rgb = np.random.default_rng(7).integers(0, 255, (45, 73, 3), dtype=np.uint8)
    alpha = np.zeros((45, 73), dtype=np.uint8)
    alpha[10:35, 20:50] = 255
    alpha[9, 18:55] = 37  # fine disconnected low-alpha hair/text
    alpha[20, 30] = 0  # real hole must survive
    source = io.BytesIO()
    Image.fromarray(rgb).save(source, format='PNG')
    raw = io.BytesIO()
    Image.fromarray(np.dstack([rgb, alpha])).save(raw, format='PNG')
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.fromarray(alpha), {}))
    result, _ = bg.remove_background_pipeline(source.getvalue())
    decoded = np.array(Image.open(io.BytesIO(result)))
    assert np.array_equal(decoded[:, :, :3], rgb)
    assert decoded.shape == (45, 73, 4)
    assert np.array_equal(decoded[:, :, 3], alpha)  # soft strands and real holes survive
    assert decoded[20, 30, 3] == 0
    assert decoded[21, 30, 3] == 255
    assert np.all(decoded[:5, :5, 3] == 0)


@pytest.mark.parametrize('opacity', [0, 255])
def test_degenerate_mask_fails(monkeypatch, opacity):
    raw = io.BytesIO()
    Image.new('RGBA', (30, 20), (50, 70, 100, opacity)).save(raw, format='PNG')
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.new('L', (30, 20), opacity), {}))
    with pytest.raises(RuntimeError):
        bg.remove_background_pipeline(raw.getvalue())


def test_source_alpha_applied_exactly_once(monkeypatch):
    source = io.BytesIO()
    pixels = np.zeros((20, 30, 4), dtype=np.uint8)
    pixels[:, :, :3] = [80, 120, 230]
    pixels[5:15, 5:25, 3] = 128
    Image.fromarray(pixels).save(source, format='PNG')
    mask = Image.new('L', (30, 20), 255)
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (mask, {}))
    result, _ = bg.remove_background_pipeline(source.getvalue(), image_type='portrait')
    assert np.array_equal(np.asarray(Image.open(io.BytesIO(result))), pixels)


def test_mask_prediction_uses_rgb_and_not_composited_alpha():
    from bg_model_inference import predict_foreground_mask
    class Runtime:
        def get_inputs(self):
            return [type('Input', (), {'name': 'input'})()]
        def run(self, _, feed):
            # RGB preprocessing ignores source alpha and uses fixed /255.
            np.testing.assert_allclose(feed['input'][0, :, 0, 0], np.array([1, 2, 3])/255-.5, atol=1e-7)
            return [np.full((1, 1, 16, 16), 191/255, dtype=np.float32)]
    session = type('Session', (), {'inner_session': Runtime()})()
    raw, _ = predict_foreground_mask(session, Image.new('RGBA', (12, 15), (1, 2, 3, 128)), 'isnet-general-use')
    assert np.all(np.asarray(raw) == 191)


def test_birefnet_normalization_and_no_minmax_stretch():
    from bg_model_inference import predict_foreground_mask
    class Runtime:
        def get_inputs(self):
            return [type('Input', (), {'name': 'input'})()]
        def run(self, _, feed):
            tensor = feed['input']
            assert tensor.dtype == np.float32
            np.testing.assert_allclose(tensor[0, :, 0, 0], (np.array([64, 64, 64])/255-np.array([.485, .456, .406]))/np.array([.229, .224, .225]), rtol=1e-6)
            return [np.full((1, 1, 1024, 1024), -2, dtype=np.float32)]
    session = type('Session', (), {'inner_session': Runtime()})()
    mask, _ = predict_foreground_mask(session, Image.new('RGB', (37, 19), (64, 64, 64)), 'birefnet-general')
    assert mask.size == (37, 19)
    assert np.all(np.asarray(mask) == 30)  # sigmoid(-2), never stretched to 255


def test_explicit_graphics_preserves_authored_text_alpha(monkeypatch):
    source = io.BytesIO()
    rgba = np.zeros((40, 83, 4), dtype=np.uint8)
    rgba[:, :, :3] = [12, 35, 100]
    rgba[8:29:3, 10:70:4, 3] = 255  # disconnected fine graphic details
    rgba[10, 71, 3] = 41
    Image.fromarray(rgba).save(source, format='PNG')
    def forbidden(*_):
        raise AssertionError('Authored graphics alpha must not be segmented again')
    monkeypatch.setattr(bg, '_get_session', forbidden)
    png, meta = bg.remove_background_pipeline(source.getvalue(), image_type='graphics')
    assert np.array_equal(np.asarray(Image.open(io.BytesIO(png))), rgba)
    assert meta['operation'] == 'preserved-existing-transparency'
    assert meta['model_used'] == 'existing-alpha'
    assert meta['quality_pass'] is False


def test_auto_mode_preserves_authored_transparency(monkeypatch):
    source = io.BytesIO()
    rgba = np.zeros((40, 83, 4), dtype=np.uint8)
    rgba[:, :, :3] = [12, 35, 100]
    rgba[:, :, 3] = 255
    rgba[:5, :5, 3] = 0  # existing transparent corner
    Image.fromarray(rgba).save(source, format='PNG')

    mask = np.zeros((40, 83), dtype=np.uint8)
    mask[10:30, 20:60] = 255
    called = []
    def mock_session(_):
        called.append(True)
        return object()
    monkeypatch.setattr(bg, '_get_session', mock_session)
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.fromarray(mask), {}))

    png, meta = bg.remove_background_pipeline(source.getvalue(), image_type='auto')
    assert not called, "Authored alpha is authoritative in auto mode"
    decoded = np.asarray(Image.open(io.BytesIO(png)))
    # Existing transparent corner remains transparent
    assert np.all(decoded[:5, :5, 3] == 0)
    # Inside the mask, foreground is kept
    assert np.all(decoded[15:25, 25:55, 3] == 255)
    assert np.array_equal(decoded, rgba)
    assert meta['operation'] == 'preserved-existing-transparency'


def test_birefnet_failure_keeps_isnet_fallback(monkeypatch):
    source = io.BytesIO()
    Image.new('RGB', (17, 23), (100, 150, 200)).save(source, format='PNG')
    models = []
    def session(model):
        models.append(model)
        return None if model.startswith('birefnet') else object()
    mask = np.zeros((23, 17), dtype=np.uint8)
    mask[3:20, 4:13] = 255
    monkeypatch.setattr(bg, '_get_session', session)
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.fromarray(mask), {}))
    _, meta = bg.remove_background_pipeline(source.getvalue(), model='birefnet-general')
    assert models == ['birefnet-general', 'isnet-general-use']
    assert meta['model_used'] == 'isnet-general-use'
    assert meta['fallback_used'] is True


def test_probability_scale_polarity_and_alignment():
    from bg_model_inference import restore_foreground_mask
    raw = np.full((7, 11), .2, dtype=np.float32)
    raw[1:4, 7:10] = .8  # deliberately asymmetric foreground
    mask, _, _ = restore_foreground_mask(raw, (55, 35))
    values = np.asarray(mask)
    assert values[10, 42] == 204
    assert values[27, 10] == 51
    assert values.min() == 51 and values.max() == 204  # no contrast stretching


@pytest.mark.parametrize('bad', [np.nan, np.inf, -1, 2])
def test_invalid_probability_rejected(bad):
    from bg_model_inference import restore_foreground_mask
    with pytest.raises(ValueError):
        restore_foreground_mask(np.full((3, 7), bad, dtype=np.float32), (7, 3))


def test_debug_exports_real_raw_and_normalized_stages(tmp_path):
    from bg_model_inference import predict_foreground_mask
    class Runtime:
        def get_inputs(self):
            return [type('Input', (), {'name': 'input'})()]
        def run(self, _, feed):
            return [np.array([[[[.1, .9], [.3, .7]]]], dtype=np.float32)]
    session = type('Session', (), {'inner_session': Runtime()})()
    mask, info = predict_foreground_mask(session, Image.new('RGB', (31, 17)), 'isnet-general-use', tmp_path)
    assert Image.open(tmp_path/'raw_mask.png').size == (2, 2)
    assert Image.open(tmp_path/'normalized_mask.png').size == (2, 2)
    assert mask.size == (31, 17)
    assert info['raw_mask']['min'] == pytest.approx(.1)
    assert info['raw_mask']['max'] == pytest.approx(.9)
    assert np.load(tmp_path/'raw_mask.npy')[0, 0] == pytest.approx(.1)


def test_pipeline_debug_artifacts_and_png_roundtrip(monkeypatch, tmp_path):
    class Runtime:
        def get_inputs(self):
            return [type('Input', (), {'name': 'input'})()]
        def run(self, _, feed):
            return [np.array([[[[0., .8], [.3, 1.]]]], dtype=np.float32)]
    session = type('Session', (), {'inner_session': Runtime()})()
    monkeypatch.setattr(bg, '_get_session', lambda _: session)
    monkeypatch.setattr(bg, 'DEBUG_DIR', tmp_path)
    source = io.BytesIO()
    Image.new('RGB', (63, 27), (20, 70, 110)).save(source, format='PNG')
    png, meta = bg.remove_background_pipeline(source.getvalue(), save_debug=True)
    from pathlib import Path
    folder = Path(meta['debug_dir'])
    for name in ['original.png', 'raw_mask.png', 'normalized_mask.png', 'restored_mask.png',
                 'binary_candidate.png', 'refined_mask.png', 'matting_alpha.png', 'final_output.png', 'diagnostics.json']:
        assert (folder/name).is_file()
    result = Image.open(io.BytesIO(png))
    assert result.format == 'PNG' and result.mode == 'RGBA'
    assert result.size == (63, 27)
    assert np.all(np.asarray(result)[:, :, :3] == [20, 70, 110])
    assert np.array_equal(np.asarray(result.getchannel('A')), np.asarray(Image.open(folder/'refined_mask.png')))
    assert meta['inference_errors'] == []


def test_rgba_with_partially_transparent_decorative_elements_and_text(monkeypatch):
    """Verify semi-transparent text strokes are not attenuated by multiplication."""
    # RGBA image with 128-opacity gold decorative stroke and 200-opacity text
    rgba = np.zeros((50, 80, 4), dtype=np.uint8)
    rgba[:, :, 0] = 212  # Gold RGB
    rgba[:, :, 1] = 175
    rgba[:, :, 2] = 55
    rgba[15:35, 20:60, 3] = 200  # text body
    rgba[10, 15:65, 3] = 128     # decorative underline / flourish
    buf = io.BytesIO()
    Image.fromarray(rgba).save(buf, format='PNG')

    # Neural model predicts foreground over this region
    model_mask = np.zeros((50, 80), dtype=np.uint8)
    model_mask[5:45, 10:70] = 240
    monkeypatch.setattr(bg, '_get_session', lambda _: object())
    monkeypatch.setattr(bg, 'predict_foreground_mask', lambda *a: (Image.fromarray(model_mask), {}))

    png, _ = bg.remove_background_pipeline(buf.getvalue(), image_type='portrait')
    res = np.asarray(Image.open(io.BytesIO(png)))

    # RGB values must remain completely untouched
    assert np.array_equal(res[:, :, :3], rgba[:, :, :3])
    # Semi-transparent text (200) must NOT be multiplied down to (200*240//255 = 188)
    # With min(model, source), min(240, 200) = 200 exactly
    assert res[20, 30, 3] == 200
    # Decorative underline (128) must NOT be multiplied down to (128*240//255 = 120)
    assert res[10, 30, 3] == 128
    # Background outside text and flourish must remain 0
    assert res[0, 0, 3] == 0
