"""
Watermark Removal Backend — Flask
Handles both video and image watermark removal.
No paid APIs. OpenCV + FFmpeg only.
"""
from __future__ import annotations

import io
import os
import re
import shutil
import threading
import time
import uuid
import zipfile
from pathlib import Path
from queue import Queue
from werkzeug.utils import secure_filename
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
import cv2

from processor import remove_watermark
from image_processor import process_image_file
from gemini_corner_inpainter import remove_gemini_corner_sparkle

BASE_DIR = Path(__file__).resolve().parent
IS_VERCEL = bool(os.environ.get("VERCEL"))
WORK_DIR = Path("/tmp") if IS_VERCEL else BASE_DIR

# --- Video Watermark Directories ---
VIDEO_UPLOADS = WORK_DIR / "uploads"
VIDEO_OUTPUTS = WORK_DIR / "outputs"
STATIC = BASE_DIR / "static"
VIDEO_UPLOADS.mkdir(parents=True, exist_ok=True)
VIDEO_OUTPUTS.mkdir(parents=True, exist_ok=True)
if not IS_VERCEL and not STATIC.exists():
    STATIC.mkdir(parents=True, exist_ok=True)

# --- Image Watermark Directories ---
IMAGE_JOB_DIR = Path(os.environ.get("IMAGE_JOB_DIR", str(WORK_DIR / "image_jobs")))
IMAGE_UPLOADS = IMAGE_JOB_DIR / "uploads"
IMAGE_RESULTS = IMAGE_JOB_DIR / "results"
IMAGE_UPLOADS.mkdir(parents=True, exist_ok=True)
IMAGE_RESULTS.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024   # 20 MB per file
MAX_BATCH_IMAGES = int(os.environ.get("MAX_BATCH_IMAGES", "10"))
RETENTION_SECONDS = 60 * 60               # 1 hour auto-cleanup
IMAGE_WORKER_COUNT = max(1, int(os.environ.get("IMAGE_WORKERS", "2")))
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv"}

app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = max(
    500 * 1024 * 1024,  # 500 MB for video
    MAX_IMAGE_FILE_BYTES * MAX_BATCH_IMAGES + 4 * 1024 * 1024,
)

# Allow requests from Next.js dev server and production domain
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS", "HEAD"],
    "allow_headers": ["Content-Type", "Accept", "Authorization", "X-Requested-With"],
    "expose_headers": ["X-Box"],
}})

# =============================================================
# 1. VIDEO WATERMARK JOBS & WORKER
# =============================================================
video_jobs: dict[str, dict] = {}


def video_worker(job_id: str, src: str, dst: str, box):
    def on_progress(percent, frames, stage):
        video_jobs[job_id].update(progress=percent, frames=frames, stage=stage)

    try:
        video_jobs[job_id]["status"] = "processing"
        remove_watermark(src, dst, progress_cb=on_progress, manual_box=box)
        video_jobs[job_id].update(status="done", progress=100)
    except Exception as e:
        video_jobs[job_id].update(status="error", error=str(e))


@app.get("/")
def index():
    index_path = STATIC / "index.html"
    if index_path.exists():
        return send_from_directory(str(STATIC), "index.html")
    return jsonify(status="ok", service="Bellix Watermark Backend", version="2.0")


@app.post("/api/upload")
def video_upload():
    f = request.files.get("video")
    if not f:
        return jsonify(error="No video uploaded"), 400
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return jsonify(error="Unsupported format. Use mp4, mov, webm, avi, mkv"), 400

    job_id = uuid.uuid4().hex
    src = str(VIDEO_UPLOADS / f"{job_id}{ext}")
    dst = str(VIDEO_OUTPUTS / f"{job_id}.mp4")
    f.save(src)

    box = None
    if request.form.get("box"):
        try:
            box = tuple(int(v) for v in request.form["box"].split(","))
            assert len(box) == 4
        except Exception:
            return jsonify(error="box must be x,y,w,h"), 400

    video_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "frames": 0,
        "stage": "Queued",
        "error": None,
    }
    threading.Thread(
        target=video_worker, args=(job_id, src, dst, box), daemon=True
    ).start()
    return jsonify(job_id=job_id)


