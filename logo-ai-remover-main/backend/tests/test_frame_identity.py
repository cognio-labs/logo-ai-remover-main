from pathlib import Path

import cv2
import numpy as np

from backend.services.frame_processor import process_frames


def test_processed_frames_keep_same_sequence_and_unmasked_content(tmp_path: Path):
    source = tmp_path / "input.mp4"
    output = tmp_path / "track.mp4"
    tracking = tmp_path / "tracking.json"
    width, height, fps, count = 160, 120, 12.0, 12
    writer = cv2.VideoWriter(str(source), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    for index in range(count):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:] = (index * 8, 35, 90)
        cv2.circle(frame, (20 + index * 5, 60), 10, (0, 220, 0), -1)
        cv2.rectangle(frame, (132, 96), (154, 114), (255, 255, 255), -1)
        writer.write(frame)
    writer.release()

    process_frames(
        source,
        output,
        tracking,
        {"x": 132 / width, "y": 96 / height, "width": 22 / width, "height": 18 / height},
        fps,
        count,
        lambda *_: None,
    )
    original_capture = cv2.VideoCapture(str(source))
    cleaned_capture = cv2.VideoCapture(str(output))
    observed = 0
    while True:
        ok_original, original = original_capture.read()
        ok_cleaned, cleaned = cleaned_capture.read()
        if not ok_original or not ok_cleaned:
            break
        # The moving subject and frame ordering remain the same outside the mask.
        difference = np.mean(np.abs(original[:85, :120].astype(float) - cleaned[:85, :120].astype(float)))
        assert difference < 12
        observed += 1
    original_capture.release()
    cleaned_capture.release()
    assert observed == count
    assert tracking.is_file()
