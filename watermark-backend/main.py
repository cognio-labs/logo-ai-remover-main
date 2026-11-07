"""
=============================================================================
main.py — FastAPI Application Entry Point
=============================================================================
Bellix Labs Video & Image Watermark Removal Application

Endpoints for Video Processing:
    POST   /api/video/process       Upload & start reverse-alpha unblending
    GET    /api/video/status/{id}   Poll progress (0-100), state, log_tail
    GET    /api/video/download/{id} Stream clean MP4 video
    DELETE /api/video/{id}          Delete job files and cleanup
    GET    /health                  Healthcheck with ffmpeg binary verification

Additional / Legacy Endpoints:
    POST   /api/remove              Corner inpainting for Gemini images
    POST   /api/upload              Automatic video inpainting endpoint
    GET    /api/status/{job_id}     Compatibility video status
    GET    /api/result/{job_id}     Compatibility video stream
    GET    /api/download/{job_id}   Compatibility video download
    POST   /upload, /frame, /process, /status, /download  (Manual canvas inpainting)
=============================================================================
"""

import asyncio
import collections
import json
import logging
import os
import re
import shutil
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from processor import remove_watermark

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("watermark-backend")

# ---------------------------------------------------------------------------
# Application paths & configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(BASE_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB max video upload
MAX_DURATION_SECONDS = 120.0        # 120 seconds max duration
RATE_LIMIT_UPLOADS_PER_HOUR = int(os.environ.get("RATE_LIMIT_UPLOADS_PER_HOUR", 10))
CLEANUP_INTERVAL_SECONDS = 60
JOB_RETENTION_SECONDS = 15 * 60     # 15 minutes after completion

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"}

# ---------------------------------------------------------------------------
# Concurrency & In-Memory Stores
# ---------------------------------------------------------------------------
# Max 2 concurrent ffmpeg jobs; others remain in "queued" state
video_semaphore = asyncio.Semaphore(2)

# Jobs store: { job_id: dict }
video_jobs: dict[str, dict] = {}

# Rate limit store: { ip: [timestamp, ...] }
ip_upload_timestamps: dict[str, list[float]] = {}

# Legacy task store
task_store: dict[str, dict] = {}


def check_ffmpeg_available() -> bool:
    """Check if the real ffmpeg binary is installed and executable on the host."""
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def sanitize_filename(filename: str | None) -> str:
    """Sanitize original client filename to prevent path traversal."""
    if not filename:
        return "video.mp4"
    base = Path(filename).name
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    return clean or "video.mp4"


def enforce_ip_rate_limit(client_ip: str):
    """Enforce per-IP rate limit of max uploads per hour."""
    now = time.time()
    cutoff = now - 3600.0
    history = [t for t in ip_upload_timestamps.get(client_ip, []) if t > cutoff]
    if len(history) >= RATE_LIMIT_UPLOADS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: maximum {RATE_LIMIT_UPLOADS_PER_HOUR} uploads per hour. Please try again later.",
        )
    history.append(now)
    ip_upload_timestamps[client_ip] = history


def purge_startup_leftovers():
    """Remove leftover job directories from previous server runs."""
    try:
        if UPLOAD_DIR.exists():
            for item in UPLOAD_DIR.iterdir():
                if item.is_dir():
                    try:
                        shutil.rmtree(item, ignore_errors=True)
                        logger.info("Purged leftover directory on startup: %s", item.name)
                    except Exception as e:
                        logger.warning("Failed to purge leftover %s: %s", item.name, e)
    except Exception as e:
        logger.error("Error purging startup leftovers: %s", e)


