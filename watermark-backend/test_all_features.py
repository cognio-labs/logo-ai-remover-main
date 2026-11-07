"""Full test of the upgraded Bellix PDF & Image Watermark Remover."""
import requests
import time
import cv2
import numpy as np
import pymupdf

API = "http://127.0.0.1:5000"

# 1. Create synthetic test document image with blue diagonal 'Sample' watermark
h, w = 900, 650
doc_img = np.full((h, w, 3), 255, dtype=np.uint8)
for y in range(80, 800, 35):
    cv2.putText(doc_img, "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", (40, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (25, 25, 25), 1, cv2.LINE_AA)
overlay = doc_img.copy()
cv2.putText(overlay, "Sample", (120, 500), cv2.FONT_HERSHEY_SIMPLEX, 4.0, (190, 80, 40), 8, cv2.LINE_AA)
watermarked_img = cv2.addWeighted(overlay, 0.45, doc_img, 0.55, 0)
cv2.imwrite("test_sample_image.png", watermarked_img)

# 2. Create scanned PDF (embed image into PDF)
scanned_pdf = pymupdf.open()
img_doc = pymupdf.open("test_sample_image.png")
rect = img_doc[0].rect
pdfbytes = img_doc.convert_to_pdf()
img_pdf = pymupdf.open("pdf", pdfbytes)
page = scanned_pdf.new_page(width=rect.width, height=rect.height)
page.show_pdf_page(rect, img_pdf, 0)
scanned_pdf.save("test_scanned_pdf.pdf")
scanned_pdf.close()
img_doc.close()

# 3. Create High-Res 2400x1800 Image
hi_res = np.full((1800, 2400, 3), 245, dtype=np.uint8)
cv2.putText(hi_res, "OFFICIAL CERTIFICATE", (600, 400), cv2.FONT_HERSHEY_SIMPLEX, 2.5, (30, 30, 30), 4)
cv2.putText(hi_res, "CONFIDENTIAL", (400, 1100), cv2.FONT_HERSHEY_SIMPLEX, 5.0, (50, 50, 220), 12, cv2.LINE_AA)
cv2.imwrite("test_hi_res.jpg", hi_res, [int(cv2.IMWRITE_JPEG_QUALITY), 95])


def test_clean(file_path, file_name, is_pdf=False):
    with open(file_path, "rb") as f:
        up = requests.post(
            f"{API}/api/pdf/upload",
            files={"file": (file_name, f, "application/pdf" if is_pdf else "image/png")},
        ).json()
    job_id = up["jobId"]
    print(f"Uploaded {file_name}: jobId={job_id}")

    # Process without manual regions (AUTO DETECTION)
    proc = requests.post(f"{API}/api/pdf/process/{job_id}", data={"manualRegions": "[]"}).json()
    assert proc.get("success"), f"Process failed to trigger: {proc}"

    # Poll status
    for _ in range(30):
        st = requests.get(f"{API}/api/pdf/status/{job_id}").json()
        if st["status"] in ("completed", "failed"):
            break
        time.sleep(1)

    print(f"Status for {file_name}: {st['status']} ({st.get('stage')})")
    assert st["status"] == "completed", f"Failed: {st.get('error')}"

    # Download
    dl = requests.get(f"{API}/api/pdf/download/{job_id}")
    assert dl.status_code == 200 and len(dl.content) > 1000
    print(f"Downloaded {file_name}: {len(dl.content):,} bytes")
    return dl.content


print("--- 1. Testing Diagonal Watermark Image ('Sample') ---")
c1 = test_clean("test_sample_image.png", "test_sample_image.png", is_pdf=False)

print("\n--- 2. Testing Native Vector PDF (invoice-before.pdf) ---")
c2 = test_clean(
    "D:/logo-ai-remover-main/logo-ai-remover-main/public/documents/invoice-before.pdf",
    "invoice-before.pdf",
    is_pdf=True,
)

print("\n--- 3. Testing Scanned PDF (test_scanned_pdf.pdf) ---")
c3 = test_clean("test_scanned_pdf.pdf", "test_scanned_pdf.pdf", is_pdf=True)

print("\n--- 4. Testing High-Res 2400x1800 Image ---")
c4 = test_clean("test_hi_res.jpg", "test_hi_res.jpg", is_pdf=False)
with open("cleaned_hi_res.png", "wb") as f:
    f.write(c4)
img = cv2.imread("cleaned_hi_res.png")
assert img.shape[:2] == (1800, 2400), f"Size mismatch: {img.shape}"
print(f"Verified 100% resolution preserved: {img.shape[1]}x{img.shape[0]}")

print("\n>>> ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS! <<<")
