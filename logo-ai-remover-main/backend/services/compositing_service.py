"""
AI Background Compositor Service.
Handles compositing transparent foregrounds onto:
1. Pure transparent RGBA (8-bit alpha: 0 <= a <= 255)
2. Solid color backgrounds (Hex / RGB / E-commerce Pure White #FFFFFF)
3. Custom user backdrop images (Cover / Contain / Stretch)
4. Gradient / Preset studio backdrops
5. Optional contact drop shadow generation
"""

import cv2
import numpy as np
from PIL import Image, ImageFilter
from typing import Tuple, Optional, Union, Dict, Any


def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Convert hex color (e.g. #FFFFFF, #1F2937, FFFFFF) to (R, G, B) tuple."""
    hex_clean = hex_str.strip().lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) != 6:
        return (255, 255, 255)
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        return (r, g, b)
    except ValueError:
        return (255, 255, 255)


class CompositingService:
    @staticmethod
    def create_transparent_rgba(
        image_rgb: np.ndarray,
        alpha_mask: np.ndarray
    ) -> np.ndarray:
        """
        Merge an RGB image with an 8-bit alpha mask into a true 4-channel RGBA image.
        Dimensions of image_rgb and alpha_mask must match.
        """
        h, w = image_rgb.shape[:2]
        if alpha_mask.shape[:2] != (h, w):
            alpha_mask = cv2.resize(alpha_mask, (w, h), interpolation=cv2.INTER_CUBIC)

        if len(alpha_mask.shape) == 3:
            alpha_mask = alpha_mask[:, :, 0]

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, :3] = image_rgb[:, :, :3]
        rgba[:, :, 3] = alpha_mask
        return rgba

    @staticmethod
    def render_gradient_backdrop(
        width: int,
        height: int,
        top_color: Tuple[int, int, int],
        bottom_color: Tuple[int, int, int]
    ) -> np.ndarray:
        """Renders a smooth vertical linear gradient backdrop (RGB)."""
        top = np.array(top_color, dtype=np.float32)
        bottom = np.array(bottom_color, dtype=np.float32)
        ratios = np.linspace(0.0, 1.0, height, dtype=np.float32).reshape((height, 1, 1))
        gradient = (1.0 - ratios) * top + ratios * bottom
        gradient = np.tile(gradient, (1, width, 1))
        return np.clip(gradient, 0, 255).astype(np.uint8)

    @staticmethod
    def generate_drop_shadow(
        alpha_mask: np.ndarray,
        offset_y: int = 15,
        offset_x: int = 0,
        blur_radius: int = 25,
        opacity: float = 0.4
    ) -> np.ndarray:
        """
        Synthesizes a realistic soft contact shadow from the subject's alpha mask.
        Returns single-channel uint8 shadow mask.
        """
        h, w = alpha_mask.shape[:2]
        shadow_pil = Image.fromarray(alpha_mask)
        # Blur alpha mask to create soft shadow
        if blur_radius > 0:
            shadow_pil = shadow_pil.filter(ImageFilter.GaussianBlur(radius=blur_radius))
        
        shadow_arr = np.array(shadow_pil, dtype=np.float32)
        
        # Translation matrix for offset
        M = np.float32([[1, 0, offset_x], [0, 1, offset_y]])
        shifted_shadow = cv2.warpAffine(shadow_arr, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        
        # Apply shadow opacity
        shifted_shadow = np.clip(shifted_shadow * opacity, 0, 255).astype(np.uint8)
        return shifted_shadow

    @classmethod
    def composite_on_solid_color(
        cls,
        image_rgb: np.ndarray,
        alpha_mask: np.ndarray,
        color_rgb: Tuple[int, int, int],
        shadow_config: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        Composite foreground onto a solid color using Porter-Duff Over.
        Output: 3-channel RGB uint8.
        """
        h, w = image_rgb.shape[:2]
        bg = np.zeros((h, w, 3), dtype=np.uint8)
        bg[:, :] = color_rgb

        alpha = (alpha_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
        fg_float = image_rgb.astype(np.float32)
        bg_float = bg.astype(np.float32)

        if shadow_config and shadow_config.get("enabled", False):
            offset_y = shadow_config.get("offset_y", 15)
            offset_x = shadow_config.get("offset_x", 0)
            blur = shadow_config.get("blur", 25)
            opacity = shadow_config.get("opacity", 0.35)
            shadow_mask = cls.generate_drop_shadow(alpha_mask, offset_y, offset_x, blur, opacity)
            shadow_alpha = (shadow_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
            # Shadow darkens background
            bg_float = bg_float * (1.0 - shadow_alpha)

        # Standard alpha blend
        blended = fg_float * alpha + bg_float * (1.0 - alpha)
        return np.clip(blended, 0, 255).astype(np.uint8)

    @classmethod
    def composite_on_image(
        cls,
        image_rgb: np.ndarray,
        alpha_mask: np.ndarray,
        bg_image_rgb: np.ndarray,
        mode: str = "cover",
        shadow_config: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        Composite foreground onto a background image with cover/contain scaling.
        Output: 3-channel RGB uint8.
        """
        fg_h, fg_w = image_rgb.shape[:2]
        bg_h, bg_w = bg_image_rgb.shape[:2]

        if mode == "cover":
            scale = max(fg_w / bg_w, fg_h / bg_h)
            new_w = int(round(bg_w * scale))
            new_h = int(round(bg_h * scale))
            resized_bg = cv2.resize(bg_image_rgb, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            # Center crop to (fg_w, fg_h)
            start_x = max(0, (new_w - fg_w) // 2)
            start_y = max(0, (new_h - fg_h) // 2)
            bg_fitted = resized_bg[start_y:start_y + fg_h, start_x:start_x + fg_w]
            # Handle rounding boundary edges
            if bg_fitted.shape[0] != fg_h or bg_fitted.shape[1] != fg_w:
                bg_fitted = cv2.resize(bg_fitted, (fg_w, fg_h), interpolation=cv2.INTER_CUBIC)
        elif mode == "contain":
            scale = min(fg_w / bg_w, fg_h / bg_h)
            new_w = int(round(bg_w * scale))
            new_h = int(round(bg_h * scale))
            resized_bg = cv2.resize(bg_image_rgb, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            bg_fitted = np.zeros((fg_h, fg_w, 3), dtype=np.uint8)
            start_x = (fg_w - new_w) // 2
            start_y = (fg_h - new_h) // 2
            bg_fitted[start_y:start_y + new_h, start_x:start_x + new_w] = resized_bg
        else: # stretch
            bg_fitted = cv2.resize(bg_image_rgb, (fg_w, fg_h), interpolation=cv2.INTER_CUBIC)

        alpha = (alpha_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
        fg_float = image_rgb.astype(np.float32)
        bg_float = bg_fitted.astype(np.float32)

        if shadow_config and shadow_config.get("enabled", False):
            shadow_mask = cls.generate_drop_shadow(
                alpha_mask,
                shadow_config.get("offset_y", 15),
                shadow_config.get("offset_x", 0),
                shadow_config.get("blur", 25),
                shadow_config.get("opacity", 0.35)
            )
            shadow_alpha = (shadow_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
            bg_float = bg_float * (1.0 - shadow_alpha)

        blended = fg_float * alpha + bg_float * (1.0 - alpha)
        return np.clip(blended, 0, 255).astype(np.uint8)

    @classmethod
    def composite(
        cls,
        image_rgb: np.ndarray,
        alpha_mask: np.ndarray,
        bg_type: str = "transparent",
        bg_color: str = "#FFFFFF",
        custom_bg_rgb: Optional[np.ndarray] = None,
        backdrop_id: Optional[str] = None,
        shadow_config: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        Unified compositing entry point.
        Returns:
            - 4-channel RGBA ndarray if bg_type == "transparent"
            - 3-channel RGB ndarray if bg_type in ("color", "image", "backdrop")
        """
        if bg_type == "transparent":
            return cls.create_transparent_rgba(image_rgb, alpha_mask)

        if bg_type == "color":
            rgb_tuple = hex_to_rgb(bg_color)
            return cls.composite_on_solid_color(image_rgb, alpha_mask, rgb_tuple, shadow_config)

        if bg_type == "image" and custom_bg_rgb is not None:
            return cls.composite_on_image(image_rgb, alpha_mask, custom_bg_rgb, mode="cover", shadow_config=shadow_config)

        if bg_type == "backdrop":
            h, w = image_rgb.shape[:2]
            # Preset studio backdrops
            preset_gradients = {
                "luxury-studio": ((44, 48, 56), (15, 17, 21)),
                "warm-loft": ((247, 239, 229), (217, 206, 192)),
                "sunset-beach": ((255, 126, 95), (255, 230, 204)),
                "modern-office": ((224, 231, 255), (165, 180, 252)),
                "cyberpunk-neon": ((15, 23, 42), (9, 13, 22)),
                "pastel-spring": ((252, 231, 243), (244, 114, 182)),
            }
            colors = preset_gradients.get(backdrop_id or "luxury-studio", ((240, 240, 240), (200, 200, 200)))
            grad_bg = cls.render_gradient_backdrop(w, h, colors[0], colors[1])
            return cls.composite_on_image(image_rgb, alpha_mask, grad_bg, mode="stretch", shadow_config=shadow_config)

        # Fallback to pure white
        return cls.composite_on_solid_color(image_rgb, alpha_mask, (255, 255, 255), shadow_config)