async def background_cleanup_loop():
    """Periodic loop to purge completed/error jobs 15 minutes after completion."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            now = time.time()
            to_delete = []

            for job_id, job in list(video_jobs.items()):
                finished_at = job.get("finished_at")
                if finished_at and (now - finished_at > JOB_RETENTION_SECONDS):
                    to_delete.append(job_id)
                elif not finished_at and (now - job.get("created_at", now) > 3600):
                    # Timeout uncompleted jobs older than 1 hour
                    to_delete.append(job_id)

            for job_id in to_delete:
                job = video_jobs.pop(job_id, None)
                if job:
                    job_dir = job.get("job_dir")
                    if job_dir and os.path.exists(job_dir):
                        try:
                            shutil.rmtree(job_dir, ignore_errors=True)
                            logger.info("15-minute cleanup removed job folder: %s", job_id)
                        except Exception as e:
                            logger.warning("Error deleting job dir for %s: %s", job_id, e)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error in background_cleanup_loop: %s", e)


# ---------------------------------------------------------------------------
# Lifespan Context Manager
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Bellix Video Watermark Remover Backend...")
    ffmpeg_ok = check_ffmpeg_available()
    logger.info("FFmpeg / FFprobe availability: %s", ffmpeg_ok)
    purge_startup_leftovers()

    cleanup_task = asyncio.create_task(background_cleanup_loop())
    yield
    # Shutdown actions
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("Backend shut down cleanly.")


# ---------------------------------------------------------------------------
# FastAPI app initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Bellix Video Watermark Remover",
    description="Self-contained Python backend running real FFmpeg for reverse alpha unblending.",
    version="3.5.0",
    lifespan=lifespan,
)

from pdf_api import router as pdf_router
app.include_router(pdf_router)

# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------
default_origins = [
    "https://bellix.us",
    "https://www.bellix.us",
    "http://localhost:5678",
    "http://127.0.0.1:5678",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

env_origins = os.environ.get("CORS_ORIGINS", "")
if env_origins:
    for origin in env_origins.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in default_origins:
            default_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins if "*" not in default_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add standard security headers."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


# =============================================================================
# Health Check Endpoint
# =============================================================================
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Return health status and whether the real ffmpeg binary is available."""
    ffmpeg_ok = check_ffmpeg_available()
    return {
        "ok": True,
        "ffmpeg": ffmpeg_ok,
        "status": "ok",
        "version": "3.5.0",
    }


# =============================================================================
# Core Gemini Video Watermark Removal Pipeline (Real FFmpeg Binary)
# =============================================================================

