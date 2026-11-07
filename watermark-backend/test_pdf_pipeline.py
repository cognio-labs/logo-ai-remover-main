import io
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pymupdf
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas

from pdf_api import router
from pdf_engine import characters


def make_pdf(mark=True, pages=2):
    buffer=io.BytesIO()
    c=canvas.Canvas(buffer)
    for i in range(pages):
        c.setFont('Helvetica',12)
        c.drawString(50,750,f'Invoice line {i+1}: pay $123.45. Original text remains.')
        # A legitimate opaque heading using a watermark keyword must survive.
        c.setFont('Helvetica-Bold',32);c.drawString(50,690,'CONFIDENTIAL')
        if mark:
            c.saveState();c.setFillAlpha(.2);c.translate(280,400);c.rotate(35)
            c.setFont('Helvetica-Bold',60);c.drawCentredString(0,0,'DRAFT');c.restoreState()
        c.showPage()
    c.save();return buffer.getvalue()


class DocumentPipelineTests(unittest.TestCase):
    def setUp(self):
        app=FastAPI();app.include_router(router);self.client=TestClient(app)

    def upload(self, data, name='test.pdf'):
        response=self.client.post('/api/pdf/upload',files={'file':(name,data)})
        self.assertEqual(response.status_code,200,response.text)
        return response.json()['jobId']

    def test_pdf_upload_detect_process_download_reopen_preserves_content(self):
        original=make_pdf();job=self.upload(original)
        detected=self.client.post(f'/api/pdf/detect/{job}?page=1').json()
        self.assertEqual(len(detected['regions']),1)
        self.assertEqual(self.client.get(f'/api/pdf/download/{job}').status_code,409)
        self.assertEqual(self.client.post(f'/api/pdf/process/{job}').status_code,200)
        state=self.client.get(f'/api/pdf/status/{job}').json()
        self.assertEqual(state['status'],'completed',state)
        cleaned=self.client.get(f'/api/pdf/download/{job}')
        self.assertEqual(cleaned.headers['content-type'],'application/pdf')
        with tempfile.TemporaryDirectory() as tmp:
            a,b=Path(tmp)/'a.pdf',Path(tmp)/'b.pdf';a.write_bytes(original);b.write_bytes(cleaned.content)
            self.assertFalse(characters(a,True)-characters(b))
        with pymupdf.open(stream=cleaned.content,filetype='pdf') as doc:
            self.assertEqual(len(doc),2)
            for p in doc:
                self.assertNotIn('DRAFT',p.get_text());self.assertIn('CONFIDENTIAL',p.get_text())
                self.assertIn('$123.45',p.get_text())
            rendered=doc[1].get_pixmap(matrix=pymupdf.Matrix(1.5,1.5),alpha=False).tobytes('png')
        preview=self.client.get(f'/api/pdf/preview/{job}/2?type=cleaned')
        self.assertEqual(preview.content,rendered)

    def test_automatic_analysis_and_free_first_page_are_real_pdf_outputs(self):
        job = self.upload(make_pdf(pages=3), "three-pages.pdf")
        analysis = self.client.post(f"/api/pdf/analyze/{job}")
        self.assertEqual(analysis.status_code, 200, analysis.text)
        report = analysis.json()
        self.assertEqual(report["pageCount"], 3)
        self.assertTrue(report["selectableText"])
        self.assertEqual(report["watermarkCount"], 3)

        started = self.client.post(f"/api/pdf/process/{job}", data={"scope": "first"})
        self.assertEqual(started.status_code, 200, started.text)
        cleaned = self.client.get(f"/api/pdf/download/{job}")
        with pymupdf.open(stream=cleaned.content, filetype="pdf") as document:
            self.assertEqual(len(document), 1)
            self.assertNotIn("DRAFT", document[0].get_text())
            self.assertIn("Original text remains.", document[0].get_text())

        restarted = self.client.post(f"/api/pdf/process/{job}", data={"scope": "full"})
        self.assertEqual(restarted.status_code, 200, restarted.text)
        full = self.client.get(f"/api/pdf/download/{job}")
        with pymupdf.open(stream=full.content, filetype="pdf") as document:
            self.assertEqual(len(document), 3)
            self.assertTrue(all("DRAFT" not in page.get_text() for page in document))

    def test_unchanged_document_is_not_called_cleaned(self):
        job=self.upload(make_pdf(mark=False));self.client.post(f'/api/pdf/process/{job}')
        self.assertEqual(self.client.get(f'/api/pdf/status/{job}').json()['status'],'failed')
        self.assertEqual(self.client.get(f'/api/pdf/download/{job}').status_code,409)

    def test_image_translucent_mark_restores_original_grayscale_text(self):
        base=Image.new('RGB',(360,180),'white');ImageDraw.Draw(base).text((40,70),'Original words 12345',fill='black')
        original=np.array(base);marked=original.copy();marked[50:110,25:300]=(marked[50:110,25:300]*.6+np.array([255,0,0])*.4).round().astype(np.uint8)
        buf=io.BytesIO();Image.fromarray(marked).save(buf,format='PNG')
        job=self.upload(buf.getvalue(),'scan.png')
        region='[{"x":0,"y":0,"width":1,"height":1}]'
        self.client.post(f'/api/pdf/process/{job}',data={'manualRegions':region})
        status=self.client.get(f'/api/pdf/status/{job}').json()
        self.assertEqual(status['status'],'completed',status)
        downloaded=self.client.get(f'/api/pdf/download/{job}')
        restored=np.array(Image.open(io.BytesIO(downloaded.content)))
        self.assertEqual(restored.shape,original.shape)
        self.assertLessEqual(np.abs(restored.astype(float)-original).max(),1)
        np.testing.assert_array_equal(restored[:50],original[:50])

    def test_invalid_file_page_limit_and_isolation(self):
        self.assertEqual(self.client.post('/api/pdf/upload',files={'file':('bad.pdf',b'not pdf')}).status_code,422)
        self.assertEqual(self.client.post('/api/pdf/upload',files={'file':('large.pdf',make_pdf(pages=26))}).status_code,422)
        self.assertEqual(self.client.get('/api/pdf/download/not-a-job').status_code,404)
        a,b=self.upload(make_pdf()),self.upload(make_pdf(False))
        self.client.post(f'/api/pdf/process/{a}')
        self.assertEqual(self.client.get(f'/api/pdf/download/{b}').status_code,409)
        self.assertEqual(self.client.post(f'/api/pdf/detect/{a}?page=3').status_code,422)
        self.assertEqual(self.client.post(f'/api/pdf/process/{b}',data={'manualRegions':'[{"x":-1}]'}).status_code,422)


if __name__=='__main__': unittest.main()
