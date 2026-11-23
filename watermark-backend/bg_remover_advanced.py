"""Bellix background removal: mask-only neural inference and lossless PNG.

ISNet remains the default and fallback. BiRefNet uses fixed RGB normalization
and sigmoid probabilities. Auto/graphics preserves existing source transparency;
portrait/product explicitly requests segmentation even for transparent inputs.
RGB pixels are never decontaminated, reconstructed, or resampled for export.
Legacy morphology helpers remain available but are not in the active pipeline.
Debug originals/masks/results are written only on explicit local opt-in.
"""
from __future__ import annotations

import gc
import io
import json
import logging
import os
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps
from bg_model_inference import predict_foreground_mask, combine_source_alpha, mask_statistics

logger = logging.getLogger(__name__)

# Keep the model cache local and configurable
os.environ["U2NET_HOME"] = os.getenv("U2NET_HOME", r"D:\models\rembg")

# Production privacy: DEBUG is false by default. No user images written to disk unless explicitly enabled.
DEBUG = os.getenv("BELLIX_DEBUG", "false").lower() in ("true", "1", "yes")
SCRATCH_ROOT = Path(os.getenv("BELLIX_SCRATCH_DIR", str(Path(__file__).resolve().parents[1] / 'scratch' / 'background-removal')))
DEBUG_DIR = SCRATCH_ROOT / "debug"
YUNET_WEIGHTS_PATH = Path("d:/logo-ai-remover-main/watermark-backend/weights/face_detection_yunet_2023mar.onnx")

# ---------------------------------------------------------------------------
# rembg session management & neural fallback chain
# ---------------------------------------------------------------------------
try:
    from rembg import new_session
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed — neural models unavailable")

def ensure_rembg_installed() -> bool:
    return REMBG_AVAILABLE

_SESSION_CACHE: dict = {}
_YUNET_CACHE: dict = {}
_EASYOCR_READER = None
LAST_MODEL_USED: str | None = None
_INFERENCE_LOCK = threading.Lock()

# Pure neural fallback sequence — zero OpenCV GrabCut!
# ISNet remains default until paired visual testing approves a different model.
DEFAULT_NEURAL_CHAIN = [
    "isnet-general-use",
    "u2net",
    "birefnet-general-lite",
    "birefnet-general",
]

def _get_session(model_name: str):
    """Return a cached rembg session for the given neural model."""
    if not REMBG_AVAILABLE:
        return None
    if model_name not in _SESSION_CACHE:
        logger.info(f"Loading neural model: {model_name} ...")
        t0 = time.time()
        try:
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = max(1, int(os.getenv('BELLIX_BG_CPU_THREADS', '1')))
            opts.inter_op_num_threads = 1
            _SESSION_CACHE[model_name] = new_session(model_name, sess_opts=opts)
            logger.info('Model %s active providers: %s', model_name, _SESSION_CACHE[model_name].inner_session.get_providers())
            logger.info(f"Model {model_name} loaded in {time.time()-t0:.2f}s")
        except Exception as exc:
            logger.exception('Failed to load neural session for %s', model_name)
            _SESSION_CACHE.pop(model_name, None)
            gc.collect()
            return None
    return _SESSION_CACHE.get(model_name)