async def _probe_video_file(file_path: str):
    """Inspect video using ffprobe to obtain width, height, duration, fps, and audio presence."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        file_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err_msg = stderr.decode("utf-8", errors="replace").strip()
        raise HTTPException(status_code=400, detail=f"Invalid video file (ffprobe failed): {err_msg}")

    try:
        data = json.loads(stdout.decode("utf-8", errors="replace"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse video metadata: {str(e)}")

    v_streams = [s for s in data.get("streams", []) if s.get("codec_type") == "video"]
    if not v_streams:
        raise HTTPException(status_code=400, detail="Uploaded file does not contain a valid video stream.")

    v = v_streams[0]
    width = int(v.get("width", 0))
    height = int(v.get("height", 0))

    if width <= 0 or height <= 0:
        raise HTTPException(status_code=400, detail="Invalid video dimensions.")

    # Duration parsing
    duration = 0.0
    try:
        duration = float(v.get("duration") or data.get("format", {}).get("duration") or 0.0)
    except Exception:
        duration = 0.0

    fps_str = v.get("r_frame_rate", "30/1")
    has_audio = any(s.get("codec_type") == "audio" for s in data.get("streams", []))

    return {
        "width": width,
        "height": height,
        "duration": duration,
        "fps": fps_str,
        "has_audio": has_audio,
    }


def _calculate_geometry(width: int, height: int, size_pct: float, dist_pct: float):
    """
    Geometry calculation:
      s = min(W, H)
      box = even(clamp(size_pct/100*s, 2, s)); d = dist_pct/100*s
      x = clamp(even(W - d - box), 0, W - box); y = clamp(even(H - d - box), 0, H - box)
      even(n) = max(2, round(n/2)*2). x, y and box must all be even.
    """
    def even(n: float) -> int:
        return max(2, int(round(n / 2.0) * 2))

    W = width
    H = height
    s = min(W, H)

    raw_box = (size_pct / 100.0) * s
    clamped_box = max(2.0, min(float(s), raw_box))
    box = even(clamped_box)
    box = min(box, W, H)
    box = even(box)

    d = (dist_pct / 100.0) * s
    raw_x = even(W - d - box)
    raw_y = even(H - d - box)

    x = max(0, min(W - box, raw_x))
    y = max(0, min(H - box, raw_y))
    x = even(x)
    y = even(y)

    return box, x, y


def _build_reverse_alpha_filter(box: int, x: int, y: int, alpha: float) -> str:
    """
    Build the exact reverse alpha blending filter for FFmpeg:
      c = box/2; R = box/2*0.95; a = alpha
      A = a*clip((1-pow(abs((X-c)/R),0.55)-pow(abs((Y-c)/R),0.55))*6,0,1)
      E = clip((p(X,Y)-255*(A))/(1-(A)),0,255)
      -vf "split[a][b];[b]crop=box:box:x:y,format=gbrp,geq=r='E':g='E':b='E'[c];[a][c]overlay=x:y,format=yuv420p"
    """
    c = box / 2.0
    R = (box / 2.0) * 0.95
    a = max(0.10, min(0.90, float(alpha)))

    # geq expression strings for crop box
    a_expr = f"{a:.4f}*clip((1-pow(abs((X-{c:.2f})/{R:.2f}),0.55)-pow(abs((Y-{c:.2f})/{R:.2f}),0.55))*6,0,1)"
    e_expr = f"clip((p(X,Y)-255*({a_expr}))/(1-({a_expr})),0,255)"

    return (
        f"split[a][b];"
        f"[b]crop={box}:{box}:{x}:{y},format=gbrp,geq=r='{e_expr}':g='{e_expr}':b='{e_expr}'[c];"
        f"[a][c]overlay={x}:{y},format=yuv420p"
    )


async def _run_ffmpeg_attempt(cmd: list[str], duration: float, job: dict) -> tuple[int, list[str]]:
    """Execute ffmpeg command, stream progress lines from stdout, capture last stderr lines."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stderr_lines = collections.deque(maxlen=30)

    async def read_stdout():
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").strip()
            if text.startswith("out_time_us=") or text.startswith("out_time_ms="):
                val_str = text.split("=")[1]
                try:
                    val = int(val_str)
                    cur_sec = val / 1_000_000.0
                    if duration > 0:
                        pct = min(99, max(2, round((cur_sec / duration) * 100)))
                        job["progress"] = pct
                except ValueError:
                    pass
            elif text == "progress=end":
                job["progress"] = 99

    async def read_stderr():
        while True:
            line = await proc.stderr.readline()
            if not line:
                break
            raw_line = line.decode("utf-8", errors="replace").rstrip()
            if raw_line:
                stderr_lines.append(raw_line)
                job["log_tail"] = list(stderr_lines)[-8:]

    await asyncio.gather(read_stdout(), read_stderr(), proc.wait())
    return proc.returncode, list(stderr_lines)


async def _process_video_worker(job_id: str):
    """Process a video with temporal logo detection and texture-preserving inpainting."""
    job = video_jobs.get(job_id)
    if not job:
        return

    # Wait in queue until one of 2 concurrency slots is free.
    async with video_semaphore:
        job["state"] = "processing"
        job["progress"] = 5
        logger.info("[Job %s] Acquired semaphore slot. Detecting and removing static logo.", job_id)

        def on_progress(percent, _frames, stage):
            job["progress"] = min(99, max(5, int(percent)))
            job["log_tail"] = [stage]

        try:
            await asyncio.to_thread(
                remove_watermark,
                job["input_path"],
                job["output_path"],
                progress_cb=on_progress,
                alpha=job.get("alpha", 0.30),
            )
            if not os.path.isfile(job["output_path"]) or os.path.getsize(job["output_path"]) == 0:
                raise RuntimeError("The watermark-removal pipeline did not produce an output video.")
            job["state"] = "done"
            job["progress"] = 100
            job["finished_at"] = time.time()
            logger.info("[Job %s] Clean video generated successfully.", job_id)
        except Exception as exc:
            logger.exception("[Job %s] Video watermark removal failed.", job_id)
            job["state"] = "error"
            job["error"] = str(exc)
            job["log_tail"] = [str(exc)]
            job["finished_at"] = time.time()