@app.get("/api/status/<job_id>")
def video_status(job_id: str):
    job = video_jobs.get(job_id)
    if not job:
        return jsonify(error="Job not found"), 404
    return jsonify(job)


@app.get("/api/result/<job_id>")
def video_result(job_id: str):
    path = VIDEO_OUTPUTS / f"{job_id}.mp4"
    if video_jobs.get(job_id, {}).get("status") != "done" or not path.exists():
        return jsonify(error="Not ready"), 404
    return send_file(str(path), mimetype="video/mp4", conditional=True)


@app.get("/api/download/<job_id>")
def video_download(job_id: str):
    path = VIDEO_OUTPUTS / f"{job_id}.mp4"
    if not path.exists():
        return jsonify(error="Not ready"), 404
    return send_file(str(path), as_attachment=True, download_name="clean_video.mp4")


# =============================================================
# 2. IMAGE WATERMARK JOBS — SINGLE FILE ENDPOINT (for Next.js)
# =============================================================
_image_jobs: dict[str, dict] = {}
_image_batches: dict[str, dict] = {}
_state_lock = threading.RLock()
_image_work_queue: Queue = Queue()


def _actual_image_type_ok(data: bytes, filename: str) -> bool:
    ext = Path(secure_filename(filename or "")).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if data[:3] == b"\xff\xd8\xff":
        return True
    if data[:4] in (b"RIFF", b"WEBP") or b"WEBP" in data[:12]:
        return True
    return False


def _public_image_job(job: dict) -> dict:
    return {
        "job_id": job["job_id"],
        "batch_id": job.get("batch_id"),
        "filename": job.get("filename"),
        "status": job["status"],
        "progress": job.get("progress", 0),
        "error": job.get("error"),
    }


def _image_worker_loop():
    while True:
        job_id = _image_work_queue.get()
        with _state_lock:
            job = _image_jobs.get(job_id)
        if not job:
            continue
        try:
            with _state_lock:
                job["status"] = "processing"
                job["progress"] = 10
            result_path = IMAGE_RESULTS / f"{job_id}.png"
            manual_box = job.get("box")
            process_image_file(
                input_path=job["upload_path"],
                output_path=str(result_path),
                manual_box=tuple(manual_box) if manual_box else None,
            )
            with _state_lock:
                job.update(status="completed", progress=100, result_path=str(result_path))
        except Exception as e:
            with _state_lock:
                job.update(status="failed", error=str(e))
        finally:
            _image_work_queue.task_done()


# Start image worker threads
for _ in range(IMAGE_WORKER_COUNT):
    threading.Thread(target=_image_worker_loop, daemon=True).start()


def _auto_cleanup():
    """Delete image jobs and files older than RETENTION_SECONDS."""
    while True:
        time.sleep(300)
        cutoff = time.time() - RETENTION_SECONDS
        with _state_lock:
            expired_jobs = [jid for jid, j in _image_jobs.items()
                            if j.get("created_at", 0) < cutoff]
        for jid in expired_jobs:
            with _state_lock:
                job = _image_jobs.pop(jid, {})
            for key in ("upload_path", "result_path"):
                p = job.get(key)
                if p and Path(p).exists():
                    try:
                        Path(p).unlink()
                    except OSError:
                        pass
        with _state_lock:
            expired_batches = [bid for bid, b in _image_batches.items()
                               if b.get("created_at", 0) < cutoff]
            for bid in expired_batches:
                _image_batches.pop(bid, None)


threading.Thread(target=_auto_cleanup, daemon=True).start()


