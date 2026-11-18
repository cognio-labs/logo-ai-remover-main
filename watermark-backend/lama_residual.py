"""Local LaMa residual repair for an already reverse-blended sparkle."""

from functools import lru_cache
from threading import Lock

import cv2
import numpy as np


@lru_cache(maxsize=1)
def _load(path):
    import torch
    torch.set_num_threads(min(torch.get_num_threads(), 4))
    return torch.jit.load(path, map_location="cpu").eval()


_inference_lock = Lock()


class LamaResidual:
    def __init__(self, weights_path, matte):
        self.model = _load(weights_path)
        support = (np.abs(matte) >= 0.008).astype(np.uint8)
        expanded = cv2.dilate(support, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
        # Use a 10-pixel dilated model mask. Constrain the Gaussian blend to it.
        self.mask = expanded.astype(bool)
        self.feather = cv2.GaussianBlur(expanded.astype(np.float32), (0, 0), 2.2) * expanded
        main = (matte > 0.5 * matte.max()).astype(np.uint8)
        contour = cv2.morphologyEx(main, cv2.MORPH_GRADIENT, np.ones((5, 5), np.uint8))
        edge = cv2.GaussianBlur(contour.astype(np.float32), (0, 0), 1.4)
        self.mix = self.feather * (0.32 + 0.58 * edge)
        self.ring = (cv2.dilate(expanded, np.ones((7, 7), np.uint8)) > 0) & ~self.mask
        self.previous = None
        # Reuse the same grain realization to avoid independent frame-to-frame noise.
        self.grain = np.random.default_rng(7331).standard_normal(matte.shape, dtype=np.float32)

    def repair(self, patch, matte):
        import torch

        alpha = matte[..., None]
        restored = np.clip((patch.astype(np.float32) - 255.0 * np.maximum(alpha, 0))
                           / np.maximum(1.0 - np.abs(alpha), 0.05), 0, 255)
        h, w = matte.shape
        pad = ((0, (-h) % 8), (0, (-w) % 8))
        rgb = np.pad(restored[..., ::-1], (*pad, (0, 0)), mode="edge")
        mask = np.pad(self.mask.astype(np.float32), pad)
        image = torch.from_numpy(np.ascontiguousarray(rgb.transpose(2, 0, 1)[None] / 255.0))
        tensor_mask = torch.from_numpy(mask[None, None])
        with _inference_lock, torch.inference_mode():
            prediction = self.model(image, tensor_mask)[0].permute(1, 2, 0).numpy()
        filled = np.clip(prediction[:h, :w, ::-1] * 255.0, 0, 255)

        # Keep the measured detail from reverse alpha where the generated
        # prediction disagrees substantially with it, especially on real edges.
        difference = filled - restored
        disagreement = np.max(np.abs(difference), axis=2)
        confidence = np.clip(10.0 / np.maximum(disagreement, 10.0), 0.0, 1.0)
        correction = difference * (self.mix * confidence)[..., None]
        if self.ring.any():
            gray = cv2.cvtColor(restored, cv2.COLOR_BGR2GRAY)
            highpass = gray - cv2.GaussianBlur(gray, (0, 0), 0.8)
            samples = highpass[self.ring]
            sigma = np.std(np.clip(samples, *np.quantile(samples, (0.1, 0.9))), dtype=np.float32)
            synth = np.minimum(sigma, 2.0) * self.grain * self.mix * confidence
            correction += synth[..., None]

        if self.previous is not None:
            prior_frame, prior_correction = self.previous
            motion = np.max(np.abs(restored - prior_frame), axis=2)
            stable = cv2.dilate(motion, np.ones((3, 3), np.uint8)) < 2.5
            correction[stable] = 0.72 * correction[stable] + 0.28 * prior_correction[stable]
        self.previous = restored, correction
        return np.clip(restored + correction, 0, 255)
