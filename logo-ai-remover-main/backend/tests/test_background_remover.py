import io
import time
from uuid import uuid4
from PIL import Image, ImageDraw
import numpy as np
import pytest

from backend.models.background_job import BackgroundJobStatus


def create_synthetic_subject_image(width=120, height=100) -> bytes:
    """
    Creates an RGB image with a distinct subject (red circle with green square)
    on a clean white/gray gradient background.
    """
    img = Image.new("RGB", (width, height), color=(240, 240, 245))
    draw = ImageDraw.Draw(img)
    # Background pattern
    draw.rectangle([0, 0, width, height], fill=(235, 238, 242))
    # Subject in center
    cx, cy = width // 2, height // 2
    r = min(width, height) // 3
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(225, 29, 72))
    draw.rectangle([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=(34, 197, 94))
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_capabilities_and_health(client):
    res = client.get("/api/v1/capabilities")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "local_onnx" in data["engines"]
    assert "transparent" in data["background_types"]

    health_res = client.get("/api/v1/health/model")
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert "standard_model" in h_data
    assert "providers" in h_data


def test_direct_sync_background_removal(client):
    img_bytes = create_synthetic_subject_image(120, 100)

    res = client.post(
        "/api/v1/background/remove",
        data={
            "bg_type": "transparent",
            "quality_mode": "standard",
            "export_format": "png",
        },
        files={"image": ("test_portrait.png", img_bytes, "image/png")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["width"] == 120
    assert data["height"] == 100
    job_id = data["job_id"]

    # Verify download of genuine 4-channel transparent PNG
    dl_res = client.get(f"/api/v1/jobs/{job_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/png"

    # Decode downloaded bytes with PIL
    out_img = Image.open(io.BytesIO(dl_res.content))
    assert out_img.mode == "RGBA"
    assert out_img.size == (120, 100)

    # Inspect alpha channel
    alpha_data = np.array(out_img.split()[-1])
    # Must have genuine transparency (< 15) and foreground (> 200)
    assert np.count_nonzero(alpha_data < 20) > 0, "Expected transparent background pixels"
    assert np.count_nonzero(alpha_data > 200) > 0, "Expected opaque subject pixels"


def test_async_process_job_lifecycle(client):
    img_bytes = create_synthetic_subject_image(100, 80)
    job_id = str(uuid4())

    res = client.post(
        "/api/v1/background/process",
        data={
            "jobId": job_id,
            "bg_type": "transparent",
            "quality_mode": "fast",
            "export_format": "png",
        },
        files={"image": ("sample.png", img_bytes, "image/png")},
    )
    assert res.status_code == 200
    assert res.json()["id"] == job_id

    # Poll status
    completed = False
    for _ in range(40):
        status_res = client.get(f"/api/v1/jobs/{job_id}")
        assert status_res.status_code == 200
        st = status_res.json()
        if st["status"] == BackgroundJobStatus.COMPLETED:
            completed = True
            break
        elif st["status"] == BackgroundJobStatus.FAILED:
            pytest.fail(f"Job failed: {st.get('error')}")
        time.sleep(0.1)

    assert completed is True

    # Test result metadata endpoint
    result_res = client.get(f"/api/v1/jobs/{job_id}/result")
    assert result_res.status_code == 200
    res_data = result_res.json()
    assert res_data["status"] == "completed"
    assert res_data["result_metadata"]["width"] == 100
    assert res_data["result_metadata"]["height"] == 80

    # Test preview and mask endpoints
    prev_res = client.get(f"/api/v1/jobs/{job_id}/preview")
    assert prev_res.status_code == 200
    assert prev_res.headers["content-type"] == "image/png"

    mask_res = client.get(f"/api/v1/jobs/{job_id}/mask")
    assert mask_res.status_code == 200
    assert mask_res.headers["content-type"] == "image/png"


def test_recomposite_solid_color_and_backdrop(client):
    img_bytes = create_synthetic_subject_image(90, 70)
    job_id = str(uuid4())

    # Create and finish a job
    res = client.post(
        "/api/v1/background/process",
        data={"jobId": job_id, "bg_type": "transparent"},
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert res.status_code == 200

    for _ in range(40):
        st = client.get(f"/api/v1/jobs/{job_id}").json()
        if st["status"] == "completed":
            break
        time.sleep(0.1)

    # Re-composite onto Pure White #FFFFFF (E-commerce compliant)
    comp_res = client.post(
        "/api/v1/background/composite",
        json={
            "job_id": job_id,
            "config": {
                "bg_type": "color",
                "bg_color": "#FFFFFF",
                "export_format": "jpg",
            },
        },
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "success"

    # Verify download as JPG
    dl_res = client.get(f"/api/v1/jobs/{job_id}/download?format=jpg")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/jpeg"
    comp_img = Image.open(io.BytesIO(dl_res.content))
    assert comp_img.mode == "RGB"
    assert comp_img.size == (90, 70)


def test_manual_brush_refine_strokes(client):
    img_bytes = create_synthetic_subject_image(80, 60)
    job_id = str(uuid4())

    client.post(
        "/api/v1/background/process",
        data={"jobId": job_id, "bg_type": "transparent"},
        files={"image": ("test.png", img_bytes, "image/png")},
    )

    for _ in range(40):
        st = client.get(f"/api/v1/jobs/{job_id}").json()
        if st["status"] == "completed":
            break
        time.sleep(0.1)

    # Apply manual brush strokes: erase a patch (remove)
    refine_res = client.post(
        "/api/v1/background/refine",
        json={
            "job_id": job_id,
            "strokes": [
                {
                    "mode": "remove",
                    "points": [[0.5, 0.5], [0.52, 0.52]],
                    "brush_size": 15.0,
                }
            ],
            "edge_refine": True,
        },
    )
    assert refine_res.status_code == 200
    assert refine_res.json()["status"] == "success"
