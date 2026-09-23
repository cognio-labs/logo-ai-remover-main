import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

from backend.models.pdf_job import DetectedRegion, PdfJobRecord, PdfJobStatus, PdfMetadata
from backend.utils.file_utils import assert_pdf_job_owned_path, pdf_job_dir


logger = logging.getLogger(__name__)


class PdfJobNotFoundError(FileNotFoundError):
    pass


class PdfJobService:
    def __init__(self) -> None:
        self._lock = threading.RLock()

    def create_layout(self, job_id: str) -> Path:
        root = pdf_job_dir(job_id)
        for child in (
            "original",
            "output",
            "temp",
            "pages/original",
            "pages/masks",
            "pages/cleaned",
        ):
            (root / child).mkdir(parents=True, exist_ok=True)
        return root

    def record_path(self, job_id: str) -> Path:
        return pdf_job_dir(job_id) / "metadata.json"

    def detection_path(self, job_id: str) -> Path:
        return pdf_job_dir(job_id) / "detection.json"

    def progress_path(self, job_id: str) -> Path:
        return pdf_job_dir(job_id) / "progress.json"

    def save(self, job: PdfJobRecord) -> PdfJobRecord:
        path = self.record_path(job.id)
        assert_pdf_job_owned_path(job.id, path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        with self._lock:
            temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
            temporary.replace(path)
            # Also keep progress.json updated for fast status polling
            prog_file = self.progress_path(job.id)
            prog_data = {
                "jobId": job.id,
                "status": job.status,
                "progress": job.progress,
                "stage": job.stage,
                "message": job.message,
                "error": job.error,
            }
            prog_file.write_text(json.dumps(prog_data, indent=2), encoding="utf-8")
        return job

    def get(self, job_id: str) -> PdfJobRecord:
        path = self.record_path(job_id)
        if not path.is_file():
            raise PdfJobNotFoundError(job_id)
        with self._lock:
            return PdfJobRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def save_detections(self, job_id: str, regions: list[DetectedRegion]) -> list[DetectedRegion]:
        det_file = self.detection_path(job_id)
        assert_pdf_job_owned_path(job_id, det_file)
        payload = {"jobId": job_id, "regions": [r.model_dump() for r in regions]}
        with self._lock:
            det_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return regions

    def get_detections(self, job_id: str) -> list[DetectedRegion]:
        det_file = self.detection_path(job_id)
        if not det_file.is_file():
            return []
        with self._lock:
            data = json.loads(det_file.read_text(encoding="utf-8"))
            return [DetectedRegion.model_validate(r) for r in data.get("regions", [])]

    def update(
        self,
        job_id: str,
        *,
        status: PdfJobStatus | None = None,
        progress: int | None = None,
        stage: str | None = None,
        message: str | None = None,
        error: str | None = None,
        result_path: str | None = None,
        metadata: PdfMetadata | None = None,
        detected_regions: list[DetectedRegion] | None = None,
        completed_at: str | None = None,
    ) -> PdfJobRecord:
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
            if metadata is not None:
                job.metadata = metadata
            if detected_regions is not None:
                job.detected_regions = detected_regions
            if completed_at is not None:
                job.completed_at = completed_at
            elif status == PdfJobStatus.COMPLETED and not job.completed_at:
                job.completed_at = datetime.now(timezone.utc).isoformat()
            
            logger.info(
                "[PDF JOB] jobId=%s status=%s stage='%s' progress=%d%%",
                job.id,
                job.status,
                job.stage,
                job.progress,
            )
            return self.save(job)


pdf_job_service = PdfJobService()
