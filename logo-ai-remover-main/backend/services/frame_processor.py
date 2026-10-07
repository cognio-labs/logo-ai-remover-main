import json
import logging
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np

from backend.services.mask_service import normalized_to_pixels
from backend.services.tracker import WatermarkTracker
from backend.services.watermark_detector import gemini_mask_for_box

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int, int, str, str], None]
PreviewCallback = Callable[[Path], None]
CancelCheck = Callable[[], bool]


def _temporally_stabilize(
    source_roi: np.ndarray,
    repaired_roi: np.ndarray,
    mask_roi: np.ndarray,
    previous_source: np.ndarray | None,
    previous_repaired: np.ndarray | None,
) -> np.ndarray:
    """Warp a small amount of the preceding clean texture into the current mask."""
    if (
        previous_source is None
        or previous_repaired is None
        or previous_source.shape != source_roi.shape
        or previous_repaired.shape != repaired_roi.shape
    ):
        return repaired_roi
    current_gray = cv2.cvtColor(source_roi, cv2.COLOR_BGR2GRAY)
    previous_gray = cv2.cvtColor(previous_source, cv2.COLOR_BGR2GRAY)
    flow_to_previous = cv2.calcOpticalFlowFarneback(
        current_gray,
        previous_gray,
        None,
        0.5,
        3,
        15,
        3,
        5,
        1.1,
        0,
    )
    grid_x, grid_y = np.meshgrid(
        np.arange(source_roi.shape[1], dtype=np.float32),
        np.arange(source_roi.shape[0], dtype=np.float32),
    )
    warped_previous = cv2.remap(
        previous_repaired,
        grid_x + flow_to_previous[:, :, 0],
        grid_y + flow_to_previous[:, :, 1],
        cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT101,
    )
    stable = repaired_roi.copy()
    active = mask_roi > 0
    stable[active] = np.clip(
        repaired_roi[active].astype(np.float32) * 0.82
        + warped_previous[active].astype(np.float32) * 0.18,
        0,
        255,
    ).astype(np.uint8)
    return stable


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
    """Stream frames through a tight, tracked Gemini mask and localized inpainting."""
    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        raise RuntimeError("Could not open the original video stream")
    ok, first_frame = capture.read()
    if not ok:
        capture.release()
        raise RuntimeError("Could not decode video frames")

    height, width = first_frame.shape[:2]
    initial_box = normalized_to_pixels(region, width, height)
    initial_mask = gemini_mask_for_box(first_frame.shape, initial_box)
    tracker = WatermarkTracker(first_frame, initial_box, initial_mask)

    intermediate_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(intermediate_path),
        cv2.VideoWriter_fourcc(*("FFV1" if intermediate_path.suffix.lower() == ".mkv" else "mp4v")),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("Could not initialize video frame writer")

    preview_writer = None
    preview_frames_target = min(max(int(fps * 3.5), 30), max(1, frame_count))
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
    previous_source_roi = None
    previous_repaired_roi = None

    try:
        while True:
            if is_cancelled is not None and is_cancelled():
                raise RuntimeError("Processing cancelled by user")

            box = tracker.update(frame)
            bx, by, bw, bh = box
            full_mask = gemini_mask_for_box(frame.shape, box)
            points = cv2.findNonZero(full_mask)
            if points is None:
                raise RuntimeError("Generated watermark mask was empty")
            mx, my, mw, mh = cv2.boundingRect(points)
            pad = max(12, round(min(bw, bh) * 0.22))
            rx1, ry1 = max(0, mx - pad), max(0, my - pad)
            rx2, ry2 = min(width, mx + mw + pad), min(height, my + mh + pad)
            source_roi = frame[ry1:ry2, rx1:rx2].copy()
            mask_roi = full_mask[ry1:ry2, rx1:rx2]

            repaired_roi = cv2.inpaint(source_roi, mask_roi, 4, cv2.INPAINT_TELEA)
            repaired_roi = _temporally_stabilize(
                source_roi,
                repaired_roi,
                mask_roi,
                previous_source_roi,
                previous_repaired_roi,
            )
            previous_source_roi = source_roi
            previous_repaired_roi = repaired_roi.copy()

            feather_radius = max(3, round(min(bw, bh) * 0.035))
            kernel_size = feather_radius * 2 + 1
            alpha = cv2.GaussianBlur(
                mask_roi.astype(np.float32) / 255.0,
                (kernel_size, kernel_size),
                max(0.8, feather_radius / 2),
            )[:, :, None]
            blended_roi = np.clip(
                repaired_roi.astype(np.float32) * alpha
                + source_roi.astype(np.float32) * (1.0 - alpha),
                0,
                255,
            ).astype(np.uint8)
            frame[ry1:ry2, rx1:rx2] = blended_roi

            writer.write(frame)
            boxes.append(box)

            if preview_writer is not None and index < preview_frames_target:
                preview_writer.write(frame)
                if index + 1 == preview_frames_target:
                    preview_writer.release()
                    preview_writer = None
                    try:
                        preview_callback(temp_preview_intermediate)
                    except Exception as err:
                        logger.warning("Early preview generation callback error: %s", err)

            index += 1
            if index % 4 == 0 or index == frame_count:
                fraction = min(1.0, index / max(1, frame_count))
                progress_callback(
                    index,
                    frame_count,
                    int(25 + fraction * 53),
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
                "maskType": "gemini_sparkle",
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


