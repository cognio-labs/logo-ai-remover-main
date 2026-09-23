import threading
from datetime import datetime, timezone
from pathlib import Path

from backend.models.image_job import ImageJobRecord, ImageJobStatus, ImageMetadata
from backend.utils.file_utils import assert_image_job_owned_path, image_job_dir


class ImageJobNotFoundError(FileNotFoundError):
    pass


class ImageJobService:
    def __init__(self) -> None:
        self._lock = threading.RLock()

    def create_layout(self, job_id: str) -> Path:
        root = image_job_dir(job_id)
        for child in ("original", "output", "temp"):
            (root / child).mkdir(parents=True, exist_ok=True)
        return root

    def record_path(self, job_id: str) -> Path:
        return image_job_dir(job_id) / "metadata.json"

    def save(self, job: ImageJobRecord) -> ImageJobRecord:
        path = self.record_path(job.id)
        assert_image_job_owned_path(job.id, path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        with self._lock:
            temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
            temporary.replace(path)
        return job

    def get(self, job_id: str) -> ImageJobRecord:
        path = self.record_path(job_id)
        if not path.is_file():
            raise ImageJobNotFoundError(job_id)
        with self._lock:
            return ImageJobRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def update(
        self,
        job_id: str,
        *,
        status: ImageJobStatus | None = None,
        progress: int | None = None,
        stage: str | None = None,
        message: str | None = None,
        error: str | None = None,
        result_path: str | None = None,
        upscaled_metadata: ImageMetadata | None = None,
        completed_at: str | None = None,
    ) -> ImageJobRecord:
        with self._lock:
            job = self.get(job_id)
            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = max(0, min(100, progress))
            if stage is not None:
                job.stage = stage
            if message is not None:
                job.message = message
            if error is not None:
                job.error = error
            if result_path is not None:
                job.result_path = result_path
            if upscaled_metadata is not None:
                job.upscaled_metadata = upscaled_metadata
            if completed_at is not None:
                job.completed_at = completed_at
            elif status == ImageJobStatus.COMPLETED and not job.completed_at:
                job.completed_at = datetime.now(timezone.utc).isoformat()
            return self.save(job)


image_job_service = ImageJobService()
