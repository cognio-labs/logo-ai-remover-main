from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

from backend.models.job import JobStatus, VideoMetadata
from backend.services.job_service import job_service


METADATA = VideoMetadata(
    width=320,
    height=240,
    fps=30,
    duration=1,
    frame_count=30,
    pixel_format="yuv420p",
    video_codec="h264",
    audio_present=False,
)


def upload(client, monkeypatch, name: str, body: bytes, job_id: str | None = None):
    monkeypatch.setattr("backend.api.video_routes.analyze_video", lambda *_: METADATA)
    identity = job_id or str(uuid4())
    response = client.post(
        "/api/video/upload",
        data={"jobId": identity},
        files={"file": (name, body, "video/mp4")},
    )
    assert response.status_code == 200, response.text
    return identity, response.json()


def test_same_filename_creates_independent_jobs(client, monkeypatch):
    first_id, first = upload(client, monkeypatch, "same.mp4", b"video-a")
    second_id, second = upload(client, monkeypatch, "same.mp4", b"video-b")
    assert first_id != second_id
    assert first["originalVideoUrl"] != second["originalVideoUrl"]
    assert Path(job_service.get(first_id).original_path).read_bytes() == b"video-a"
    assert Path(job_service.get(second_id).original_path).read_bytes() == b"video-b"


def test_process_submits_only_requested_job(client, monkeypatch):
    job_id, _ = upload(client, monkeypatch, "a.mp4", b"video-a")
    submitted: list[str] = []
    monkeypatch.setattr(
        "backend.api.video_routes.submit_video_job",
        lambda identity, manual=None: submitted.append(identity),
    )
    response = client.post("/api/video/process", json={"jobId": job_id})
    assert response.status_code == 200
    assert response.json()["jobId"] == job_id
    assert submitted == [job_id]


def test_two_simultaneous_uploads_never_share_paths(client, monkeypatch):
    monkeypatch.setattr("backend.api.video_routes.analyze_video", lambda *_: METADATA)

    def send(label: str):
        job_id = str(uuid4())
        response = client.post(
            "/api/video/upload",
            data={"jobId": job_id},
            files={"file": (f"{label}.mp4", label.encode(), "video/mp4")},
        )
        return job_id, response

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(send, "user-a").result()
        second = pool.submit(send, "user-b").result()
    assert first[1].status_code == second[1].status_code == 200
    first_job = job_service.get(first[0])
    second_job = job_service.get(second[0])
    assert first_job.original_path != second_job.original_path
    assert Path(first_job.original_path).read_bytes() == b"user-a"
    assert Path(second_job.original_path).read_bytes() == b"user-b"


def test_failed_job_never_returns_fallback_video(client, monkeypatch):
    job_id, _ = upload(client, monkeypatch, "failed.mp4", b"video")
    job_service.update(job_id, status=JobStatus.FAILED, error="detector unavailable")
    result = client.get(f"/api/video/result/{job_id}")
    download = client.get(f"/api/video/download/{job_id}")
    assert result.status_code == 409
    assert download.status_code == 409
    assert "demo" not in result.text.lower()


def test_status_recovers_after_refresh(client, monkeypatch):
    job_id, _ = upload(client, monkeypatch, "recover.mp4", b"video")
    job_service.update(
        job_id,
        status=JobStatus.PROCESSING,
        progress=67,
        stage="Reconstructing masked region",
    )
    response = client.get(f"/api/video/status/{job_id}")
    payload = response.json()
    assert payload["jobId"] == job_id
    assert payload["status"] == "processing"
    assert payload["progress"] == 67
    assert payload["stage"] == "Reconstructing masked region"
    assert payload["error"] is None


def test_download_returns_only_the_jobs_verified_result(client, monkeypatch):
    first_id, _ = upload(client, monkeypatch, "a.mp4", b"video-a")
    second_id, _ = upload(client, monkeypatch, "b.mp4", b"video-b")
    for job_id, body in ((first_id, b"clean-a"), (second_id, b"clean-b")):
        job = job_service.get(job_id)
        output = Path(job.original_path).parents[1] / "output" / "cleaned.mp4"
        output.write_bytes(body)
        job_service.update(
            job_id,
            status=JobStatus.COMPLETED,
            progress=100,
            result_path=str(output),
        )
    first = client.get(f"/api/video/download/{first_id}")
    second = client.get(f"/api/video/download/{second_id}")
    assert first.content == b"clean-a"
    assert second.content == b"clean-b"
    assert first.headers["x-video-job-id"] == first_id
    assert second.headers["x-video-job-id"] == second_id


def test_video_watermark_alias_routes_dual_compatibility(client, monkeypatch):
    monkeypatch.setattr("backend.api.video_routes.analyze_video", lambda *_: METADATA)
    submitted: list[str] = []
    monkeypatch.setattr(
        "backend.api.video_routes.submit_video_job",
        lambda identity, manual=None: submitted.append(identity),
    )

    # 1. Upload via /api/video-watermark/upload
    job_id = str(uuid4())
    upload_res = client.post(
        "/api/video-watermark/upload",
        data={"jobId": job_id},
        files={"file": ("alias_test.mp4", b"alias-video-content", "video/mp4")},
    )
    assert upload_res.status_code == 200, upload_res.text
    data = upload_res.json()
    assert data["jobId"] == job_id
    assert data["status"] == "uploaded"

    # 2. Process via /api/video-watermark/process
    proc_res = client.post("/api/video-watermark/process", json={"jobId": job_id})
    assert proc_res.status_code == 200
    assert proc_res.json()["jobId"] == job_id
    assert submitted == [job_id]

    # 3. Status via both /api/video-watermark/status and /api/video/status
    st_alias = client.get(f"/api/video-watermark/status/{job_id}")
    st_canonical = client.get(f"/api/video/status/{job_id}")
    assert st_alias.status_code == 200
    assert st_canonical.status_code == 200
    assert st_alias.json()["status"] == st_canonical.json()["status"]

    # 4. Download via /api/video-watermark/download once completed
    job = job_service.get(job_id)
    output = Path(job.original_path).parents[1] / "output" / "cleaned.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(b"cleaned-watermark-free")
    job_service.update(
        job_id,
        status=JobStatus.COMPLETED,
        progress=100,
        result_path=str(output),
    )
    dl_alias = client.get(f"/api/video-watermark/download/{job_id}")
    dl_canonical = client.get(f"/api/video/download/{job_id}")
    assert dl_alias.status_code == 200
    assert dl_canonical.status_code == 200
    assert dl_alias.content == b"cleaned-watermark-free"
    assert dl_alias.content == dl_canonical.content
    assert dl_alias.headers["x-video-job-id"] == job_id

    # 5. Delete via /api/video-watermark/{job_id}
    del_alias = client.delete(f"/api/video-watermark/{job_id}")
    assert del_alias.status_code == 200
    assert del_alias.json()["jobId"] == job_id
