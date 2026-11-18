"""Run five labeled video cleaner cases and report export and decoded-frame checks."""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from processor import _sparkle_mattes, _white_response, remove_watermark
from video_stream import probe, rotation, video_stream

CASES = {
    "bright": (1280, 720),
    "dark": (1280, 720),
    "moving-camera": (1280, 720),
    "vertical": (720, 1280),
    "1080p": (1920, 1080),
}


def synthetic_clip(name, path):
    width, height = CASES[name]
    short = min(width, height)
    size = round(short / 15)
    x = width - size - round(short * 0.13)
    y = height - size - round(short * 0.13)
    matte = cv2.resize(_sparkle_mattes()[0], (size, size))[..., None]
    cols = np.arange(width, dtype=np.float32)[None, :]
    rows = np.arange(height, dtype=np.float32)[:, None]
    base = 145 if name == "bright" else 18 if name == "dark" else 65
    with subprocess.Popen([
        "ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pixel_format", "bgr24",
        "-video_size", f"{width}x{height}", "-framerate", "24", "-i", "pipe:0",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1",
        "-c:v", "libx264", "-threads", "2", "-crf", "17", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-shortest", str(path),
    ], stdin=subprocess.PIPE) as writer:
        for index in range(24):
            background = base + 15 * np.sin((cols + index * 5) / 40) + 12 * np.cos((rows - index * 7) / 54)
            if name == "moving-camera":
                background += 30 * ((cols + rows + index * 9) % 130 < 42)
            frame = np.stack((background + 2, background + 8, background + 16), axis=-1)
            patch = frame[y:y+size, x:x+size]
            patch[:] = patch * (1 - matte) + matte * 255
            writer.stdin.write(np.clip(np.rint(frame), 0, 255).astype(np.uint8).tobytes())
        writer.stdin.close()
        if writer.wait():
            raise RuntimeError("Could not generate the synthetic test clip.")


def audio_hash(path):
    audio = probe(path, "-select_streams", "a", "-show_entries", "stream=index").get("streams", [])
    if not audio:
        return None
    hashes = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a", "-c:a", "copy",
        "-f", "streamhash", "-",
    ])
    return hashlib.sha256(hashes).hexdigest()


def timestamps(path):
    frames = probe(path, "-select_streams", "V:0", "-show_frames",
                   "-show_entries", "frame=best_effort_timestamp_time")["frames"]
    return np.array([float(frame["best_effort_timestamp_time"]) for frame in frames])


def inspect_pixels(source, result, debug):
    x, y, width, height = json.loads(Path(str(result) + ".quality.json").read_text())["watermark_box"]
    matte = cv2.imread(str(debug / "alpha.png"), cv2.IMREAD_UNCHANGED) / 65535
    slope = np.diff(matte, axis=1)
    contour = np.abs(slope) > np.abs(slope).max() * 0.26
    sign = np.sign(slope[contour])
    before, after = cv2.VideoCapture(str(source)), cv2.VideoCapture(str(result))
    for capture in (before, after):
        capture.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0)
    count = 0
    outline = [[], []]
    errors = []
    try:
        while True:
            ok, original = before.read()
            success, exported = after.read()
            if ok != success:
                raise RuntimeError("Source and result have different decoded frame counts.")
            if not ok:
                break
            for scores, frame in zip(outline, (original, exported)):
                crop = frame[y:y+height, x:x+width]
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                edges = np.diff(_white_response(gray), axis=1)[contour] * sign
                scores.append(float(np.median(edges)))
            difference = cv2.absdiff(original, exported)
            difference[y:y+height, x:x+width] = 0
            errors.append(float(difference.mean()))
            count += 1
    finally:
        before.release()
        after.release()
    return {
        "decoded_frames": count,
        "median_sparkle_edge_response_before": round(float(np.median(outline[0])), 4),
        "median_sparkle_edge_response_after": round(float(np.median(outline[1])), 4),
        "p95_absolute_edge_response_after": round(float(np.quantile(np.abs(outline[1]), 0.95)), 4),
        "mean_outside_box_channel_error_after_encoding": round(float(np.mean(errors)), 3),
    }


def verify(source, result, debug=None):
    a, b = video_stream(source), video_stream(result)
    fields = ("width", "height", "color_range", "color_space", "color_primaries", "color_transfer")
    streams_match = all(a.get(key, "unknown") == b.get(key, "unknown") for key in fields)
    source_pts, result_pts = timestamps(source), timestamps(result)
    timing_matches = (
        source_pts.shape == result_pts.shape
        and np.allclose(source_pts, result_pts, rtol=0, atol=0.001)
        and abs(float(a.get("duration", 0)) - float(b.get("duration", 0))) <= 0.02
    )
    audio_matches = audio_hash(source) == audio_hash(result)
    rotation_matches = rotation(a) == rotation(b)
    result_fields = {
        "stream_metadata_match": streams_match,
        "frame_timing_match": timing_matches,
        "audio_packets_match": audio_matches,
        "rotation_match": rotation_matches,
    }
    if debug is not None:
        result_fields.update(inspect_pixels(source, result, debug))
    return result_fields


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--clip", action="append", default=[], metavar="LABEL=PATH",
                        help="Test owned source clips instead of generating the five default fixtures")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    clips = {}
    for item in args.clip:
        label, separator, value = item.partition("=")
        if not separator or not label.replace("-", "").isalnum():
            parser.error("Each clip must use LABEL=PATH with an alphanumeric label.")
        clips[label] = args.output_dir / value if not Path(value).is_file() else Path(value)
    if not clips:
        for name in CASES:
            source = args.output_dir / f"{name}-source.mp4"
            synthetic_clip(name, source)
            clips[name] = source

    failures = 0
    for name, source in clips.items():
        result = args.output_dir / f"{name}-clean.mp4"
        debug = args.output_dir / f"{name}-debug"
        try:
            remove_watermark(str(source), str(result), debug_dir=debug, allow_tracking=False)
            checks = verify(source, result, debug)
            passed = all(value for value in checks.values() if isinstance(value, bool))
            passed = passed and abs(checks["median_sparkle_edge_response_after"]) < (
                abs(checks["median_sparkle_edge_response_before"]) * 0.35
            )
            report = {"case": name, "passed": passed, **checks}
        except Exception as exc:
            passed = False
            report = {"case": name, "passed": False, "error": str(exc)}
        print(json.dumps(report), flush=True)
        failures += not passed
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
