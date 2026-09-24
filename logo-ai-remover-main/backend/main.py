import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.utils.logging_utils import configure_logging
from backend.api.video_routes import router as video_router, router_alias as video_router_alias
from backend.api.image_routes import router as image_router
from backend.api.pdf_routes import router as pdf_router
from backend.api.background_routes import router as background_router, router_alias as background_router_alias
from backend.api.video_enhancer_routes import router as video_enhancer_router, health_router as video_enhancer_health_router


# CRITICAL: Configure temp directory to Drive D: storage so multipart uploads never fail on C: disk full
_TEMP_ROOT = settings.storage_root.parent / "temp"
_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(_TEMP_ROOT)
os.environ["TEMP"] = str(_TEMP_ROOT)
os.environ["TMP"] = str(_TEMP_ROOT)

configure_logging()
app = FastAPI(
    title="Bellix.us Video Restoration, Image Upscaler, PDF Cleaner & AI Background Remover API",
    version="1.0.0",
    description="Job-isolated video restoration, image upscaling, PDF document cleaning, and AI background removal pipeline.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "INVALID_REQUEST_BODY",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "FILE_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "UNPROCESSABLE_ENTITY",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": msg,
            },
            "detail": msg,
        },
    )


@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = "; ".join(f"{'.'.join(str(loc) for loc in e.get('loc', []))}: {e.get('msg', '')}" for e in errors)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": msg or "Invalid request parameters",
            },
            "detail": msg,
        },
    )


@app.exception_handler(Exception)
async def custom_general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) or "An unexpected server error occurred",
            },
            "detail": str(exc),
        },
    )


@app.middleware("http")
async def prevent_stale_job_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(("/api/video/", "/api/video-watermark/", "/api/v1/video/", "/api/image/", "/api/pdf/", "/api/background/", "/api/v1/jobs/")):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(video_router)
app.include_router(video_router_alias)
app.include_router(image_router)
app.include_router(pdf_router)
app.include_router(background_router)
app.include_router(background_router_alias)
app.include_router(video_enhancer_router)
app.include_router(video_enhancer_health_router)

