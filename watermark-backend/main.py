"""
=============================================================================
main.py — FastAPI Application Entry Point
=============================================================================
Bellix Labs Video Watermark Removal Application — OpenCV Inpainting Engine

Endpoints:
    POST   /upload           Upload a video file for processing
    GET    /frame/{task_id}  Retrieve the first frame of the uploaded video
    GET    /video/{task_id}  Stream the uploaded video for playback
    POST   /process          Submit a mask and start background inpainting
    GET    /status/{task_id} Poll the progress of the inpainting task
    GET    /download/{task_id} Download the final processed video

    Compatibility Endpoints (for Bellix Labs Next.js Frontend):
    POST   /api/upload
    GET    /api/status/{job_id}
    GET    /api/result/{job_id}
    GET    /api/download/{job_id}

Security Notes:
    - File uploads are validated by extension allow-list and size limit.
    - Uploaded files are renamed to UUIDs to prevent path traversal.
    - The uploads directory is outside the web root static directory.
=============================================================================
"""

import os
import uuid
import logging
from pathlib import Path

from fastapi import (
    FastAPI,
    File,
    Form,
    UploadFile,
    BackgroundTasks,
    HTTPException,
    Request,
)
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import video_utils
import inpainter
import cv2
from PIL import Image

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("watermark-app")

# ---------------------------------------------------------------------------
# Application configuration
# ---------------------------------------------------------------------------
# Maximum upload size in bytes (default: 100 MB)
IS_VERCEL = bool(os.environ.get("VERCEL"))
BASE_DIR = Path(__file__).resolve().parent
WORK_DIR = Path("/tmp") if IS_VERCEL else BASE_DIR

MAX_UPLOAD_SIZE = int(os.environ.get("MAX_UPLOAD_SIZE_MB", 100)) * 1024 * 1024
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(WORK_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allow-list of accepted video file extensions
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# ---------------------------------------------------------------------------
# FastAPI app initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Bellix Video Watermark Remover",
    description="Self-contained video watermark removal using OpenCV inpainting.",
    version="3.0.0",
)

# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Inject security headers into every HTTP response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# ---------------------------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://www.bellix.us",
        "https://bellix.us",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory task status store
# ---------------------------------------------------------------------------
task_store: dict[str, dict] = {}


def _validate_video_extension(filename: str) -> str:
    """Validate that the uploaded file has an allowed video extension."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )
    return ext


# =============================================================================
# API Endpoints
# =============================================================================



# ---------------------------------------------------------------------------
# Health & Corner Inpainting Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0", "platform": "vercel" if IS_VERCEL else "local"}


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
    upload = file or image
    if not upload:
        raise HTTPException(status_code=400, detail="No file or image uploaded")
    data = await upload.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")

    use_method = inpaint_mode or method or "ns"
    from gemini_corner_inpainter import remove_gemini_corner_sparkle
    from fastapi.responses import Response

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
            }
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
    import io, zipfile
    from gemini_corner_inpainter import remove_gemini_corner_sparkle
    from fastapi.responses import Response

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, f in enumerate(files):
            data = await f.read()
            if not data or len(data) > 15 * 1024 * 1024:
                continue
            try:
                cleaned_np, _ = remove_gemini_corner_sparkle(
                    image_input=data,
                    inpaint_mode=method
                )
                _, buf = cv2.imencode(".png", cleaned_np)
                base_name = Path(f.filename or f"image_{idx}").stem
                zf.writestr(f"{base_name}-cleaned.png", buf.tobytes())
            except Exception:
                continue

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="gemini_sparkle_cleaned_batch.zip"'}
    )


try:
    from starlette.middleware.wsgi import WSGIMiddleware
    from app import app as flask_app
    app.mount("/api/image", WSGIMiddleware(flask_app))
except Exception as e:
    logger.warning("Could not mount Flask WSGI middleware: %s", e)


@app.get("/")
async def root():
    """Serve the main frontend page."""
    index_file = Path("static/index.html")
    if index_file.is_file():
        return FileResponse(str(index_file))
    return {"message": "Bellix Video Watermark Remover API is running."}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file for watermark removal.

    The file is validated by extension and size, then saved with a UUID
    filename to prevent path traversal attacks.
    """
    ext = _validate_video_extension(file.filename or "unknown.bin")

    task_id = str(uuid.uuid4())
    task_dir = UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    video_path = task_dir / f"original{ext}"
    total_bytes = 0

    try:
        with open(video_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    f.close()
                    video_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File too large. Maximum size is "
                            f"{MAX_UPLOAD_SIZE // (1024 * 1024)} MB."
                        ),
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("File upload failed for task %s: %s", task_id, str(e))
        raise HTTPException(status_code=500, detail="File upload failed.")

    logger.info(
        "Uploaded video for task %s (%d bytes, ext=%s)", task_id, total_bytes, ext
    )

    task_store[task_id] = {
        "status": "uploaded",
        "progress": 0,
        "error": None,
        "video_path": str(video_path),
    }

    return JSONResponse(
        content={"task_id": task_id, "message": "Video uploaded successfully."}
    )


