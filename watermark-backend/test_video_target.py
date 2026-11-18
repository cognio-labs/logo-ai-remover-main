"""Regression: native portrait coordinates, moving icon, encoded MP4 and audio."""
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path
import cv2
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from logo_target import detect_target
from processor import _find_calibrated_sparkle, _restore_calibrated, _sparkle_mattes, remove_watermark
from video_stream import apply_yuv_delta, yuv_crop

class VideoTargetTests(unittest.TestCase):
    def frame(self, index=0):
        yy, xx = np.mgrid[:426, :240]
        clean = np.stack([40+xx//5, 70+yy//8, 110+xx//8], axis=2).astype(np.uint8)
        marked = clean.copy()
        x, y = 200+index//3, 385-index//4
        pts = np.array([[x,y-8],[x+2,y-2],[x+8,y],[x+2,y+2],[x,y+8],[x-2,y+2],[x-8,y],[x-2,y-2]])
        mask = np.zeros((426,240),np.uint8)
        cv2.fillPoly(mask,[pts],255)
        marked[mask>0] = (marked[mask>0]*.65+255*.35).astype(np.uint8)
        return clean, marked, (x,y)

    def test_detection_and_no_random_target(self):
        clean, marked, (x,y) = self.frame()
        box = detect_target(marked)
        self.assertIsNotNone(box)
        bx,by,bw,bh=box
        self.assertLess(abs(bx+bw/2-x),3)
        self.assertLess(abs(by+bh/2-y),3)
        self.assertIsNone(detect_target(clean))

    def test_calibrated_sparkle_preserves_background_edges(self):
        x, y = 136, 136
        yy, xx = np.mgrid[:240, :240]
        matte = _sparkle_mattes()[0] * 0.575
        samples = []
        for index in range(19):
            plane = 55 + (xx % 17) + 45 * (yy > y + index * 2)
            clean = np.stack((plane + 5, plane + 40, plane), axis=-1).astype(np.uint8)
            marked = clean.copy()
            patch = marked[y:y+48, x:x+48]
            patch[:] = np.rint(patch * (1 - matte[..., None]) + 255 * matte[..., None]).astype(np.uint8)
            samples.append(cv2.cvtColor(marked, cv2.COLOR_BGR2GRAY))

        box, calibrated = _find_calibrated_sparkle(np.stack(samples), 720, (0, 0))
        self.assertEqual(box, (x-4, y-4, 56, 56))
        support = (calibrated > calibrated.max() * 0.5).astype(np.uint8)
        contour = cv2.morphologyEx(
            support, cv2.MORPH_GRADIENT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
        ) * 255
        _restore_calibrated(marked, box, calibrated, contour)
        footprint = np.zeros(clean.shape[:2], dtype=bool)
        footprint[y-4:y+52, x-4:x+52] = (calibrated > 0) | (contour > 0)
        np.testing.assert_array_equal(marked[~footprint], clean[~footprint])
        self.assertLess(np.abs(marked[footprint].astype(float) - clean[footprint]).mean(), 3)

    def test_native_yuv_edits_keep_other_samples_exact(self):
        width, height = 16, 12
        frame = np.full(width * height * 3 // 2, 128, dtype=np.uint8)
        original = frame.copy()
        matrix = (0.299, 0.114)
        crop, planes = yuv_crop(frame, width, height, (4, 4, 12, 10), matrix, False)
        edited = crop.copy()
        edited[2:4, 2:4, 2] += 36
        apply_yuv_delta(crop, edited, planes, matrix, False)
        expected = [6 * width + 6, 6 * width + 7, 7 * width + 6, 7 * width + 7]
        chroma = 3 * (width // 2) + 3
        expected += [width * height + chroma, width * height * 5 // 4 + chroma]
        self.assertEqual(np.flatnonzero(original != frame).tolist(), expected)

    def test_reopen_processed_mp4(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, source, output = [str(Path(tmp)/n) for n in ('raw.mp4','source.mp4','clean.mp4')]
            writer=cv2.VideoWriter(raw,cv2.VideoWriter_fourcc(*'mp4v'),24,(240,426))
            for i in range(24): writer.write(self.frame(i)[1])
            writer.release()
            subprocess.run(['ffmpeg','-y','-loglevel','error','-i',raw,'-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','copy','-c:a','aac','-shortest',source],check=True)
            remove_watermark(source,output)
            cap=cv2.VideoCapture(output)
            self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),24)
            self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),240)
            self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),426)
            self.assertAlmostEqual(cap.get(cv2.CAP_PROP_FPS),24)
            for i in range(24):
                ok, frame=cap.read(); self.assertTrue(ok)
                clean, marked, (x,y)=self.frame(i)
                self.assertLess(np.abs(frame[y-6:y+7,x-6:x+7].astype(float)-clean[y-6:y+7,x-6:x+7]).mean(),8)
            cap.release()
            audio=subprocess.check_output(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=codec_name','-of','csv=p=0',output],text=True)
            self.assertIn('aac',audio)

if __name__=='__main__': unittest.main()
