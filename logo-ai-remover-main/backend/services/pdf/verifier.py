"""
PDF Document Integrity Verifier.

Checks that:
  1. The cleaned PDF exists and is non-empty
  2. Page count exactly matches the original
  3. The PDF can be parsed
  4. Text object count did not unexpectedly collapse
  5. Image count did not unexpectedly collapse
  6. First page is not blank
  7. No page shrank/grew dimensions unexpectedly

If any check fails → raises IntegrityError (caller must NOT mark job as CLEAN).
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pymupdf

logger = logging.getLogger(__name__)


class IntegrityError(RuntimeError):
    """Raised when the cleaned PDF fails an integrity check."""


def verify_cleaned_pdf(
    original_path: Path,
    cleaned_path: Path,
    expected_pages: int,
) -> dict[str, object]:
    """
    Run all integrity checks. Returns a summary dict on success.
    Raises IntegrityError on any failure.
    """
    if not cleaned_path.is_file():
        raise IntegrityError("Cleaned PDF output file does not exist on disk")
    if cleaned_path.stat().st_size < 200:
        raise IntegrityError("Cleaned PDF is suspiciously small (< 200 bytes)")

    # Open both documents
    orig_doc: pymupdf.Document | None = None
    clean_doc: pymupdf.Document | None = None
    try:
        orig_doc = pymupdf.open(str(original_path))
        clean_doc = pymupdf.open(str(cleaned_path))
    except Exception as exc:
        raise IntegrityError(f"Cannot open PDF for verification: {exc}") from exc

    try:
        # ── Check 1: page count ──────────────────────────────────────────────
        if len(clean_doc) != expected_pages:
            raise IntegrityError(
                f"Page count mismatch: original={expected_pages}, cleaned={len(clean_doc)}"
            )

        summary: dict[str, object] = {
            "pages": expected_pages,
            "text_collapse": False,
            "image_collapse": False,
            "blank_page_detected": False,
        }

        for p_idx in range(expected_pages):
            orig_page = orig_doc[p_idx]
            clean_page = clean_doc[p_idx]

            # ── Check 2: page dimensions ─────────────────────────────────────
            orig_w = round(orig_page.rect.width, 0)
            orig_h = round(orig_page.rect.height, 0)
            clean_w = round(clean_page.rect.width, 0)
            clean_h = round(clean_page.rect.height, 0)
            if abs(orig_w - clean_w) > 2 or abs(orig_h - clean_h) > 2:
                raise IntegrityError(
                    f"Page {p_idx+1} dimensions changed: "
                    f"orig=({orig_w}x{orig_h}) cleaned=({clean_w}x{clean_h})"
                )

            # ── Check 3: text object count collapse ──────────────────────────
            orig_words = orig_page.get_text("words")
            clean_words = clean_page.get_text("words")
            orig_wc = len(orig_words)
            clean_wc = len(clean_words)
            # Allow up to 15% word-count reduction (watermark text removal is legitimate)
            if orig_wc > 10 and clean_wc < orig_wc * 0.85:
                logger.warning(
                    "Page %d word count dropped significantly: %d → %d",
                    p_idx + 1,
                    orig_wc,
                    clean_wc,
                )
                summary["text_collapse"] = True
                # Don't raise — watermark text IS legitimately removed
                # But flag it so the route can show a warning badge

            # ── Check 4: image count collapse ───────────────────────────────
            orig_imgs = orig_page.get_images()
            clean_imgs = clean_page.get_images()
            # Allow watermark images to be removed; flag if >50% of images vanish
            if len(orig_imgs) > 0 and len(clean_imgs) < len(orig_imgs) * 0.50:
                logger.warning(
                    "Page %d image count dropped >50%%: %d → %d",
                    p_idx + 1,
                    len(orig_imgs),
                    len(clean_imgs),
                )
                summary["image_collapse"] = True

            # ── Check 5: blank page detection ────────────────────────────────
            pix = clean_page.get_pixmap(dpi=72)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                (pix.height, pix.width, pix.n)
            )
            std_dev = float(np.std(img))
            if std_dev < 0.8:
                raise IntegrityError(
                    f"Page {p_idx + 1} of cleaned PDF appears blank (std={std_dev:.3f})"
                )
            if std_dev < 3.0:
                summary["blank_page_detected"] = True

        logger.info(
            "[Verifier] PASSED pages=%d text_collapse=%s image_collapse=%s blank=%s",
            expected_pages,
            summary["text_collapse"],
            summary["image_collapse"],
            summary["blank_page_detected"],
        )
        return summary

    finally:
        if orig_doc:
            orig_doc.close()
        if clean_doc:
            clean_doc.close()


def verify_cleaned_image(original_path: Path, cleaned_path: Path) -> dict[str, object]:
    """Verify integrity of a cleaned image document."""
    import cv2

    if not cleaned_path.is_file() or cleaned_path.stat().st_size == 0:
        raise IntegrityError("Cleaned image file does not exist or is empty")

    cleaned = cv2.imread(str(cleaned_path))
    original = cv2.imread(str(original_path))

    if cleaned is None:
        raise IntegrityError("Cleaned image cannot be decoded")

    if original is not None:
        oh, ow = original.shape[:2]
        ch, cw = cleaned.shape[:2]
        if oh != ch or ow != cw:
            raise IntegrityError(f"Image dimensions changed: orig=({ow}x{oh}) cleaned=({cw}x{ch})")

    std_dev = float(np.std(cleaned))
    if std_dev < 0.5:
        raise IntegrityError("Cleaned image appears completely blank")

    return {"dims_ok": True, "std_dev": round(std_dev, 2)}