# ------------------------------------------------------------------
# SINGLE IMAGE UPLOAD (used by Next.js /remove/image page)
# POST /api/image/upload  — field: "image" (single file)
#                           optional field: "box" = "x,y,w,h"
# Returns: { job_id, status }
# ------------------------------------------------------------------
@app.post("/api/image/upload")
def image_upload_single():
    """Accept one image file, queue removal job, return job_id immediately."""
    f = request.files.get("image")
    if not f:
        return jsonify(error="No image uploaded. Use field name 'image'."), 400

    data = f.read()
    if len(data) > MAX_IMAGE_FILE_BYTES:
        return jsonify(error=f"File too large. Max {MAX_IMAGE_FILE_BYTES // (1024*1024)} MB."), 413

    safe_name = secure_filename(f.filename or "image.jpg")
    if not _actual_image_type_ok(data, safe_name):
        return jsonify(error="Only JPG, PNG, or WEBP files are allowed."), 415

    # Parse optional manual box
    box = None
    box_str = request.form.get("box", "").strip()
    if box_str:
        try:
            parts = [int(v.strip()) for v in box_str.split(",")]
            assert len(parts) == 4
            box = parts
        except Exception:
            return jsonify(error="'box' must be 'x,y,w,h' in pixels."), 400

    job_id = uuid.uuid4().hex
    batch_id = uuid.uuid4().hex  # single-image batch
    upload_path = IMAGE_UPLOADS / f"{job_id}.upload"
    upload_path.write_bytes(data)

    job = {
        "job_id": job_id,
        "batch_id": batch_id,
        "filename": safe_name,
        "status": "queued",
        "progress": 0,
        "error": None,
        "created_at": time.time(),
        "upload_path": str(upload_path),
        "box": box,
    }
    with _state_lock:
        _image_jobs[job_id] = job
        _image_batches[batch_id] = {
            "batch_id": batch_id,
            "job_ids": [job_id],
            "created_at": time.time(),
        }
    _image_work_queue.put(job_id)
    return jsonify(job_id=job_id, batch_id=batch_id, status="queued"), 202


# ------------------------------------------------------------------
# BATCH IMAGE UPLOAD (legacy HTML UI)
# POST /api/image/batch-upload  — field: "images[]"
# ------------------------------------------------------------------
@app.post("/api/image/batch-upload")
def image_batch_upload():
    files = request.files.getlist("images[]")
    if not files:
        return jsonify(error="No images uploaded."), 400
    if len(files) > MAX_BATCH_IMAGES:
        return jsonify(error=f"Maximum {MAX_BATCH_IMAGES} images per batch."), 400

    box = None
    box_str = request.form.get("box", "").strip()
    if box_str:
        try:
            parts = [int(v.strip()) for v in box_str.split(",")]
            assert len(parts) == 4
            box = parts
        except Exception:
            return jsonify(error="'box' must be 'x,y,w,h' in pixels."), 400

    batch_id = uuid.uuid4().hex
    batch_jobs: list[str] = []

    for f in files:
        data = f.read()
        if len(data) > MAX_IMAGE_FILE_BYTES:
            return jsonify(error=f"{f.filename}: file too large."), 413
        safe_name = secure_filename(f.filename or "image.jpg")
        if not _actual_image_type_ok(data, safe_name):
            return jsonify(error=f"{safe_name}: only JPG, PNG, or WEBP files are allowed."), 415

        job_id = uuid.uuid4().hex
        upload_path = IMAGE_UPLOADS / f"{job_id}.upload"
        upload_path.write_bytes(data)
        job = {
            "job_id": job_id,
            "batch_id": batch_id,
            "filename": safe_name,
            "status": "queued",
            "progress": 0,
            "error": None,
            "created_at": time.time(),
            "upload_path": str(upload_path),
            "box": box,
        }
        with _state_lock:
            _image_jobs[job_id] = job
        batch_jobs.append(job_id)

    with _state_lock:
        _image_batches[batch_id] = {
            "batch_id": batch_id,
            "job_ids": batch_jobs,
            "created_at": time.time(),
        }
    for jid in batch_jobs:
        _image_work_queue.put(jid)
    return jsonify(
        batch_id=batch_id,
        jobs=[_public_image_job(_image_jobs[j]) for j in batch_jobs],
    ), 202


