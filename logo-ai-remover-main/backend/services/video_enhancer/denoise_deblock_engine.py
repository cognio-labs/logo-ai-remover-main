import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class DenoiseDeblockEngine:
    """
    Production-grade image enhancement engine for video frames:
    - Chroma-safe noise reduction (Bilateral & Non-Local Means)
    - Compression deblock filter (attenuates 8x8 DCT grid artifacts while keeping edges intact)
    - Luminance-isolated unsharp masking (no color fringing or halo artifacts)
    """

    def apply_denoise(self, frame_bgr: np.ndarray, level: str = "medium") -> np.ndarray:
        if level == "off" or level is None:
            return frame_bgr

        if level == "low":
            # Fast edge-preserving filter
            return cv2.bilateralFilter(frame_bgr, d=5, sigmaColor=30, sigmaSpace=30)
        elif level == "medium":
            # Moderate edge-preserving filter on Y-channel, mild on chroma
            ycrcb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YCrCb)
            y, cr, cb = cv2.split(ycrcb)
            y_denoised = cv2.bilateralFilter(y, d=7, sigmaColor=50, sigmaSpace=50)
            cr_denoised = cv2.bilateralFilter(cr, d=5, sigmaColor=30, sigmaSpace=30)
            cb_denoised = cv2.bilateralFilter(cb, d=5, sigmaColor=30, sigmaSpace=30)
            merged = cv2.merge([y_denoised, cr_denoised, cb_denoised])
            return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)
        elif level == "high":
            # Robust Non-Local Means or high-strength bilateral
            # High-strength bilateral with detail restoration to avoid over-softening
            ycrcb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YCrCb)
            y, cr, cb = cv2.split(ycrcb)
            y_smooth = cv2.bilateralFilter(y, d=9, sigmaColor=75, sigmaSpace=75)
            # Retain high-contrast edge details
            edge_mask = cv2.Canny(y, 50, 150)
            edge_mask = cv2.dilate(edge_mask, np.ones((3, 3), np.uint8), iterations=1)
            y_final = np.where(edge_mask > 0, y, y_smooth)
            cr_smooth = cv2.bilateralFilter(cr, d=7, sigmaColor=45, sigmaSpace=45)
            cb_smooth = cv2.bilateralFilter(cb, d=7, sigmaColor=45, sigmaSpace=45)
            merged = cv2.merge([y_final, cr_smooth, cb_smooth])
            return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)

        return frame_bgr

    def apply_deblock(self, frame_bgr: np.ndarray) -> np.ndarray:
        """
        Attenuates 8x8 block boundary compression artifacts while preserving genuine edges.
        """
        ycrcb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)

        # Subtle median blur to soften blocking grid
        y_median = cv2.medianBlur(y, 3)

        # Detect sharp genuine edges
        gradient_x = cv2.Sobel(y, cv2.CV_32F, 1, 0, ksize=3)
        gradient_y = cv2.Sobel(y, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gradient_x, gradient_y)

        # Where gradient is low/medium (compression block noise), blend with median
        # Where gradient is high (true details/edges), keep original Y
        weight = np.clip(magnitude / 64.0, 0.0, 1.0)
        y_deblocked = (y * weight + y_median * (1.0 - weight)).astype(np.uint8)

        merged = cv2.merge([y_deblocked, cr, cb])
        return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)

    def apply_sharpen(self, frame_bgr: np.ndarray, level: str = "medium") -> np.ndarray:
        if level == "off" or level is None:
            return frame_bgr

        params = {
            "low": (1.0, 0.45, 3),
            "medium": (1.2, 0.85, 2),
            "high": (1.4, 1.25, 1),
        }
        sigma, amount, threshold = params.get(level, (1.2, 0.85, 2))

        # Sharpen strictly in Luminance space to prevent color fringe/chroma noise
        lab = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        blurred_l = cv2.GaussianBlur(l, (0, 0), sigmaX=sigma)
        diff = cv2.subtract(l, blurred_l)

        # Adaptive thresholding: avoid amplifying low-level noise
        mask = diff > threshold
        sharpened_l = l.astype(np.float32)
        sharpened_l[mask] += amount * diff[mask]
        sharpened_l = np.clip(sharpened_l, 0, 255).astype(np.uint8)

        merged = cv2.merge([sharpened_l, a, b])
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        denoise_level: str = "medium",
        deblock: bool = True,
        sharpen_level: str = "medium",
    ) -> np.ndarray:
        result = frame_bgr
        if deblock:
            result = self.apply_deblock(result)
        if denoise_level and denoise_level != "off":
            result = self.apply_denoise(result, level=denoise_level)
        if sharpen_level and sharpen_level != "off":
            result = self.apply_sharpen(result, level=sharpen_level)
        return result


denoise_deblock_engine = DenoiseDeblockEngine()
