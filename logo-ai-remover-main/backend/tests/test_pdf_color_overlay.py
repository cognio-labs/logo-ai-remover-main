import cv2
import numpy as np

from backend.services.pdf.inpaint import remove_uniform_color_overlay
from backend.services.pdf.mask import build_chromatic_image_mask


def test_blue_overlay_is_removed_without_changing_unmarked_text():
    original = np.full((80, 120, 3), 255, dtype=np.uint8)
    cv2.putText(original, "TEXT", (8, 47), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1)
    marked = original.copy()
    blue = np.full((40, 65, 3), (145, 45, 0), dtype=np.uint8)
    marked[20:60, 40:105] = np.rint(
        original[20:60, 40:105].astype(np.float32) * 0.57 + blue * 0.43
    ).astype(np.uint8)

    mask = build_chromatic_image_mask(marked)
    cleaned = remove_uniform_color_overlay(marked, mask)

    assert np.count_nonzero(mask) > 0
    assert np.array_equal(cleaned[:, :35], marked[:, :35])
    assert np.max(cleaned[25:30, 60:100]) == 255
    assert np.mean(np.abs(cleaned.astype(np.int16) - original.astype(np.int16))) < 4


def test_neutral_document_ink_is_not_selected_as_watermark():
    image = np.full((40, 80, 3), 255, dtype=np.uint8)
    cv2.putText(image, "A1", (5, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (35, 35, 35), 1)
    assert np.count_nonzero(build_chromatic_image_mask(image)) == 0
