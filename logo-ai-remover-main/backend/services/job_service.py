import json
import threading
from pathlib import Path

from backend.models.job import JobRecord, JobStatus
from backend.utils.file_utils import assert_job_owned_path, job_dir


class JobNotFoundError(FileNotFoundError):
    pass


class JobService:
    def __init__(self) -> None:
        self._lock = threading.RLock()

    def create_layout(self, job_id: str) -> Path:
        root = job_dir(job_id)
        for child in ("original", "frames/original", "frames/cleaned", "masks", "output", "temp"):
            (root / child).mkdir(parents=True, exist_ok=True)
        return root

    def record_path(self, job_id: str) -> Path:
        return job_dir(job_id) / "metadata.json"

    def save(self, job: JobRecord) -> JobRecord:
        path = self.record_path(job.id)
        assert_job_owned_path(job.id, path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        with self._lock:
            temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
            temporary.replace(path)
        return job

    def get(self, job_id: str) -> JobRecord:
        path = self.record_path(job_id)
        if not path.is_file():
            raise JobNotFoundError(job_id)
        with self._lock:
            return JobRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def update(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        progress: int | None = None,
        stage: str | None = None,
        message: str | None = None,
        error: str | None = None,
        result_path: str | None = None,
        completed_at=None,
    ) -> JobRecord:
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
            if completed_at is not None:
                job.completed_at = completed_at
            return self.save(job)

    def write_detection(self, job_id: str, payload: dict) -> Path:
        path = job_dir(job_id) / "detection.json"
        with self._lock:
            path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return path


job_service = JobService()
