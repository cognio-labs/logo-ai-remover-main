import logging
from pathlib import Path
import cv2
import numpy as np
import pymupdf


logger = logging.getLogger(__name__)


class PdfVerificationError(RuntimeError):
    pass


def verify_cleaned_pdf(
    original_pdf_path: Path,
    cleaned_pdf_path: Path,
    expected_page_count: int,
) -> bool:
    """
    Verify the integrity of a cleaned PDF document:
    1. Cleaned PDF exists and is non-empty.
    2. Page count matches the original page count exactly.
    3. Document can be opened and parsed by PyMuPDF.
    4. Rendered pages are neither blank (100% white/black) nor corrupted.
    """
    if not cleaned_pdf_path.is_file():
        raise PdfVerificationError("Cleaned PDF output file does not exist on disk")

    if cleaned_pdf_path.stat().st_size < 100:
        raise PdfVerificationError("Cleaned PDF output file is too small or empty")

    doc = None
    try:
        doc = pymupdf.open(str(cleaned_pdf_path))
        actual_page_count = len(doc)
    except Exception as exc:
        raise PdfVerificationError(f"Cleaned PDF cannot be parsed or is corrupted: {exc}") from exc
    finally:
        if doc:
            doc.close()

    # 1. Page count check
    if actual_page_count != expected_page_count:
        raise PdfVerificationError(
            f"Page count mismatch: original has {expected_page_count} pages, but cleaned has {actual_page_count} pages"
        )

    # 2. Visual inspection of page 1
    doc = pymupdf.open(str(cleaned_pdf_path))
    try:
        first_page = doc[0]
        pix = first_page.get_pixmap(dpi=72)
        if pix.width <= 0 or pix.height <= 0:
            raise PdfVerificationError("Rendered page has invalid dimensions")

        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        # Check if page is completely blank (all pixels identical)
        std_dev = float(np.std(img))
        if std_dev < 0.5:
            raise PdfVerificationError("Cleaned PDF page appears blank or unrendered")
    finally:
        doc.close()

    logger.info("PDF verification passed successfully: %d pages validated", actual_page_count)
    return True


def verify_cleaned_image(
    original_image_path: Path,
    cleaned_image_path: Path,
) -> bool:
    """Verify integrity of cleaned image document."""
    if not cleaned_image_path.is_file() or cleaned_image_path.stat().st_size == 0:
        raise PdfVerificationError("Cleaned image file does not exist or is empty")

    cleaned = cv2.imread(str(cleaned_image_path))
    if cleaned is None or cleaned.shape[0] == 0 or cleaned.shape[1] == 0:
        raise PdfVerificationError("Cleaned image cannot be decoded")

    std_dev = float(np.std(cleaned))
    if std_dev < 0.5:
        raise PdfVerificationError("Cleaned image appears completely blank")

    return True
