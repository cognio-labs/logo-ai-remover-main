"""Automatic PDF analysis and conservative watermark removal for Bellix."""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path
from typing import Any, Callable, Iterable, Optional

import cv2
import numpy as np
import pymupdf
from PIL import Image, ImageOps
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ContentStream, NameObject, TextStringObject

WATERMARK_KEYWORDS = re.compile(
    r"\b(DRAFT|CONFIDENTIAL|SAMPLE|PREVIEW|COPY|WATERMARK|PAID|VOID|TRIAL|DUPLICATE|TEST|DEMO)\b",
    re.IGNORECASE,
)


def _is_watermark_text(text: str, size: float) -> bool:
    cleaned = " ".join(text.split())
    return size >= 20 and len(cleaned) < 160 and bool(WATERMARK_KEYWORDS.search(cleaned))


def _native_regions(page: pymupdf.Page, page_number: int) -> list[dict[str, Any]]:
    regions: list[dict[str, Any]] = []
    for span in page.get_texttrace():
        text = "".join(chr(char[0]) for char in span.get("chars", ()))
        direction = span.get("dir", (1.0, 0.0))
        diagonal = abs(float(direction[1])) > 0.08
        opacity = float(span.get("opacity", 1.0))
        if _is_watermark_text(text, float(span.get("size", 0))) and (opacity < 0.92 or diagonal):
            x0, y0, x1, y1 = span["bbox"]
            regions.append({
                "x": x0 / page.rect.width, "y": y0 / page.rect.height,
                "width": (x1 - x0) / page.rect.width, "height": (y1 - y0) / page.rect.height,
                "page": page_number, "type": "native_text_watermark", "confidence": 0.98,
            })
    for annot in page.annots() or ():
        if annot.type[1] == "Watermark":
            rect = annot.rect
            regions.append({
                "x": rect.x0 / page.rect.width, "y": rect.y0 / page.rect.height,
                "width": rect.width / page.rect.width, "height": rect.height / page.rect.height,
                "page": page_number, "type": "watermark_annotation", "confidence": 1.0,
            })
    return regions


def _visual_mask(image_bgr: np.ndarray) -> tuple[np.ndarray, list[dict[str, Any]]]:
    """Find likely flattened translucent marks without selecting all document colour."""
    height, width = image_bgr.shape[:2]
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    saturation, value = hsv[:, :, 1], hsv[:, :, 2]
    chroma = ((saturation > 45) & (value > 115)).astype(np.uint8) * 255
    count, labels, stats, _ = cv2.connectedComponentsWithStats(chroma, 8)
    mask = np.zeros((height, width), np.uint8)
    for index in range(1, count):
        _, _, w, h, area = stats[index]
        if area >= max(20, height * width * 0.00002) and (w >= width * 0.015 or h >= height * 0.015):
            mask[labels == index] = 255
    kernel_size = max(13, int(min(height, width) * 0.035)) | 1
    top_hat = cv2.morphologyEx(
        gray, cv2.MORPH_TOPHAT,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size)),
    )
    light_strokes = ((top_hat > 42) & (value > 165)).astype(np.uint8) * 255
    mask = cv2.bitwise_or(mask, light_strokes)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)
    regions: list[dict[str, Any]] = []
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    for index in range(1, count):
        x, y, w, h, area = stats[index]
        if area >= 30:
            regions.append({
                "x": x / width, "y": y / height, "width": w / width, "height": h / height,
                "type": "flattened_watermark", "confidence": 0.72,
            })
    return mask, regions


def _manual_mask(shape: tuple[int, int], regions: Iterable[dict[str, Any]]) -> np.ndarray:
    height, width = shape
    mask = np.zeros((height, width), np.uint8)
    for region in regions:
        x0 = max(0, min(width, round(float(region["x"]) * width)))
        y0 = max(0, min(height, round(float(region["y"]) * height)))
        x1 = max(x0, min(width, round((float(region["x"]) + float(region["width"])) * width)))
        y1 = max(y0, min(height, round((float(region["y"]) + float(region["height"])) * height)))
        mask[y0:y1, x0:x1] = 255
    return mask


def detect_image_watermarks(
    image_bgr: np.ndarray, manual_regions: Optional[list[dict[str, Any]]] = None,
) -> tuple[np.ndarray, list[dict[str, Any]]]:
    mask, regions = _visual_mask(image_bgr)
    if manual_regions:
        mask = cv2.bitwise_or(mask, _manual_mask(image_bgr.shape[:2], manual_regions))
        regions.extend({**region, "type": "manual_selection", "confidence": 1.0} for region in manual_regions)
    return mask, regions


