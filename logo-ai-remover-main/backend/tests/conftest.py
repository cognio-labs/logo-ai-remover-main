import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.config import settings

# Force pytest and subprocesses to use Drive D temp storage (Drive C has 0 bytes free)
_PYTEST_TEMP = Path(__file__).resolve().parent.parent / "storage" / "temp"
_PYTEST_TEMP.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(_PYTEST_TEMP)
os.environ["TEMP"] = str(_PYTEST_TEMP)
os.environ["TMP"] = str(_PYTEST_TEMP)

from backend.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "storage_root", tmp_path / "jobs")
    settings.storage_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "background_storage_root", tmp_path / "background_jobs")
    settings.background_storage_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "video_enhancer_storage_root", tmp_path / "video_enhancer_jobs")
    settings.video_enhancer_storage_root.mkdir(parents=True, exist_ok=True)
    with TestClient(app) as test_client:
        yield test_client
