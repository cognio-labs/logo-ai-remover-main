import os
import time
import shutil
import logging
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class StorageService:
    """
    Unified Storage Service supporting S3 / Cloudflare R2 and Local fallback.
    - Presigned URLs with 1-hour expiration
    - Transient processing with 1-hour auto-retention cleanup
    - Zero data persistence beyond retention window
    """
    def __init__(self):
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL", "")
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "")
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        self.region_name = os.getenv("AWS_REGION", "auto")
        self.retention_seconds = int(os.getenv("RETENTION_SECONDS", "3600"))  # 1 hour
        self.base_url = os.getenv("API_BASE_URL", "http://localhost:8000")

        self.s3_client = None
        if self.bucket_name and self.access_key and self.secret_key:
            try:
                import boto3
                from botocore.config import Config
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url or None,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region_name,
                    config=Config(signature_version="s3v4")
                )
                logger.info(f"S3/R2 Storage connected to bucket: {self.bucket_name}")
            except Exception as e:
                logger.warning(f"Could not initialize boto3 S3 client ({e}). Falling back to local storage.")
                self.s3_client = None

        # Start background retention janitor
        self._start_retention_janitor()

    def upload_file(self, local_path: Path, remote_key: str, content_type: Optional[str] = None) -> str:
        """Uploads a file to S3/R2 or stores locally, returning its access key/path."""
        if self.s3_client and self.bucket_name:
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            self.s3_client.upload_file(
                str(local_path),
                self.bucket_name,
                remote_key,
                ExtraArgs=extra_args if extra_args else None
            )
            return remote_key
        return str(local_path)

    def get_signed_url(self, file_reference: str, expires_in: int = 3600) -> str:
        """Generates a presigned URL with specified expiration (default 1 hour)."""
        if self.s3_client and self.bucket_name and not Path(file_reference).is_absolute():
            try:
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": file_reference},
                    ExpiresIn=expires_in
                )
                return url
            except Exception as e:
                logger.error(f"Failed to generate presigned S3 URL: {e}")

        # Local fallback URL
        if os.path.exists(file_reference):
            rel = Path(file_reference).name
            return f"{self.base_url}/api/storage/files/{rel}"

        return file_reference

    def delete_file(self, file_reference: str) -> bool:
        """Deletes a file immediately from storage."""
        if self.s3_client and self.bucket_name and not Path(file_reference).is_absolute():
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_reference)
                return True
            except Exception as e:
                logger.warning(f"Failed to delete S3 object {file_reference}: {e}")
                return False

        if os.path.exists(file_reference):
            try:
                if os.path.isdir(file_reference):
                    shutil.rmtree(file_reference, ignore_errors=True)
                else:
                    os.remove(file_reference)
                return True
            except Exception as e:
                logger.warning(f"Failed to delete local file {file_reference}: {e}")
        return False

    def _start_retention_janitor(self):
        """Background thread that runs hourly to delete local/transient files older than retention limit."""
        def run_janitor():
            while True:
                try:
                    time.sleep(300)  # Check every 5 minutes
                    cutoff = time.time() - self.retention_seconds
                    from backend.config import settings
                    storage_dirs = [
                        settings.image_storage_root,
                        settings.pdf_storage_root,
                        settings.background_storage_root,
                        settings.storage_root,
                    ]
                    for s_dir in storage_dirs:
                        if s_dir.exists():
                            for job_folder in s_dir.iterdir():
                                if job_folder.is_dir() and job_folder.stat().st_mtime < cutoff:
                                    logger.info(f"Auto-deleting expired job directory: {job_folder.name}")
                                    shutil.rmtree(job_folder, ignore_errors=True)
                except Exception as ex:
                    logger.error(f"Error in storage retention janitor: {ex}")

        t = threading.Thread(target=run_janitor, daemon=True)
        t.start()

storage_service = StorageService()
