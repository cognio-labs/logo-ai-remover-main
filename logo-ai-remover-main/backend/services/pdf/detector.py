"""
PDF Watermark Detector — Step 1 of the conservative pipeline.

Priority order (least destructive first):
  1. Native PDF annotation/stamp/watermark objects  → remove the object, not the content
  2. Optional content groups (layers)               → toggle visibility off
  3. Transparent overlay images/XObjects            → remove XObject reference
  4. Raster baked-in watermarks                     → ONLY if no text layer is found

Key invariant:
  DO NOT classify legitimate document content as watermark.
  Confidence threshold is deliberately high.
  When in doubt → preserve the original.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
import pymupdf

logger = logging.getLogger(__name__)

# ── confidence threshold: below this we refuse to remove ───────────────────
CONFIDENCE_REMOVE_THRESHOLD = 0.72

# ── watermark text keywords (case-insensitive) ──────────────────────────────
WATERMARK_KEYWORDS = {
    "watermark", "sample", "draft", "confidential", "do not copy",
    "do not duplicate", "trial version", "evaluation", "paid", "copy",
    "void", "specimen", "proof", "for review",
}

# ── annotation type IDs that are purely decorative overlays ────────────────
REMOVABLE_ANNOT_TYPE_IDS = {
    pymupdf.PDF_ANNOT_STAMP,       # 13
    pymupdf.PDF_ANNOT_WATERMARK,   # 22
    pymupdf.PDF_ANNOT_FREE_TEXT,   # 2  — only if content matches keywords
}

ALWAYS_PRESERVE_ANNOT_TYPE_IDS = {
    pymupdf.PDF_ANNOT_WIDGET,      # 20 — form field
}


@dataclass
class WatermarkCandidate:
    """A single candidate watermark object on one PDF page."""
    page_index: int
    source: str  # "annotation" | "xobject" | "ocg" | "raster"
    confidence: float = 0.0
    # for annotation sources
    annot_ref: Any = None
    annot_type_id: int = -1
    # for xobject / ocg sources
    xobject_name: str = ""
    ocg_xref: int = -1
    # for raster mask approach
    raster_mask: np.ndarray | None = None
    # normalized bounding box on page (0-1)
    norm_bbox: tuple[float, float, float, float] = (0.0, 0.0, 1.0, 1.0)

    def is_safe_to_remove(self) -> bool:
        return self.confidence >= CONFIDENCE_REMOVE_THRESHOLD


@dataclass
class PageWatermarkAnalysis:
    """Full analysis result for one page."""
    page_index: int
    page_width: float
    page_height: float
    has_text_layer: bool
    candidates: list[WatermarkCandidate] = field(default_factory=list)
    strategy: str = "none"  # "native_annot" | "xobject" | "ocg" | "raster" | "none"
    safe_candidates: list[WatermarkCandidate] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.safe_candidates = [c for c in self.candidates if c.is_safe_to_remove()]

    def has_removable_watermark(self) -> bool:
        return len(self.safe_candidates) > 0


# ── public API ──────────────────────────────────────────────────────────────

def analyze_page(
    doc: pymupdf.Document,
    page_index: int,
    render_dpi: int = 150,
) -> PageWatermarkAnalysis:
    """
    Inspect one PDF page and return a structured watermark analysis.
    Never rasterizes unless annotation/object inspection yields nothing.
    """
    page = doc[page_index]
    pw = page.rect.width
    ph = page.rect.height
    has_text = bool(page.get_text("text").strip())

    candidates: list[WatermarkCandidate] = []

    # ── Step 1: Native PDF annotation inspection ────────────────────────────
    annotation_candidates = _inspect_annotations(page, page_index)
    candidates.extend(annotation_candidates)

    # ── Step 2: XObject / transparency group inspection ─────────────────────
    xobj_candidates = _inspect_xobjects(doc, page, page_index)
    candidates.extend(xobj_candidates)

    # ── Step 3: Optional Content Group (layer) inspection ───────────────────
    ocg_candidates = _inspect_ocg(doc, page, page_index)
    candidates.extend(ocg_candidates)

    # ── Step 4: Raster fallback — only when no native objects found ─────────
    raster_candidates: list[WatermarkCandidate] = []
    if not candidates:
        raster_candidates = _inspect_raster(page, page_index, render_dpi)
        candidates.extend(raster_candidates)

    # Determine overall strategy
    strategy = "none"
    safe = [c for c in candidates if c.is_safe_to_remove()]
    if safe:
        sources = {c.source for c in safe}
        if "annotation" in sources:
            strategy = "native_annot"
        elif "xobject" in sources:
            strategy = "xobject"
        elif "ocg" in sources:
            strategy = "ocg"
        elif "raster" in sources:
            strategy = "raster"

    analysis = PageWatermarkAnalysis(
        page_index=page_index,
        page_width=pw,
        page_height=ph,
        has_text_layer=has_text,
        candidates=candidates,
        strategy=strategy,
    )

    logger.info(
        "[Detector] page=%d  has_text=%s  candidates=%d  safe=%d  strategy=%s",
        page_index + 1,
        has_text,
        len(candidates),
        len(analysis.safe_candidates),
        strategy,
    )
    return analysis


# ── Step 1: Annotation inspection ──────────────────────────────────────────

def _inspect_annotations(
    page: pymupdf.Page, page_index: int
) -> list[WatermarkCandidate]:
    results: list[WatermarkCandidate] = []
    pw, ph = page.rect.width, page.rect.height
    if pw <= 0 or ph <= 0:
        return results

    try:
        annots = list(page.annots())
    except Exception as exc:
        logger.warning("Cannot read annots on page %d: %s", page_index + 1, exc)
        return results

    for annot in annots:
        try:
            type_id = annot.type[0]
            if type_id in ALWAYS_PRESERVE_ANNOT_TYPE_IDS:
                continue
            if type_id not in REMOVABLE_ANNOT_TYPE_IDS:
                continue

            info = annot.info or {}
            content = str(info.get("content", "")).lower()
            subject = str(info.get("subject", "")).lower()

            # FreeText annotations: only remove if they contain watermark keywords
            if type_id == pymupdf.PDF_ANNOT_FREE_TEXT:
                combined = f"{content} {subject}"
                if not any(kw in combined for kw in WATERMARK_KEYWORDS):
                    logger.debug(
                        "Skipping FreeText annot without watermark keyword: '%s'", content[:60]
                    )
                    continue
                confidence = 0.80
            else:
                confidence = 0.95  # STAMP / WATERMARK type IDs are nearly always watermarks

            rect = annot.rect
            nx = max(0.0, (rect.x0 - page.rect.x0) / pw)
            ny = max(0.0, (rect.y0 - page.rect.y0) / ph)
            nw = max(0.001, min(1.0 - nx, rect.width / pw))
            nh = max(0.001, min(1.0 - ny, rect.height / ph))

            results.append(
                WatermarkCandidate(
                    page_index=page_index,
                    source="annotation",
                    confidence=confidence,
                    annot_ref=annot,
                    annot_type_id=type_id,
                    norm_bbox=(nx, ny, nw, nh),
                )
            )
        except Exception as exc:
            logger.warning("Error inspecting annot on page %d: %s", page_index + 1, exc)

    return results


# ── Step 2: XObject transparency inspection ─────────────────────────────────

def _inspect_xobjects(
    doc: pymupdf.Document, page: pymupdf.Page, page_index: int
) -> list[WatermarkCandidate]:
    """
    Look for image XObjects that:
      - cover a large area of the page
      - have a transparency/soft-mask attribute (ca, CA, SMask)
      - appear on multiple pages (strong watermark signal)
    """
    results: list[WatermarkCandidate] = []
    try:
        xref_list = page.get_images(full=True)
    except Exception:
        return results

    pw, ph = page.rect.width, page.rect.height
    if pw <= 0 or ph <= 0:
        return results

    # Build xref → usage-count map across first 5 pages for repetition check
    repeated_xrefs: set[int] = set()
    try:
        for other_idx in range(min(len(doc), 5)):
            if other_idx == page_index:
                continue
            for img_info in doc[other_idx].get_images(full=True):
                repeated_xrefs.add(img_info[0])
    except Exception:
        pass

    for img_info in xref_list:
        try:
            xref = img_info[0]
            img_dict = doc.extract_image(xref)
            if not img_dict:
                continue

            # Check for soft-mask (transparency channel)
            has_smask = img_dict.get("smask", 0) > 0
            is_repeated = xref in repeated_xrefs

            # Coverage estimation: use colorspace alpha
            width = img_dict.get("width", 0)
            height = img_dict.get("height", 0)
            if width <= 0 or height <= 0:
                continue

            # Get placement rect on page via page.get_image_rects
            rects = page.get_image_rects(xref)
            if not rects:
                continue

            for r in rects:
                coverage = (r.width * r.height) / (pw * ph)
                # A watermark image XObject must be: large, transparent, and/or repeated
                confidence = 0.0
                if has_smask:
                    confidence += 0.45
                if is_repeated:
                    confidence += 0.35
                if coverage > 0.25:
                    confidence += 0.20
                if coverage > 0.50:
                    confidence += 0.10

                if confidence >= CONFIDENCE_REMOVE_THRESHOLD:
                    nx = max(0.0, r.x0 / pw)
                    ny = max(0.0, r.y0 / ph)
                    nw = max(0.001, min(1.0 - nx, r.width / pw))
                    nh = max(0.001, min(1.0 - ny, r.height / ph))
                    results.append(
                        WatermarkCandidate(
                            page_index=page_index,
                            source="xobject",
                            confidence=min(0.97, confidence),
                            xobject_name=str(xref),
                            norm_bbox=(nx, ny, nw, nh),
                        )
                    )
        except Exception as exc:
            logger.debug("XObject inspection error: %s", exc)

    return results


# ── Step 3: Optional Content Group (OCG / layer) inspection ─────────────────

def _inspect_ocg(
    doc: pymupdf.Document, page: pymupdf.Page, page_index: int
) -> list[WatermarkCandidate]:
    """Detect watermark layers hidden in OCG (Optional Content Groups)."""
    results: list[WatermarkCandidate] = []
    try:
        layers = doc.get_ocgs()
        if not layers:
            return results
        for xref, ocg_info in layers.items():
            name = str(ocg_info.get("name", "")).lower()
            if any(kw in name for kw in WATERMARK_KEYWORDS):
                results.append(
                    WatermarkCandidate(
                        page_index=page_index,
                        source="ocg",
                        confidence=0.88,
                        ocg_xref=xref,
                    )
                )
    except Exception as exc:
        logger.debug("OCG inspection error: %s", exc)
    return results


# ── Step 4: Raster watermark detection (fallback only) ─────────────────────

# Maximum mask coverage allowed — refuse if watermark mask covers > 60% of page
MAX_RASTER_MASK_COVERAGE = 0.60

def _inspect_raster(
    page: pymupdf.Page,
    page_index: int,
    render_dpi: int = 150,
) -> list[WatermarkCandidate]:
    """
    Detect raster/baked-in watermarks on a scanned or image-only page.
    Uses multi-signal analysis:
      - semi-transparent grayish overlay pixels
      - large diagonal connected components spanning ≥30% of page width
      - NOT: normal text pixels, table borders, or dark-ink document content
    """
    from backend.services.pdf_renderer import render_page_to_bgr  # local import to avoid cycles

    try:
        bgr = render_page_to_bgr(page, dpi=render_dpi)
    except Exception as exc:
        logger.warning("Could not render page %d for raster detection: %s", page_index + 1, exc)
        return []

    h, w = bgr.shape[:2]
    if h == 0 or w == 0:
        return []

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # Multi-signal overlay detection:
    # 1. Colored overlays (stamps, colored text watermarks like blue/red):
    b, g, r = bgr[:, :, 0].astype(int), bgr[:, :, 1].astype(int), bgr[:, :, 2].astype(int)
    max_c = np.maximum(np.maximum(b, g), r)
    min_c = np.minimum(np.minimum(b, g), r)
    chroma = max_c - min_c
    is_colored_overlay = (chroma > 10) & (gray > 100) & (gray < 252)

    # 2. Semi-transparent grayish overlays on white/light paper:
    is_gray_overlay = (gray >= 175) & (gray <= 230)

    # Exclude very dark pixels (definite document ink < 110)
    candidate_pixels = (is_colored_overlay | is_gray_overlay) & (gray >= 110)
    wm_mask = candidate_pixels.astype(np.uint8) * 255

    # Morphological cleanup — connect fragmented diagonal letterforms
    kern_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    wm_mask = cv2.morphologyEx(wm_mask, cv2.MORPH_CLOSE, kern_close)

    # Reject small noise islands
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        wm_mask, connectivity=8
    )
    refined_mask = np.zeros((h, w), dtype=np.uint8)
    candidates_found: list[WatermarkCandidate] = []

    page_area = w * h
    pw, ph = page.rect.width, page.rect.height

    for i in range(1, num_labels):
        comp_w = stats[i, cv2.CC_STAT_WIDTH]
        comp_h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]
        x = stats[i, cv2.CC_STAT_LEFT]
        y = stats[i, cv2.CC_STAT_TOP]

        # Span across page: either width, height, or diagonal span
        span = math.hypot(comp_w, comp_h)
        if span < w * 0.25 and comp_w < w * 0.25:
            continue
        # Must be large enough to be a real overlay (not tiny speckle)
        if area < page_area * 0.002:
            continue
        # Reject full-page artifacts
        if comp_w > w * 0.98 and comp_h > h * 0.98:
            continue

        # Coverage check
        coverage = area / page_area
        if coverage > MAX_RASTER_MASK_COVERAGE:
            logger.warning(
                "Raster mask covers %.1f%% of page — refusing destructive removal",
                coverage * 100,
            )
            continue

        confidence = 0.68
        if span > w * 0.40:
            confidence += 0.15
        if np.any(is_colored_overlay[labels == i]):
            confidence += 0.12  # Chromatic ink watermark has strong signal

        if confidence < CONFIDENCE_REMOVE_THRESHOLD:
            continue

        refined_mask[labels == i] = 255
        nx = x / w
        ny = y / h
        nw = comp_w / w
        nh = comp_h / h

        candidates_found.append(
            WatermarkCandidate(
                page_index=page_index,
                source="raster",
                confidence=min(0.95, confidence),
                raster_mask=None,  # full mask assembled after all components
                norm_bbox=(nx, ny, nw, nh),
            )
        )

    # Assign the combined refined mask to all raster candidates
    if candidates_found and np.any(refined_mask > 0):
        for c in candidates_found:
            c.raster_mask = refined_mask
        logger.info(
            "[Detector] page=%d raster candidates=%d mask_coverage=%.2f%%",
            page_index + 1,
            len(candidates_found),
            np.count_nonzero(refined_mask) / page_area * 100,
        )

    return candidates_found
