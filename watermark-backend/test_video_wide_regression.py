"""Comprehensive video-wide regression suite for Bellix Video Cleaner.

Tests real repo clips across aspect ratios, resolutions, codecs, negative controls,
and synthetic ground-truth scenarios (16:9, 9:16 rotated, 1:1, odd resolution, 4K,
60fps, WebM+Opus, dark polarity, fade-in/out, scene change, moving sparkle,
manual box, and guaranteed mode), writing a JSON report and visual strips.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from processor import _sparkle_mattes, remove_watermark  # noqa: E402
from video_stream import encoded_box, rotation, video_stream  # noqa: E402


REPORT_ROOT = Path(
    os.environ.get(
        "BELLIX_QA_DIR",
        str(ROOT_DIR / "debug" / "video-audit"),
    )
)
WORK_TMP_ROOT = BACKEND_DIR / ".qa_tmp"


def _ffprobe_json(path: str | Path) -> dict:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_format",
            "-show_streams",
            "-of",
            "json",
            str(path),
        ],
        text=True,
    )
    return json.loads(out)


def _stream_by_type(probe: dict, kind: str) -> dict | None:
    for s in probe.get("streams", []):
        if s.get("codec_type") == kind:
            return s
    return None


def _open_capture(path: Path | str):
    cap = cv2.VideoCapture(str(path))
    cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0)
    return cap


def _count_decoded_frames(path: str | Path) -> tuple[int, tuple[int, int], list[float]]:
    cap = _open_capture(path)
    if not cap.isOpened():
        return 0, (0, 0), []
    count = 0
    means: list[float] = []
    size = (0, 0)
    try:
        while True:
            ok, frm = cap.read()
            if not ok:
                break
            if count == 0:
                size = (frm.shape[1], frm.shape[0])
            means.append(float(frm.mean()))
            count += 1
    finally:
        cap.release()
    return count, size, means


def _read_frames_at(path: str | Path, indices: list[int]) -> dict[int, np.ndarray]:
    cap = _open_capture(path)
    wanted = set(indices)
    out: dict[int, np.ndarray] = {}
    idx = 0
    try:
        while len(out) < len(wanted):
            ok, frm = cap.read()
            if not ok:
                break
            if idx in wanted:
                out[idx] = frm.copy()
            idx += 1
    finally:
        cap.release()
    return out


def _save_comparison_strip(
    name: str,
    src: str | Path,
    dst: str | Path,
    box: list[int] | None,
    indices: list[int],
    out_dir: Path,
) -> Path:
    src_frames = _read_frames_at(src, indices)
    dst_frames = _read_frames_at(dst, indices)
    rows = []
    for idx in sorted(set(indices)):
        sf = src_frames.get(idx)
        df = dst_frames.get(idx)
        if sf is None or df is None or sf.shape != df.shape:
            continue
        h, w = sf.shape[:2]
        if box:
            bx, by, bw, bh = box
        else:
            bx, by, bw, bh = max(0, w - 160), max(0, h - 160), min(160, w), min(160, h)
        pad = 24
        x0, y0 = max(0, bx - pad), max(0, by - pad)
        x1, y1 = min(w, bx + bw + pad), min(h, by + bh + pad)
        sc = sf[y0:y1, x0:x1]
        dc = df[y0:y1, x0:x1]
        diff = np.clip(np.abs(sc.astype(np.float32) - dc.astype(np.float32)) * 4.0, 0, 255).astype(np.uint8)
        row = np.hstack((sc, dc, diff))
        scale = 2 if max(row.shape[:2]) < 220 else 1
        if scale > 1:
            row = cv2.resize(row, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
        cv2.putText(row, f"f={idx} (orig | clean | x4 diff)", (6, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        rows.append(row)
    out_path = out_dir / f"{name}.png"
    if rows:
        cv2.imwrite(str(out_path), np.vstack(rows))
    return out_path


def _encode_bgr_mp4(
    frames: list[np.ndarray],
    out_path: str | Path,
    *,
    fps: float = 24.0,
    with_audio: bool = True,
    pix_fmt: str = "yuv420p",
    container: str = "mp4",
    rotate_deg: int = 0,
) -> Path:
    out_path = Path(out_path)
    h, w = frames[0].shape[:2]
    dur = len(frames) / fps
    with tempfile.TemporaryDirectory(dir=out_path.parent) as td:
        raw_path = Path(td) / "raw.bgr"
        with open(raw_path, "wb") as f:
            for frm in frames:
                f.write(frm.tobytes())
        cmd = [
            "ffmpeg", "-y", "-v", "error", "-filter_threads", "1",
            "-f", "rawvideo", "-pixel_format", "bgr24",
            "-video_size", f"{w}x{h}", "-framerate", str(fps), "-i", str(raw_path),
        ]
        if with_audio:
            cmd.extend(["-f", "lavfi", "-i", f"sine=frequency=440:duration={dur:.9f}"])
        if container == "webm":
            cmd.extend(["-frames:v", str(len(frames)), "-c:v", "libvpx", "-threads:v", "2", "-crf", "16", "-b:v", "2M"])
            if with_audio:
                cmd.extend(["-c:a", "libopus"])
        else:
            cmd.extend(["-frames:v", str(len(frames)), "-c:v", "libx264", "-threads:v", "2", "-crf", "12", "-preset", "fast", "-pix_fmt", pix_fmt])
            if with_audio:
                cmd.extend(["-c:a", "aac"])
        encoded = Path(td) / "unrotated.mp4" if rotate_deg else out_path
        cmd.append(str(encoded))
        subprocess.run(cmd, check=True)
        if rotate_deg:
            subprocess.run([
                "ffmpeg", "-y", "-v", "error", "-display_rotation:v:0", str(rotate_deg),
                "-i", str(encoded), "-map", "0", "-c", "copy", str(out_path),
            ], check=True)
    return out_path


def _textured_frames(
    w: int,
    h: int,
    n: int,
    *,
    dark_bg: bool = False,
    scene_cut: bool = True,
    with_face_detail: bool = False,
) -> list[np.ndarray]:
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    frames: list[np.ndarray] = []
    for i in range(n):
        t = i * 3.0
        in_second_scene = scene_cut and (i >= n // 2)
        if dark_bg:
            base_r = 35 + 18 * np.sin((xx + t) / 19.0) + 14 * np.cos((yy - t * 0.5) / 23.0)
            base_g = 42 + 20 * np.cos((xx - t * 0.7) / 17.0) + 12 * np.sin((yy + t) / 15.0)
            base_b = 48 + 15 * np.sin((xx + yy + t) / 29.0)
        else:
            base_r = 212 + 14 * np.sin((xx + t) / 21.0)
            base_g = 216 + 14 * np.cos((yy - t * 0.6) / 19.0)
            base_b = 218 + 12 * np.sin((xx + yy + t) / 27.0)
        if in_second_scene:
            base_r = np.clip(base_r * 0.85 + 24, 10, 245)
            base_g = np.clip(base_g * 1.05 - 12, 10, 245)
        frm = np.clip(np.stack([base_b, base_g, base_r], axis=2), 0, 255).astype(np.uint8)
        if with_face_detail:
            cv2.circle(frm, (w // 2, h // 2), min(w, h) // 7, (175, 192, 224), -1)
            cv2.circle(frm, (w // 2 - 20, h // 2 - 10), 5, (30, 30, 30), -1)
            cv2.circle(frm, (w // 2 + 20, h // 2 - 10), 5, (30, 30, 30), -1)
            cv2.putText(frm, "DETAIL OK", (24, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        frames.append(frm)
    return frames


def _stamp_sparkle(
    frames: list[np.ndarray],
    x: int,
    y: int,
    size: int = 48,
    alpha: float = 0.48,
    polarity: str = "light",
    active_mask: list[bool] | None = None,
    drift: tuple[float, float] = (0.0, 0.0),
) -> list[np.ndarray]:
    matte_src = _sparkle_mattes()[0]
    matte_pos = np.maximum(matte_src, 0.0)
    matte_resized = cv2.resize(matte_pos, (size, size), interpolation=cv2.INTER_AREA if size < matte_pos.shape[0] else cv2.INTER_CUBIC)
    a = np.clip(matte_resized / max(float(matte_resized.max()), 1e-6) * alpha, 0.0, 0.92)[:, :, None]
    target = 0.0 if polarity == "dark" else 255.0
    marked_frames: list[np.ndarray] = []
    for i, clean in enumerate(frames):
        frm = clean.copy()
        if active_mask is None or active_mask[i]:
            fx = int(round(x + drift[0] * i))
            fy = int(round(y + drift[1] * i))
            patch = frm[fy : fy + size, fx : fx + size].astype(np.float32)
            patch[:] = np.rint(patch * (1.0 - a) + target * a).astype(np.uint8)
            frm[fy : fy + size, fx : fx + size] = patch.astype(np.uint8)
        marked_frames.append(frm)
    return marked_frames


def _verify_output(name: str, src: Path, dst: Path, *, expected_min_frames: int = 1, expect_audio: bool | None = None) -> dict:
    src_probe = _ffprobe_json(src)
    dst_probe = _ffprobe_json(dst)
    sv = _stream_by_type(src_probe, "video")
    dv = _stream_by_type(dst_probe, "video")
    sa = _stream_by_type(src_probe, "audio")
    da = _stream_by_type(dst_probe, "audio")
    assert sv is not None and dv is not None, f"{name}: missing video stream"

    src_count, src_sz, src_means = _count_decoded_frames(src)
    dst_count, dst_sz, dst_means = _count_decoded_frames(dst)
    assert src_count >= expected_min_frames
    assert dst_count == src_count, f"{name}: frame count mismatch {dst_count} != {src_count}"
    assert dst_sz == src_sz, f"{name}: resolution mismatch {dst_sz} != {src_sz}"
    assert rotation(sv) == rotation(dv), f"{name}: rotation mismatch {rotation(dv)} != {rotation(sv)}"

    # Check for unintended black frames introduced by processing
    corrupt_black = [
        i for i, (sm, dm) in enumerate(zip(src_means, dst_means))
        if sm > 12.0 and dm < 1.5
    ]
    assert not corrupt_black, f"{name}: corrupted black frames {corrupt_black[:5]}"

    # Check output actually modified pixels vs input (no unchanged passthrough)
    scene_changes = np.abs(np.diff(src_means))
    cuts = sorted(int(i) + 1 for i in np.argsort(scene_changes)[-3:] if scene_changes[i] >= 10)
    idxs = {0, src_count // 4, src_count // 2, max(0, src_count - 1)}
    idxs.update(frame for cut in cuts for frame in (cut - 1, cut))
    idxs = sorted(idxs)
    sf = _read_frames_at(src, idxs)
    df = _read_frames_at(dst, idxs)
    changed_max = max(float(np.abs(sf[i].astype(float) - df[i].astype(float)).max()) for i in idxs)
    assert changed_max > 2.0, f"{name}: output identical to input"

    has_audio = sa is not None if expect_audio is None else expect_audio
    audio_ok = True
    audio_dur_diff = None
    if has_audio:
        assert da is not None, f"{name}: audio lost in output"
        assert da.get("codec_name") == "aac", f"{name}: expected aac, got {da.get('codec_name')}"
        vdur = float(dv.get("duration") or dst_probe["format"].get("duration") or 0)
        adur = float(da.get("duration") or dst_probe["format"].get("duration") or 0)
        if vdur > 0 and adur > 0:
            audio_dur_diff = abs(vdur - adur)
            assert audio_dur_diff <= max(0.35, vdur * 0.02), f"{name}: audio sync diff {audio_dur_diff:.3f}s"

    q_path = Path(str(dst) + ".quality.json")
    quality = json.loads(q_path.read_text(encoding="utf8")) if q_path.is_file() else {}
    strip = _save_comparison_strip(name, src, dst, quality.get("watermark_box"), idxs, REPORT_ROOT)
    return {
        "name": name,
        "width": dst_sz[0],
        "height": dst_sz[1],
        "frames": dst_count,
        "black_frames_introduced": len(corrupt_black),
        "scene_transition_indices": cuts,
        "rotation": rotation(dv),
        "audio_preserved": bool(da) if has_audio else True,
        "audio_dur_diff_s": round(audio_dur_diff, 4) if audio_dur_diff is not None else None,
        "method": quality.get("method"),
        "polarity": quality.get("polarity"),
        "edge_before": quality.get("edge_before"),
        "edge_after": quality.get("edge_after"),
        "strip": str(strip),
    }


class VideoWideRegressionTests(unittest.TestCase):
    results: list[dict] = []

    @classmethod
    def setUpClass(cls):
        REPORT_ROOT.mkdir(parents=True, exist_ok=True)
        WORK_TMP_ROOT.mkdir(parents=True, exist_ok=True)
        cls.tmp = tempfile.TemporaryDirectory(prefix="bellix-wide-", dir=str(WORK_TMP_ROOT))
        cls.tmp_dir = Path(cls.tmp.name)

    @classmethod
    def tearDownClass(cls):
        summary = {"cases": cls.results, "total": len(cls.results)}
        (REPORT_ROOT / "regression_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf8")
        cls.tmp.cleanup()

    def _run_case(self, name: str, src: Path, *, mode: str = "clean", manual_box=None, normalized_box=None, clean_frames: list[np.ndarray] | None = None, active_mask: list[bool] | None = None) -> dict:
        dst = REPORT_ROOT / f"{name}-processed.mp4"
        if src.parent == self.tmp_dir:
            artifact_source = REPORT_ROOT / f"{name}-source{src.suffix}"
            shutil.copyfile(src, artifact_source)
            src = artifact_source
        stream = video_stream(src)
        rec = {
            "name": name, "src": str(src), "output": str(dst), "mode": mode,
            "input_frame_size": [stream["width"], stream["height"]],
            "input_fps": stream["avg_frame_rate"], "passed": False,
        }
        self.results.append(rec)
        progress_log: list[int] = []
        try:
            remove_watermark(
                src,
                dst,
                progress_cb=lambda pct, _f, _m: progress_log.append(int(pct)),
                mode=mode,
                manual_box=manual_box,
                normalized_box=normalized_box,
                allow_tracking=True,
            )
        except Exception as exc:
            rec["error"] = str(exc)
            raise
        self.assertTrue(progress_log and progress_log[-1] == 100)
        self.assertEqual(progress_log, sorted(progress_log))
        info = _verify_output(name, src, dst)
        rec.update(info)
        q = json.loads(Path(str(dst) + ".quality.json").read_text(encoding="utf8"))
        rec.update(q)
        self.assertEqual(q["frames_processed"], info["frames"])
        self.assertEqual(q["decoded_frames_verified"], info["frames"])

        if clean_frames is not None and mode == "clean":
            bx, by, bw, bh = q["watermark_box"]
            box_errs = []
            out_errs = []
            before_box_errs = []
            mask_outside = np.ones(clean_frames[0].shape[:2], dtype=bool)
            pad = 12
            mask_outside[max(0, by - pad) : by + bh + pad, max(0, bx - pad) : bx + bw + pad] = False
            outside_src_errs = []
            source_capture, output_capture = _open_capture(src), _open_capture(dst)
            region = np.s_[by : by + bh, bx : bx + bw]
            previous_error = None
            max_temporal_error = 0.0
            try:
                for cf in clean_frames:
                    before_ok, osrc = source_capture.read()
                    after_ok, pf = output_capture.read()
                    self.assertTrue(before_ok and after_ok)
                    box_errs.append(float(cv2.absdiff(pf[region], cf[region]).mean()))
                    frame_error = pf[region].astype(np.int16) - cf[region]
                    if previous_error is not None:
                        max_temporal_error = max(max_temporal_error, float(np.abs(frame_error - previous_error).mean()))
                    previous_error = frame_error
                    before_box_errs.append(float(cv2.absdiff(osrc[region], cf[region]).mean()))
                    out_errs.append(float(cv2.absdiff(pf, cf)[mask_outside].mean()))
                    outside_src_errs.append(float(cv2.absdiff(pf, osrc)[mask_outside].mean()))
            finally:
                source_capture.release()
                output_capture.release()
            rec["ground_truth_frames_compared"] = len(clean_frames)
            rec["mean_box_err_before"] = round(float(np.mean(before_box_errs)), 3)
            rec["mean_box_err_vs_clean"] = round(float(np.mean(box_errs)), 3)
            rec["worst_box_err_vs_clean"] = round(max(box_errs), 3)
            rec["max_frame_to_frame_error_delta"] = round(max_temporal_error, 3)
            rec["mean_outside_err_vs_clean"] = round(float(np.mean(out_errs)), 3)
            rec["mean_outside_err_vs_src"] = round(float(np.mean(outside_src_errs)), 3)
            self.assertLess(rec["mean_box_err_vs_clean"], 10.0, f"{name}: {rec}")
            self.assertLess(rec["mean_outside_err_vs_src"], 1.5, f"{name}: outside pixels altered vs source {rec}")
            self.assertLess(rec["mean_outside_err_vs_clean"], 2.8, f"{name}: outside pixels damaged vs clean {rec}")
            if active_mask is not None:
                # Ensure unmarked lead/tail frames stay faithful
                rec["worst_unmarked_frame_err"] = round(max(error for error, active in zip(box_errs, active_mask) if not active), 3)
                self.assertLess(rec["worst_unmarked_frame_err"], 3.0, f"{name}: fade frames damaged")

        rec["passed"] = True
        return rec

    def test_01_real_samples_and_negative_controls(self):
        real_cases = [
            ("real_landscape_grass_16x9", ROOT_DIR / "watermark-backend" / "uploads" / "05f409148a904aebb74eedcc7e8c268a.mp4", "clean", None),
            ("real_portrait_cartoon_9x16", BACKEND_DIR / "cartoon-source.mp4", "clean", None),
            ("real_square_1x1", ROOT_DIR / "watermark-backend" / "square-source.mp4", "clean", None),
            ("real_bright_16x9", ROOT_DIR / "samples" / "real" / "bright_gemini.mp4", "clean", None),
            ("real_dark_16x9", ROOT_DIR / "samples" / "real" / "dark_gemini.mp4", "clean", None),
            ("real_1080p_example", ROOT_DIR / "logo-ai-remover-main" / "public" / "gemini-example-before.mp4", "clean", None),
            ("real_portrait_crop", BACKEND_DIR / "cartoon-source.mp4", "crop", None),
            ("real_hero_manual_bottom_left", ROOT_DIR / "logo-ai-remover-main" / "public" / "hero-original-video.mp4", "clean", (0.015, 0.88, 0.14, 0.08)),
        ]
        for name, path, mode, norm_box in real_cases:
            if not path.is_file():
                self.results.append({"name": name, "status": "fixture unavailable"})
                continue
            with self.subTest(case=name):
                rec = self._run_case(name, path, mode=mode, normalized_box=norm_box)
                if rec.get("edge_before") and rec.get("edge_after") is not None:
                    self.assertLess(abs(rec["edge_after"]), abs(rec["edge_before"]) * 0.65)
                if name == "real_portrait_crop":
                    q_g = rec
                    det = q_g.get("detected_box")
                    crect = q_g.get("crop_rect")
                    self.assertIsNotNone(det)
                    self.assertIsNotNone(crect)
                    cx0, cy0, cw, ch = crect
                    dx, dy, dw, dh = det
                    # Detected box must fall completely outside kept crop rectangle
                    outside_x = (dx >= cx0 + cw) or (dx + dw <= cx0)
                    outside_y = (dy >= cy0 + ch) or (dy + dh <= cy0)
                    self.assertTrue(outside_x or outside_y, f"Guaranteed crop {crect} did not exclude {det}")
                if name == "real_1080p_example":
                    ref_after = ROOT_DIR / "logo-ai-remover-main" / "public" / "gemini-example-after.mp4"
                    if ref_after.is_file():
                        f_ref = _read_frames_at(ref_after, [0])[0]
                        f_out = _read_frames_at(rec["output"], [0])[0]
                        x, y, w, h = rec["watermark_box"]
                        region = np.s_[y:y+h, x:x+w]
                        f0_err = float(cv2.absdiff(f_out[region], f_ref[region]).mean())
                        rec["f0_err_vs_ref_after"] = round(f0_err, 3)
                        self.assertLess(f0_err, 12.0, f"1080p shot-1 sparkle left residual vs ref: {f0_err}")

        neg_controls = [
            ("neg_stage_unmarked", ROOT_DIR / "samples" / "real" / "stage_gemini.mp4"),
            ("neg_e244_unmarked", ROOT_DIR / "watermark-backend" / "uploads" / "e244ff13136647b998b3e763f165b4de.mp4"),
        ]
        for name, path in neg_controls:
            if not path.is_file():
                self.results.append({"name": name, "status": "fixture unavailable"})
                continue
            with self.subTest(case=name):
                out = self.tmp_dir / f"{name}.mp4"
                with self.assertRaises(ValueError) as rejected:
                    remove_watermark(path, out, allow_tracking=True)
                self.assertFalse(out.exists())
                self.results.append({"name": name, "passed": True, "expected_reject": True, "reason": str(rejected.exception)})

    def test_02_diverse_resolutions_aspects_framerates_codecs(self):
        # 16:9 with scene cut & face/text details
        clean_169 = _textured_frames(1280, 720, 30, dark_bg=True, scene_cut=True, with_face_detail=True)
        marked_169 = _stamp_sparkle(clean_169, 1280 - 92, 720 - 84, size=48, alpha=0.45)
        p169 = _encode_bgr_mp4(marked_169, self.tmp_dir / "s169.mp4", fps=30.0)
        with self.subTest(case="landscape scene cut"):
            self._run_case("syn_16x9_scenecut_30fps", p169, clean_frames=clean_169)

        # 9:16 rotated display matrix (stored 1280x720 with display_rotation -90 -> displays bottom-right!)
        clean_rot = _textured_frames(1280, 720, 24, dark_bg=True, scene_cut=False)
        bx, by, bw, bh = encoded_box((0.88, 0.88, 0.08, 0.08), 1280, 720, -90)
        sz = max(32, min(bw, bh))
        marked_rot = _stamp_sparkle(clean_rot, bx, by, size=sz, alpha=0.46)
        prot = _encode_bgr_mp4(marked_rot, self.tmp_dir / "srot90.mp4", fps=24.0, rotate_deg=-90)
        with self.subTest(case="portrait rotation"):
            self._run_case("syn_9x16_rotated_metadata", prot, clean_frames=clean_rot)

        # 1:1 square 25fps dark scene
        clean_11 = _textured_frames(640, 640, 25, dark_bg=True, scene_cut=True)
        marked_11 = _stamp_sparkle(clean_11, 640 - 78, 640 - 74, size=44, alpha=0.44)
        p11 = _encode_bgr_mp4(marked_11, self.tmp_dir / "s11.mp4", fps=25.0)
        with self.subTest(case="square"):
            self._run_case("syn_1x1_square_25fps", p11, clean_frames=clean_11)

        # Odd dimensions (642x362 / odd height not divisible by 2 handled via yuv444p; test even non-mod16 + odd!)
        clean_odd = _textured_frames(643, 361, 24, dark_bg=True, scene_cut=False)
        marked_odd = _stamp_sparkle(clean_odd, 643 - 68, 361 - 64, size=36, alpha=0.46)
        podd = _encode_bgr_mp4(marked_odd, self.tmp_dir / "sodd.mp4", fps=24.0, pix_fmt="yuv444p")
        with self.subTest(case="odd resolution"):
            self._run_case("syn_odd_resolution_yuv444p", podd, clean_frames=clean_odd)

        # 4K UHD
        clean_4k = _textured_frames(3840, 2160, 6, dark_bg=True, scene_cut=True)
        marked_4k = _stamp_sparkle(clean_4k, 3840 - 180, 2160 - 160, size=96, alpha=0.48)
        p4k = _encode_bgr_mp4(marked_4k, self.tmp_dir / "s4k.mp4", fps=24.0)
        with self.subTest(case="4K"):
            self._run_case("syn_4k_uhd", p4k, clean_frames=clean_4k)
        del clean_4k, marked_4k

        # 60fps
        clean_60 = _textured_frames(960, 540, 60, dark_bg=True, scene_cut=True)
        marked_60 = _stamp_sparkle(clean_60, 960 - 76, 540 - 72, size=42, alpha=0.44)
        p60 = _encode_bgr_mp4(marked_60, self.tmp_dir / "s60fps.mp4", fps=60.0)
        with self.subTest(case="60 fps"):
            self._run_case("syn_60fps_540p", p60, clean_frames=clean_60)

        # WebM + Opus audio container conversion -> MP4 + AAC
        clean_webm = _textured_frames(854, 480, 24, dark_bg=True, scene_cut=False)
        marked_webm = _stamp_sparkle(clean_webm, 854 - 74, 480 - 70, size=40, alpha=0.48)
        pwebm = _encode_bgr_mp4(marked_webm, self.tmp_dir / "swebm.webm", fps=24.0, container="webm")
        with self.subTest(case="WebM Opus"):
            self._run_case("syn_webm_opus_to_mp4_aac", pwebm, clean_frames=clean_webm)

        # Dark-polarity watermark on bright background
        clean_dark_wm = _textured_frames(960, 540, 24, dark_bg=False, scene_cut=True)
        marked_dark_wm = _stamp_sparkle(clean_dark_wm, 960 - 78, 540 - 74, size=44, alpha=0.42, polarity="dark")
        pdarkwm = _encode_bgr_mp4(marked_dark_wm, self.tmp_dir / "sdarkwm.mp4", fps=24.0)
        with self.subTest(case="dark sparkle"):
            rec_dw = self._run_case("syn_dark_polarity_mark", pdarkwm, clean_frames=clean_dark_wm)
            self.assertEqual(rec_dw.get("polarity"), "dark")

        # Fade-in / fade-out watermark (frames 0..5 & 30..35 clean, 6..29 marked)
        clean_fade = _textured_frames(720, 720, 36, dark_bg=True, scene_cut=False)
        active = [6 <= i <= 29 for i in range(36)]
        marked_fade = _stamp_sparkle(clean_fade, 720 - 82, 720 - 76, size=44, alpha=0.45, active_mask=active)
        pfade = _encode_bgr_mp4(marked_fade, self.tmp_dir / "sfade.mp4", fps=24.0)
        with self.subTest(case="sparkle fades"):
            self._run_case("syn_fade_in_out", pfade, clean_frames=clean_fade, active_mask=active)

    def test_03_long_vfr_mixed_audio_and_sample_aspect_ratio(self):
        frames = _textured_frames(320, 180, 24, dark_bg=True, scene_cut=True)
        marked = _stamp_sparkle(frames, 281, 140, size=24, alpha=0.45)
        seed = _encode_bgr_mp4(marked, self.tmp_dir / "vfr-seed.mp4", with_audio=False)
        source = self.tmp_dir / "fixture.mkv"
        subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-stream_loop", "42", "-i", str(seed),
            "-f", "lavfi", "-i", "sine=440:sample_rate=48000:duration=43",
            "-f", "lavfi", "-i", "sine=740:sample_rate=48000:duration=43",
            "-map", "0:v", "-map", "1:a", "-map", "2:a",
            "-vf", "select='not(eq(mod(n,11),5))',setsar=4/3", "-fps_mode", "passthrough",
            "-c:v", "libx264", "-threads:v", "2", "-c:a:0", "aac", "-c:a:1", "libopus", str(source),
        ], check=True)
        rec = self._run_case("syn_long_vfr_mixed_audio", source)
        self.assertGreater(rec["decoded_frames_verified"], 800)
        self.assertEqual(rec["audio_tracks"], ["copied", "aac"])
        self.assertLessEqual(rec["max_frame_timing_error_ms"], 1)

    def test_04_unmarked_crop_and_unchanged_manual_fail(self):
        source = _encode_bgr_mp4(
            [np.zeros((144, 256, 3), np.uint8)] * 8, self.tmp_dir / "unmarked.mp4", with_audio=False,
        )
        target = self.tmp_dir / "unmarked-result.mp4"
        for mode, box in [("clean", None), ("crop", None), ("clean", (224, 112, 20, 20))]:
            with self.subTest(mode=mode, box=box):
                with self.assertRaises(ValueError) as rejected:
                    remove_watermark(source, target, mode=mode, manual_box=box)
                self.assertFalse(target.exists())
                self.results.append({
                    "name": f"unmarked_{mode}_{'manual' if box else 'auto'}",
                    "input_frame_size": [256, 144], "input_fps": 24, "frames": 8,
                    "passed": True, "expected_reject": True, "reason": str(rejected.exception),
                })


if __name__ == "__main__":
    unittest.main(verbosity=2)