@app.get("/frame/{task_id}")
async def get_frame(task_id: str):
    """Return the first frame of the uploaded video as a PNG image."""
    try:
        uuid.UUID(task_id, version=4)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    frame_path = UPLOAD_DIR / task_id / "first_frame.png"
    if not frame_path.is_file():
        # Generate first frame on the fly if not already saved
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

    resolved = frame_path.resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve()) + os.sep):
        raise HTTPException(status_code=403, detail="Access denied.")

    return FileResponse(
        str(resolved),
        media_type="image/png",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


@app.get("/video/{task_id}")
async def get_video(task_id: str):
    """Stream the uploaded video file for playback in the mask editor."""
    try:
        uuid.UUID(task_id, version=4)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found.")

    video_path = Path(task_store[task_id]["video_path"])
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found.")

    resolved = video_path.resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve()) + os.sep):
        raise HTTPException(status_code=403, detail="Access denied.")

    return FileResponse(
        str(resolved),
        media_type="video/mp4",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Accept-Ranges": "bytes",
        },
    )


@app.post("/process")
async def process_video(
    background_tasks: BackgroundTasks,
    task_id: str = Form(...),
    mask: UploadFile = File(...),
    logo: UploadFile = File(None),
    enhance: bool = Form(False),
    inpaint_mode: str = Form("telea"),
):
    """Start the watermark removal process with painted mask."""
    try:
        uuid.UUID(task_id, version=4)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found.")

    if task_store[task_id]["status"] == "processing":
        raise HTTPException(status_code=409, detail="Task is already processing.")

    task_dir = UPLOAD_DIR / task_id
    resolved_dir = task_dir.resolve()
    if not str(resolved_dir).startswith(str(UPLOAD_DIR.resolve()) + os.sep):
        raise HTTPException(status_code=403, detail="Access denied.")

    mask_path = task_dir / "mask.png"
    mask_ext = Path(mask.filename or "mask.png").suffix.lower()
    if mask_ext != ".png":
        raise HTTPException(status_code=400, detail="Mask must be a PNG image.")

    try:
        mask_data = await mask.read()
        if len(mask_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Mask file too large.")

        if not mask_data[:8] == b"\x89PNG\r\n\x1a\n":
            raise HTTPException(
                status_code=400, detail="Invalid mask file. Must be a valid PNG image."
            )

        with open(mask_path, "wb") as f:
            f.write(mask_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Mask save failed for task %s: %s", task_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to save mask.")

    logo_path = None
    if logo and logo.filename:
        logo_ext = Path(logo.filename).suffix.lower()
        if logo_ext in [".png", ".jpg", ".jpeg"]:
            logo_path = task_dir / f"logo{logo_ext}"
            try:
                logo_data = await logo.read()
                if len(logo_data) > 10 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="Logo file too large.")
                with open(logo_path, "wb") as f:
                    f.write(logo_data)
            except Exception as e:
                logger.error("Logo save failed for task %s: %s", task_id, str(e))
                logo_path = None

    task_store[task_id]["status"] = "processing"
    task_store[task_id]["progress"] = 0

    background_tasks.add_task(
        _run_processing_pipeline,
        task_id,
        task_store[task_id]["video_path"],
        str(mask_path),
        str(logo_path) if logo_path else None,
        str(task_dir),
        enhance,
        inpaint_mode,
    )

    logger.info("Started processing pipeline for task %s", task_id)

    return JSONResponse(
        content={
            "task_id": task_id,
            "message": "Processing started.",
        }
    )


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    """Poll current progress of a processing task."""
    try:
        uuid.UUID(task_id, version=4)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found.")

    task = task_store[task_id]
    return JSONResponse(
        content={
            "task_id": task_id,
            "status": task["status"],
            "progress": task["progress"],
            "error": task.get("error"),
        }
    )


