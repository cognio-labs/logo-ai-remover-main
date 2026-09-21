import logging


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def log_job(logger: logging.Logger, job_id: str, original: str, result: str, status: str, progress: int) -> None:
    logger.info(
        "[VIDEO JOB] jobId=%s original=%s result=%s status=%s progress=%s",
        job_id,
        original,
        result,
        status,
        progress,
    )
