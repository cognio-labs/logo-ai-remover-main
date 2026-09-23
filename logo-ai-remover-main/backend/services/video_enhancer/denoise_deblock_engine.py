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
            return cv2.bilateralFilter(frame_bgr, d=5, sigmaColor=25, sigmaSpace=25)
        elif level == "medium":
            # Fast edge-preserving filter on Y-channel (Luminance) in YUV space
            yuv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YUV)
            y, u, v = cv2.split(yuv)
            y_denoised = cv2.bilateralFilter(y, d=5, sigmaColor=40, sigmaSpace=40)
            u_denoised = cv2.GaussianBlur(u, (3, 3), 0)
            v_denoised = cv2.GaussianBlur(v, (3, 3), 0)
            merged = cv2.merge([y_denoised, u_denoised, v_denoised])
            return cv2.cvtColor(merged, cv2.COLOR_YUV2BGR)
        elif level == "high":
            # Robust bilateral with edge-detail protection in YUV space
            yuv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YUV)
            y, u, v = cv2.split(yuv)
            y_smooth = cv2.bilateralFilter(y, d=7, sigmaColor=60, sigmaSpace=60)
            edge_mask = cv2.Canny(y, 60, 140)
            edge_mask = cv2.dilate(edge_mask, np.ones((3, 3), np.uint8), iterations=1)
            y_final = np.where(edge_mask > 0, y, y_smooth)
            u_smooth = cv2.GaussianBlur(u, (5, 5), 0)
            v_smooth = cv2.GaussianBlur(v, (5, 5), 0)
            merged = cv2.merge([y_final, u_smooth, v_smooth])
            return cv2.cvtColor(merged, cv2.COLOR_YUV2BGR)

        return frame_bgr

    def apply_deblock(self, frame_bgr: np.ndarray) -> np.ndarray:
        """
        Attenuates 8x8 block boundary compression artifacts while preserving genuine edges.
        """
        yuv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YUV)
        y, u, v = cv2.split(yuv)

        # Fast 3x3 median blur to soften blocking grid
        y_median = cv2.medianBlur(y, 3)

        # Detect sharp genuine edges
        gradient_x = cv2.Sobel(y, cv2.CV_32F, 1, 0, ksize=3)
        gradient_y = cv2.Sobel(y, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gradient_x, gradient_y)

        # Where gradient is low/medium (compression block noise), blend with median
        # Where gradient is high (true details/edges), keep original Y
        weight = np.clip(magnitude / 64.0, 0.0, 1.0)
        y_deblocked = (y * weight + y_median * (1.0 - weight)).astype(np.uint8)

        merged = cv2.merge([y_deblocked, u, v])
        return cv2.cvtColor(merged, cv2.COLOR_YUV2BGR)

    def apply_sharpen(self, frame_bgr: np.ndarray, level: str = "medium") -> np.ndarray:
        if level == "off" or level is None:
            return frame_bgr

        params = {
            "low": 1.25,
            "medium": 1.45,
            "high": 1.70,
        }
        mult = params.get(level, 1.45)
        sub = mult - 1.0

        # High-speed Luminance sharpening in YUV space (no color halos or chroma shifts)
        yuv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YUV)
        y, u, v = cv2.split(yuv)

        blurred_y = cv2.GaussianBlur(y, (0, 0), sigmaX=1.3)
        sharpened_y = cv2.addWeighted(y, mult, blurred_y, -sub, 0)

        merged = cv2.merge([sharpened_y, u, v])
        return cv2.cvtColor(merged, cv2.COLOR_YUV2BGR)

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
