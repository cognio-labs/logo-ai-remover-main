import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import shutil
import threading
from typing import Any, AsyncGenerator

from backend.models.video_enhancer_job import (
    ProcessOptions,
    VideoEnhancerJobRecord,
    VideoEnhancerJobStatus,
    VideoStreamMetadata,
)
from backend.utils.file_utils import (
    assert_video_enhancer_job_owned_path,
    video_enhancer_job_dir,
)

logger = logging.getLogger(__name__)


class VideoEnhancerJobNotFoundError(FileNotFoundError):
    pass


class VideoEnhancerJobService:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def create_layout(self, job_id: str) -> Path:
        root = video_enhancer_job_dir(job_id)
        for child in ("frames_in", "frames_out", "temp"):
            (root / child).mkdir(parents=True, exist_ok=True)
        return root

    def record_path(self, job_id: str) -> Path:
        return video_enhancer_job_dir(job_id) / "metadata.json"

    def save(self, job: VideoEnhancerJobRecord) -> VideoEnhancerJobRecord:
        path = self.record_path(job.id)
        assert_video_enhancer_job_owned_path(job.id, path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        job.updated_at = datetime.now(timezone.utc)
        with self._lock:
            temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
            temporary.replace(path)

        # Notify active SSE subscribers
        self._notify_subscribers(job)
        return job

    def get(self, job_id: str) -> VideoEnhancerJobRecord:
        path = self.record_path(job_id)
        if not path.is_file():
            raise VideoEnhancerJobNotFoundError(f"Job {job_id} not found")
        with self._lock:
            return VideoEnhancerJobRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def exists(self, job_id: str) -> bool:
        return self.record_path(job_id).is_file()

    def update(
        self,
        job_id: str,
        *,
        status: VideoEnhancerJobStatus | None = None,
        stage: str | None = None,
        message: str | None = None,
        progress: float | None = None,
        current_frame: int | None = None,
        total_frames: int | None = None,
        input_metadata: VideoStreamMetadata | None = None,
        target_metadata: dict[str, Any] | None = None,
        options: ProcessOptions | None = None,
        result_path: str | None = None,
        preview_path: str | None = None,
        output_metadata: VideoStreamMetadata | None = None,
        error: str | None = None,
        cancelled: bool | None = None,
    ) -> VideoEnhancerJobRecord:
        with self._lock:
            job = self.get(job_id)
            if status is not None:
                job.status = status
            if stage is not None:
                job.stage = stage
            if message is not None:
                job.message = message
            if progress is not None:
                job.progress = max(0.0, min(100.0, round(float(progress), 2)))
            if current_frame is not None:
                job.current_frame = current_frame
            if total_frames is not None:
                job.total_frames = total_frames
            if input_metadata is not None:
                job.input_metadata = input_metadata
            if target_metadata is not None:
                job.target_metadata = target_metadata
            if options is not None:
                job.options = options
            if result_path is not None:
                job.result_path = result_path
            if preview_path is not None:
                job.preview_path = preview_path
            if output_metadata is not None:
                job.output_metadata = output_metadata
            if error is not None:
                job.error = error
            if cancelled is not None:
                job.cancelled = cancelled
            if status == VideoEnhancerJobStatus.COMPLETED and not job.completed_at:
                job.completed_at = datetime.now(timezone.utc)
            return self.save(job)

    def cancel(self, job_id: str) -> VideoEnhancerJobRecord:
        with self._lock:
            job = self.get(job_id)
            if job.status not in (VideoEnhancerJobStatus.COMPLETED, VideoEnhancerJobStatus.FAILED):
                job.status = VideoEnhancerJobStatus.CANCELLED
                job.stage = "Cancelled"
                job.message = "Processing was cancelled by user"
                job.cancelled = True
                return self.save(job)
            return job

    def delete(self, job_id: str) -> None:
        root = video_enhancer_job_dir(job_id)
        if root.exists():
            shutil.rmtree(root, ignore_errors=True)

    def cleanup_intermediate_frames(self, job_id: str) -> None:
        """
        Removes temporary uncompressed frames to reclaim disk space.
        Leaves source video, output video, preview thumbnail, and metadata intact.
        """
        try:
            root = video_enhancer_job_dir(job_id)
            for folder_name in ("frames_in", "frames_out", "temp"):
                folder = root / folder_name
                if folder.exists():
                    shutil.rmtree(folder, ignore_errors=True)
            logger.info(f"Cleaned up intermediate frame directories for job {job_id}")
        except Exception as e:
            logger.warning(f"Failed to cleanup frames for job {job_id}: {e}")

    # SSE Event Broadcasting
    def _notify_subscribers(self, job: VideoEnhancerJobRecord) -> None:
        payload = {
            "job_id": job.id,
            "status": job.status.value,
            "stage": job.stage,
            "message": job.message,
            "progress": job.progress,
            "current_frame": job.current_frame,
            "total_frames": job.total_frames,
            "error": job.error,
            "output_metadata": job.output_metadata.model_dump() if job.output_metadata else None,
        }
        json_data = json.dumps(payload)
        with self._lock:
            queues = self._subscribers.get(job.id, [])
            for q in list(queues):
                try:
                    q.put_nowait(json_data)
                except asyncio.QueueFull:
                    pass
                except Exception:
                    pass

    async def subscribe_events(self, job_id: str) -> AsyncGenerator[str, None]:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        with self._lock:
            if job_id not in self._subscribers:
                self._subscribers[job_id] = []
            self._subscribers[job_id].append(q)

        # Immediately send current state if job exists
        try:
            current_job = self.get(job_id)
            initial_data = json.dumps({
                "job_id": current_job.id,
                "status": current_job.status.value,
                "stage": current_job.stage,
                "message": current_job.message,
                "progress": current_job.progress,
                "current_frame": current_job.current_frame,
                "total_frames": current_job.total_frames,
                "error": current_job.error,
                "output_metadata": current_job.output_metadata.model_dump() if current_job.output_metadata else None,
            })
            yield f"data: {initial_data}\n\n"
        except Exception:
            pass

        try:
            while True:
                data = await q.get()
                yield f"data: {data}\n\n"
                # If terminal state, close stream after delivering
                try:
                    parsed = json.loads(data)
                    if parsed.get("status") in ("COMPLETED", "FAILED", "CANCELLED"):
                        break
                except Exception:
                    pass
        finally:
            with self._lock:
                if job_id in self._subscribers and q in self._subscribers[job_id]:
                    self._subscribers[job_id].remove(q)
                    if not self._subscribers[job_id]:
                        del self._subscribers[job_id]


video_enhancer_job_service = VideoEnhancerJobService()
