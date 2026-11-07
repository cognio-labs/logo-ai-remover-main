import unittest
import cv2
import numpy as np
from temporal_inpainter import TemporalInpainter


class TemporalRecoveryTests(unittest.TestCase):
    def test_recovers_obscured_texture_from_moving_original_frames(self):
        rng = np.random.default_rng(123)
        texture = cv2.GaussianBlur(rng.integers(30, 190, (160, 320, 3), dtype=np.uint8), (3, 3), 0)
        cv2.line(texture, (0, 100), (319, 65), (20, 25, 30), 2)
        frames, clean, masks = [], [], []
        for i in range(9):
            original = texture[:, i*8:i*8+160].copy()
            mask = np.zeros((160, 160), np.uint8)
            mask[75:95, 75:95] = 255
            marked = original.copy()
            marked[mask>0] = 245
            clean.append(original)
            frames.append(marked)
            masks.append(mask)
        engine = TemporalInpainter(frames, masks)
        output, coverage = engine.reconstruct(4)
        self.assertGreater(coverage, .95)
        error = np.abs(output.astype(float)-clean[4].astype(float))
        self.assertLess(error[masks[4]>0].mean(), 8)
        np.testing.assert_array_equal(output[masks[4]==0], frames[4][masks[4]==0])

    def test_empty_mask_does_not_change_frame(self):
        frame = np.full((64, 64, 3), 120, np.uint8)
        result, coverage = TemporalInpainter([frame], [np.zeros((64, 64), np.uint8)]).reconstruct(0)
        np.testing.assert_array_equal(frame, result)
        self.assertEqual(coverage, 1)


if __name__ == '__main__':
    unittest.main()
