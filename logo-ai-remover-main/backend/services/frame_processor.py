import json
import logging
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np

from backend.services.mask_service import normalized_to_pixels
from backend.services.tracker import WatermarkTracker


logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int, int, str, str], None]
# Args: processed_frames, total_frames, progress_percent, stage, message
PreviewCallback = Callable[[Path], None]
# Callback triggered when early preview video is generated
CancelCheck = Callable[[], bool]


def process_frames(
    input_path: Path,
    intermediate_path: Path,
    tracking_path: Path,
    region: dict,
    fps: float,
    frame_count: int,
    progress_callback: ProgressCallback,
    preview_output_path: Path | None = None,
    preview_callback: PreviewCallback | None = None,
    is_cancelled: CancelCheck | None = None,
) -> list[tuple[int, int, int, int]]:
    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        raise RuntimeError("Could not open the original video stream")

    ok, first_frame = capture.read()
    if not ok:
        capture.release()
        raise RuntimeError("Could not decode video frames")

    height, width = first_frame.shape[:2]
    initial_box = normalized_to_pixels(region, width, height)
    tracker = WatermarkTracker(first_frame, initial_box)

    # Main output writer
    writer = cv2.VideoWriter(
        str(intermediate_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("Could not initialize video frame writer")

    # Preview writer (for quick preview in first 3.5 seconds)
    preview_writer = None
    preview_frames_target = min(max(int(fps * 3.5), 30), max(1, frame_count))
    preview_written = False
    temp_preview_intermediate = None

    if preview_output_path is not None and preview_callback is not None:
        temp_preview_intermediate = intermediate_path.parent / "preview_raw.mp4"
        preview_writer = cv2.VideoWriter(
            str(temp_preview_intermediate),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height),
        )

    boxes: list[tuple[int, int, int, int]] = []
    index = 0
    frame = first_frame
    prev_roi_repaired = None

    try:
        while True:
            if is_cancelled is not None and is_cancelled():
                raise RuntimeError("Processing cancelled by user")

            box = initial_box if index == 0 else tracker.update(frame)
            bx, by, bw, bh = box

            # ROI with padding for 100x faster inpainting performance
            pad = max(12, int(min(bw, bh) * 0.2))
            rx1 = max(0, bx - pad)
            ry1 = max(0, by - pad)
            rx2 = min(width, bx + bw + pad)
            ry2 = min(height, by + bh + pad)

            roi = frame[ry1:ry2, rx1:rx2].copy()
            h_roi, w_roi = roi.shape[:2]

            # Precise localized mask
            mask_roi = np.zeros((h_roi, w_roi), dtype=np.uint8)
            my1 = max(0, by - ry1)
            my2 = min(h_roi, by - ry1 + bh)
            mx1 = max(0, bx - rx1)
            mx2 = min(w_roi, bx - rx1 + bw)
            mask_roi[my1:my2, mx1:mx2] = 255

            # High quality inpainting on localized patch
            repaired_roi = cv2.inpaint(roi, mask_roi, 3, cv2.INPAINT_TELEA)

            # Temporal blend with previous frame's reconstructed texture to prevent flicker
            if prev_roi_repaired is not None and prev_roi_repaired.shape == repaired_roi.shape:
                repaired_roi = (
                    repaired_roi.astype(np.float32) * 0.85
                    + prev_roi_repaired.astype(np.float32) * 0.15
                ).astype(np.uint8)
            prev_roi_repaired = repaired_roi

            # Edge feathering for seamless blending with surrounding image
            feather = cv2.GaussianBlur(mask_roi.astype(np.float32) / 255.0, (9, 9), 2.5)[:, :, None]
            blended_roi = (repaired_roi * feather + roi * (1.0 - feather)).astype(np.uint8)
            frame[ry1:ry2, rx1:rx2] = blended_roi

            writer.write(frame)
            boxes.append(box)

            # Early preview write
            if preview_writer is not None and index < preview_frames_target:
                preview_writer.write(frame)
                if index + 1 == preview_frames_target:
                    preview_writer.release()
                    preview_writer = None
                    preview_written = True
                    try:
                        preview_callback(temp_preview_intermediate)
                    except Exception as err:
                        logger.warning("Early preview generation callback error: %s", err)

            index += 1

            # Progress calculation: 25% to 75% for frame reconstruction
            if index % 4 == 0 or index == frame_count:
                fraction = index / max(1, frame_count)
                percent = int(25 + fraction * 50)
                progress_callback(
                    index,
                    frame_count,
                    percent,
                    "Reconstructing frames",
                    f"Processing frame {index} of {frame_count}",
                )

            ok, frame = capture.read()
            if not ok:
                break
    finally:
        writer.release()
        capture.release()
        if preview_writer is not None:
            preview_writer.release()

    if not boxes:
        raise RuntimeError("No frames could be processed")

    tracking_path.write_text(
        json.dumps(
            {
                "frameCount": len(boxes),
                "boxes": [
                    {"frameIndex": i, "x": b[0], "y": b[1], "width": b[2], "height": b[3]}
                    for i, b in enumerate(boxes)
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return boxes