@app.post("/api/video/process")
async def api_video_process(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    size_pct: float = Form(7.0),
    dist_pct: float = Form(4.0),
    alpha: float = Form(0.30),
):
    """
    POST /api/video/process (multipart/form-data)
    Fields: file (video), size_pct (float, default 7), dist_pct (float, default 4), alpha (float 0.10-0.90, default 0.30)
    Validate:
      - content-type starts with video/
      - size <= 500 MB (stream to disk in chunks)
      - duration <= 120 s (check with ffprobe)
    Save to per-job temp folder, start background task, return {"job_id": "..."} immediately.
    """
    # 1. Enforce per-IP rate limit
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "127.0.0.1")
    enforce_ip_rate_limit(client_ip)

    # 2. File type validation
    filename = file.filename or "uploaded.mp4"
    ext = Path(filename).suffix.lower()
    content_type = file.content_type or ""

    if not (content_type.startswith("video/") or ext in ALLOWED_VIDEO_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file must be a valid video (MP4, MOV, WebM, AVI, MKV). Received: {content_type or ext}",
        )

    # 3. Setup per-job directory
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    input_path = job_dir / f"input{ext if ext else '.mp4'}"
    output_path = job_dir / "output.mp4"

    # 4. Stream upload in chunks to disk (limit 500 MB)
    total_bytes = 0
    try:
        with open(input_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    f.close()
                    shutil.rmtree(job_dir, ignore_errors=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size ({MAX_UPLOAD_SIZE // (1024 * 1024)} MB).",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        logger.error("Failed to save uploaded video for job %s: %s", job_id, e)
        raise HTTPException(status_code=500, detail="Failed to save uploaded video.")

    # 5. Inspect video with ffprobe
    meta = await _probe_video_file(str(input_path))
    if meta["duration"] > MAX_DURATION_SECONDS:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail=f"Video duration ({meta['duration']:.1f}s) exceeds maximum allowed limit of {int(MAX_DURATION_SECONDS)}s.",
        )

    # 6. Initialize in-memory job status
    sanitized_name = sanitize_filename(filename)
    video_jobs[job_id] = {
        "job_id": job_id,
        "state": "queued",  # queued | processing | done | error
        "progress": 0,
        "error": None,
        "log_tail": [],
        "created_at": time.time(),
        "finished_at": None,
        "original_name": sanitized_name,
        "input_path": str(input_path),
        "output_path": str(output_path),
        "job_dir": str(job_dir),
        "size_pct": float(size_pct),
        "dist_pct": float(dist_pct),
        "alpha": float(alpha),
        "width": meta["width"],
        "height": meta["height"],
        "duration": meta["duration"],
        "has_audio": meta["has_audio"],
        "client_ip": client_ip,
    }

    # 7. Start processing in background task
    background_tasks.add_task(_process_video_worker, job_id)
    logger.info("Accepted video process job %s (duration: %.1fs, %dx%d)", job_id, meta["duration"], meta["width"], meta["height"])

    return JSONResponse(content={"job_id": job_id})


@app.get("/api/video/status/{job_id}")
async def api_video_status(job_id: str):
    """
    GET /api/video/status/{job_id}
    Returns {"state": "queued|processing|done|error", "progress": 0-100, "error": null or string, "log_tail": [last 8 ffmpeg stderr lines]}
    """
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return JSONResponse(
        content={
            "state": job["state"],
            "progress": job["progress"],
            "error": job["error"],
            "log_tail": job["log_tail"][-8:],
        }
    )


@app.get("/api/video/download/{job_id}")
async def api_video_download(job_id: str):
    """
    GET /api/video/download/{job_id}
    Streams the clean MP4 as <original-name>-clean.mp4 with Content-Disposition attachment.
    """
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job["state"] != "done":
        raise HTTPException(status_code=400, detail=f"Job is not yet complete (state: {job['state']}).")

    out_file = Path(job["output_path"])
    if not out_file.is_file():
        raise HTTPException(status_code=404, detail="Output video file not found.")

    orig_stem = Path(job.get("original_name") or "video.mp4").stem
    download_filename = f"{orig_stem}-clean.mp4"

    return FileResponse(
        path=str(out_file),
        media_type="video/mp4",
        filename=download_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.delete("/api/video/{job_id}")
async def api_video_delete(job_id: str):
    """DELETE /api/video/{job_id} removes the job files and clears memory record."""
    job = video_jobs.pop(job_id, None)
    if not job:
        # Check if directory exists anyway
        job_dir = UPLOAD_DIR / job_id
        if job_dir.is_dir():
            shutil.rmtree(job_dir, ignore_errors=True)
        return JSONResponse(content={"ok": True, "message": "Job removed."})

    job_dir = job.get("job_dir")
    if job_dir and os.path.exists(job_dir):
        shutil.rmtree(job_dir, ignore_errors=True)

    logger.info("Deleted job files for %s", job_id)
    return JSONResponse(content={"ok": True, "message": "Job files deleted."})


# =============================================================================
# Image Inpainting Endpoints (Corner Sparkle for Static Images)
# =============================================================================

@app.post("/api/remove")
@app.post("/api/gemini-image/clean")
@app.post("/api/v1/gemini-image/clean")
async def api_remove_corner(
    file: UploadFile = File(None),
    image: UploadFile = File(None),
    offset_pct: float = Form(0.156),
    box_pct: float = Form(0.10),
    method: str = Form("ns"),
    inpaint_mode: str = Form(None),
):
    """Corner sparkle removal for static images."""
    upload = file or image
    if not upload:
        raise HTTPException(status_code=400, detail="No file or image uploaded")
    data = await upload.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")

    use_method = inpaint_mode or method or "ns"
    from gemini_corner_inpainter import remove_gemini_corner_sparkle
    import cv2

    try:
        cleaned_np, box = remove_gemini_corner_sparkle(
            image_input=data,
            offset_pct=offset_pct,
            box_pct=box_pct,
            inpaint_mode=use_method,
        )
        success, buf = cv2.imencode(".png", cleaned_np)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to encode image")

        bx, by, bw, bh = box
        return Response(
            content=buf.tobytes(),
            media_type="image/png",
            headers={
                "X-Box": f"{bx},{by},{bw},{bh}",
                "Access-Control-Expose-Headers": "X-Box",
            },
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")


@app.post("/api/remove/batch")
async def api_remove_batch(
    files: list[UploadFile] = File(...),
    method: str = Form("ns"),
):
    """Batch image watermark remover returning ZIP."""
    import io
    import zipfile
    import cv2
    from gemini_corner_inpainter import remove_gemini_corner_sparkle

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, f in enumerate(files):
            data = await f.read()
            if not data or len(data) > 15 * 1024 * 1024:
                continue
            try:
                cleaned_np, _ = remove_gemini_corner_sparkle(image_input=data, inpaint_mode=method)
                _, buf = cv2.imencode(".png", cleaned_np)
                base_name = Path(f.filename or f"image_{idx}").stem
                zf.writestr(f"{base_name}-cleaned.png", buf.tobytes())
            except Exception:
                continue

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="gemini_sparkle_cleaned_batch.zip"'},
    )


# =============================================================================
# Compatibility Endpoints (Legacy Web UI)
# =============================================================================

@app.post("/api/upload")
async def api_upload(background_tasks: BackgroundTasks, video: UploadFile = File(...)):
    """Automatic detection & inpainting endpoint for Bellix Labs frontend."""
    upload_res = await upload_video(file=video)
    data = json.loads(upload_res.body.decode("utf-8"))
    tid = data["task_id"]

    def _run_auto_video(tid_val: str):
        try:
            import processor
            task_store[tid_val]["status"] = "processing"
            task_store[tid_val]["stage"] = "Detecting watermark..."
            task_store[tid_val]["progress"] = 5

            src_file = task_store[tid_val]["video_path"]
            dst_file = os.path.join(str(UPLOAD_DIR / tid_val), "output.mp4")

            def on_progress(p, n, stage):
                task_store[tid_val]["progress"] = p
                task_store[tid_val]["frames"] = n
                task_store[tid_val]["stage"] = stage

            processor.remove_watermark(src_file, dst_file, progress_cb=on_progress)
            task_store[tid_val]["status"] = "done"
            task_store[tid_val]["progress"] = 100
            task_store[tid_val]["stage"] = "Done"
        except Exception as err:
            logger.error("Auto video processing failed: %s", str(err))
            task_store[tid_val]["status"] = "error"
            task_store[tid_val]["error"] = str(err)

    background_tasks.add_task(_run_auto_video, tid)
    return JSONResponse(content={"job_id": tid})


@app.get("/api/status/{job_id}")
async def api_status(job_id: str):
    # Check video_jobs first
    if job_id in video_jobs:
        j = video_jobs[job_id]
        return JSONResponse(content={
            "status": j["state"],
            "progress": j["progress"],
            "stage": j["state"],
            "error": j["error"],
        })

    if job_id not in task_store:
        raise HTTPException(status_code=404, detail="Job not found")
    t = task_store[job_id]
    st = t.get("status")
    norm_status = "done" if st == "complete" else st
    return JSONResponse(
        content={
            "status": norm_status,
            "progress": t.get("progress", 0),
            "stage": t.get("stage", "Processing..."),
            "frames": t.get("frames", 0),
            "error": t.get("error"),
        }
    )


@app.get("/api/result/{job_id}")
async def api_result(job_id: str):
    if job_id in video_jobs:
        out_p = Path(video_jobs[job_id]["output_path"])
        if out_p.is_file():
            return FileResponse(str(out_p), media_type="video/mp4")
    out_path = UPLOAD_DIR / job_id / "output.mp4"
    if not out_path.is_file():
        raise HTTPException(status_code=404, detail="Not ready")
    return FileResponse(str(out_path), media_type="video/mp4")


@app.get("/api/download/{job_id}")
async def api_download(job_id: str):
    if job_id in video_jobs:
        return await api_video_download(job_id)
    out_path = UPLOAD_DIR / job_id / "output.mp4"
    if not out_path.is_file():
        raise HTTPException(status_code=404, detail="Not ready")
    return FileResponse(
        str(out_path),
        media_type="video/mp4",
        filename="clean_video.mp4",
        headers={"Content-Disposition": 'attachment; filename="clean_video.mp4"'},
    )


# =============================================================================
# Manual Inpainting Endpoints (/upload, /frame, /process, /status, /download)
# =============================================================================

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'")

    task_id = str(uuid.uuid4())
    task_dir = UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    video_path = task_dir / f"original{ext}"

    with open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    task_store[task_id] = {
        "status": "uploaded",
        "progress": 0,
        "error": None,
        "video_path": str(video_path),
    }
    return JSONResponse(content={"task_id": task_id, "message": "Video uploaded successfully."})


@app.get("/frame/{task_id}")
async def get_frame(task_id: str):
    import cv2
    frame_path = UPLOAD_DIR / task_id / "first_frame.png"
    if not frame_path.is_file():
        if task_id in task_store:
            vid = task_store[task_id].get("video_path")
            if vid and os.path.isfile(vid):
                cap = cv2.VideoCapture(vid)
                ok, frame = cap.read()
                cap.release()
                if ok:
                    cv2.imwrite(str(frame_path), frame)

    if not frame_path.is_file():
        raise HTTPException(status_code=404, detail="Frame not found.")
    return FileResponse(str(frame_path), media_type="image/png")


@app.get("/video/{task_id}")
async def get_video(task_id: str):
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found.")
    video_path = Path(task_store[task_id]["video_path"])
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found.")
    return FileResponse(str(video_path), media_type="video/mp4")


@app.get("/")
async def root():
    index_file = BASE_DIR / "static" / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {
        "message": "Bellix Video Watermark Remover API is running.",
        "version": "3.5.0",
        "endpoints": ["/api/video/process", "/api/video/status/{id}", "/api/video/download/{id}", "/health"],
    }


# Mount static directory if present
static_dir = BASE_DIR / "static"
if static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.post("/api/video/detect-frame")
async def detect_video_frame(request: Request):
    """Native-resolution PNG only; uses exactly the export detector and repair."""
    import base64
    import cv2
    import numpy as np
    from logo_target import detect_target, repair
    data = await request.body()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(413, "Frame too large")
    frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(422, "Invalid frame")
    box = await asyncio.to_thread(detect_target, frame)
    if box is None:
        raise HTTPException(422, "No confident white sparkle detected in this frame")
    cleaned = await asyncio.to_thread(repair, frame, box)
    _, png = cv2.imencode(".png", cleaned)
    return {"box": box, "preview": "data:image/png;base64," + base64.b64encode(png).decode()}