@app.get("/api/image/status/<job_id>")
def image_status(job_id: str):
    with _state_lock:
        job = _image_jobs.get(job_id)
        if not job:
            return jsonify(error="Job not found or expired."), 404
        return jsonify(_public_image_job(job))


@app.get("/api/image/batch/<batch_id>")
def batch_status(batch_id: str):
    with _state_lock:
        batch = _image_batches.get(batch_id)
        if not batch:
            return jsonify(error="Batch not found or expired."), 404
        jobs = [
            _public_image_job(_image_jobs[jid])
            for jid in batch["job_ids"]
            if jid in _image_jobs
        ]
        return jsonify(
            batch_id=batch_id,
            jobs=jobs,
            completed=sum(1 for j in jobs if j["status"] == "completed"),
            failed=sum(1 for j in jobs if j["status"] == "failed"),
            total=len(jobs),
        )


@app.get("/api/image/result/<job_id>")
def image_result(job_id: str):
    with _state_lock:
        job = _image_jobs.get(job_id)
        if job and job.get("status") == "completed":
            path = job.get("result_path")
            if path and Path(path).is_file():
                return send_file(path, mimetype="image/png", conditional=True)
    fallback_path = IMAGE_RESULTS / f"{job_id}.png"
    if fallback_path.is_file():
        return send_file(fallback_path, mimetype="image/png", conditional=True)
    return jsonify(error="Result file missing or expired."), 404


@app.get("/api/image/download/<job_id>")
def image_download(job_id: str):
    with _state_lock:
        job = _image_jobs.get(job_id)
        if job and job.get("status") == "completed":
            path, original = job.get("result_path"), job.get("filename", "image")
            if path and Path(path).is_file():
                stem = Path(original).stem or "image"
                return send_file(path, mimetype="image/png", as_attachment=True, download_name=f"{stem}-cleaned.png")
    fallback_path = IMAGE_RESULTS / f"{job_id}.png"
    if fallback_path.is_file():
        return send_file(fallback_path, mimetype="image/png", as_attachment=True, download_name=f"bellix-cutout-{job_id}.png")
    return jsonify(error="Result file missing or expired."), 404


@app.get("/api/image/batch/<batch_id>/download")
def batch_download(batch_id: str):
    with _state_lock:
        batch = _image_batches.get(batch_id)
        if not batch:
            return jsonify(error="Batch not found or expired."), 404
        jobs = [_image_jobs[jid].copy() for jid in batch["job_ids"] if jid in _image_jobs]
    ready = [
        j for j in jobs
        if j.get("status") == "completed"
        and j.get("result_path")
        and Path(j["result_path"]).is_file()
    ]
    if not ready:
        return jsonify(error="No completed images are ready to download."), 409

    buffer = io.BytesIO()
    used: set[str] = set()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for job in ready:
            base = (
                re.sub(r"[^A-Za-z0-9_-]+", "-", Path(job["filename"]).stem).strip("-")
                or "image"
            )
            arcname = f"{base}-cleaned.png"
            counter = 2
            while arcname.lower() in used:
                arcname = f"{base}-cleaned-{counter}.png"
                counter += 1
            used.add(arcname.lower())
            zf.write(job["result_path"], arcname)
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"image-results-{batch_id[:8]}.zip",
    )


# =============================================================
# 3. BACKGROUND REMOVAL API (CLIENT-SIDE & BACKEND FALLBACK)
# =============================================================
BG_JOBS: dict[str, dict] = {}

