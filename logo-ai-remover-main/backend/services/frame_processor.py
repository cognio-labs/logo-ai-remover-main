import json
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np

from backend.services.mask_service import create_mask, feather_mask, normalized_to_pixels
from backend.services.tracker import WatermarkTracker


ProgressCallback = Callable[[int, str], None]


def process_frames(
    input_path: Path,
    intermediate_path: Path,
    tracking_path: Path,
    region: dict,
    fps: float,
    frame_count: int,
    progress_callback: ProgressCallback,
) -> list[tuple[int, int, int, int]]:
    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        raise RuntimeError("Could not open the job's original video")
    ok, first_frame = capture.read()
    if not ok:
        capture.release()
        raise RuntimeError("Could not decode the first frame")
    height, width = first_frame.shape[:2]
    initial_box = normalized_to_pixels(region, width, height)
    tracker = WatermarkTracker(first_frame, initial_box)
    writer = cv2.VideoWriter(
        str(intermediate_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("Could not create the cleaned video track")

    boxes: list[tuple[int, int, int, int]] = []
    index = 0
    frame = first_frame
    try:
        while True:
            box = initial_box if index == 0 else tracker.update(frame)
            mask = create_mask((height, width), box)
            repaired = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
            alpha = feather_mask(mask)[:, :, None]
            cleaned = np.clip(repaired * alpha + frame * (1.0 - alpha), 0, 255).astype(np.uint8)
            writer.write(cleaned)
            boxes.append(box)
            index += 1
            if index % 3 == 0 or index == frame_count:
                fraction = index / max(frame_count, index)
                progress_callback(40 + min(36, int(fraction * 36)), "Reconstructing masked region")
            ok, frame = capture.read()
            if not ok:
                break
    finally:
        writer.release()
        capture.release()

    if not boxes:
        raise RuntimeError("No frames were processed")
    tracking_path.write_text(
        json.dumps(
            {
                "frameCount": len(boxes),
                "boxes": [
                    {"frameIndex": index, "x": box[0], "y": box[1], "width": box[2], "height": box[3]}
                    for index, box in enumerate(boxes)
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return boxes
