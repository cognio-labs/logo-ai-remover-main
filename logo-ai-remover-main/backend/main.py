from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.api.video_routes import router as video_router
from backend.config import settings
from backend.utils.logging_utils import configure_logging


configure_logging()
app = FastAPI(
    title="PixelRefine Video Restoration API",
    version="1.0.0",
    description="Job-isolated OpenRouter detection + OpenCV inpainting + FFmpeg output pipeline.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def prevent_stale_job_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/video/"):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(video_router)