def process_background_removal(src_path: Path, dst_path: Path) -> tuple[int, int]:
    import cv2
    import numpy as np
    from PIL import Image

    bgr = None
    try:
        pil_img = Image.open(src_path).convert("RGBA")
        np_img = np.array(pil_img)
        bgr = cv2.cvtColor(np_img, cv2.COLOR_RGBA2BGR)
    except Exception:
        pass

    if bgr is None:
        bgr = cv2.imread(str(src_path), cv2.IMREAD_COLOR)

    if bgr is None:
        raise ValueError("Could not decode image format")

    h, w = bgr.shape[:2]

    # Sample corners to get background color
    corners = [
        bgr[0, 0],
        bgr[0, w - 1],
        bgr[h - 1, 0],
        bgr[h - 1, w - 1],
    ]
    bg_color = np.mean(corners, axis=0)

    diff = np.linalg.norm(bgr.astype(np.float32) - bg_color.astype(np.float32), axis=2)
    alpha = np.clip((diff - 25.0) / 40.0 * 255.0, 0, 255).astype(np.uint8)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

    b, g, r = cv2.split(bgr)
    rgba = cv2.merge([b, g, r, alpha])
    cv2.imwrite(str(dst_path), rgba)
    return w, h


@app.post("/api/v1/background/remove")
@app.post("/api/background/remove")
def background_remove_direct():
    if "image" not in request.files:
        return jsonify(error="No image uploaded"), 400
    file = request.files["image"]
    raw = file.read()
    if not raw:
        return jsonify(error="Empty file"), 400

    job_id = f"bg_{uuid.uuid4().hex[:12]}"
    src_path = IMAGE_UPLOADS / f"{job_id}.png"
    dst_path = IMAGE_RESULTS / f"{job_id}.png"
    src_path.write_bytes(raw)

    try:
        w, h = process_background_removal(src_path, dst_path)
    except Exception as exc:
        return jsonify(error=str(exc), detail=str(exc)), 500

    result_url = f"/api/image/result/{job_id}"
    job_info = {
        "id": job_id,
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        "stage": "completed",
        "message": "Background removed successfully",
        "result_url": result_url,
        "preview_url": result_url,
        "mask_url": result_url,
        "width": w,
        "height": h,
    }
    BG_JOBS[job_id] = job_info
    with _state_lock:
        _image_jobs[job_id] = {
            "status": "completed",
            "result_path": str(dst_path),
            "filename": getattr(file, "filename", "cutout.png") or "cutout.png",
            "created_at": time.time(),
        }
    return jsonify(job_info)


@app.post("/api/v1/background/process")
@app.post("/api/background/process")
def background_process_async():
    return background_remove_direct()


@app.post("/api/v1/background/composite")
@app.post("/api/background/composite")
def background_composite():
    data = request.get_json(silent=True) or {}
    job_id = data.get("job_id", "")
    return jsonify({
        "status": "success",
        "job_id": job_id,
        "preview_url": f"/api/image/result/{job_id}",
        "download_url": f"/api/image/download/{job_id}",
    })


@app.get("/api/v1/jobs/<job_id>")
@app.get("/api/jobs/<job_id>")
def background_job_status(job_id: str):
    if job_id in BG_JOBS:
        return jsonify(BG_JOBS[job_id])
    dst_path = IMAGE_RESULTS / f"{job_id}.png"
    if dst_path.exists():
        result_url = f"/api/image/result/{job_id}"
        return jsonify({
            "id": job_id,
            "status": "completed",
            "progress": 100,
            "result_url": result_url,
            "preview_url": result_url,
        })
    return jsonify(error="Job not found"), 404


@app.get("/api/v1/jobs/<job_id>/download")
@app.get("/api/jobs/<job_id>/download")
def background_job_download(job_id: str):
    dst_path = IMAGE_RESULTS / f"{job_id}.png"
    if not dst_path.exists():
        return jsonify(error="Not found"), 404
    return send_file(dst_path, mimetype="image/png", as_attachment=True, download_name=f"bellix-cutout-{job_id}.png")


@app.get("/api/v1/jobs/<job_id>/preview")
@app.get("/api/jobs/<job_id>/preview")
def background_job_preview(job_id: str):
    dst_path = IMAGE_RESULTS / f"{job_id}.png"
    if not dst_path.exists():
        return jsonify(error="Not found"), 404
    return send_file(dst_path, mimetype="image/png")


# =============================================================

