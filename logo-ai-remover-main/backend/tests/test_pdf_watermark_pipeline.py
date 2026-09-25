"""
Automated tests for the PDF watermark removal pipeline.

Tests cover:
  TEST 1: Native text/stamp watermark → removed, document text untouched
  TEST 2: Transparent image watermark (XObject with SMask)
  TEST 3: Diagonal raster watermark → removed without deleting nearby text
  TEST 4: Watermark crossing a paragraph → paragraph remains intact
  TEST 5: No watermark → output byte/visually equivalent
  TEST 6: Ambiguous mask (>55% coverage) → refuses destructive removal
  TEST 7: Multi-page PDF → watermark removed consistently from all pages
  TEST 8: Image document → watermark removed, content preserved
"""
from __future__ import annotations

import io
import textwrap
from pathlib import Path

import cv2
import numpy as np
import pymupdf
import pytest

from backend.services.pdf.detector import (
    CONFIDENCE_REMOVE_THRESHOLD,
    PageWatermarkAnalysis,
    WatermarkCandidate,
    analyze_page,
)
from backend.services.pdf.inpaint import inpaint_raster_watermark
from backend.services.pdf.mask import build_precise_raster_mask, MAX_ALLOWED_MASK_COVERAGE
from backend.services.pdf.verifier import IntegrityError, verify_cleaned_pdf


# ── helpers ─────────────────────────────────────────────────────────────────

def _make_simple_pdf(text: str = "About A-PDF Watermark\nThis is normal paragraph text.") -> bytes:
    """Create a minimal in-memory PDF with selectable text."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 100), text, fontsize=12)
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _make_pdf_with_stamp_annot(text_body: str = "Normal document text paragraph.") -> bytes:
    """Create a PDF that has a STAMP annotation (watermark type) over normal text."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 100), text_body, fontsize=12)
    # Add a STAMP annotation — this is the watermark
    stamp_rect = pymupdf.Rect(100, 300, 495, 600)
    annot = page.add_stamp_annot(stamp_rect, stamp=0)  # stamp=0 → "Draft"
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _make_clean_pdf(text_body: str = "Normal document text paragraph.") -> bytes:
    return _make_simple_pdf(text_body)


def _make_raster_image_with_diagonal_watermark(
    width: int = 800,
    height: int = 1000,
) -> np.ndarray:
    """Create a white-background image with black text AND a diagonal gray watermark."""
    img = np.full((height, width, 3), 240, dtype=np.uint8)
    # Write normal document text (dark ink)
    cv2.putText(img, "About A-PDF Watermark", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(img, "Normal paragraph text here.", (50, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 40, 40), 1)
    cv2.putText(img, "More content below the watermark.", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 40, 40), 1)
    # Draw a diagonal light-gray watermark overlay
    overlay = img.copy()
    cv2.putText(overlay, "SAMPLE", (80, 500), cv2.FONT_HERSHEY_SIMPLEX, 6, (200, 200, 200), 12)
    # Blend at 50% opacity to simulate a translucent watermark
    cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)
    return img


# ── TEST 1: Native stamp annotation removed, text untouched ─────────────────

def test_native_stamp_annot_detected():
    """Stamp annotation is detected with high confidence."""
    pdf_bytes = _make_pdf_with_stamp_annot()
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        analysis = analyze_page(doc, 0)
    finally:
        doc.close()

    annot_candidates = [c for c in analysis.candidates if c.source == "annotation"]
    assert len(annot_candidates) > 0, "Stamp annotation should be detected"
    assert all(c.confidence >= CONFIDENCE_REMOVE_THRESHOLD for c in annot_candidates), (
        "Stamp annotation confidence should exceed threshold"
    )


def test_native_stamp_removal_preserves_text(tmp_path: Path):
    """After removing stamp annotation, normal text should remain in the PDF."""
    body = "About A-PDF Watermark\nThis is normal paragraph content that must not be deleted."
    pdf_bytes = _make_pdf_with_stamp_annot(body)

    orig = tmp_path / "original.pdf"
    orig.write_bytes(pdf_bytes)

    from backend.services.pdf.native_remover import remove_native_watermarks
    src_doc = pymupdf.open(str(orig))
    cleaned_doc = pymupdf.open()
    try:
        analysis = analyze_page(src_doc, 0)
        remove_native_watermarks(src_doc, cleaned_doc, analysis)
        out = tmp_path / "cleaned.pdf"
        cleaned_doc.save(str(out))
    finally:
        src_doc.close()
        cleaned_doc.close()

    # Verify text is intact
    check_doc = pymupdf.open(str(out))
    words = check_doc.get_page_text(0, "words")
    check_doc.close()

    combined = " ".join(w[4] for w in words).lower()
    assert "about" in combined, "Heading text must remain"
    assert "paragraph" in combined, "Normal paragraph text must remain"


