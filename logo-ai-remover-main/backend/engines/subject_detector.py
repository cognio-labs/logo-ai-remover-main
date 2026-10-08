import logging
from dataclasses import dataclass
from typing import Tuple, List, Dict, Any, Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class SubjectConfidenceReport:
    status: str  # "GOOD" | "UNCERTAIN" | "NO_SUBJECT"
    confidence_score: float  # 0.0 to 1.0
    mask_area_ratio: float
    uncertain_ratio: float
    num_components: int
    fragmentation_score: float
    border_touch_ratio: float
    mean_raw_activation: float
    scene_type: str  # "subject" | "landscape_scene" | "pattern" | "blank"
    warnings: List[str]
    actions: List[Dict[str, str]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "confidence_score": round(self.confidence_score, 3),
            "mask_area_ratio": round(self.mask_area_ratio, 4),
            "uncertain_ratio": round(self.uncertain_ratio, 4),
            "num_components": self.num_components,
            "fragmentation_score": round(self.fragmentation_score, 3),
            "border_touch_ratio": round(self.border_touch_ratio, 3),
            "mean_raw_activation": round(self.mean_raw_activation, 4),
            "scene_type": self.scene_type,
            "warnings": self.warnings,
            "actions": self.actions,
        }


class SubjectDetector:
    """
    Intelligent subject detection, saliency confidence scoring, and landscape classifier.
    Prevents tearing and destruction of landscape, panoramic, or subject-less images.
    """

    @staticmethod
    def analyze_mask(
        raw_mask_0_1: np.ndarray,
        image_rgb: Optional[np.ndarray] = None
    ) -> SubjectConfidenceReport:
        """
        Analyzes a raw model saliency prediction (values in [0.0, 1.0]).
        Returns a detailed confidence report classifying image as GOOD, UNCERTAIN, or NO_SUBJECT.
        """
        h, w = raw_mask_0_1.shape[:2]
        total_pixels = h * w

        # 1. Basic pixel distribution
        mean_raw = float(np.mean(raw_mask_0_1))
        std_raw = float(np.std(raw_mask_0_1))
        fg_pixels = int(np.count_nonzero(raw_mask_0_1 >= 0.5))
        mask_area_ratio = fg_pixels / max(1, total_pixels)

        # Pixels where model is hesitant (between 0.15 and 0.85)
        uncertain_pixels = int(np.count_nonzero((raw_mask_0_1 > 0.15) & (raw_mask_0_1 < 0.85)))
        uncertain_ratio = uncertain_pixels / max(1, total_pixels)

        # 2. Border Touch Ratio
        # Check border perimeter pixels (top, bottom, left, right)
        border_pixels = np.concatenate([
            raw_mask_0_1[0, :],         # top row
            raw_mask_0_1[h - 1, :],     # bottom row
            raw_mask_0_1[:, 0],         # left column
            raw_mask_0_1[:, w - 1]      # right column
        ])
        border_touch_count = int(np.count_nonzero(border_pixels >= 0.5))
        border_touch_ratio = border_touch_count / max(1, len(border_pixels))

        # 3. Connected Components & Fragmentation Analysis
        bin_mask = (raw_mask_0_1 >= 0.5).astype(np.uint8) * 255
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bin_mask)

        # Filter out background (label 0)
        component_areas = []
        min_valid_area = total_pixels * 0.005  # 0.5% area threshold
        significant_components = 0

        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= min_valid_area:
                significant_components += 1
                component_areas.append(area)

        # Fragmentation score: ratio of significant components to total area coverage
        if significant_components == 0:
            fragmentation_score = 1.0
        else:
            largest_area = max(component_areas) if component_areas else 0
            largest_ratio = largest_area / max(1, total_pixels)
            fragmentation_score = float(significant_components) / (largest_ratio * 10.0 + 1.0)

        # 4. Color / Scene heuristics (e.g. Detect sky or panoramic nature)
        is_landscape = False
        if image_rgb is not None:
            # Check if top 30% has sky-like characteristics (high blue/cyan/white brightness)
            top_h = int(h * 0.3)
            top_region = image_rgb[:top_h, :]
            # Average color in top region
            mean_r = float(np.mean(top_region[:, :, 0]))
            mean_g = float(np.mean(top_region[:, :, 1]))
            mean_b = float(np.mean(top_region[:, :, 2]))
            # Sky usually has b > r or high uniform luminance
            if mean_b > mean_r + 15 or (mean_r > 180 and mean_g > 180 and mean_b > 180):
                if border_touch_ratio > 0.40:
                    is_landscape = True

        warnings = []
        actions = []

        # 5. Classification Logic
        # Case A: NO_SUBJECT (Landscape, blank, pattern, or extremely fragmented/tiny blob)
        if mask_area_ratio < 0.03:
            # Model barely found anything (<3% of image, like the lake artifact in a landscape)
            status = "NO_SUBJECT"
            scene_type = "landscape_scene" if is_landscape else "pattern"
            confidence = max(0.05, mean_raw)
            warnings.append("No prominent foreground subject detected (detected area < 3%).")
            actions = [
                {"id": "remove_sky", "label": "Remove Sky Only", "type": "sky"},
                {"id": "select_subject", "label": "Select Subject Manually", "type": "brush"},
                {"id": "keep_original", "label": "Keep Original Image", "type": "keep"}
            ]

        elif mask_area_ratio > 0.92 and border_touch_ratio > 0.70:
            # Full bleed background photo covering >92%
            status = "NO_SUBJECT"
            scene_type = "landscape_scene"
            confidence = 0.20
            warnings.append("Full-frame background scene detected with no isolated subject.")
            actions = [
                {"id": "remove_sky", "label": "Remove Sky Only", "type": "sky"},
                {"id": "select_subject", "label": "Select Subject Manually", "type": "brush"},
                {"id": "keep_original", "label": "Keep Original Image", "type": "keep"}
            ]

        elif (border_touch_ratio > 0.55 and significant_components > 4) or (mean_raw < 0.12 and mask_area_ratio < 0.05):
            # Highly fragmented pieces touching borders with low overall activation
            status = "NO_SUBJECT"
            scene_type = "landscape_scene" if is_landscape else "fragmented_scene"
            confidence = 0.25
            warnings.append("Multiple disjoint landscape regions detected with no single focal subject.")
            actions = [
                {"id": "remove_sky", "label": "Remove Sky Only", "type": "sky"},
                {"id": "select_subject", "label": "Select Subject Manually", "type": "brush"},
                {"id": "keep_original", "label": "Keep Original Image", "type": "keep"}
            ]

        # Case B: UNCERTAIN (Ambiguous edges, medium confidence, or semi-transparent subject)
        elif uncertain_ratio > 0.35 or border_touch_ratio > 0.45 or significant_components > 3:
            status = "UNCERTAIN"
            scene_type = "subject"
            confidence = 0.55
            warnings.append("Complex background detected; some edges may require refinement.")
            actions = [
                {"id": "refine_brush", "label": "Refine with Brush", "type": "brush"},
                {"id": "accept", "label": "Accept Result", "type": "accept"}
            ]

        # Case C: GOOD (Clear, well-defined foreground subject like a portrait, product, animal)
        else:
            status = "GOOD"
            scene_type = "subject"
            confidence = min(0.98, max(0.70, float(1.0 - uncertain_ratio - (border_touch_ratio * 0.2))))

        return SubjectConfidenceReport(
            status=status,
            confidence_score=confidence,
            mask_area_ratio=mask_area_ratio,
            uncertain_ratio=uncertain_ratio,
            num_components=significant_components,
            fragmentation_score=fragmentation_score,
            border_touch_ratio=border_touch_ratio,
            mean_raw_activation=mean_raw,
            scene_type=scene_type,
            warnings=warnings,
            actions=actions,
        )

subject_detector = SubjectDetector()
