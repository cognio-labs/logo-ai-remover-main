"""
Advanced Background Remover — Bellix Neural Pipeline
=======================================================
High-performance background removal with:
1. Face & subject detection
2. Primary models: u2net_human_seg (for people/portraits/groups) & isnet-general-use
3. Hole filling: prevents transparent speckles/holes in skin, shirts, and dresses
4. Connected component selection: strips floating text headings, buttons, and scenery
5. Quality Gate: automatic fallback and retry if mask quality fails checks
6. Debug dump: saves all intermediate stages to ./debug/<timestamp>/

No paid APIs. Pure open-source.
"""
from __future__ import annotations

import io
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

DEBUG_DIR = Path("d:/logo-ai-remover-main/debug")

# ---------------------------------------------------------------------------
# rembg availability
# ---------------------------------------------------------------------------
try:
    from rembg import remove as rembg_remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed — fallback active")

def ensure_rembg_installed() -> bool:
    return REMBG_AVAILABLE

_SESSION_CACHE: dict = {}

def _get_session(model_name: str):
    """Return a cached rembg session for the given model."""
    if not REMBG_AVAILABLE:
        return None
    if model_name not in _SESSION_CACHE:
        logger.info(f"Loading model: {model_name} ...")
        t0 = time.time()
        _SESSION_CACHE[model_name] = new_session(model_name)
        logger.info(f"Model {model_name} loaded in {time.time()-t0:.1f}s")
    return _SESSION_CACHE[model_name]


# ---------------------------------------------------------------------------
# Face Detection Helper
# ---------------------------------------------------------------------------

def detect_faces(img_rgb: np.ndarray) -> list:
    """Detect human faces using OpenCV Haar Cascade."""
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        return list(faces)
    except Exception as e:
        logger.debug(f"Face detection error: {e}")
        return []


# ---------------------------------------------------------------------------
# Hole Filling Algorithm (Solves Skin / Shirt / Dress Speckle Noise)
# ---------------------------------------------------------------------------

