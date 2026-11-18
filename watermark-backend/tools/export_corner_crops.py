"""Save matching 300×300 lossless PNG crops at 4× zoom from encoded videos."""

import argparse
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from video_stream import frame_rate, video_stream, video_timing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("original", type=Path)
    parser.add_argument("processed", type=Path)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    stream = video_stream(args.original)
    total, *_ = video_timing(str(args.original), stream, frame_rate(stream))
    labels = {"first": 0, "middle": total // 2, "last": total - 1}
    quality = json.loads(Path(str(args.processed) + ".quality.json").read_text(encoding="utf-8"))
    x, y, width, height = quality["watermark_box"]
    left = min(stream["width"] - 75, max(0, round(x + width / 2 - 37.5)))
    top = min(stream["height"] - 75, max(0, round(y + height / 2 - 37.5)))
    select = "+".join(f"eq(n,{index})" for index in sorted(set(labels.values())))
    filters = f"select='{select}',format=bgr24,crop=75:75:{left}:{top}:exact=1,scale=300:300:flags=neighbor"
    versions = {"original": args.original}
    if args.previous:
        versions["previous"] = args.previous
    versions["processed"] = args.processed

    args.output.mkdir(parents=True, exist_ok=True)
    crops = {}
    for version, source in versions.items():
        data = subprocess.check_output([
            "ffmpeg", "-nostdin", "-v", "error", "-noautorotate", "-i", str(source),
            "-map", "0:V:0", "-vf", filters, "-fps_mode", "passthrough",
            "-c:v", "rawvideo", "-threads", "1", "-pix_fmt", "bgr24", "-f", "rawvideo", "pipe:1",
        ])
        decoded = np.frombuffer(data, np.uint8).reshape(-1, 300, 300, 3)
        by_index = dict(zip(sorted(set(labels.values())), decoded, strict=True))
        for label, index in labels.items():
            crop = by_index[index]
            path = args.output / f"{label}-{index:05d}-{version}.png"
            if not cv2.imwrite(str(path), crop):
                raise RuntimeError(f"Unable to write {path}")
            crops[label, version] = crop

    rows = []
    for label, index in labels.items():
        title = np.full((28, 300 * len(versions), 3), 22, np.uint8)
        for column, version in enumerate(versions):
            cv2.putText(title, f"Frame {index} | {version} 4x", (column * 300 + 8, 19),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (245, 245, 245), 1, cv2.LINE_AA)
        rows.extend((title, np.hstack([crops[label, version] for version in versions])))
    cv2.imwrite(str(args.output / "comparison.png"), np.vstack(rows))


if __name__ == "__main__":
    main()