def _get_ocr_reader():
    """Lazy initialization of EasyOCR reader for Quality Gate."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            _EASYOCR_READER = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception as exc:
            logger.debug(f"EasyOCR reader unavailable: {exc}")
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None


# ---------------------------------------------------------------------------
# 1. Mode Detection: Design Mode (Cards / Collages / UI) vs Subject Mode
# ---------------------------------------------------------------------------

def detect_design_mode_and_cards(img_rgb: np.ndarray) -> tuple[bool, list[tuple[int, int, int, int]]]:
    """
    Classifies image as Design Mode (cards, collages, multi-column screenshot) or Subject Mode.
    If multiple structured card containers are found, returns True and the card bounding boxes.
    """
    h, w = img_rgb.shape[:2]
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    thresh = (gray < 235).astype(np.uint8) * 255
    k_col = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 30))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_col)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    potential_cards = []
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if bh >= h * 0.35 and (w * 0.10 <= bw <= w * 0.60):
            aspect = bw / float(bh)
            if 0.3 <= aspect <= 1.5:
                potential_cards.append((x, y, bw, bh))

    if len(potential_cards) >= 2:
        potential_cards.sort(key=lambda b: b[0])
        w0, h0 = potential_cards[0][2], potential_cards[0][3]
        consistent = all(
            abs(b[2] - w0) < w0 * 0.25 and abs(b[3] - h0) < h0 * 0.35
            for b in potential_cards
        )
        if consistent:
            logger.info(f"Design Mode Detected: Found {len(potential_cards)} cards.")
            return True, potential_cards

    return False, []


def render_card_containers_mask(shape: tuple[int, int], cards: list[tuple[int, int, int, int]], radius: int = 14) -> np.ndarray:
    """Renders antialiased rounded rectangular masks for protected card containers."""
    h, w = shape
    mask = np.zeros((h, w), dtype=np.uint8)
    scale = 2
    for (x, y, bw, bh) in cards:
        r_scaled = radius * scale
        big_w, big_h = bw * scale, bh * scale
        big_mask = np.zeros((big_h, big_w), dtype=np.uint8)
        cv2.rectangle(big_mask, (r_scaled, 0), (big_w - r_scaled, big_h), 255, -1)
        cv2.rectangle(big_mask, (0, r_scaled), (big_w, big_h - r_scaled), 255, -1)
        cv2.circle(big_mask, (r_scaled, r_scaled), r_scaled, 255, -1)
        cv2.circle(big_mask, (big_w - r_scaled, r_scaled), r_scaled, 255, -1)
        cv2.circle(big_mask, (r_scaled, big_h - r_scaled), r_scaled, 255, -1)
        cv2.circle(big_mask, (big_w - r_scaled, big_h - r_scaled), r_scaled, 255, -1)
        smooth_card = cv2.resize(big_mask, (bw, bh), interpolation=cv2.INTER_AREA)
        mask[y:y+bh, x:x+bw] = np.maximum(mask[y:y+bh, x:x+bw], smooth_card)
    return mask


# ---------------------------------------------------------------------------
# 2. Modern Face Detection (YuNet ONNX) — Soft Vote Only
# ---------------------------------------------------------------------------

def detect_faces_yunet(img_rgb: np.ndarray) -> list[tuple[int, int, int, int, float]]:
    """
    Detect human faces using OpenCV YuNet DNN.
    Used exclusively as a SOFT salience vote (never an unconditional keep-anchor).
    """
    if not YUNET_WEIGHTS_PATH.exists():
        return []

    h, w = img_rgb.shape[:2]
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

    detector_key = f"{w}x{h}"
    if detector_key not in _YUNET_CACHE:
        detector = cv2.FaceDetectorYN.create(
            str(YUNET_WEIGHTS_PATH),
            "",
            (w, h),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000,
        )
        _YUNET_CACHE[detector_key] = detector
    else:
        detector = _YUNET_CACHE[detector_key]

    faces = detector.detect(img_bgr)
    results = []
    if faces[1] is not None:
        for f in faces[1]:
            fx, fy, fw, fh = map(int, f[:4])
            score = float(f[-1])
            results.append((fx, fy, fw, fh, score))
    return results


# ---------------------------------------------------------------------------
# 3. Enclosed Hole & Notch Healing
# ---------------------------------------------------------------------------

def fill_holes_and_small_notches(binary_mask: np.ndarray, max_hole_area: int | None = None) -> np.ndarray:
    """Fills enclosed transparent holes completely surrounded by foreground subject."""
    h, w = binary_mask.shape[:2]
    total_area = h * w
    if max_hole_area is None:
        max_hole_area = int(total_area * 0.15)

    filled = binary_mask.copy()
    contours, hierarchy = cv2.findContours(filled, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is not None and len(contours) > 0:
        for i, h_info in enumerate(hierarchy[0]):
            if h_info[3] != -1:  # Internal hole
                hole_area = cv2.contourArea(contours[i])
                if hole_area <= max_hole_area:
                    cv2.drawContours(filled, [contours[i]], -1, 255, thickness=cv2.FILLED)
    return filled


# ---------------------------------------------------------------------------
# 4. SCDTR: Solid-Core Distance Transform Reconstruction
# ---------------------------------------------------------------------------

def apply_scdtr_component_refinement(
    binary_mask: np.ndarray,
    faces: list[tuple[int, int, int, int, float]] | None = None,
    strictness: float = 1.0,
) -> tuple[np.ndarray, dict[str, Any]]:
    """
    Solid-Core Distance Transform Reconstruction (SCDTR).

    Principles:
    1. Per-Component Inscribed Radius:
       For each connected component C_k, compute R_k = max(D(x, y)).
       Derive r_core = max(3, round(0.12 * R_k * strictness)).
       Small subjects (distant people, kids' arms, 300px images) scale to their own R_k and are not severed.
    2. Thin Structures Preservation:
       Keep thin structures (glasses frames, headphone wires, whiskers, strands) inside the subject envelope
       or within the boundary edge band.
       Remove thin parts (concentric mandala rings, underlines, buttons) that extend outside the envelope.
    3. Soft Face Voting:
       Faces are NOT hard keep-anchors. A component is boosted in salience if a face lies inside or
       adjacent to its solid core.
    """
    if faces is None:
        faces = []

    h, w = binary_mask.shape[:2]
    max_dim = max(h, w)

    # Fast downscaled EDT for large images
    if max_dim > 1536:
        scale_edt = 1536.0 / max_dim
        sw, sh = round(w * scale_edt), round(h * scale_edt)
        small_bin = cv2.resize(binary_mask, (sw, sh), interpolation=cv2.INTER_NEAREST)
        small_dist = cv2.distanceTransform(small_bin, cv2.DIST_L2, 5)
        dist_map = cv2.resize(small_dist / scale_edt, (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        dist_map = cv2.distanceTransform(binary_mask, cv2.DIST_L2, 5)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    if num_labels <= 1:
        return binary_mask.copy(), {"kept_components": 0}

    component_records = []

    for lbl in range(1, num_labels):
        area = int(stats[lbl, cv2.CC_STAT_AREA])
        if area < 30:
            continue

        comp_mask = (labels == lbl)
        comp_dists = dist_map[comp_mask]
        if len(comp_dists) == 0:
            continue

        R = float(np.max(comp_dists))
        # Thin wire, noise speck, or isolated ring segment
        if R < 2.5:
            continue

        r_core = max(3, round(0.10 * R * strictness))
        core_mask = comp_mask & (dist_map >= r_core)
        core_area = int(np.count_nonzero(core_mask))
        if core_area < 25:
            continue

        core_u8 = (core_mask.astype(np.uint8) * 255)
        dt_core = cv2.distanceTransform((core_u8 == 0).astype(np.uint8) * 255, cv2.DIST_L2, 5)
        # Restore true boundary within r_core + 2px; sever long external rings extending > 10px
        max_dist = r_core + 2
        retained = comp_mask & (dt_core <= max_dist)
        retained_area = int(np.count_nonzero(retained))

        # Soft Face Vote: face center or box inside component core boosts salience
        has_face_vote = False
        for fx, fy, fw, fh, _conf in faces:
            fcx = min(w - 1, max(0, int(fx + fw * 0.5)))
            fcy = min(h - 1, max(0, int(fy + fh * 0.5)))
            face_box_crop = core_u8[max(0, fy):min(h, fy+fh), max(0, fx):min(w, fx+fw)]
            if core_mask[fcy, fcx] or np.count_nonzero(face_box_crop) > 0.1 * (fw * fh):
                has_face_vote = True
                break

        salience_score = float(core_area * R)
        if has_face_vote:
            salience_score *= 2.0

        component_records.append({
            "lbl": lbl,
            "R": R,
            "r_core": r_core,
            "core_area": core_area,
            "retained_area": retained_area,
            "retained_mask": retained,
            "has_face_vote": has_face_vote,
            "salience_score": salience_score,
            "bbox": (int(stats[lbl, 0]), int(stats[lbl, 1]), int(stats[lbl, 2]), int(stats[lbl, 3])),
        })

    if not component_records:
        return binary_mask.copy(), {"kept_components": 0}

    # Sort descending by salience
    component_records.sort(key=lambda c: c["salience_score"], reverse=True)
    primary = component_records[0]

    clean_mask = np.zeros((h, w), dtype=np.uint8)
    clean_mask[primary["retained_mask"]] = 255
    kept_count = 1

    dt_primary = cv2.distanceTransform((clean_mask == 0).astype(np.uint8) * 255, cv2.DIST_L2, 5)

    # Evaluate secondary components (multi-person, pets, children, held objects)
    for sec in component_records[1:]:
        min_dist = float(np.min(dt_primary[sec["retained_mask"]]))
        # Proximity threshold: components within 23px connect to the primary subject cluster (e.g. family members, pets)
        touches_primary = (min_dist <= 23.0)

        bx, by, bw, bh = sec["bbox"]
        # Background framing arch check: spans >= 70% height while narrow <= 25% width
        is_framing_arch = (bh >= 0.70 * h) and (bw <= 0.25 * w)

        is_independent_subject = (
            sec["core_area"] >= max(500, int(primary["core_area"] * 0.15))
            and sec["R"] >= max(5.0, primary["R"] * 0.20)
            and not is_framing_arch
        )

        if touches_primary or is_independent_subject:
            clean_mask[sec["retained_mask"]] = 255
            kept_count += 1
            # Update dt_primary to include the newly retained component in the cluster
            dt_primary = cv2.distanceTransform((clean_mask == 0).astype(np.uint8) * 255, cv2.DIST_L2, 5)

    clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    return clean_mask, {"kept_components": kept_count, "primary_R": primary["R"]}


# ---------------------------------------------------------------------------
# 5. Fast Guided Filter Matting
# ---------------------------------------------------------------------------

def fast_guided_filter(guide_gray: np.ndarray, src_p: np.ndarray, r: int = 8, eps: float = 1e-4, s: int = 2) -> np.ndarray:
    """Fast Guided Filter (He et al. 2015). Sub-pixel edge alignment in <60ms."""
    h, w = guide_gray.shape[:2]
    guide_sub = cv2.resize(guide_gray, (max(1, w // s), max(1, h // s)), interpolation=cv2.INTER_NEAREST)
    p_sub = cv2.resize(src_p, (max(1, w // s), max(1, h // s)), interpolation=cv2.INTER_NEAREST)
    r_sub = max(1, r // s)

    mean_I = cv2.boxFilter(guide_sub, cv2.CV_32F, (r_sub, r_sub))
    mean_p = cv2.boxFilter(p_sub, cv2.CV_32F, (r_sub, r_sub))
    corr_I = cv2.boxFilter(guide_sub * guide_sub, cv2.CV_32F, (r_sub, r_sub))
    corr_Ip = cv2.boxFilter(guide_sub * p_sub, cv2.CV_32F, (r_sub, r_sub))

    var_I = corr_I - mean_I * mean_I
    cov_Ip = corr_Ip - mean_I * mean_p

    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I

    mean_a = cv2.boxFilter(a, cv2.CV_32F, (r_sub, r_sub))
    mean_b = cv2.boxFilter(b, cv2.CV_32F, (r_sub, r_sub))

    mean_a = cv2.resize(mean_a, (w, h), interpolation=cv2.INTER_LINEAR)
    mean_b = cv2.resize(mean_b, (w, h), interpolation=cv2.INTER_LINEAR)

    q = mean_a * guide_gray + mean_b
    return np.clip(q, 0.0, 1.0)


def refine_matting(img_rgb: np.ndarray, clean_mask: np.ndarray, raw_alpha: np.ndarray) -> np.ndarray:
    """Produces clean sub-pixel alpha with solid subject core and feathering along hair & edges."""
    kernel = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    dilated = cv2.dilate(clean_mask, kernel, iterations=1)
    eroded = cv2.erode(clean_mask, kernel, iterations=1)
    boundary = (dilated > 0) & (eroded == 0)

    final_alpha = clean_mask.copy()
    final_alpha[eroded > 0] = 255

    inside_boundary = boundary & (clean_mask > 0)
    final_alpha[inside_boundary] = raw_alpha[inside_boundary]
    final_alpha[clean_mask == 0] = 0
    return final_alpha


# ---------------------------------------------------------------------------
# 6. Native Gradient Detection
# ---------------------------------------------------------------------------

def detect_native_gradient(img_rgb: np.ndarray, mask: np.ndarray) -> bool:
    """Detects whether the source image has a baked-in dark gradient / vignette over the subject."""
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return False

    y_min, y_max = int(ys.min()), int(ys.max())
    subject_h = y_max - y_min
    if subject_h < 50:
        return False

    mid_y = y_min + int(subject_h * 0.4)
    bot_y = y_min + int(subject_h * 0.88)

    mid_pixels = img_rgb[mid_y : mid_y + 10, xs[ys == mid_y]]
    bot_pixels = img_rgb[bot_y : min(img_rgb.shape[0], bot_y + 10), xs[ys == bot_y]]

    if len(mid_pixels) == 0 or len(bot_pixels) == 0:
        return False

    mid_lum = np.mean(mid_pixels)
    bot_lum = np.mean(bot_pixels)
    return bool((mid_lum - bot_lum) > 40.0)


# ---------------------------------------------------------------------------
# 7. Quality Gate: OCR on White Composite + Coverage & Hole Metrics
# ---------------------------------------------------------------------------

def check_text_outside_subject(pil_rgba: Image.Image, clean_mask: np.ndarray) -> tuple[bool, list[str]]:
    """
    Quality gate: composites final cutout on white background and runs OCR.
    Flags if text glyphs are present outside the subject region.
    """
    reader = _get_ocr_reader()
    if reader is None:
        return False, []

    white_bg = Image.new("RGBA", pil_rgba.size, (255, 255, 255, 255))
    comp = Image.alpha_composite(white_bg, pil_rgba).convert("RGB")
    comp_np = np.array(comp)

    h, w = comp_np.shape[:2]
    max_d = max(h, w)
    scale = 1.0
    if max_d > 1024:
        scale = 1024.0 / max_d
        ocr_img = cv2.resize(comp_np, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        ocr_img = comp_np

    try:
        results = reader.readtext(ocr_img, min_size=10, text_threshold=0.5)
    except Exception as e:
        logger.debug(f"OCR read error: {e}")
        return False, []

    texts_outside = []
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    core_zone = cv2.erode(clean_mask, kernel, iterations=2)

    for (bbox, text, conf) in results:
        if conf < 0.35:
            continue
        box_pts = np.array(bbox) / scale
        bx_min = max(0, int(np.min(box_pts[:, 0])))
        bx_max = min(w - 1, int(np.max(box_pts[:, 0])))
        by_min = max(0, int(np.min(box_pts[:, 1])))
        by_max = min(h - 1, int(np.max(box_pts[:, 1])))

        box_crop = clean_mask[by_min:by_max+1, bx_min:bx_max+1]
        if box_crop.size == 0:
            continue
        alpha_in_box = np.count_nonzero(box_crop > 0)
        core_in_box = np.count_nonzero(core_zone[by_min:by_max+1, bx_min:bx_max+1] > 0)
        if alpha_in_box > 20 and (core_in_box / float(alpha_in_box)) < 0.25:
            texts_outside.append(text)

    return (len(texts_outside) > 0), texts_outside


def evaluate_mask_quality(alpha: np.ndarray, has_text_outside: bool = False) -> dict[str, Any]:
    """Calculates mask quality metrics and checks quality gate pass criteria."""
    total = alpha.size
    fg_count = np.count_nonzero(alpha > 128)
    coverage_pct = (fg_count / total) * 100

    uncertain_count = np.count_nonzero((alpha > 25) & (alpha < 230))
    uncertain_pct = (uncertain_count / total) * 100

    binary = (alpha > 128).astype(np.uint8) * 255
    _contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    holes_count = 0
    if hierarchy is not None:
        for h_info in hierarchy[0]:
            if h_info[3] != -1:
                holes_count += 1

    is_reliable = (
        0.5 <= coverage_pct <= 98.0
        and uncertain_pct <= 25.0
        and holes_count <= 20
        and not has_text_outside
    )

    return {
        "coverage_pct": round(coverage_pct, 2),
        "uncertain_pct": round(uncertain_pct, 2),
        "holes_count": holes_count,
        "has_text_outside": has_text_outside,
        "is_reliable": is_reliable,
    }


# ---------------------------------------------------------------------------
# 8. Main Neural Pipeline Orchestrator (Zero GrabCut!)
# ---------------------------------------------------------------------------

def _remove_background_pipeline(
    image_bytes: bytes,
    model: str | None = None,
    save_debug: bool = False,
    image_type: str = 'auto',
) -> tuple[bytes, dict[str, Any]]:
    """
    Main Background Removal Pipeline returning (png_bytes, metadata).
    Zero GrabCut fallback. Exposes fallback usage, model used, latency, and quality pass.
    """
    global LAST_MODEL_USED
    t_start = time.time()

    # Save debug only if locally enabled (BELLIX_DEBUG=1 or save_debug=True)
    write_debug = DEBUG or save_debug
    req_debug_dir = None
    if write_debug:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        req_debug_dir = DEBUG_DIR / timestamp
        req_debug_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Decode image with native resolution
    pil_input = _decode_image(image_bytes)
    img_rgb = np.array(pil_input.convert("RGB"))
    h, w = img_rgb.shape[:2]
    inference_errors = []
    logger.info('Original image dimensions: %sx%s', w, h)
    if req_debug_dir:
        pil_input.save(req_debug_dir / 'original.png')

    if image_type not in {'auto', 'portrait', 'product', 'graphics'}:
        raise ValueError('Unsupported image type')
    if image_type in {'auto', 'graphics'} and ('A' in pil_input.getbands() or 'transparency' in pil_input.info):
        existing_alpha = np.asarray(pil_input.convert('RGBA').getchannel('A'))
        if np.any(existing_alpha == 0) and np.any(existing_alpha > 0):
            # Existing authored alpha is authoritative in auto/graphics mode.
            # Explicit portrait/product mode requests fresh neural segmentation.
            # Do not segment the typography a second time or call this AI removal.
            result = Image.fromarray(np.dstack([img_rgb, existing_alpha]))
            if req_debug_dir:
                for name in ['raw_mask', 'normalized_mask', 'refined_mask']:
                    Image.fromarray(existing_alpha).save(req_debug_dir / f'{name}.png')
                result.save(req_debug_dir / 'final_output.png')
            metrics = _alpha_diagnostics(existing_alpha)
            if req_debug_dir:
                (req_debug_dir / 'diagnostics.json').write_text(json.dumps({
                    'operation': 'preserved-existing-transparency', 'original_dimensions': [w, h],
                    'metrics': metrics, 'inference_errors': [], 'neural_raw_mask_available': False,
                }, indent=2), encoding='utf-8')
            return _pil_to_png_bytes(result), {
                'model_used': 'existing-alpha', 'operation': 'preserved-existing-transparency',
                'image_type': image_type, 'fallback_used': False, 'mask_valid': True,
                'metrics': metrics, 'inference_errors': [],
                'debug_dir': str(req_debug_dir) if req_debug_dir else None,
                'quality_pass': False, 'latency_seconds': round(time.time()-t_start, 2),
                'warnings': ['Existing graphics transparency preserved; no AI segmentation performed.'],
            }

    # Requested/configured model first; retain general-purpose neural fallbacks.
    requested_model = model or os.getenv('BELLIX_BACKGROUND_MODEL', DEFAULT_NEURAL_CHAIN[0])
    model_chain = [requested_model] + [m for m in DEFAULT_NEURAL_CHAIN if m != requested_model]

    best_result_pil = None
    best_meta = None
    winning_model = None
    fallback_used = False

    for idx, model_name in enumerate(model_chain):
        try:
            logger.info(f"Attempting neural model: {model_name}...")
            t_m0 = time.time()
            session = _get_session(model_name)
            if session is None:
                inference_errors.append({'model': model_name, 'error_type': 'SessionLoadError',
                                         'error': 'Session unavailable; see provider/session exception in worker log'})
                fallback_used = True
                continue

            attempt_dir = req_debug_dir / model_name if req_debug_dir else None
            if attempt_dir:
                raw_mask, inference_info = predict_foreground_mask(session, pil_input, model_name, debug_dir=attempt_dir)
            else:
                raw_mask, inference_info = predict_foreground_mask(session, pil_input, model_name)
            raw_alpha = np.asarray(raw_mask).copy()
            logger.info(f"Model {model_name} executed in {time.time()-t_m0:.2f}s")

            # The validated adapter restores the foreground mask to source size.
            if raw_alpha.shape != (h, w):
                raise ValueError('Model mask dimensions differ from original')
            final_alpha = combine_source_alpha(raw_mask, pil_input)
            candidate_pil = pil_input.convert('RGB').convert('RGBA')
            candidate_pil.putalpha(Image.fromarray(final_alpha))
            metrics = evaluate_mask_quality(final_alpha)
            metrics.update(_alpha_diagnostics(final_alpha))
            # Structural validity is not a semantic quality guarantee.
            metrics['is_reliable'] = bool(np.any(final_alpha == 0) and np.any(final_alpha > 0))
            has_gradient = False
            logger.info('Mask %s shape=%s range=%s..%s transparent=%s soft=%s',
                        model_name, raw_alpha.shape, raw_alpha.min(), raw_alpha.max(),
                        int(np.count_nonzero(final_alpha == 0)),
                        int(np.count_nonzero((final_alpha > 0) & (final_alpha < 255))))
            if write_debug and req_debug_dir:
                Image.fromarray(final_alpha).save(attempt_dir / 'refined_mask.png')
                candidate_pil.save(attempt_dir / 'final_output.png')
                (attempt_dir / 'diagnostics.json').write_text(json.dumps({
                    'inference': inference_info, 'metrics': metrics,
                }, indent=2), encoding='utf-8')
            if not metrics['is_reliable']:
                raise ValueError('Model produced an empty or fully opaque mask')

            meta = {
                "model_used": model_name,
                "fallback_used": (idx > 0),
                "quality_pass": False,
                "mask_valid": metrics["is_reliable"],
                "warnings": ["Visual quality is unverified; inspect edges and background before use."],
                "metrics": metrics,
                "inference": inference_info,
                "image_type": image_type,
                "operation": "neural-background-removal",
                "has_gradient_note": has_gradient,
            }

            if metrics["is_reliable"] or best_result_pil is None:
                best_result_pil = candidate_pil
                best_meta = meta
                winning_model = model_name
                fallback_used = (idx > 0)

            if metrics["is_reliable"]:
                break

        except Exception as exc:
            inference_errors.append({'model': model_name, 'error_type': type(exc).__name__, 'error': str(exc)})
            logger.exception('Inference/provider failure for %s; trying fallback', model_name)
            if req_debug_dir:
                (req_debug_dir / 'inference_errors.json').write_text(json.dumps(inference_errors, indent=2), encoding='utf-8')
            _SESSION_CACHE.pop(model_name, None)
            gc.collect()
            fallback_used = True
            continue

    if best_result_pil is None:
        raise RuntimeError(
            "All neural background removal models failed. Please verify system memory or try another image."
        )

    LAST_MODEL_USED = winning_model
    elapsed = time.time() - t_start
    best_meta["latency_seconds"] = round(elapsed, 2)
    best_meta["fallback_used"] = fallback_used
    best_meta['inference_errors'] = inference_errors
    best_meta['debug_dir'] = str(req_debug_dir) if req_debug_dir else None
    if req_debug_dir:
        # Stable names describe only the winning attempt; failed attempts stay isolated.
        for name in ['raw_mask.png', 'normalized_mask.png', 'refined_mask.png', 'final_output.png']:
            source = req_debug_dir / winning_model / name
            if source.exists():
                (req_debug_dir / name).write_bytes(source.read_bytes())
        (req_debug_dir / 'diagnostics.json').write_text(json.dumps(best_meta, indent=2), encoding='utf-8')

    logger.info(
        f"Background removal finished in {elapsed:.2f}s using {winning_model} "
        f"(fallback_used={fallback_used}, quality_pass={best_meta['quality_pass']})"
    )

    return _pil_to_png_bytes(best_result_pil), best_meta


def remove_background_advanced(
    image_bytes: bytes,
    model: str | None = None,
    save_debug: bool = False,
) -> bytes:
    """Wrapper returning PNG bytes for backward compatibility."""
    result_bytes, _ = remove_background_pipeline(image_bytes, model=model, save_debug=save_debug)
    return result_bytes


def remove_background_pipeline(
    image_bytes: bytes,
    model: str | None = None,
    save_debug: bool = False,
    image_type: str = 'auto',
) -> tuple[bytes, dict[str, Any]]:
    # Large ONNX intermediates cannot safely overlap on the CPU worker.
    with _INFERENCE_LOCK:
        return _remove_background_pipeline(image_bytes, model, save_debug, image_type)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _alpha_diagnostics(alpha: np.ndarray) -> dict:
    metrics = mask_statistics(alpha)
    metrics.update({
        'foreground_pixel_percentage': float(np.mean(alpha > 128)*100),
        'transparent_pixel_percentage': float(np.mean(alpha == 0)*100),
        'soft_pixel_percentage': float(np.mean((alpha > 0) & (alpha < 255))*100),
    })
    logger.info('Alpha diagnostics: %s', metrics)
    return metrics

def _decode_image(image_bytes: bytes) -> Image.Image:
    """Decode image handling EXIF, CMYK, and palette modes."""
    pil = Image.open(io.BytesIO(image_bytes))
    try:
        pil = ImageOps.exif_transpose(pil)
    except Exception:
        pass

    if pil.mode == "P":
        pil = pil.convert("RGBA")
    elif pil.mode in ("L", "CMYK"):
        pil = pil.convert("RGB")
    return pil


def _pil_to_png_bytes(pil: Image.Image) -> bytes:
    """Convert PIL image to PNG bytes."""
    buf = io.BytesIO()
    pil.convert("RGBA").save(buf, format="PNG", optimize=False)
    buf.seek(0)
    return buf.read()
