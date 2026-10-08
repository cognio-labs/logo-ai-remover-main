import os
import logging

try:
    from celery import Celery
    HAS_CELERY = True
except ImportError:
    HAS_CELERY = False
    class Celery:
        def __init__(self, *args, **kwargs):
            self.conf = {}
        def task(self, *args, **kwargs):
            def decorator(fn):
                fn.delay = lambda *a, **k: fn(*a, **k)
                return fn
            return decorator

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "bellix_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=180,  # Hard timeout 3 minutes
    task_soft_time_limit=120,  # Soft timeout 2 minutes
    worker_prefetch_multiplier=1,
    task_routes={
        "tasks.upscale_task": {"queue": "upscale"},
        "tasks.remove_bg_task": {"queue": "background_removal"},
        "tasks.clean_image_task": {"queue": "image_clean"},
        "tasks.clean_pdf_task": {"queue": "pdf_clean"},
    },
    task_default_retry_delay=5,
    task_max_retries=2,
)