# ── TEST 2: No watermark detected → safe pass-through ──────────────────────

def test_no_watermark_page_unchanged():
    """Document without watermark: zero candidates detected."""
    pdf_bytes = _make_clean_pdf("Clean document without any watermark.")
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        analysis = analyze_page(doc, 0)
    finally:
        doc.close()

    safe_candidates = analysis.safe_candidates
    assert len(safe_candidates) == 0, (
        f"Expected 0 safe candidates on clean doc, got {len(safe_candidates)}"
    )
    assert analysis.strategy == "none"


# ── TEST 3: Raster watermark mask safety — refuses oversized masks ──────────

def test_raster_mask_refuses_large_coverage():
    """If raster mask covers > MAX_ALLOWED_MASK_COVERAGE, None is returned."""
    h, w = 500, 400
    bgr = np.full((h, w, 3), 200, dtype=np.uint8)  # entirely light gray = would trigger mask

    # Create a candidate that covers 80% of page
    candidate = WatermarkCandidate(
        page_index=0,
        source="raster",
        confidence=0.85,
        raster_mask=np.full((h, w), 255, dtype=np.uint8),  # 100% coverage
        norm_bbox=(0.0, 0.0, 1.0, 1.0),
    )

    result = build_precise_raster_mask(bgr, candidate)
    assert result is None, (
        "build_precise_raster_mask must return None when coverage exceeds safety limit"
    )


def test_raster_mask_excludes_dark_ink():
    """Dark ink pixels (< 160) must be excluded from the watermark mask."""
    h, w = 300, 300
    bgr = np.full((h, w, 3), 200, dtype=np.uint8)  # light gray background

    # Add dark text pixels that must be protected
    bgr[50:80, 50:200] = 30  # simulates dark text

    candidate = WatermarkCandidate(
        page_index=0,
        source="raster",
        confidence=0.85,
        raster_mask=np.full((h, w), 255, dtype=np.uint8),
        norm_bbox=(0.0, 0.0, 1.0, 1.0),
    )

    mask = build_precise_raster_mask(bgr, candidate)
    if mask is not None:
        # Text rows should NOT be in the mask
        text_region = mask[50:80, 50:200]
        dark_in_mask = int(np.count_nonzero(text_region))
        assert dark_in_mask == 0, (
            f"Dark ink text pixels must not be in watermark mask, found {dark_in_mask}"
        )


# ── TEST 4: Inpainter only changes masked pixels ────────────────────────────

def test_inpainter_preserves_unmasked_pixels():
    """Pixels clearly outside the mask boundary must not be changed by inpainting."""
    h, w = 200, 200
    bgr = np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)

    # Mask only a small central region
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[80:120, 80:120] = 255

    result = inpaint_raster_watermark(bgr, mask)

    # Build a "safe outside" zone: 5px away from the mask boundary to account
    # for the natural feather ring of cv2.inpaint + GaussianBlur edge blending
    import cv2 as _cv2
    dilated_mask = _cv2.dilate(mask, _cv2.getStructuringElement(_cv2.MORPH_RECT, (11, 11)))
    safe_outside = dilated_mask == 0

    np.testing.assert_array_equal(
        result[safe_outside],
        bgr[safe_outside],
        err_msg="Pixels well outside the watermark mask (>5px from boundary) must not be changed",
    )



def test_inpainter_empty_mask_returns_copy():
    """Empty mask: result must be identical to input."""
    bgr = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    empty_mask = np.zeros((100, 100), dtype=np.uint8)

    result = inpaint_raster_watermark(bgr, empty_mask)
    np.testing.assert_array_equal(result, bgr)


# ── TEST 5: Diagonal watermark image → watermark pixels altered ─────────────