def _restore_overlay(image_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    if not np.any(mask):
        return image_bgr.copy()
    result = image_bgr.astype(np.float32).copy()
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    coloured = (mask > 0) & (hsv[:, :, 1] > 45)
    if np.any(coloured):
        observed = image_bgr[coloured].astype(np.float32)
        channel_max = observed.max(axis=1)
        channel_min = observed.min(axis=1)
        alpha = np.clip((channel_max - channel_min) / 255.0, 0.02, 0.92)
        ink = np.zeros_like(observed)
        ink[np.arange(len(observed)), np.argmax(observed, axis=1)] = 255.0
        restored = (observed - alpha[:, None] * ink) / np.maximum(1.0 - alpha[:, None], 0.08)
        result[coloured] = np.clip(restored, 0, 255)
    remaining = mask.copy()
    remaining[coloured] = 0
    if np.any(remaining):
        remaining = cv2.dilate(remaining, np.ones((3, 3), np.uint8), iterations=1)
        result = cv2.inpaint(result.astype(np.uint8), remaining, 3, cv2.INPAINT_TELEA).astype(np.float32)
    return np.clip(result, 0, 255).astype(np.uint8)


def clean_image(source_path: Path, output_path: Path, regions: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
    image = ImageOps.exif_transpose(Image.open(source_path)).convert("RGB")
    image_bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    automatic_mask, found = detect_image_watermarks(image_bgr)
    if np.any(automatic_mask):
        saturation = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)[:, :, 1]
        mask = cv2.bitwise_and(automatic_mask, (saturation > 45).astype(np.uint8) * 255)
    else:
        mask = _manual_mask(image_bgr.shape[:2], regions or [])
    if not np.any(mask):
        raise ValueError("No safely removable watermark was detected.")
    cleaned = _restore_overlay(image_bgr, mask)
    Image.fromarray(cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)).save(output_path, "PNG", compress_level=2)
    return {"method": "raster_inpainting", "detectedRegions": len(found), "restoredPixels": int(np.count_nonzero(mask))}


