import unittest
import cv2
import numpy as np
from local_reconstruction import reconstruct_smooth
from logo_target import detect_target
from test_video_target import VideoTargetTests


class LocalReconstructionTests(unittest.TestCase):
    def test_moving_mark_all_frames_and_unchanged_outside_mask(self):
        for index in range(24):
            clean, marked, _ = VideoTargetTests().frame(index)
            result = reconstruct_smooth(marked, detect_target(marked))
            self.assertIsNotNone(result)
            output, mask, _ = result
            np.testing.assert_array_equal(output[mask == 0], marked[mask == 0])
            self.assertLess(np.abs(output.astype(float)-clean)[mask > 0].mean(), 2)

    def test_textured_context_is_rejected(self):
        rng = np.random.default_rng(22)
        frame = rng.integers(20, 230, (100, 100, 3), dtype=np.uint8)
        self.assertIsNone(reconstruct_smooth(frame, (40, 40, 18, 18)))

    def test_dark_halo_is_part_of_mask(self):
        frame = np.full((100, 100, 3), 120, np.uint8)
        frame[40:60, 40:60] = 110
        frame[45:55, 45:55] = 175
        output, mask, _ = reconstruct_smooth(frame, (40, 40, 20, 20))
        self.assertTrue(np.all(mask[40:60, 40:60] > 0))
        self.assertTrue(np.all(output == 120))
