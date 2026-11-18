"""FFmpeg frame I/O and source timing for the video cleaner."""

import json
import subprocess
from fractions import Fraction

import cv2
import numpy as np


def probe(path, *args):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", *args, "-of", "json", str(path),
    ]))


def video_stream(path):
    return probe(path, "-select_streams", "V:0", "-show_streams")["streams"][0]


def rotation(stream):
    return next((item["rotation"] for item in stream.get("side_data_list", [])
                 if "rotation" in item), 0)


def encoded_box(box, width, height, degrees):
    """Map a normalized rectangle on the displayed video to encoded pixels."""
    x, y, w, h = box
    turns = round(degrees / 90) % 4
    if turns == 1:
        x, y, w, h = 1 - y - h, x, h, w
    elif turns == 2:
        x, y = 1 - x - w, 1 - y - h
    elif turns == 3:
        x, y, w, h = y, 1 - x - w, h, w
    return round(x * width), round(y * height), max(1, round(w * width)), max(1, round(h * height))


def frame_rate(stream):
    for key in ("r_frame_rate", "avg_frame_rate"):
        try:
            rate = Fraction(stream.get(key, "0/0"))
        except (ValueError, ZeroDivisionError):
            continue
        if rate > 0:
            return rate
    raise RuntimeError("The source frame rate could not be read.")


def read_frame(pipe, width, height, native_yuv=False):
    count = width * height * 3
    if native_yuv:
        count //= 2
    buffer = bytearray(count)
    view = memoryview(buffer)
    offset = 0
    while offset < count:
        size = pipe.readinto(view[offset:])
        if not size:
            if not offset:
                return None
            raise RuntimeError("FFmpeg returned a truncated video frame.")
        offset += size
    frame = np.frombuffer(buffer, np.uint8)
    return frame if native_yuv else frame.reshape(height, width, 3)


def video_timing(source, stream, rate):
    """Build a compact frame-index lookup when the stream has irregular timestamps."""
    decoded = probe(source, "-select_streams", "V:0", "-show_frames",
                    "-show_entries", "frame=best_effort_timestamp,duration,pkt_duration")["frames"]
    stamps = [int(frame["best_effort_timestamp"]) for frame in decoded]
    if not stamps or any(after <= before for before, after in zip(stamps, stamps[1:])):
        raise RuntimeError("The source does not provide strictly increasing video timestamps.")
    time_base = Fraction(stream["time_base"])
    step = 1 / (time_base * rate)
    first = stamps[0]
    if all(abs(stamp - (first + i * step)) <= 1 for i, stamp in enumerate(stamps)):
        start = float(first * time_base)
        return len(stamps), [], ["-itsoffset", str(start)] if start else [], rate, None

    def expression(start, end):
        if end - start == 1:
            return str(stamps[start])
        middle = (start + end) // 2
        return f"if(lt(N,{middle}),{expression(start, middle)},{expression(middle, end)})"

    filters = [f"settb={time_base}", f"setpts='{expression(0, len(stamps))}'"]
    tail = int(decoded[-1].get("duration") or decoded[-1].get("pkt_duration") or round(step))
    tail_rate = 1 / (time_base * max(1, tail))
    return len(stamps), filters, [], tail_rate, time_base


def encode_colors(stream, native_yuv=False):
    output = []
    tags = []
    for field, option, parameter in (
        ("color_range", "-color_range", "range"),
        ("color_space", "-colorspace", "colorspace"),
        ("color_transfer", "-color_trc", "color_trc"),
        ("color_primaries", "-color_primaries", "color_primaries"),
    ):
        value = stream.get(field)
        if value and value not in ("unknown", "unspecified", "reserved"):
            output.extend([option, value])
            tags.append(f"{parameter}={value}")
    matrix = {"bt709": "bt709", "bt470bg": "bt601", "smpte170m": "bt601",
              "smpte240m": "smpte240m", "bt2020nc": "bt2020"}.get(stream.get("color_space"))
    scale = []
    if matrix:
        scale.append(f"out_color_matrix={matrix}")
    if stream.get("color_range") in ("pc", "tv"):
        scale.append(f"out_range={stream['color_range']}")
    sar = stream.get("sample_aspect_ratio", "1:1")
    filters = ["scale=" + ":".join(scale)] if scale and not native_yuv else []
    if sar not in ("0:1", "N/A", "1:1"):
        filters.append("setsar=" + sar.replace(":", "/"))
    if tags:
        filters.append("setparams=" + ":".join(tags))
    return output, filters


YUV_COEFFICIENTS = {
    "bt709": (0.2126, 0.0722),
    "bt470bg": (0.299, 0.114),
    "smpte170m": (0.299, 0.114),
    "smpte240m": (0.212, 0.087),
    "bt2020nc": (0.2627, 0.0593),
    "unknown": (0.299, 0.114),
}


def yuv_crop(frame, width, height, region, coefficients, full_range, *, floating=False):
    """Decode only the selected patch from native 4:2:0 and retain plane views."""
    left, top, right, bottom = region
    area = width * height
    y = frame[:area].reshape(height, width)[top:bottom, left:right]
    u, v = frame[area:].reshape(2, height // 2, width // 2)[
        :, top//2:bottom//2, left//2:right//2
    ]
    y_offset, y_span, chroma_span = (0, 255, 255) if full_range else (16, 219, 224)
    kr, kb = coefficients
    kg = 1 - kr - kb
    luma = (y.astype(np.float32) - y_offset) * (255 / y_span)
    cb = (cv2_resize_plane(u, y.shape) - 128) * (255 / chroma_span)
    cr = (cv2_resize_plane(v, y.shape) - 128) * (255 / chroma_span)
    blue = luma + 2 * (1 - kb) * cb
    red = luma + 2 * (1 - kr) * cr
    green = (luma - kr * red - kb * blue) / kg
    bgr = np.clip(np.stack((blue, green, red), axis=-1), 0, 255)
    if not floating:
        bgr = np.rint(bgr).astype(np.uint8)
    return bgr, (y, u, v)


def cv2_resize_plane(plane, shape):
    """Use interpolated chroma for RGB reconstruction within the crop."""
    return cv2.resize(plane.astype(np.float32), (shape[1], shape[0]), interpolation=cv2.INTER_LINEAR)


def apply_yuv_delta(before, after, planes, coefficients, full_range):
    """Apply RGB changes back to native planes without reconverting unchanged pixels."""
    b, g, r = np.moveaxis(after.astype(np.float32) - before, -1, 0)
    kr, kb = coefficients
    luma = kr * r + (1 - kr - kb) * g + kb * b
    y_span, chroma_span = (255, 255) if full_range else (219, 224)
    y, u, v = planes
    luma = luma * (y_span / 255)
    cb = (b * (y_span / 255) - luma) * (chroma_span / y_span) / (2 * (1 - kb))
    cr = (r * (y_span / 255) - luma) * (chroma_span / y_span) / (2 * (1 - kr))
    for plane, delta in ((y, luma), (u, cb), (v, cr)):
        if plane.shape != delta.shape:
            delta = delta.reshape(plane.shape[0], 2, plane.shape[1], 2).mean(axis=(1, 3))
        plane[:] = np.clip(np.rint(plane + delta), 0, 255).astype(np.uint8)