@app.get("/download/{task_id}")
async def download_video(task_id: str):
    """Download the final processed video with the watermark removed."""
    try:
        uuid.UUID(task_id, version=4)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found.")

    if task_store[task_id]["status"] != "complete":
        raise HTTPException(
            status_code=400,
            detail="Processing is not yet complete.",
        )

    output_path = UPLOAD_DIR / task_id / "output.mp4"
    resolved = output_path.resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve()) + os.sep):
        raise HTTPException(status_code=403, detail="Access denied.")

    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="Output video not found.")

    return FileResponse(
        str(resolved),
        media_type="video/mp4",
        filename=f"watermark_removed_{task_id[:8]}.mp4",
        headers={
            "Content-Disposition": f'attachment; filename="watermark_removed_{task_id[:8]}.mp4"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


# =============================================================================
# Compatibility Endpoints (for Bellix Labs Next.js UI)
# =============================================================================

@app.post("/api/upload")
async def api_upload(background_tasks: BackgroundTasks, video: UploadFile = File(...)):
    """Automatic detection & inpainting endpoint for Bellix Labs frontend."""
    upload_res = await upload_video(file=video)
    task_id = upload_res.body
    import json
    data = json.loads(task_id.decode("utf-8"))
    tid = data["task_id"]

    # Trigger automatic background inpaint using processor.py
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
    if job_id not in task_store:
        raise HTTPException(status_code=404, detail="Job not found")
    t = task_store[job_id]
    st = t.get("status")
    # Normalize status for frontend ('complete' -> 'done')
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
    out_path = UPLOAD_DIR / job_id / "output.mp4"
    if not out_path.is_file():
        raise HTTPException(status_code=404, detail="Not ready")
    return FileResponse(str(out_path), media_type="video/mp4")


@app.get("/api/download/{job_id}")
async def api_download(job_id: str):
    out_path = UPLOAD_DIR / job_id / "output.mp4"
    if not out_path.is_file():
        raise HTTPException(status_code=404, detail="Not ready")
    return FileResponse(
        str(out_path),
        media_type="video/mp4",
        filename="clean_video.mp4",
        headers={"Content-Disposition": 'attachment; filename="clean_video.mp4"'},
    )


def prepare_overlay(mask_path: str, logo_path: str, overlay_path: str) -> None:
    """Reads mask bounding box and resizes logo to fit it."""
    mask_cv = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask_cv is None:
        logger.error("Failed to read mask for overlay placement.")
        return

    _, mask_bin = cv2.threshold(mask_cv, 127, 255, cv2.THRESH_BINARY)
    points = cv2.findNonZero(mask_bin)
    if points is None:
        logger.warning("Mask is completely empty. Cannot place logo.")
        return

    x, y, w, h = cv2.boundingRect(points)
    mask_h, mask_w = mask_cv.shape[:2]

    try:
        logo_img = Image.open(logo_path).convert("RGBA")
    except Exception as e:
        logger.error("Failed to open logo image: %s", str(e))
        return

    logo_w, logo_h = logo_img.size
    scale = min(w / logo_w, h / logo_h)
    new_w = max(1, int(logo_w * scale))
    new_h = max(1, int(logo_h * scale))
    logo_img = logo_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    overlay_img = Image.new("RGBA", (mask_w, mask_h), (0, 0, 0, 0))
    paste_x = x + (w - new_w) // 2
    paste_y = y + (h - new_h) // 2

    overlay_img.paste(logo_img, (paste_x, paste_y), logo_img)
    overlay_img.save(overlay_path, "PNG")
    logger.info("Successfully prepared logo overlay at %s", overlay_path)


def _run_processing_pipeline(
    task_id: str,
    video_path: str,
    mask_path: str,
    logo_path: str | None,
    task_dir: str,
    enhance: bool,
    inpaint_mode: str,
):
    """Execute the full watermark removal pipeline as a background task."""
    try:
        logger.info("[%s] Pipeline started.", task_id)

        # Stage 1: Extract audio
        task_store[task_id]["progress"] = 5
        audio_path = os.path.join(task_dir, "audio.aac")
        video_utils.extract_audio(video_path, audio_path)
        logger.info("[%s] Audio extracted.", task_id)

        # Stage 2: Split video into frames
        task_store[task_id]["progress"] = 10
        frames_dir = os.path.join(task_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        frame_count = video_utils.split_frames(video_path, frames_dir)
        logger.info("[%s] Extracted %d frames.", task_id, frame_count)

        # Stage 3: Inpaint each frame
        output_frames_dir = os.path.join(task_dir, "output_frames")
        os.makedirs(output_frames_dir, exist_ok=True)

        def progress_callback(current_frame: int, total_frames: int):
            pct = 10 + int((current_frame / max(total_frames, 1)) * 75)
            task_store[task_id]["progress"] = min(pct, 85)

        inpainter.process_frames(
            frames_dir=frames_dir,
            mask_path=mask_path,
            output_dir=output_frames_dir,
            progress_callback=progress_callback,
            enhance=enhance,
            inpaint_mode=inpaint_mode,
        )
        logger.info("[%s] Inpainting complete.", task_id)

        # Stage 4: Reassemble video with audio and optional logo
        task_store[task_id]["progress"] = 90
        output_path = os.path.join(task_dir, "output.mp4")
        overlay_path = None

        if logo_path and os.path.isfile(logo_path):
            overlay_path = os.path.join(task_dir, "overlay.png")
            prepare_overlay(mask_path, logo_path, overlay_path)
            if not os.path.isfile(overlay_path):
                overlay_path = None

        fps = video_utils.get_video_fps(video_path)

        video_utils.reassemble_video(
            frames_dir=output_frames_dir,
            audio_path=audio_path,
            output_path=output_path,
            fps=fps,
            overlay_path=overlay_path,
        )
        logger.info("[%s] Video reassembled.", task_id)

        task_store[task_id]["status"] = "complete"
        task_store[task_id]["progress"] = 100
        logger.info("[%s] Pipeline complete.", task_id)

    except Exception as e:
        logger.error("[%s] Pipeline failed: %s", task_id, str(e))
        task_store[task_id]["status"] = "error"
        task_store[task_id]["error"] = "Processing failed. Please try again."


# Mount static directory for frontend
static_dir = Path("static")
if static_dir.is_dir():
    app.mount("/static", StaticFiles(directory="static"), name="static")

