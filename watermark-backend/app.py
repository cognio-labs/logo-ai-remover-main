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
from flask import Flask, jsonify, request, send_file, send_from_directory, abort
from flask_cors import CORS

from processor import remove_watermark
from image_processor import process_image_file

BASE_DIR = Path(__file__).resolve().parent

# --- Video Watermark Directories & Setup ---
VIDEO_UPLOADS = BASE_DIR / "uploads"
VIDEO_OUTPUTS = BASE_DIR / "outputs"
STATIC = BASE_DIR / "static"
VIDEO_UPLOADS.mkdir(parents=True, exist_ok=True)
VIDEO_OUTPUTS.mkdir(parents=True, exist_ok=True)
STATIC.mkdir(parents=True, exist_ok=True)

# --- Image Watermark Directories & Setup ---
IMAGE_JOB_DIR = Path(os.environ.get("IMAGE_JOB_DIR", BASE_DIR / "image_jobs"))
IMAGE_UPLOADS = IMAGE_JOB_DIR / "uploads"
IMAGE_RESULTS = IMAGE_JOB_DIR / "results"
IMAGE_UPLOADS.mkdir(parents=True, exist_ok=True)
IMAGE_RESULTS.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024  # 20 MB per file
MAX_BATCH_IMAGES = int(os.environ.get("MAX_BATCH_IMAGES", "10"))
RETENTION_SECONDS = 60 * 60  # 1 hour auto-cleanup
IMAGE_WORKER_COUNT = max(1, int(os.environ.get("IMAGE_WORKERS", "2")))
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv"}

app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = max(
    500 * 1024 * 1024,  # 500 MB for video
    MAX_IMAGE_FILE_BYTES * MAX_BATCH_IMAGES + 4 * 1024 * 1024
)
CORS(app)

# -------------------------------------------------------------
# 1. Video Watermark Jobs & Worker
# -------------------------------------------------------------
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
    return send_from_directory(app.static_folder, "index.html")


@app.post("/api/upload")
def video_upload():
    f = request.files.get("video")
    if not f:
        return jsonify(error="No video uploaded"), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return jsonify(error="Unsupported format"), 400

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


# -------------------------------------------------------------
# 2. Image Watermark Processing (Batch Queue & Worker)
# -------------------------------------------------------------
_image_jobs: dict[str, dict] = {}
_image_batches: dict[str, dict] = {}
_state_lock = threading.RLock()
_image_work_queue: Queue = Queue()


def _actual_image_type_ok(data: bytes, filename: str) -> bool:
    ext = Path(secure_filename(filename or "")).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        actual = ".png"
    elif data.startswith(b"\xff\xd8\xff"):
        actual = ".jpg"
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        actual = ".webp"
    else:
        return False
    return ext in ({".jpg", ".jpeg"} if actual == ".jpg" else {actual})


def _public_image_job(job: dict) -> dict:
    return {
        k: job.get(k)
        for k in (
            "job_id",
            "batch_id",
            "filename",
            "status",
            "progress",
            "error",
            "created_at",
            "finished_at",
        )
    }


def _image_worker() -> None:
    while True:
        job_id = _image_work_queue.get()
        if job_id is None:
            _image_work_queue.task_done()
            break
        with _state_lock:
            job = _image_jobs.get(job_id)
            if not job:
                _image_work_queue.task_done()
                continue
            job["status"] = "processing"
            job["progress"] = 25
            job["started_at"] = time.time()

        try:
            result_path = IMAGE_RESULTS / f"{job_id}.png"
            process_image_file(
                job["upload_path"], result_path, manual_box=job.get("box")
            )
            with _state_lock:
                job["result_path"] = str(result_path)
                job["status"] = "completed"
                job["progress"] = 100
                job["finished_at"] = time.time()
        except Exception as exc:
            with _state_lock:
                job["status"] = "failed"
                job["error"] = str(exc)[:400]
                job["finished_at"] = time.time()
        finally:
            try:
                Path(job["upload_path"]).unlink(missing_ok=True)
            except OSError:
                pass
            _image_work_queue.task_done()