def detect_pdf(path: Path, page_number: int) -> list[dict[str, Any]]:
    with pymupdf.open(path) as document:
        if not 1 <= page_number <= len(document):
            return []
        page = document[page_number - 1]
        native = _native_regions(page, page_number)
        if native:
            return native
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
        image = np.frombuffer(pixmap.samples, np.uint8).reshape(pixmap.height, pixmap.width, 3)
        _, regions = _visual_mask(cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        return [{**region, "page": page_number} for region in regions]


def analyze_pdf(path: Path) -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    all_regions: list[dict[str, Any]] = []
    with pymupdf.open(path) as document:
        for index, page in enumerate(document):
            text_length = len(page.get_text("text").strip())
            drawings = len(page.get_drawings())
            images = len(page.get_images(full=True))
            regions = detect_pdf(path, index + 1)
            all_regions.extend(regions)
            pages.append({
                "page": index + 1, "selectableText": text_length > 20,
                "vectorObjects": drawings, "embeddedImages": images,
                "scanned": text_length <= 20 and images > 0, "watermarkCount": len(regions),
            })
    native = any(region["type"].startswith(("native", "watermark_")) for region in all_regions)
    return {
        "pageCount": len(pages), "selectableText": any(page["selectableText"] for page in pages),
        "vectorObjects": sum(page["vectorObjects"] for page in pages),
        "embeddedImages": sum(page["embeddedImages"] for page in pages),
        "scannedPages": sum(1 for page in pages if page["scanned"]),
        "watermarkCount": len(all_regions), "method": "native" if native else "raster",
        "pages": pages, "regions": all_regions,
    }


def _remove_native(source: Path, output: Path, page_indexes: list[int]) -> dict[str, Any]:
    reader = PdfReader(source)
    writer = PdfWriter()
    removed = 0

    def clean_stream(container: Any, resources: Any) -> ContentStream:
        nonlocal removed
        stream = ContentStream(container, reader)
        kept: list[tuple[Any, bytes]] = []
        block: Optional[list[tuple[Any, bytes]]] = None
        size, opacity, diagonal = 0.0, 1.0, False
        block_text, block_size, block_opacity, block_diagonal = "", 0.0, 1.0, False
        stack: list[tuple[float, float, bool]] = []
        for args, op in stream.operations:
            if op == b"q":
                stack.append((size, opacity, diagonal))
            elif op == b"Q" and stack:
                size, opacity, diagonal = stack.pop()
            elif op == b"gs":
                states = resources.get("/ExtGState", {})
                states = states.get_object() if hasattr(states, "get_object") else states
                state = states.get(args[0], {}) if states else {}
                state = state.get_object() if hasattr(state, "get_object") else state
                opacity = float(state.get("/ca", 1.0))
            elif op == b"cm":
                diagonal = diagonal or abs(float(args[1])) > 0.08 or abs(float(args[2])) > 0.08
            elif op == b"Tf":
                size = float(args[1])
            if op == b"BT":
                block = []
                block_text, block_size, block_opacity, block_diagonal = "", size, opacity, diagonal
            if block is not None:
                block.append((args, op))
                block_size, block_opacity = max(block_size, size), min(block_opacity, opacity)
                block_diagonal = block_diagonal or diagonal
                if op == b"Tm":
                    block_diagonal = block_diagonal or abs(float(args[1])) > 0.08 or abs(float(args[2])) > 0.08
                if op in (b"Tj", b"'", b'"') and args and isinstance(args[-1], TextStringObject):
                    block_text += str(args[-1])
                elif op == b"TJ":
                    block_text += "".join(str(item) for item in args[0] if isinstance(item, TextStringObject))
                if op == b"ET":
                    if _is_watermark_text(block_text, block_size) and (block_opacity < 0.92 or block_diagonal):
                        removed += 1
                    else:
                        kept.extend(block)
                    block = None
            else:
                kept.append((args, op))
        stream.operations = kept
        return stream

    for index in page_indexes:
        page = reader.pages[index]
        if page.get_contents() is not None:
            page.replace_contents(clean_stream(page.get_contents(), page.get("/Resources", {})))
        if "/Annots" in page:
            retained = []
            for ref in page["/Annots"]:
                if ref.get_object().get("/Subtype") == "/Watermark":
                    removed += 1
                else:
                    retained.append(ref)
            page[NameObject("/Annots")] = ArrayObject(retained)
        writer.add_page(page)
    if removed == 0:
        raise ValueError("No native watermark layer found.")
    with output.open("wb") as handle:
        writer.write(handle)
    return {"method": "native_object_removal", "removedObjects": removed}


def _remove_raster(
    source: Path, output: Path, page_indexes: list[int], regions: Optional[list[dict[str, Any]]],
    progress_cb: Optional[Callable[[int, str], None]],
) -> dict[str, Any]:
    document, result, restored = pymupdf.open(source), pymupdf.open(), 0
    try:
        for position, index in enumerate(page_indexes):
            page = document[index]
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), alpha=False)
            rgb = np.frombuffer(pixmap.samples, np.uint8).reshape(pixmap.height, pixmap.width, 3)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            page_regions = [region for region in (regions or []) if int(region.get("page", index + 1)) == index + 1]
            mask, _ = detect_image_watermarks(bgr, page_regions or None)
            if not np.any(mask):
                raise ValueError(f"No safely removable watermark was detected on page {index + 1}.")
            cleaned = _restore_overlay(bgr, mask)
            restored += int(np.count_nonzero(mask))
            ok, encoded = cv2.imencode(".png", cleaned, [cv2.IMWRITE_PNG_COMPRESSION, 3])
            if not ok:
                raise RuntimeError(f"Could not encode cleaned page {index + 1}.")
            new_page = result.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=encoded.tobytes())
            if progress_cb:
                progress_cb(35 + round(50 * (position + 1) / len(page_indexes)), f"Reconstructing page {position + 1} of {len(page_indexes)}")
        result.save(output, deflate=True)
    finally:
        document.close()
        result.close()
    return {"method": "high_resolution_inpainting", "pagesCleaned": len(page_indexes), "restoredPixels": restored}


def characters(path: Path, exclude_watermarks: bool = False) -> Counter[str]:
    text = ""
    with pymupdf.open(path) as document:
        for page in document:
            for line in page.get_text("text").splitlines():
                if not (exclude_watermarks and WATERMARK_KEYWORDS.search(line)):
                    text += line
    return Counter(text)


def clean_pdf(
    source: Path, output: Path, progress_cb: Optional[Callable[[int, str], None]] = None,
    manual_regions: Optional[list[dict[str, Any]]] = None, scope: str = "full",
) -> dict[str, Any]:
    with pymupdf.open(source) as document:
        page_indexes = [0] if scope == "first" else list(range(len(document)))
    if progress_cb:
        progress_cb(18, "Detecting watermarks")
    try:
        details = _remove_native(source, output, page_indexes)
    except ValueError:
        with pymupdf.open(source) as document:
            raster_pages = [
                index for index in page_indexes
                if len(document[index].get_text("text").strip()) <= 20
                and len(document[index].get_images(full=True)) > 0
            ]
        if len(raster_pages) != len(page_indexes):
            raise ValueError("No safely removable watermark layer was found.")
        if progress_cb:
            progress_cb(30, "Removing flattened watermark pixels")
        details = _remove_raster(source, output, page_indexes, manual_regions, progress_cb)
    with pymupdf.open(output) as cleaned:
        if len(cleaned) != len(page_indexes):
            raise RuntimeError("Processed PDF page count verification failed.")
    if progress_cb:
        progress_cb(92, "Preparing clean preview")
    return {**details, "scope": scope, "pageCount": len(page_indexes)}
