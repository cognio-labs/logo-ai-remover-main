"""Conservatively remove colored marks from a raster document image."""

import argparse
from pathlib import Path

import cv2
import numpy as np

from backend.services.pdf.inpaint import remove_uniform_color_overlay
from backend.services.pdf.mask import build_chromatic_image_mask


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = cv2.imread(str(args.input), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Input image could not be decoded")
    mask = build_chromatic_image_mask(image)
    if not np.any(mask):
        raise ValueError("No safely removable colored pixels were detected")
    cleaned = remove_uniform_color_overlay(image, mask)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(args.output), cleaned):
        raise OSError("Could not save cleaned image")
    print(f"Saved {args.output} ({image.shape[1]} x {image.shape[0]} pixels)")


if __name__ == "__main__":
    main()