def _image_cleanup_loop() -> None:
    while True:
        time.sleep(300)
        cutoff = time.time() - RETENTION_SECONDS
        with _state_lock:
            old_jobs = [
                jid
                for jid, j in _image_jobs.items()
                if j.get("created_at", time.time()) < cutoff
            ]
            for jid in old_jobs:
                job = _image_jobs.pop(jid, {})
                for key in ("upload_path", "result_path"):
                    p = job.get(key)
                    if p:
                        try:
                            Path(p).unlink(missing_ok=True)
                        except OSError:
                            pass
            for bid, batch in list(_image_batches.items()):
                if batch.get("created_at", time.time()) < cutoff:
                    _image_batches.pop(bid, None)

        for folder in (IMAGE_UPLOADS, IMAGE_RESULTS):
            if folder.exists():
                for p in folder.iterdir():
                    try:
                        if p.is_file() and p.stat().st_mtime < cutoff:
                            p.unlink(missing_ok=True)
                    except OSError:
                        pass


for _ in range(IMAGE_WORKER_COUNT):
    threading.Thread(target=_image_worker, daemon=True, name="image-worker").start()
threading.Thread(target=_image_cleanup_loop, daemon=True, name="image-cleanup").start()


def _parse_box(raw: str | None):
    if not raw:
        return None
    try:
        vals = [int(x.strip()) for x in raw.split(",")]
        if len(vals) != 4 or vals[2] < 1 or vals[3] < 1:
            raise ValueError
        return tuple(vals)
    except (TypeError, ValueError):
        raise ValueError("box must be x,y,w,h with positive width and height")


@app.get("/image-remover")
def image_remover_page():
    return send_from_directory(app.static_folder, "image-remover.html")


@app.post("/api/image/upload")
def upload_images():
    files = request.files.getlist("image") or request.files.getlist("images")
    files = [f for f in files if f and f.filename]
    if not files:
        return jsonify(error="Select at least one image (field name: image)."), 400
    if len(files) > MAX_BATCH_IMAGES:
        return jsonify(error=f"Maximum {MAX_BATCH_IMAGES} images per batch."), 413
    try:
        box = _parse_box(request.form.get("box"))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    batch_id = uuid.uuid4().hex
    batch_jobs = []
    for file in files:
        safe_name = secure_filename(file.filename) or "image"
        data = file.read(MAX_IMAGE_FILE_BYTES + 1)
        if not data:
            return jsonify(error=f"{safe_name}: empty file."), 400
        if len(data) > MAX_IMAGE_FILE_BYTES:
            return jsonify(error=f"{safe_name}: exceeds 20 MB limit."), 413
        if not _actual_image_type_ok(data, safe_name):
            return (
                jsonify(
                    error=f"{safe_name}: only valid JPG, PNG, or WEBP files are allowed."
                ),
                415,
            )
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
    return (
        jsonify(
            batch_id=batch_id,
            jobs=[_public_image_job(_image_jobs[j]) for j in batch_jobs],
        ),
        202,
    )


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
        if not job:
            return jsonify(error="Job not found or expired."), 404
        if job["status"] != "completed":
            return jsonify(error="Image is not ready", status=job["status"]), 409
        path = job.get("result_path")
    if not path or not Path(path).is_file():
        return jsonify(error="Result file missing or expired."), 404
    return send_file(path, mimetype="image/png", conditional=True)


@app.get("/api/image/download/<job_id>")
def image_download(job_id: str):
    with _state_lock:
        job = _image_jobs.get(job_id)
        if not job:
            return jsonify(error="Job not found or expired."), 404
        if job["status"] != "completed":
            return jsonify(error="Image is not ready", status=job["status"]), 409
        path, original = job.get("result_path"), job.get("filename", "image")
    if not path or not Path(path).is_file():
        return jsonify(error="Result file missing or expired."), 404
    stem = Path(original).stem or "image"
    return send_file(
        path,
        mimetype="image/png",
        as_attachment=True,
        download_name=f"{stem}-cleaned.png",
    )


@app.get("/api/image/batch/<batch_id>/download")
def batch_download(batch_id: str):
    with _state_lock:
        batch = _image_batches.get(batch_id)
        if not batch:
            return jsonify(error="Batch not found or expired."), 404
        jobs = [_image_jobs[jid].copy() for jid in batch["job_ids"] if jid in _image_jobs]
    ready = [
        j
        for j in jobs
        if j.get("status") == "completed"
        and j.get("result_path")
        and Path(j["result_path"]).is_file()
    ]
    if not ready:
        return jsonify(error="No completed images are ready to download."), 409

    buffer = io.BytesIO()
    used = set()
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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
        threaded=True,
    )
