"""
Quality and Integrity Verifier for AI Background Removal.
Ensures:
1. Output dimensions strictly match original input dimensions.
2. Genuine 8-bit alpha channel (0 <= alpha <= 255) for transparent PNGs.
3. Transparent pixels exist (alpha < 10) and subject foreground exists (alpha > 240).
4. Not inverted (border corners check vs center).
5. Output is not all transparent or all opaque.
6. File exists and is non-empty.
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, Tuple


class BackgroundQualityVerifier:
    @staticmethod
    def verify_alpha_mask(
        mask: np.ndarray,
        orig_shape: Tuple[int, int]
    ) -> Dict[str, Any]:
        """
        Verify mask integrity, coverage, and inversion.
        orig_shape: (orig_h, orig_w)
        """
        issues = []
        h, w = mask.shape[:2]
        orig_h, orig_w = orig_shape

        if (h, w) != (orig_h, orig_w):
            issues.append(f"Dimension mismatch: mask is {w}x{h}, original is {orig_w}x{orig_h}")

        # Check range
        min_val = float(np.min(mask))
        max_val = float(np.max(mask))

        if max_val - min_val < 10:
            issues.append("Mask lacks contrast (almost solid color)")

        # Coverage
        foreground_ratio = float(np.count_nonzero(mask > 128)) / float(mask.size)
        if foreground_ratio < 0.005:
            issues.append("Mask foreground is nearly empty (< 0.5% coverage)")
        elif foreground_ratio > 0.995:
            issues.append("Mask foreground covers whole image (> 99.5% coverage)")

        # Inversion check: border edges vs center
        # For typical photos, the corners and edges are background
        edge_thickness = max(2, min(h, w) // 40)
        top = mask[:edge_thickness, :]
        bottom = mask[-edge_thickness:, :]
        left = mask[:, :edge_thickness]
        right = mask[:, -edge_thickness:]
        border_mean = (float(np.mean(top)) + float(np.mean(bottom)) + float(np.mean(left)) + float(np.mean(right))) / 4.0
        
        center_h_start, center_h_end = h // 4, (3 * h) // 4
        center_w_start, center_w_end = w // 4, (3 * w) // 4
        center_mean = float(np.mean(mask[center_h_start:center_h_end, center_w_start:center_w_end]))

        is_inverted = False
        # If borders are strongly white (240+) and center is black (< 30), it's likely inverted
        if border_mean > 220 and center_mean < 50:
            is_inverted = True
            issues.append("Mask appears inverted (border is foreground, center is empty)")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "foreground_ratio": round(foreground_ratio, 4),
            "border_mean": round(border_mean, 2),
            "center_mean": round(center_mean, 2),
            "is_inverted": is_inverted,
            "min_alpha": min_val,
            "max_alpha": max_val,
        }

    @staticmethod
    def verify_output_image(
        image_path: str,
        expected_shape: Tuple[int, int],
        expected_channels: int = 4
    ) -> Dict[str, Any]:
        """
        Verify saved output image file on disk.
        expected_shape: (expected_h, expected_w)
        """
        if not os.path.isfile(image_path):
            return {"valid": False, "error": f"File does not exist: {image_path}"}

        size_bytes = os.path.getsize(image_path)
        if size_bytes < 100:
            return {"valid": False, "error": f"File is too small or empty ({size_bytes} bytes)"}

        # Read image with alpha channel
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return {"valid": False, "error": "Could not decode output image"}

        h, w = img.shape[:2]
        channels = 1 if len(img.shape) == 2 else img.shape[2]
        exp_h, exp_w = expected_shape

        if (h, w) != (exp_h, exp_w):
            return {
                "valid": False,
                "error": f"Resolution mismatch: got {w}x{h}, expected {exp_w}x{exp_h}"
            }

        if expected_channels == 4:
            if channels != 4:
                return {
                    "valid": False,
                    "error": f"Expected 4-channel RGBA output, but got {channels} channels"
                }
            alpha = img[:, :, 3]
            num_transparent = np.count_nonzero(alpha < 15)
            num_opaque = np.count_nonzero(alpha > 240)
            if num_transparent == 0:
                return {"valid": False, "error": "No transparent pixels found in RGBA output"}
            if num_opaque == 0:
                return {"valid": False, "error": "No opaque foreground pixels found in RGBA output"}

        return {
            "valid": True,
            "width": w,
            "height": h,
            "channels": channels,
            "size_bytes": size_bytes
        }