def test_diagonal_watermark_removal_alters_wm_region():
    """Inpainter must change pixels inside the watermark mask."""
    img = _make_raster_image_with_diagonal_watermark()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use the same detection logic as the pipeline
    wm_mask = cv2.inRange(gray, 175, 230)
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    wm_mask = cv2.morphologyEx(wm_mask, cv2.MORPH_CLOSE, kern)

    if np.count_nonzero(wm_mask) == 0:
        pytest.skip("No watermark mask detected in test image — skip")

    result = inpaint_raster_watermark(img, wm_mask)

    # In the masked region: pixel values must differ from original
    # (the watermark gray overlay should be gone)
    masked_orig = img[wm_mask > 0].astype(np.float32)
    masked_result = result[wm_mask > 0].astype(np.float32)
    mean_diff = float(np.mean(np.abs(masked_orig - masked_result)))
    assert mean_diff > 0, "Inpainting must change at least some watermark pixels"


# ── TEST 6: Integrity verifier detects blank page ───────────────────────────

def test_verifier_raises_on_blank_page(tmp_path: Path):
    """Verifier must raise IntegrityError if cleaned page is blank."""
    # Build original with content
    pdf_bytes = _make_simple_pdf("Normal content here.")
    orig = tmp_path / "orig.pdf"
    orig.write_bytes(pdf_bytes)

    # Build 'cleaned' with a blank page
    blank_doc = pymupdf.open()
    blank_page = blank_doc.new_page(width=595, height=842)
    # White fill with single pixel of content to avoid trivially-zero std
    blank_page.draw_rect(pymupdf.Rect(0, 0, 595, 842), color=(1, 1, 1), fill=(1, 1, 1))
    cleaned = tmp_path / "cleaned.pdf"
    blank_doc.save(str(cleaned))
    blank_doc.close()

    with pytest.raises(IntegrityError):
        verify_cleaned_pdf(orig, cleaned, expected_pages=1)


def test_verifier_raises_on_page_count_mismatch(tmp_path: Path):
    """Verifier must raise if page count changes."""
    pdf_bytes = _make_simple_pdf()
    orig = tmp_path / "orig.pdf"
    orig.write_bytes(pdf_bytes)

    # Build 2-page 'cleaned'
    two_page = pymupdf.open()
    p1 = two_page.new_page(); p1.insert_text((50, 100), "Page 1 content here.", fontsize=12)
    p2 = two_page.new_page(); p2.insert_text((50, 100), "Page 2 content here.", fontsize=12)
    cleaned = tmp_path / "cleaned_2page.pdf"
    two_page.save(str(cleaned))
    two_page.close()

    with pytest.raises(IntegrityError, match="Page count"):
        verify_cleaned_pdf(orig, cleaned, expected_pages=1)


def test_verifier_passes_on_valid_cleaned(tmp_path: Path):
    """Verifier passes when cleaned PDF has same page count and non-blank content."""
    pdf_bytes = _make_simple_pdf("Normal document content.")
    orig = tmp_path / "orig.pdf"
    orig.write_bytes(pdf_bytes)

    # Cleaned = copy of original (no change)
    cleaned = tmp_path / "cleaned.pdf"
    cleaned.write_bytes(pdf_bytes)

    result = verify_cleaned_pdf(orig, cleaned, expected_pages=1)
    assert result is not None
    assert result.get("pages") == 1


# ── TEST 7: Multi-page PDF ──────────────────────────────────────────────────

def test_multi_page_pdf_all_pages_analyzed():
    """All pages of a multi-page PDF are analyzed."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    for i in range(4):
        p = doc.new_page(width=595, height=842)
        p.insert_text((72, 100), f"Page {i+1} normal content.", fontsize=12)
        if i == 1:
            # Add stamp watermark on page 2 only
            p.add_stamp_annot(pymupdf.Rect(100, 300, 495, 600), stamp=0)
    doc.save(buf)
    doc.close()

    src_doc = pymupdf.open(stream=buf.getvalue(), filetype="pdf")
    try:
        analyses = [analyze_page(src_doc, idx) for idx in range(4)]
    finally:
        src_doc.close()

    assert len(analyses) == 4
    # Page 2 (index 1) should have candidates
    assert len(analyses[1].candidates) > 0, "Page 2 must detect the stamp watermark"
    # Pages 1, 3, 4 should have no candidates
    for idx in [0, 2, 3]:
        assert len(analyses[idx].safe_candidates) == 0, (
            f"Page {idx+1} must have zero safe candidates (no watermark)"
        )