def fill_subject_holes(binary_mask: np.ndarray, max_hole_area: Optional[int] = None) -> np.ndarray:
    """
    Fills enclosed transparent holes inside foreground subjects.
    
    Any hole completely enclosed by the subject (internal contour)
    is filled back to 255 (opaque), preventing holes in skin, shirts, or dresses.
    """
    h, w = binary_mask.shape[:2]
    if max_hole_area is None:
        # Fill holes up to 15% of the total image area
        max_hole_area = int(h * w * 0.15)

    filled = binary_mask.copy()
    contours, hierarchy = cv2.findContours(filled, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    
    if hierarchy is not None and len(contours) > 0:
        for i, h_info in enumerate(hierarchy[0]):
            # h_info[3] is the parent index; if not -1, it's an internal hole!
            if h_info[3] != -1:
                hole_area = cv2.contourArea(contours[i])
                if hole_area <= max_hole_area:
                    cv2.drawContours(filled, [contours[i]], -1, 255, thickness=cv2.FILLED)
                    
    return filled


# ---------------------------------------------------------------------------
# Quality Gate
# ---------------------------------------------------------------------------

def evaluate_mask_quality(alpha: np.ndarray) -> Dict[str, Any]:
    """
    Compute quality metrics on the alpha mask:
    - coverage_pct: fraction of opaque pixels (> 128)
    - uncertain_pct: fraction of semi-transparent boundary pixels (25 to 230)
    - hole_count: number of internal enclosed holes
    - is_reliable: boolean passing all checks
    """
    total = alpha.size
    fg_count = np.count_nonzero(alpha > 128)
    coverage_pct = (fg_count / total) * 100

    uncertain_count = np.count_nonzero((alpha > 25) & (alpha < 230))
    uncertain_pct = (uncertain_count / total) * 100

    # Count internal holes
    binary = (alpha > 128).astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    holes_count = 0
    if hierarchy is not None:
        for h_info in hierarchy[0]:
            if h_info[3] != -1:
                holes_count += 1

    # Reliability gate
    is_reliable = (
        coverage_pct >= 1.0 and
        coverage_pct <= 95.0 and
        uncertain_pct <= 30.0 and
        holes_count <= 25
    )

    return {
        "coverage_pct": round(coverage_pct, 2),
        "uncertain_pct": round(uncertain_pct, 2),
        "holes_count": holes_count,
        "is_reliable": is_reliable,
    }


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def remove_background_advanced(
    image_bytes: bytes,
    model: Optional[str] = None,
    save_debug: bool = True,
) -> bytes:
    """
    Main entrance for background removal.
    
    1. Decode & normalize input (handles EXIF, CMYK, Palette)
    2. Detect faces: if person detected, select u2net_human_seg
    3. Run neural model
    4. Fill enclosed holes in subject (skin, clothes)
    5. Discard small disconnected text / button / scenery islands
    6. Quality gate: retry if mask is degraded
    7. 1px soft edge feathering
    8. Save intermediate debug images to ./debug/<timestamp>/
    """
    t_start = time.time()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    req_debug_dir = DEBUG_DIR / timestamp
    if save_debug:
        req_debug_dir.mkdir(parents=True, exist_ok=True)

    # Decode
    pil_input = _decode_image(image_bytes)
    img_rgb = np.array(pil_input.convert("RGB"))
    h, w = img_rgb.shape[:2]

    if save_debug:
        pil_input.save(req_debug_dir / "01_input_normalized.png")

    # Step 1: Detect subject type (person vs product)
    faces = detect_faces(img_rgb)
    has_person = len(faces) > 0
    logger.info(f"Detected {len(faces)} face(s). Person mode: {has_person}")

    # Fallback chain
    if model:
        model_chain = [model]
    elif has_person:
        model_chain = ["u2net_human_seg", "isnet-general-use"]
    else:
        model_chain = ["isnet-general-use", "u2net_human_seg"]

    best_result_pil = None
    best_metrics = None

    for model_name in model_chain:
        try:
            logger.info(f"Running neural segmentation with {model_name}...")
            session = _get_session(model_name)
            if session is None:
                continue

            input_bytes = _pil_to_png_bytes(pil_input)
            raw_output_bytes = rembg_remove(input_bytes, session=session)
            raw_pil = Image.open(io.BytesIO(raw_output_bytes)).convert("RGBA")

            if save_debug:
                raw_pil.save(req_debug_dir / f"02_raw_output_{model_name}.png")

            # Extract raw alpha
            raw_rgba = np.array(raw_pil)
            raw_alpha = raw_rgba[:, :, 3].copy()

            # Step 2: Fill holes in subject (skin, shirts, dress highlights)
            binary_mask = (raw_alpha > 80).astype(np.uint8) * 255
            filled_mask = fill_subject_holes(binary_mask)

            if save_debug:
                cv2.imwrite(str(req_debug_dir / "03_hole_filled_mask.png"), filled_mask)

            # Step 3: Connected component filtering
            # Discard disconnected text boxes, buttons, small scenery blobs
            clean_mask = _select_main_components(filled_mask, faces, w, h)

            if save_debug:
                cv2.imwrite(str(req_debug_dir / "04_component_selected.png"), clean_mask)

            # Step 4: Edge smoothing & feathering (1px soft edge)
            final_alpha = _refine_edges(clean_mask, raw_alpha)

            # Quality gate evaluation
            metrics = evaluate_mask_quality(final_alpha)
            logger.info(f"Model {model_name} metrics: {metrics}")

            # Assemble clean RGBA
            clean_rgba = img_rgb.copy()
            clean_result = np.dstack([clean_rgba, final_alpha])
            candidate_pil = Image.fromarray(clean_result, "RGBA")

            if save_debug:
                candidate_pil.save(req_debug_dir / "05_final_alpha.png")
                _save_checkerboard(candidate_pil, req_debug_dir / "06_checkerboard.png")

            if metrics["is_reliable"] or best_result_pil is None:
                best_result_pil = candidate_pil
                best_metrics = metrics

            if metrics["is_reliable"]:
                break  # Quality gate passed!

        except Exception as exc:
            logger.error(f"Error with model {model_name}: {exc}")

    if best_result_pil is None:
        logger.warning("All models failed, using OpenCV fallback")
        best_result_pil = _opencv_grabcut_pipeline(pil_input)

    elapsed = time.time() - t_start
    logger.info(f"Background removal finished in {elapsed:.2f}s")
    return _pil_to_png_bytes(best_result_pil)


# ---------------------------------------------------------------------------
# Connected Components: Keep People, Drop Floating Text/Buttons
# ---------------------------------------------------------------------------

def _select_main_components(
    mask: np.ndarray,
    faces: list,
    width: int,
    height: int,
) -> np.ndarray:
    """
    Selects valid subject components and drops isolated text blocks/buttons.
    - If faces are detected: keep components touching/overlapping face bounding boxes.
    - If no faces: keep the largest salient components (> 1% of area).
    """
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        return mask

    clean_mask = np.zeros_like(mask)
    min_area = max(100, int(width * height * 0.005))  # 0.5% min area

    if len(faces) > 0:
        # Keep components that contain or touch any detected face
        kept_labels = set()
        for (fx, fy, fw, fh) in faces:
            # Expand face box downward to encompass neck and torso
            body_x = max(0, fx - int(fw * 0.5))
            body_y = fy
            body_w = min(width - body_x, int(fw * 2.0))
            body_h = min(height - body_y, int(fh * 4.0))

            roi_labels = labels[body_y:body_y + body_h, body_x:body_x + body_w]
            unique_labels = np.unique(roi_labels)
            for lbl in unique_labels:
                if lbl != 0:
                    kept_labels.add(lbl)

        # Fallback: if no component matched face, keep largest
        if not kept_labels:
            areas = [(stats[i, cv2.CC_STAT_AREA], i) for i in range(1, num_labels)]
            areas.sort(reverse=True)
            kept_labels.add(areas[0][1])

        for lbl in kept_labels:
            clean_mask[labels == lbl] = 255

    else:
        # No face detected: keep largest component plus meaningful connected parts
        areas = [(stats[i, cv2.CC_STAT_AREA], i) for i in range(1, num_labels)]
        areas.sort(reverse=True)
        largest_area = areas[0][0]

        for rank, (area, lbl) in enumerate(areas):
            if rank == 0:
                clean_mask[labels == lbl] = 255
            elif area > min_area and area > largest_area * 0.05:
                clean_mask[labels == lbl] = 255

    return clean_mask


# ---------------------------------------------------------------------------
# Edge Refinement
# ---------------------------------------------------------------------------

def _refine_edges(clean_mask: np.ndarray, raw_alpha: np.ndarray) -> np.ndarray:
    """Combines cleaned mask with soft raw alpha for sub-pixel boundary feathering."""
    # Find boundary zone (5px wide)
    dilated = cv2.dilate(clean_mask, np.ones((5, 5), np.uint8))
    eroded = cv2.erode(clean_mask, np.ones((5, 5), np.uint8))
    boundary = (dilated > 0) & (eroded == 0)

    # Core subject stays 255 (no holes allowed!)
    final_alpha = np.zeros_like(clean_mask, dtype=np.uint8)
    final_alpha[eroded > 0] = 255

    # Boundary takes soft alpha from model or gaussian feathering
    final_alpha[boundary] = raw_alpha[boundary]

    return final_alpha


# ---------------------------------------------------------------------------
# Helpers & Utilities
# ---------------------------------------------------------------------------

def _decode_image(image_bytes: bytes) -> Image.Image:
    """Decode image bytes handling EXIF, CMYK, and palette modes."""
    pil = Image.open(io.BytesIO(image_bytes))
    try:
        from PIL import ImageOps
        pil = ImageOps.exif_transpose(pil)
    except Exception:
        pass

    if pil.mode == "P":
        pil = pil.convert("RGBA")
    elif pil.mode in ("L", "CMYK"):
        pil = pil.convert("RGB")
    return pil


def _pil_to_png_bytes(pil: Image.Image) -> bytes:
    """Convert PIL image to PNG byte buffer."""
    buf = io.BytesIO()
    pil.convert("RGBA").save(buf, format="PNG", optimize=False)
    buf.seek(0)
    return buf.read()


def _save_checkerboard(pil_rgba: Image.Image, output_path: Path):
    """Save RGBA preview over a checkerboard background."""
    w, h = pil_rgba.size
    checker = Image.new("RGBA", (w, h), (20, 20, 20, 255))
    grid_size = 20
    draw_img = np.array(checker)
    for y in range(0, h, grid_size):
        for x in range(0, w, grid_size):
            if ((x // grid_size) + (y // grid_size)) % 2 == 1:
                draw_img[y:y+grid_size, x:x+grid_size] = [40, 40, 40, 255]
    bg = Image.fromarray(draw_img, "RGBA")
    composite = Image.alpha_composite(bg, pil_rgba)
    composite.save(output_path)


def _opencv_grabcut_pipeline(pil_input: Image.Image) -> Image.Image:
    """Fallback GrabCut segmentation."""
    img_rgb = np.array(pil_input.convert("RGB"))
    h, w = img_rgb.shape[:2]
    rect = (int(w * 0.1), int(h * 0.1), int(w * 0.8), int(h * 0.8))
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(img_rgb, mask, rect, bgd, fgd, 4, cv2.GC_INIT_WITH_RECT)
        fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except Exception:
        fg_mask = np.ones((h, w), np.uint8) * 255
    rgba = np.dstack([img_rgb, fg_mask])
    return Image.fromarray(rgba, "RGBA")
