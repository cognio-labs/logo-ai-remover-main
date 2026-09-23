from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.api.background_routes import router as background_router, router_alias as background_router_alias
from backend.api.image_routes import router as image_router
from backend.api.pdf_routes import router as pdf_router
from backend.api.video_routes import router as video_router
from backend.api.video_enhancer_routes import router as video_enhancer_router, health_router as video_enhancer_health_router
from backend.config import settings
from backend.utils.logging_utils import configure_logging


configure_logging()
app = FastAPI(
    title="PixelRefine Video Restoration, Image Upscaler, PDF Cleaner & AI Background Remover API",
    version="1.0.0",
    description="Job-isolated video restoration, image upscaling, PDF document cleaning, and AI background removal pipeline.",
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
    if request.url.path.startswith(("/api/video/", "/api/v1/video/", "/api/image/", "/api/pdf/", "/api/background/", "/api/v1/jobs/")):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(video_router)
app.include_router(image_router)
app.include_router(pdf_router)
app.include_router(background_router)
app.include_router(background_router_alias)
app.include_router(video_enhancer_router)
app.include_router(video_enhancer_health_router)

