import logging
from typing import Any, List, Dict, Optional, Tuple, Union
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class MaskRefiner:
    """
    Advanced edge refinement, hair/fur preservation, and color decontamination engine.
    Ensures that background-removed cutouts have soft, clean alpha transitions
    without white or dark halos, jagged silhouettes, or lost fine details.
    """

    @classmethod
    def refine_mask(
        cls,
        image_rgb: np.ndarray,
        raw_mask: np.ndarray,
        bilateral_refine: bool = True,
        fill_holes: bool = True,
        smooth_radius: int = 2,
    ) -> np.ndarray:
        """
        Class-level unified mask refiner.
        image_rgb: (H, W, 3) RGB ndarray
        raw_mask: (H, W) uint8 in [0, 255]
        """
        bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        inst = cls()
        refined = raw_mask.copy()
        if fill_holes:
            refined = inst._fill_micro_holes(refined)
        if bilateral_refine:
            refined = inst._edge_aware_matting(bgr, refined, mode="balanced")
        if smooth_radius > 0:
            refined = inst._refine_hair_strands(refined, mode="balanced")
        return refined

    @classmethod
    def color_decontaminate(
        cls,
        image_rgb: np.ndarray,
        alpha_mask: np.ndarray,
    ) -> np.ndarray:
        """
        Removes background color bleeding from edge pixels.
        Returns cleaned RGB image.
        """
        bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        inst = cls()
        cleaned_bgr = inst._decontaminate_color_spill(bgr, alpha_mask)
        return cv2.cvtColor(cleaned_bgr, cv2.COLOR_BGR2RGB)

    @classmethod
    def apply_manual_strokes(
        cls,
        base_mask: np.ndarray,
        strokes_or_keep: Union[List[Dict[str, Any]], np.ndarray],
        remove_mask: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Supports both:
        1. apply_manual_strokes(base_mask, strokes=[{"mode": "keep"|"remove", "points": [[x, y], ...], "brush_size": 15}])
        2. apply_manual_strokes(base_mask, keep_mask=..., remove_mask=...)
        """
        h, w = base_mask.shape[:2]

        if isinstance(strokes_or_keep, list):
            # List of stroke dicts
            keep = np.zeros((h, w), dtype=np.uint8)
            remove = np.zeros((h, w), dtype=np.uint8)

            for s in strokes_or_keep:
                mode = s.get("mode", "keep")
                points = s.get("points", [])
                brush_size = max(1, int(round(s.get("brush_size", 20.0))))

                if not points:
                    continue

                pts_px = [
                    (max(0, min(w - 1, int(p[0] * w))), max(0, min(h - 1, int(p[1] * h))))
                    for p in points
                ]

                target = keep if mode == "keep" else remove

                # Draw continuous strokes
                if len(pts_px) == 1:
                    cv2.circle(target, pts_px[0], brush_size // 2, 255, -1)
                else:
                    for i in range(len(pts_px) - 1):
                        cv2.line(target, pts_px[i], pts_px[i + 1], 255, brush_size)
                        cv2.circle(target, pts_px[i], brush_size // 2, 255, -1)
                    cv2.circle(target, pts_px[-1], brush_size // 2, 255, -1)

            inst = cls()
            return inst._combine_strokes(base_mask, keep, remove)
        else:
            inst = cls()
            return inst._combine_strokes(base_mask, strokes_or_keep, remove_mask)

    def refine_matte(
        self,
        image_bgr: np.ndarray,
        raw_mask: np.ndarray,
        quality_mode: str = "balanced",
        decontaminate: bool = True,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Refines a raw 1-channel alpha mask against the original image.
        Returns:
            (refined_mask, decontaminated_bgr)
        """
        refined = raw_mask.copy()

        # 1. Hole filling for solid foreground bodies
        refined = self._fill_micro_holes(refined)

        # 2. Edge-aware guided filtering along transition bands
        refined = self._edge_aware_matting(image_bgr, refined, quality_mode)

        # 3. Hair and fine strand anti-aliasing
        refined = self._refine_hair_strands(refined, quality_mode)

        # 4. Color spill decontamination
        cleaned_bgr = image_bgr.copy()
        if decontaminate:
            cleaned_bgr = self._decontaminate_color_spill(cleaned_bgr, refined)

        return refined, cleaned_bgr

    def _fill_micro_holes(self, mask: np.ndarray) -> np.ndarray:
        """Fill tiny pinhole noise inside solid foreground while keeping intentional gaps."""
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None:
            return mask

        result = mask.copy()
        for i, c in enumerate(contours):
            if hierarchy[0][i][3] != -1:
                area = cv2.contourArea(c)
                if area < (mask.shape[0] * mask.shape[1] * 0.0005):
                    cv2.drawContours(result, [c], -1, 255, -1)

        return result

    def _edge_aware_matting(self, image_bgr: np.ndarray, mask: np.ndarray, mode: str) -> np.ndarray:
        """Apply edge-preserving bilateral smoothing specifically along transition boundaries."""
        kernel_size = 5 if mode == "fast" else 7
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        dilated = cv2.dilate(mask, kernel)
        eroded = cv2.erode(mask, kernel)
        band = cv2.subtract(dilated, eroded)

        if np.count_nonzero(band) == 0:
            return mask

        blurred_mask = cv2.bilateralFilter(mask, d=7, sigmaColor=75, sigmaSpace=75)
        result = mask.copy()
        result[band > 0] = blurred_mask[band > 0]
        return result

    def _refine_hair_strands(self, mask: np.ndarray, mode: str) -> np.ndarray:
        """Smooth sub-pixel steps to prevent staircase/pixelated edges on hair and curves."""
        if mode == "fast":
            return mask
        semi_trans = (mask > 10) & (mask < 245)
        if np.count_nonzero(semi_trans) == 0:
            return mask

        smooth = cv2.GaussianBlur(mask, (3, 3), 0.6)
        result = mask.copy()
        result[semi_trans] = smooth[semi_trans]
        return result

    def _decontaminate_color_spill(self, bgr: np.ndarray, alpha: np.ndarray) -> np.ndarray:
        """
        Suppresses background color bleeding into semi-transparent
        edge pixels and hair strands by pulling colors towards the solid foreground.
        """
        edge_zone = (alpha > 15) & (alpha < 235)
        if np.count_nonzero(edge_zone) == 0:
            return bgr

        solid_fg = alpha >= 235
        if np.count_nonzero(solid_fg) == 0:
            return bgr

        fg_only = bgr.copy()
        fg_only[~solid_fg] = 0

        dilated_fg = cv2.dilate(fg_only, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))
        result = bgr.copy()
        a = (alpha[edge_zone].astype(np.float32) / 255.0)[:, np.newaxis]
        orig_colors = bgr[edge_zone].astype(np.float32)
        decontam_colors = dilated_fg[edge_zone].astype(np.float32)

        valid_decontam = (decontam_colors.sum(axis=1, keepdims=True) > 10)
        blended = np.where(valid_decontam, (a * orig_colors + (1.0 - a) * decontam_colors), orig_colors)

        result[edge_zone] = np.clip(blended, 0, 255).astype(np.uint8)
        return result

    def _combine_strokes(
        self,
        base_mask: np.ndarray,
        keep_mask: Optional[np.ndarray] = None,
        remove_mask: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        result = base_mask.astype(np.int16)
        if keep_mask is not None and np.any(keep_mask > 0):
            result = np.maximum(result, keep_mask.astype(np.int16))
        if remove_mask is not None and np.any(remove_mask > 0):
            result = np.minimum(result, 255 - remove_mask.astype(np.int16))
        return np.clip(result, 0, 255).astype(np.uint8)


mask_refiner = MaskRefiner()
