"""FFmpeg frame I/O and source timing for the video cleaner."""

import json
import subprocess
from fractions import Fraction

import cv2
import numpy as np


def probe(path, *args):
    result = subprocess.run([
        "ffprobe", "-v", "error", *args, "-of", "json", str(path),
    ], check=True, capture_output=True)
    if result.stderr:
        raise ValueError("FFmpeg could not read all of the video data.")
    return json.loads(result.stdout)


def video_stream(path):
    return probe(path, "-select_streams", "V:0", "-show_streams")["streams"][0]


def audio_stream(path):
    streams = audio_streams(path)
    return streams[0] if streams else None


def audio_streams(path):
    return probe(path, "-select_streams", "a", "-show_streams").get("streams", [])


MP4_AUDIO_CODECS = {"aac", "mp3", "ac3", "eac3", "alac"}


def mp4_audio_args(streams):
    """Choose stream copy or AAC independently for each track."""
    args = ["-c:a", "copy"]
    for index, stream in enumerate(streams):
        if stream["codec_name"] not in MP4_AUDIO_CODECS:
            args.extend([f"-c:a:{index}", "aac", f"-b:a:{index}", "192k"])
    return args


def rotation(stream):
    deg = next((item["rotation"] for item in stream.get("side_data_list", [])
                if "rotation" in item), None)
    if deg is None:
        raw = (stream.get("tags") or {}).get("rotate")
        if raw is not None:
            try:
                deg = -int(round(float(raw)))
            except (TypeError, ValueError):
                deg = 0
        else:
            deg = 0
    return deg


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


def display_size(width, height, degrees):
    turns = round(degrees / 90) % 4
    return (height, width) if turns % 2 else (width, height)


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


def decoded_timeline(path):
    packets = probe(
        path, "-select_streams", "V:0", "-show_packets",
        "-show_entries", "packet=pts,duration",
    ).get("packets", [])
    pkt_stamps = [pkt.get("pts") for pkt in packets]
    if packets and not any(s in (None, "N/A") for s in pkt_stamps):
        paired = sorted(
            ((int(pkt["pts"]), pkt.get("duration")) for pkt in packets),
            key=lambda item: item[0],
        )
        stamps = [item[0] for item in paired]
        if all(before < after for before, after in zip(stamps, stamps[1:])):
            tail = paired[-1][1]
            return stamps, int(tail) if tail not in (None, "N/A") else None

    frames = probe(
        path, "-threads", "2", "-select_streams", "V:0", "-show_frames",
        "-show_entries", "frame=best_effort_timestamp,duration,pkt_duration",
    ).get("frames", [])
    if not frames:
        raise ValueError("The video contains no decodable frames.")
    stamps = [frame.get("best_effort_timestamp") for frame in frames]
    if any(stamp in (None, "N/A") for stamp in stamps):
        raise ValueError("The video has missing frame timestamps.")
    stamps = [int(stamp) for stamp in stamps]

    if any(after <= before for before, after in zip(stamps, stamps[1:])):
        raise ValueError("The video has duplicate or out-of-order presentation timestamps.")
    tail = frames[-1].get("duration") or frames[-1].get("pkt_duration")
    return stamps, int(tail) if tail not in (None, "N/A") else None


def video_timing(source, stream, rate, *, timeline=None):
    """Recreate decoded presentation timestamps, including long VFR clips."""
    stamps, tail = timeline if timeline is not None else decoded_timeline(source)

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
    tail = tail or round(step)
    tail_rate = 1 / (time_base * max(1, tail))
    return len(stamps), filters, [], tail_rate, time_base


def _audio_packet_hashes(path):
    return subprocess.check_output([
        "ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", str(path),
        "-map", "0:a", "-c:a", "copy", "-f", "streamhash", "-",
    ]).splitlines()


def verify_export(source, output, stream, timeline, input_audio):
    """Decode the entire export and check timing against the source before publication."""
    result = video_stream(output)
    if any(stream[key] != result[key] for key in ("width", "height")) or rotation(stream) != rotation(result):
        raise ValueError("The export changed the video dimensions or orientation.")
    if sample_aspect_ratio(stream) != sample_aspect_ratio(result):
        raise ValueError("The export changed the video aspect ratio.")

    before, source_tail = timeline
    after, output_tail = decoded_timeline(output)
    before_scale = float(Fraction(stream["time_base"]))
    after_scale = float(Fraction(result["time_base"]))
    before_times = np.asarray(before) * before_scale
    after_times = np.asarray(after) * after_scale
    clock_shift = after_times[0] - before_times[0]
    tolerance = max(0.001, before_scale, after_scale)
    if len(before) != len(after) or not np.allclose(
        before_times + clock_shift, after_times, rtol=0, atol=tolerance,
    ):
        raise ValueError("The export changed the source frame count or playback timing.")
    if source_tail and output_tail and abs(source_tail * before_scale - output_tail * after_scale) > tolerance:
        raise ValueError("The export changed the duration of the final video frame.")

    output_audio = audio_streams(output)
    if len(input_audio) != len(output_audio):
        raise ValueError("The export lost one or more source audio tracks.")

    copied = [s["codec_name"] in MP4_AUDIO_CODECS for s in input_audio]
    if any(copied):
        source_hashes = _audio_packet_hashes(source)
        output_hashes = _audio_packet_hashes(output)
        if any(copy and a != b for copy, a, b in zip(copied, source_hashes, output_hashes)):
            raise ValueError("The export changed an audio track expected to be copied.")

    for old, new, copy in zip(input_audio, output_audio, copied):
        if int(old["channels"]) != int(new["channels"]):
            raise ValueError("The export changed an audio track's channel count.")
        # AAC priming and end padding may extend a transcoded track by one packet.
        packet_buffer = 2048 / int(new["sample_rate"])
        start_old = float(old.get("start_time") or 0)
        start_new = float(new.get("start_time") or 0)
        sync_tolerance = max(0.002, tolerance) if copy else packet_buffer
        if abs(start_new - start_old - clock_shift) > sync_tolerance:
            raise ValueError("The export changed the audio/video start offset.")
        if old.get("duration") and new.get("duration"):
            if abs(float(new["duration"]) - float(old["duration"])) > packet_buffer + tolerance:
                raise ValueError("The export changed a source audio track's duration.")

    return {
        "decoded_frames_verified": len(after),
        "max_frame_timing_error_ms": round(float(np.max(np.abs(after_times - before_times - clock_shift))) * 1000, 3),
        "audio_tracks": ["copied" if copy else "aac" for copy in copied],
    }


def sample_aspect_ratio(stream):
    sar = stream.get("sample_aspect_ratio") or "1:1"
    return "1:1" if sar in ("0:1", "N/A") else sar


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
    color_range = stream.get("color_range")
    if stream.get("pix_fmt") == "yuvj420p":
        if not color_range or color_range in ("unknown", "unspecified"):
            color_range = "pc"
            output.extend(["-color_range", "pc"])
            tags.append("range=pc")
        if not matrix:
            matrix = "bt601"
    scale = []
    if matrix:
        scale.append(f"out_color_matrix={matrix}")
    if color_range in ("pc", "tv"):
        scale.append(f"out_range={color_range}")
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
