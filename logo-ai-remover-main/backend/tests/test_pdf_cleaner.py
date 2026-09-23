import io
import time
from uuid import uuid4
import cv2
import numpy as np
from PIL import Image
import pymupdf
import pytest

from backend.models.pdf_job import PdfJobStatus
from backend.services.pdf_job_service import pdf_job_service


def create_sample_pdf_bytes(pages: int = 1, text: str = "GLOBAL LOGISTICS & ACCOUNTS CORP") -> bytes:
    doc = pymupdf.open()
    for i in range(pages):
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), f"{text} - Page {i + 1}", fontsize=14, color=(0, 0, 0))
        page.insert_text((50, 120), "Invoice Ref #INV-2026-9901 | Subtotal: $14,850.00", fontsize=11, color=(0.2, 0.2, 0.2))
        page.insert_text((50, 160), "Commercial agreement terms and confidential specifications.", fontsize=10, color=(0.3, 0.3, 0.3))
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def create_pdf_with_blue_marker_bytes() -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 100), "CONFIDENTIAL AGREEMENT AND RESTRICTED DATA", fontsize=16, color=(0, 0, 0))
    # Draw blue marker-like rectangle over text
    rect = pymupdf.Rect(45, 88, 480, 112)
    # PyMuPDF highlight annotation simulates blue marker
    annot = page.add_highlight_annot(rect)
    annot.set_colors(stroke=(0.1, 0.4, 0.95))  # Blue stroke
    annot.update()
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def create_sample_image_document_bytes() -> bytes:
    # 400x300 document image with header, content, and a blue marker stroke
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    cv2.putText(img, "STATEMENT OF ACCOUNT", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "ACCOUNT BALANCE: $4,500.00", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "DATE: 2026-09-21 · STATUS: VERIFIED", (30, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (60, 60, 60), 1)
    # Add blue marker stroke over middle balance line
    overlay = img.copy()
    cv2.line(overlay, (25, 115), (375, 115), (235, 120, 20), 22)  # BGR blue
    cv2.addWeighted(overlay, 0.5, img, 0.5, 0, img)
    
    success, enc = cv2.imencode(".png", img)
    return enc.tobytes()


def test_pdf_upload_and_preview(client):
    pdf_bytes = create_sample_pdf_bytes(pages=2)
    job_id = str(uuid4())

    response = client.post(
        "/api/pdf/upload",
        data={"jobId": job_id},
        files={"file": ("invoice.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["jobId"] == job_id
    assert data["pageCount"] == 2
    assert data["isPdf"] is True

    # Test preview of page 1
    prev_res = client.get(f"/api/pdf/preview/{job_id}/1?type=original")
    assert prev_res.status_code == 200
    assert prev_res.headers["content-type"] == "image/png"
    assert len(prev_res.content) > 1000


def test_pdf_cleaner_e2e_processing(client):
    pdf_bytes = create_pdf_with_blue_marker_bytes()
    job_id = str(uuid4())

    # 1. Upload
    up_res = client.post(
        "/api/pdf/upload",
        data={"jobId": job_id},
        files={"file": ("marked_doc.pdf", pdf_bytes, "application/pdf")},
    )
    assert up_res.status_code == 200

    # 2. Detect
    det_res = client.post(f"/api/pdf/detect/{job_id}?page=1")
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert det_data["success"] is True

    # 3. Process
    proc_res = client.post(
        f"/api/pdf/process/{job_id}",
        data={
            "mode": "balanced",
            "removeAnnotations": "true",
            "removeBlueMarker": "true",
        },
    )
    assert proc_res.status_code == 200
    assert proc_res.json()["status"] == "queued"

    # 4. Poll status
    completed = False
    for _ in range(40):
        stat_res = client.get(f"/api/pdf/status/{job_id}")
        assert stat_res.status_code == 200
        status_data = stat_res.json()
        if status_data["status"] == PdfJobStatus.COMPLETED:
            completed = True
            break
        elif status_data["status"] == PdfJobStatus.FAILED:
            assert False, f"Job failed: {status_data.get('error')}"
        time.sleep(0.1)

    assert completed is True

    # 5. Result
    res = client.get(f"/api/pdf/result/{job_id}")
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["status"] == "completed"
    assert res_json["pageCount"] == 1

    # 6. Download
    dl_res = client.get(f"/api/pdf/download/{job_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")

    # Verify cleaned PDF with PyMuPDF
    doc = pymupdf.open(stream=dl_res.content, filetype="pdf")
    assert len(doc) == 1
    # Check that annotations were stripped
    annots = list(doc[0].annots())
    assert len(annots) == 0
    doc.close()


def test_pdf_job_isolation(client):
    doc_a = create_sample_pdf_bytes(1, "Document A")
    doc_b = create_sample_pdf_bytes(2, "Document B")

    id_a = str(uuid4())
    id_b = str(uuid4())

    res_a = client.post("/api/pdf/upload", data={"jobId": id_a}, files={"file": ("docA.pdf", doc_a, "application/pdf")})
    res_b = client.post("/api/pdf/upload", data={"jobId": id_b}, files={"file": ("docB.pdf", doc_b, "application/pdf")})
    assert res_a.status_code == 200
    assert res_b.status_code == 200

    job_a = pdf_job_service.get(id_a)
    job_b = pdf_job_service.get(id_b)
    assert job_a.original_path != job_b.original_path
    assert job_a.page_count == 1
    assert job_b.page_count == 2


def test_image_document_cleaning(client):
    img_bytes = create_sample_image_document_bytes()
    job_id = str(uuid4())

    up_res = client.post(
        "/api/pdf/upload",
        data={"jobId": job_id},
        files={"file": ("scan.png", img_bytes, "image/png")},
    )
    assert up_res.status_code == 200
    assert up_res.json()["isPdf"] is False

    proc_res = client.post(
        f"/api/pdf/process/{job_id}",
        data={"mode": "balanced", "removeBlueMarker": "true"},
    )
    assert proc_res.status_code == 200

    completed = False
    for _ in range(30):
        stat = client.get(f"/api/pdf/status/{job_id}").json()
        if stat["status"] == PdfJobStatus.COMPLETED:
            completed = True
            break
        time.sleep(0.1)

    assert completed is True
    dl = client.get(f"/api/pdf/download/{job_id}")
    assert dl.status_code == 200
    assert dl.headers["content-type"] == "image/png"
