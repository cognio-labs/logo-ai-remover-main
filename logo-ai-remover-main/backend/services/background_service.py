import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple
import cv2
import numpy as np

from backend.models.background_job import (
    BackgroundJobRecord,
    BackgroundJobStatus,
    BackgroundImageMetadata,
    BackgroundConfig,
)
from backend.utils.file_utils import (
    background_job_dir,
    assert_background_job_owned_path,
)


class BackgroundJobNotFoundError(FileNotFoundError):
    pass


class BackgroundJobService:
    def __init__(self) -> None:
        self._lock = threading.RLock()

    def create_layout(self, job_id: str) -> Path:
        root = background_job_dir(job_id)
        for child in ("original", "mask", "result", "preview", "temp"):
            (root / child).mkdir(parents=True, exist_ok=True)
        return root

    def record_path(self, job_id: str) -> Path:
        return background_job_dir(job_id) / "metadata.json"

    def save(self, job: BackgroundJobRecord) -> BackgroundJobRecord:
        path = self.record_path(job.id)
        assert_background_job_owned_path(job.id, path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        with self._lock:
            temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
            temporary.replace(path)
        return job

    def get(self, job_id: str) -> BackgroundJobRecord:
        path = self.record_path(job_id)
        if not path.is_file():
            raise BackgroundJobNotFoundError(job_id)
        with self._lock:
            return BackgroundJobRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def update(
        self,
        job_id: str,
        *,
        status: Optional[BackgroundJobStatus] = None,
        progress: Optional[int] = None,
        stage: Optional[str] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
        mask_path: Optional[str] = None,
        result_path: Optional[str] = None,
        preview_path: Optional[str] = None,
        result_metadata: Optional[BackgroundImageMetadata] = None,
        config: Optional[BackgroundConfig] = None,
        processing_time_ms: Optional[int] = None,
        completed_at: Optional[str] = None,
    ) -> BackgroundJobRecord:
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
            if mask_path is not None:
                job.mask_path = mask_path
            if result_path is not None:
                job.result_path = result_path
            if preview_path is not None:
                job.preview_path = preview_path
            if result_metadata is not None:
                job.result_metadata = result_metadata
            if config is not None:
                job.config = config
            if processing_time_ms is not None:
                job.processing_time_ms = processing_time_ms
            if completed_at is not None:
                job.completed_at = completed_at
            elif status == BackgroundJobStatus.COMPLETED and not job.completed_at:
                job.completed_at = datetime.now(timezone.utc).isoformat()
            return self.save(job)

    def save_mask(self, job_id: str, mask: np.ndarray) -> Path:
        """Saves single-channel 8-bit alpha mask to mask/mask.png."""
        root = background_job_dir(job_id)
        mask_dir = root / "mask"
        mask_dir.mkdir(parents=True, exist_ok=True)
        mask_file = mask_dir / "mask.png"
        assert_background_job_owned_path(job_id, mask_file)
        
        if len(mask.shape) == 3:
            mask = mask[:, :, 0]
        mask_uint8 = np.clip(mask, 0, 255).astype(np.uint8)
        cv2.imwrite(str(mask_file), mask_uint8)
        return mask_file

    def load_mask(self, job_id: str) -> np.ndarray:
        """Loads single-channel 8-bit alpha mask."""
        root = background_job_dir(job_id)
        mask_file = root / "mask" / "mask.png"
        if not mask_file.is_file():
            raise FileNotFoundError(f"Mask file not found for job {job_id}")
        mask = cv2.imread(str(mask_file), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise RuntimeError(f"Failed to read mask image for job {job_id}")
        return mask

    def load_original_rgb(self, job_id: str) -> Tuple[np.ndarray, BackgroundImageMetadata]:
        """Loads original uploaded image in RGB format."""
        job = self.get(job_id)
        path = Path(job.original_path)
        if not path.is_file():
            raise FileNotFoundError(f"Original image file not found: {path}")

        img_bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise RuntimeError(f"Failed to decode original image: {path}")

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        h, w = img_rgb.shape[:2]
        meta = BackgroundImageMetadata(
            width=w,
            height=h,
            channels=3,
            format=path.suffix.lstrip(".").lower(),
            size_bytes=path.stat().st_size,
        )
        return img_rgb, meta

    def save_result(self, job_id: str, image: np.ndarray, ext: str = "png") -> Path:
        """Saves final composited or transparent image."""
        root = background_job_dir(job_id)
        result_dir = root / "result"
        result_dir.mkdir(parents=True, exist_ok=True)
        clean_ext = ext.lstrip(".").lower()
        if clean_ext not in ("png", "jpg", "jpeg", "webp"):
            clean_ext = "png"
        result_file = result_dir / f"result.{clean_ext}"
        assert_background_job_owned_path(job_id, result_file)

        # OpenCV expects BGR or BGRA
        if len(image.shape) == 3 and image.shape[2] == 4:
            # RGBA -> BGRA
            img_to_save = cv2.cvtColor(image, cv2.COLOR_RGBA2BGRA)
        elif len(image.shape) == 3 and image.shape[2] == 3:
            # RGB -> BGR
            img_to_save = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        else:
            img_to_save = image

        params = []
        if clean_ext == "png":
            params = [cv2.IMWRITE_PNG_COMPRESSION, 4]
        elif clean_ext in ("jpg", "jpeg"):
            params = [cv2.IMWRITE_JPEG_QUALITY, 95]
        elif clean_ext == "webp":
            params = [cv2.IMWRITE_WEBP_QUALITY, 95]

        cv2.imwrite(str(result_file), img_to_save, params)
        return result_file

    def save_preview(self, job_id: str, image: np.ndarray, max_dim: int = 1024) -> Path:
        """Saves a resized preview image for web viewing."""
        root = background_job_dir(job_id)
        preview_dir = root / "preview"
        preview_dir.mkdir(parents=True, exist_ok=True)
        preview_file = preview_dir / "preview.png"
        assert_background_job_owned_path(job_id, preview_file)

        h, w = image.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            preview_img = cv2.resize(image, (int(round(w * scale)), int(round(h * scale))), interpolation=cv2.INTER_AREA)
        else:
            preview_img = image

        if len(preview_img.shape) == 3 and preview_img.shape[2] == 4:
            bgr_preview = cv2.cvtColor(preview_img, cv2.COLOR_RGBA2BGRA)
        elif len(preview_img.shape) == 3 and preview_img.shape[2] == 3:
            bgr_preview = cv2.cvtColor(preview_img, cv2.COLOR_RGB2BGR)
        else:
            bgr_preview = preview_img

        cv2.imwrite(str(preview_file), bgr_preview, [cv2.IMWRITE_PNG_COMPRESSION, 3])
        return preview_file

    def delete(self, job_id: str) -> bool:
        """Deletes all files and directories for a background job."""
        try:
            root = background_job_dir(job_id)
            if root.exists():
                shutil.rmtree(str(root))
            return True
        except Exception:
            return False


background_job_service = BackgroundJobService()
