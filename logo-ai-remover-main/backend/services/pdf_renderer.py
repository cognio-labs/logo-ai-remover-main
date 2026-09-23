import logging
from pathlib import Path
import cv2
import numpy as np
import pymupdf


logger = logging.getLogger(__name__)


def render_page_to_bgr(page: pymupdf.Page, dpi: int = 150) -> np.ndarray:
    """Render a PyMuPDF page to an OpenCV BGR numpy image array."""
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)

    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
    if pix.n == 4:
        bgr = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    elif pix.n == 3:
        # PyMuPDF samples are RGB
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    elif pix.n == 1:
        bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    else:
        bgr = img
    return bgr


def render_page_to_jpeg_bytes(page: pymupdf.Page, dpi: int = 150, quality: int = 88) -> bytes:
    """Render a PyMuPDF page directly to JPEG bytes (for AI detection or web preview)."""
    bgr = render_page_to_bgr(page, dpi=dpi)
    success, encoded = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        raise RuntimeError("Failed to encode rendered PDF page as JPEG")
    return encoded.tobytes()


def render_pdf_page_preview_file(
    pdf_path: Path,
    page_num: int,
    output_png: Path,
    dpi: int = 150,
) -> Path:
    """Render a specific page from a PDF file directly to a PNG preview on disk."""
    doc = pymupdf.open(str(pdf_path))
    try:
        idx = max(0, min(len(doc) - 1, page_num - 1))
        page = doc[idx]
        bgr = render_page_to_bgr(page, dpi=dpi)
        output_png.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_png), bgr, [cv2.IMWRITE_PNG_COMPRESSION, 4])
        return output_png
    finally:
        doc.close()


def render_image_preview_file(
    image_path: Path,
    output_png: Path,
) -> Path:
    """Prepare a preview for an uploaded image file."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Cannot read image file at {image_path}")
    output_png.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_png), img, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    return output_png
