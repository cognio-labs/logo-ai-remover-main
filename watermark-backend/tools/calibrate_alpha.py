"""Generate a grayscale 16-bit sparkle matte from owned reference clips."""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from processor import _sample_gray
from video_stream import frame_rate, video_stream, video_timing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", nargs="+", help="Clips with the same sparkle size and position")
    parser.add_argument("--box", type=int, nargs=4, required=True, metavar=("X", "Y", "W", "H"),
                        help="Encoded-pixel crop including a few clean pixels around the glow")
    parser.add_argument("--background", type=float, nargs="+",
                        help="Known flat background luma 0–255 per clip; otherwise infer from the border")
    parser.add_argument("--output", type=Path, default=Path("alpha_mask.png"))
    parser.add_argument("--shadow-output", type=Path)
    args = parser.parse_args()
    if args.background and (len(args.background) != len(args.reference)
                            or not all(0 <= value <= 255 for value in args.background)):
        parser.error("Supply one background luma from 0 to 255 per clip.")
    x, y, width, height = args.box
    if x < 0 or y < 0 or min(width, height) < 9 or width != height:
        parser.error("Supply a square crop of at least 9×9 pixels within each clip.")
    rows, cols = np.mgrid[:height, :width]
    design = np.stack((np.ones_like(rows), cols, rows), axis=-1)
    border = (rows < 2) | (rows >= height - 2) | (cols < 2) | (cols >= width - 2)
    foregrounds, backgrounds = [], []
    for index, path in enumerate(args.reference):
        stream = video_stream(path)
        if x + width > stream["width"] or y + height > stream["height"]:
            parser.error(f"The calibration crop is outside {path}.")
        total, *_ = video_timing(path, stream, frame_rate(stream))
        samples = _sample_gray(str(Path(path).resolve()), (x, y, x+width, y+height), total)
        for patch in samples:
            if args.background:
                predicted = np.full(patch.shape, args.background[index])
            else:
                fit = np.linalg.lstsq(design[border], patch[border], rcond=None)[0]
                predicted = design @ fit
                if np.quantile(np.abs((patch - predicted)[border]), 0.8) > 6:
                    continue
            foregrounds.append(patch)
            backgrounds.append(np.clip(predicted, 0, 255))
    if not foregrounds:
        parser.error("No smooth reference frames found. Use a solid-color reference or supply its luma.")

    actual = np.stack(foregrounds).astype(np.float32)
    background = np.stack(backgrounds).astype(np.float32)
    delta = actual - background
    if np.ptp(np.median(background, axis=(1, 2))) >= 70:
        # I = (1 - A)·B + 255·W. The slope yields total opacity A,
        # and the intercept separates the white contribution W from shadow.
        x_centered = background - background.mean(axis=0)
        slope = np.sum(x_centered * (actual - actual.mean(axis=0)), axis=0)
        slope /= np.maximum(np.sum(x_centered**2, axis=0), 1)
        alpha = (actual.mean(axis=0) - slope * background.mean(axis=0)) / 255
        shadow = 1 - slope - alpha
    else:
        alpha = np.median(delta / np.maximum(255 - background, 16), axis=0)
        shadow = np.median(-delta / np.maximum(background, 16), axis=0)

    for path, matte in ((args.output, alpha), (args.shadow_output, shadow)):
        if path:
            matte = np.where(matte >= 0.008, np.clip(matte, 0, 0.95), 0)
            if not cv2.imwrite(str(path), np.rint(matte * 65535).astype(np.uint16)):
                raise OSError(f"Could not write {path}")
    print(f"Wrote matte from {len(foregrounds)} reference frames to {args.output}")


if __name__ == "__main__":
    main()
