from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.models.video_enhancer_job import (
    ProcessOptions,
    VideoEnhancerJobRecord,
    VideoEnhancerJobStatus,
    VideoStreamMetadata,
)
from backend.services.video_enhancer.denoise_deblock_engine import denoise_deblock_engine
from backend.services.video_enhancer.frame_interpolation_engine import frame_interpolation_engine
from backend.services.video_enhancer.job_service import video_enhancer_job_service
from backend.services.video_enhancer.super_resolution_engine import (
    SuperResolutionError,
    compute_target_dimensions,
    super_resolution_engine,
)
from backend.services.video_enhancer.video_inspector import video_inspector


def test_compute_target_dimensions_valid():
    # 720p 2x -> 1440p
    tw, th = compute_target_dimensions(1280, 720, scale=2)
    assert tw == 2560
    assert th == 1440

    # 1080p 2x -> 4K UHD
    tw, th = compute_target_dimensions(1920, 1080, scale=2)
    assert tw == 3840
    assert th == 2160


def test_compute_target_dimensions_exceeding_limit():
    # 3840x2160 (4K) with 4x upscale would be 15360x8640 (16K), which must be rejected
    with pytest.raises(SuperResolutionError) as exc_info:
        compute_target_dimensions(3840, 2160, scale=4)
    assert "exceeds the maximum supported 4K limit" in str(exc_info.value)


def test_denoise_deblock_engine():
    # Synthetic noisy frame
    frame = np.random.randint(0, 255, (64, 64, 3), dtype=np.uint8)

    # Test all variations
    for denoise in ("off", "low", "medium", "high"):
        for deblock in (True, False):
            for sharpen in ("off", "low", "medium", "high"):
                out = denoise_deblock_engine.process_frame(
                    frame,
                    denoise_level=denoise,
                    deblock=deblock,
                    sharpen_level=sharpen,
                )
                assert out.shape == (64, 64, 3)
                assert out.dtype == np.uint8


def test_super_resolution_engine():
    super_resolution_engine.reset_temporal_state()
    frame = np.ones((48, 64, 3), dtype=np.uint8) * 128

    upscaled = super_resolution_engine.upscale_frame(
        frame_bgr=frame,
        target_w=128,
        target_h=96,
        scale=2,
        mode="balanced",
    )
    assert upscaled.shape == (96, 128, 3)
    assert upscaled.dtype == np.uint8


def test_frame_interpolation_engine():
    f0 = np.zeros((64, 64, 3), dtype=np.uint8)
    f1 = np.ones((64, 64, 3), dtype=np.uint8) * 200

    multiplier, timestamps = frame_interpolation_engine.compute_interpolation_plan(
        source_fps=30.0,
        target_fps=60.0,
    )
    assert multiplier == 2
    assert len(timestamps) == 1
    assert timestamps[0] == 0.5

    synth = frame_interpolation_engine.synthesize_intermediate_frame(f0, f1, t=0.5)
    assert synth.shape == (64, 64, 3)
    assert synth.dtype == np.uint8


def test_job_service_record_lifecycle(tmp_path):
    job_id = "00000000-0000-0000-0000-000000000001"
    video_enhancer_job_service.create_layout(job_id)

    record = VideoEnhancerJobRecord(
        id=job_id,
        status=VideoEnhancerJobStatus.QUEUED,
        stage="Queued",
        message="Job queued",
        progress=0.0,
        original_filename="sample.mp4",
        original_path=str(tmp_path / "sample.mp4"),
        original_mime="video/mp4",
        original_size_bytes=1024,
    )

    saved = video_enhancer_job_service.save(record)
    assert saved.id == job_id

    retrieved = video_enhancer_job_service.get(job_id)
    assert retrieved.status == VideoEnhancerJobStatus.QUEUED

    updated = video_enhancer_job_service.update(
        job_id,
        status=VideoEnhancerJobStatus.ENHANCING,
        progress=45.5,
        current_frame=45,
        total_frames=100,
    )
    assert updated.status == VideoEnhancerJobStatus.ENHANCING
    assert updated.progress == 45.5
    assert updated.current_frame == 45

    cancelled = video_enhancer_job_service.cancel(job_id)
    assert cancelled.status == VideoEnhancerJobStatus.CANCELLED
    assert cancelled.cancelled is True

    video_enhancer_job_service.delete(job_id)
    assert not video_enhancer_job_service.exists(job_id)


def test_system_health_and_capabilities(client: TestClient):
    # Health checks
    r1 = client.get("/api/v1/video/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "ok"

    r2 = client.get("/api/v1/video/health/model")
    assert r2.status_code == 200
    assert r2.json()["status"] == "ready"

    r3 = client.get("/api/v1/video/health/ffmpeg")
    assert r3.status_code == 200
    assert r3.json()["ok"] is True

    # Capabilities
    r4 = client.get("/api/v1/video/capabilities")
    assert r4.status_code == 200
    caps = r4.json()
    assert 2 in caps["supported_scales"]
    assert "4k" in caps["supported_resolutions"]
    assert "h264" in caps["supported_codecs"]


def test_api_upload_and_inspect(client: TestClient):
    # Use existing test video in public folder
    source_file = Path("public/gemini-example-before.mp4")
    if not source_file.exists():
        pytest.skip("public/gemini-example-before.mp4 not found")

    with source_file.open("rb") as f:
        res = client.post(
            "/api/v1/video/upload",
            files={"file": ("sample.mp4", f, "video/mp4")},
        )
    assert res.status_code == 200, res.text
    data = res.json()
    job_id = data["job_id"]
    assert "metadata" in data
    assert data["metadata"]["width"] > 0
    assert data["metadata"]["height"] > 0

    # Inspect endpoint
    inspect_res = client.post(
        "/api/v1/video/inspect",
        json={"job_id": job_id, "scale": 2, "target_resolution": "4k"},
    )
    assert inspect_res.status_code == 200
    inspect_data = inspect_res.json()
    assert inspect_data["safe"] is True
    assert inspect_data["target_width"] == data["metadata"]["width"] * 2

    # Clean up job
    client.delete(f"/api/v1/video/jobs/{job_id}")
