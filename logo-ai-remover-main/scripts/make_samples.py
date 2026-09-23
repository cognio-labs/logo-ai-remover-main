import pymupdf
from pathlib import Path

samples_dir = Path("public/samples")
samples_dir.mkdir(parents=True, exist_ok=True)

# 1. Sample Invoice
doc = pymupdf.open()
page = doc.new_page(width=600, height=800)
page.insert_text((50, 60), "GLOBAL LOGISTICS & ACCOUNTS CORP", fontsize=18, fontname="helv", color=(0.1, 0.1, 0.1))
page.insert_text((50, 80), "Document Ref: #PR-2026-8942 · Status: Commercial Invoice", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
page.draw_line((50, 95), (550, 95), color=(0.8, 0.8, 0.8), width=1)

page.insert_text((50, 140), "Billed To: ACME Industrial Supplies Ltd.", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
page.insert_text((50, 160), "Item Description: Enterprise Cloud Infrastructure & Logistics Services", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
page.insert_text((50, 210), "Subtotal: $14,850.00    VAT / Tax: $1,485.00    Total Due: $16,335.00", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))

# Watermark banner in center
banner_rect = pymupdf.Rect(65, 330, 535, 395)
page.draw_rect(banner_rect, fill=(0.95, 0.88, 0.90), color=(0.88, 0.20, 0.35), width=1.5)
page.insert_text((95, 372), "PAID · SAMPLE COPY · DO NOT DUPLICATE", fontsize=18, fontname="helv", color=(0.82, 0.15, 0.30))
annot = page.add_highlight_annot(banner_rect)
annot.set_colors(stroke=(1, 0, 0))
annot.update()

page.insert_text((50, 720), "Authorized Signature: Validated Digitally", fontsize=10, fontname="helv", color=(0.5, 0.5, 0.5))
page.insert_text((500, 720), "Page 1 of 1", fontsize=10, fontname="helv", color=(0.5, 0.5, 0.5))
doc.save(str(samples_dir / "sample_invoice.pdf"))
doc.close()

# 2. Sample NDA
doc = pymupdf.open()
page = doc.new_page(width=600, height=800)
page.insert_text((50, 60), "MUTUAL NON-DISCLOSURE AGREEMENT", fontsize=16, fontname="helv", color=(0.1, 0.1, 0.1))
page.insert_text((50, 80), "Standard Corporate Confidentiality Framework - Version 4.2", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
page.draw_line((50, 95), (550, 95), color=(0.8, 0.8, 0.8), width=1)

page.insert_text((50, 130), "1. DEFINITION OF CONFIDENTIAL INFORMATION", fontsize=11, fontname="helv", color=(0.15, 0.15, 0.15))
page.insert_text((50, 150), "The receiving party agrees to hold in strict confidence all proprietary technical data,", fontsize=10, fontname="helv", color=(0.3, 0.3, 0.3))
page.insert_text((50, 170), "source code architectures, business plans, and commercial contracts shared hereunder.", fontsize=10, fontname="helv", color=(0.3, 0.3, 0.3))

page.insert_text((50, 210), "2. NON-CIRCUMVENTION AND TERM", fontsize=11, fontname="helv", color=(0.15, 0.15, 0.15))
page.insert_text((50, 230), "The obligations of non-disclosure shall survive for five (5) years from execution date.", fontsize=10, fontname="helv", color=(0.3, 0.3, 0.3))

# Center watermark
banner_rect = pymupdf.Rect(75, 340, 525, 410)
page.draw_rect(banner_rect, fill=(0.96, 0.88, 0.90), color=(0.85, 0.20, 0.30), width=1.5)
page.insert_text((135, 385), "CONFIDENTIAL · EVALUATION COPY ONLY", fontsize=17, fontname="helv", color=(0.82, 0.15, 0.28))
annot = page.add_highlight_annot(banner_rect)
annot.set_colors(stroke=(1, 0, 0))
annot.update()

page.insert_text((50, 720), "Executed by Authorized Officers of Both Parties", fontsize=10, fontname="helv", color=(0.5, 0.5, 0.5))
page.insert_text((500, 720), "Page 1 of 1", fontsize=10, fontname="helv", color=(0.5, 0.5, 0.5))
doc.save(str(samples_dir / "sample_nda.pdf"))
doc.close()

# 3. Sample Blueprint
doc = pymupdf.open()
page = doc.new_page(width=800, height=600)
page.insert_text((50, 45), "METROPOLITAN RESIDENCE — STRUCTURAL ELEVATION", fontsize=15, fontname="helv", color=(0.1, 0.1, 0.1))
page.insert_text((50, 65), "Architectural Sheet A-102 · Scale: 1/4 in = 1 ft · Revision B", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
page.draw_rect(pymupdf.Rect(50, 85, 750, 530), color=(0.2, 0.4, 0.7), width=1)
for x in range(100, 750, 80):
    page.draw_line((x, 85), (x, 530), color=(0.85, 0.90, 0.96), width=0.5)
for y in range(120, 530, 60):
    page.draw_line((50, y), (750, y), color=(0.85, 0.90, 0.96), width=0.5)

banner_rect = pymupdf.Rect(180, 260, 620, 330)
page.draw_rect(banner_rect, fill=(0.95, 0.88, 0.90), color=(0.85, 0.20, 0.30), width=1.5)
page.insert_text((220, 305), "TRIAL EVALUATION · NOT FOR CONSTRUCTION", fontsize=16, fontname="helv", color=(0.82, 0.15, 0.28))
annot = page.add_highlight_annot(banner_rect)
annot.set_colors(stroke=(1, 0, 0))
annot.update()

doc.save(str(samples_dir / "sample_blueprint.pdf"))
doc.close()
print("Generated all 3 sample PDFs successfully")