# =============================================================
# GEMINI CORNER INPAINTER ENDPOINT (100% FREE, ZERO API KEY)
# =============================================================
@app.post("/api/remove")
@app.post("/api/gemini-image/clean")
@app.post("/api/v1/gemini-image/clean")
def clean_gemini_image():
    """
    Endpoint: upload a Gemini image, automatically locate sparkle via the 15.6% short-side rule
    + auto-refine, inpaint with zero plastic blur, and return cleaned PNG.
    Supported aspect ratios: 1:1, 9:16, 3:4, 4:3, 16:9.
    """
    f = request.files.get("file") or request.files.get("image")
    if not f:
        return jsonify(error="No image file provided in multipart 'file' or 'image'"), 400

    data = f.read()
    # 15 MB limit
    if len(data) > 15 * 1024 * 1024:
        return jsonify(error="File size exceeds maximum 15 MB limit."), 413

    try:
        # Check if offset_pct or margin_pct passed
        raw_offset = request.form.get("offset_pct") or request.form.get("margin_pct")
        offset_pct = float(raw_offset) if raw_offset is not None else 0.156
        if offset_pct > 1.0:
            offset_pct /= 100.0  # handle percentage passed as 15.6

        raw_box = request.form.get("box_pct") or request.form.get("box_size_pct")
        box_pct = float(raw_box) if raw_box is not None else 0.10
        if box_pct > 1.0:
            box_pct /= 100.0
    except (ValueError, TypeError):
        offset_pct = 0.156
        box_pct = 0.10

    method = request.form.get("method") or request.form.get("inpaint_mode") or "ns"

    job_id = uuid.uuid4().hex
    result_path = IMAGE_RESULTS / f"{job_id}.png"

    try:
        cleaned_np, box = remove_gemini_corner_sparkle(
            image_input=data,
            output_path=result_path,
            offset_pct=offset_pct,
            box_pct=box_pct,
            inpaint_mode=method
        )
    except ValueError as ve:
        return jsonify(error=str(ve)), 400
    except Exception as e:
        return jsonify(error=f"Inpainting failed: {str(e)}"), 500

    response = send_file(
        result_path,
        mimetype="image/png",
        as_attachment=False,
        download_name=f"gemini_cleaned_{job_id[:8]}.png"
    )
    # Header X-Box for debugging
    bx, by, bw, bh = box
    response.headers["X-Box"] = f"{bx},{by},{bw},{bh}"
    response.headers["Access-Control-Expose-Headers"] = "X-Box"
    return response


@app.post("/api/remove/batch")
def clean_gemini_batch():
    """Batch inpainting: upload multiple files, returns a ZIP of cleaned PNGs."""
    files = request.files.getlist("file") or request.files.getlist("files") or request.files.getlist("image")
    if not files:
        return jsonify(error="No image files provided"), 400

    method = request.form.get("method") or "ns"
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, f in enumerate(files):
            data = f.read()
            if not data or len(data) > 15 * 1024 * 1024:
                continue
            try:
                cleaned_np, _ = remove_gemini_corner_sparkle(
                    image_input=data,
                    inpaint_mode=method
                )
                _, buf = cv2.imencode(".png", cleaned_np)
                base_name = secure_filename(Path(f.filename or f"image_{idx}").stem) or f"image_{idx}"
                zf.writestr(f"{base_name}-cleaned.png", buf.tobytes())
            except Exception:
                continue

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name="gemini_sparkle_cleaned_batch.zip"
    )


# 4. HEALTH CHECK
# =============================================================
@app.get("/health")
@app.get("/api/health")
def health():
    return jsonify(status="ok", version="2.0", platform="vercel" if IS_VERCEL else "local")


class VercelPathMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched_path = environ.get("HTTP_X_MATCHED_PATH") or environ.get("HTTP_X_FORWARDED_URI")
        if matched_path and not matched_path.startswith("/api/index"):
            environ["PATH_INFO"] = matched_path.split("?")[0]
        return self.wsgi_app(environ, start_response)


app.wsgi_app = VercelPathMiddleware(app.wsgi_app)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
        threaded=True,
    )
