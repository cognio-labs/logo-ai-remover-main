"""
Unit tests for Advanced Background Remover (Bellix Neural Pipeline v2).
Ensures no unbound variables, no silent exception eating, correct SCDTR mathematics,
soft face voting, pure neural fallbacks, and quality gate integrity.
"""
import io

import cv2
import numpy as np
from bg_remover_advanced import (
    apply_scdtr_component_refinement,
    detect_native_gradient,
    remove_background_pipeline,
)
from PIL import Image


def _make_dummy_image(w=128, h=128, subject_radius=30, with_thin_ring=True) -> bytes:
    """Creates a synthetic test image with a solid subject and an optional thin concentric ring."""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    # Background: dark maroon (50, 20, 20)
    img[:] = [50, 20, 20]
    # Solid subject circle at center: white (240, 240, 240)
    cv2.circle(img, (w // 2, h // 2), subject_radius, (240, 240, 240), -1)
    if with_thin_ring:
        # Thin concentric ring of thickness 2px
        cv2.circle(img, (w // 2, h // 2), subject_radius + 15, (220, 180, 50), 2)
    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


def test_scdtr_removes_thin_rings_and_preserves_subject():
    """Verify SCDTR computes per-component inscribed radius and decouples thin rings."""
    w, h = 200, 200
    mask = np.zeros((h, w), dtype=np.uint8)
    # Solid circle (radius 40, inscribed R=40)
    cv2.circle(mask, (100, 100), 40, 255, -1)
    # Thin concentric ring (thickness 2px, radius 60, inscribed R=1)
    cv2.circle(mask, (100, 100), 60, 255, 2)
    # Connect ring to body with a 2px bridge
    cv2.line(mask, (100, 140), (100, 160), 255, 2)

    # Before SCDTR, they are physically connected
    _, labels_before = cv2.connectedComponents(mask)
    assert np.max(labels_before) == 1, "Should be physically connected before SCDTR"

    # Apply SCDTR
    clean_mask, _stats = apply_scdtr_component_refinement(mask, faces=[])
    
    # Ring at radius 60 should be gone!
    ring_pixel_val = clean_mask[100, 160]
    assert ring_pixel_val == 0, "Thin concentric ring must be completely eliminated"
    # Subject center must be intact
    assert clean_mask[100, 100] == 255, "Solid subject center must remain intact"


def test_no_unbound_local_errors_in_pipeline():
    """Verify remove_background_pipeline runs without UnboundLocalError."""
    dummy_bytes = _make_dummy_image(w=64, h=64, subject_radius=15, with_thin_ring=False)
    # Run with default neural model
    result_bytes, meta = remove_background_pipeline(dummy_bytes, model="isnet-general-use", save_debug=False)
    assert isinstance(result_bytes, bytes)
    assert len(result_bytes) > 0
    assert "model_used" in meta
    assert meta["model_used"] is not None


def test_pure_neural_fallback_chain_no_grabcut():
    """Verify that GrabCut is not used; if an invalid model is requested, it falls back to neural chain."""
    dummy_bytes = _make_dummy_image(w=64, h=64, subject_radius=15, with_thin_ring=False)
    _result_bytes, meta = remove_background_pipeline(dummy_bytes, model="nonexistent-model", save_debug=False)
    assert meta["fallback_used"] is True
    assert meta["model_used"] in ("isnet-general-use", "u2net_human_seg", "birefnet-general", "u2net")
    assert meta["model_used"] != "grabcut"


def test_native_gradient_detection():
    """Verify native gradient detector flags bottom fades present in original."""
    h, w = 100, 100
    img = np.zeros((h, w, 3), dtype=np.uint8)
    mask = np.zeros((h, w), dtype=np.uint8)
    # Draw subject with a dark gradient fade at the bottom
    for y in range(20, 80):
        for x in range(30, 70):
            mask[y, x] = 255
            # Fading from white (240) down to dark brown (40)
            val = int(240 - (y - 20) * 3)
            img[y, x] = [val, max(20, val - 30), max(10, val - 50)]

    has_grad = detect_native_gradient(img, mask)
    assert has_grad is True, "Should detect native bottom gradient"


def test_face_soft_vote_not_hard_anchor():
    """Verify that a detached component with a false face is NOT kept if it lacks a solid core."""
    h, w = 300, 300
    mask = np.zeros((h, w), dtype=np.uint8)
    # Main person: solid circle (R=40) on right
    cv2.circle(mask, (220, 150), 40, 255, -1)
    # Detached thin text strokes / line art on left (thickness 2px)
    cv2.putText(mask, "TEXT", (20, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.8, 255, 2)

    # False face placed inside the TEXT
    false_face = [(25, 130, 40, 40, 0.95)]

    clean_mask, _stats = apply_scdtr_component_refinement(mask, faces=false_face)
    # Text on left must NOT be kept despite the false face!
    assert np.count_nonzero(clean_mask[:, :120]) == 0, "Text with false face must be rejected"
    # Person on right must be kept
    assert np.count_nonzero(clean_mask[:, 150:]) > 1000, "Real subject must be kept"
