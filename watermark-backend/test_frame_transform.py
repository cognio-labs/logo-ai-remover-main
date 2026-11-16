import unittest
import numpy as np
from processor import frame_transform


class FrameTransformTests(unittest.TestCase):
    def test_rotation_and_scale_about_crop_origin(self):
        matrix = np.array([[.98, -.12, 7.], [.12, .98, -4.]])
        origin = np.array([850., 400.])
        local = np.array([35., 25.])
        expected = matrix[:, :2] @ local + matrix[:, 2] + origin
        actual = frame_transform(matrix, origin)
        np.testing.assert_allclose(actual[:, :2] @ (local + origin) + actual[:, 2], expected)
        np.testing.assert_array_equal(matrix[:, 2], [7., -4.])

    def test_translation_is_unchanged(self):
        matrix = np.array([[1., 0., 8.], [0., 1., -3.]])
        np.testing.assert_array_equal(frame_transform(matrix, (900, 500)), matrix)
