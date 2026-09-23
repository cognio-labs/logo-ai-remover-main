import io
import time
from uuid import uuid4
from PIL import Image

from backend.models.image_job import ImageJobStatus
from backend.services.image_job_service import image_job_service


def create_test_image_bytes(width=64, height=48, color=(200, 50, 100)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_image_upscale_e2e_2x_png(client):
    img_bytes = create_test_image_bytes(60, 40)
    job_id = str(uuid4())

    response = client.post(
        "/api/image/upscale",
        data={"scale": 2, "mode": "natural", "outputFormat": "png", "jobId": job_id},
        files={"image": ("test-photo.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["jobId"] == job_id

    # Wait for completion (fast for 60x40 image)
    completed = False
    for _ in range(30):
        status_res = client.get(f"/api/image/status/{job_id}")
        assert status_res.status_code == 200
        data = status_res.json()
        if data["status"] == ImageJobStatus.COMPLETED:
            completed = True
            break
        elif data["status"] == ImageJobStatus.FAILED:
            assert False, f"Job failed unexpectedly: {data.get('error')}"
        time.sleep(0.1)

    assert completed is True

    # Check result endpoint
    result_res = client.get(f"/api/image/result/{job_id}")
    assert result_res.status_code == 200
    res_data = result_res.json()
    assert res_data["status"] == "completed"
    assert res_data["metadata"]["originalWidth"] == 60
    assert res_data["metadata"]["originalHeight"] == 40
    assert res_data["metadata"]["upscaledWidth"] == 120
    assert res_data["metadata"]["upscaledHeight"] == 80
    assert res_data["metadata"]["scale"] == 2
    assert res_data["metadata"]["format"] == "PNG"

    # Check download endpoint
    dl_res = client.get(f"/api/image/download/{job_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/png"
    assert "test-photo-upscaled-2x.png" in dl_res.headers["content-disposition"]


def test_image_upscale_jpg_format(client):
    img_bytes = create_test_image_bytes(50, 50)
    job_id = str(uuid4())

    response = client.post(
        "/api/image/upscale",
        data={"scale": 2, "mode": "portrait", "outputFormat": "jpg", "jobId": job_id},
        files={"image": ("portrait.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200

    completed = False
    for _ in range(30):
        status_res = client.get(f"/api/image/status/{job_id}")
        if status_res.json()["status"] == ImageJobStatus.COMPLETED:
            completed = True
            break
        time.sleep(0.1)

    assert completed is True
    result_res = client.get(f"/api/image/result/{job_id}")
    assert result_res.json()["metadata"]["format"] == "JPG"

    dl_res = client.get(f"/api/image/download/{job_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/jpeg"
    assert "portrait-upscaled-2x.jpg" in dl_res.headers["content-disposition"]


def test_image_upscale_invalid_inputs(client):
    img_bytes = create_test_image_bytes(32, 32)

    # Invalid scale
    res_scale = client.post(
        "/api/image/upscale",
        data={"scale": 5, "mode": "natural", "outputFormat": "png"},
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert res_scale.status_code == 422

    # Invalid mode
    res_mode = client.post(
        "/api/image/upscale",
        data={"scale": 4, "mode": "invalid_mode", "outputFormat": "png"},
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert res_mode.status_code == 422

    # Invalid format
    res_fmt = client.post(
        "/api/image/upscale",
        data={"scale": 4, "mode": "natural", "outputFormat": "bmp"},
        files={"image": ("test.png", img_bytes, "image/png")},
    )
    assert res_fmt.status_code == 422


def test_image_job_isolation(client):
    img_a = create_test_image_bytes(40, 40, (255, 0, 0))
    img_b = create_test_image_bytes(40, 40, (0, 255, 0))

    id_a = str(uuid4())
    id_b = str(uuid4())

    res_a = client.post(
        "/api/image/upscale",
        data={"scale": 2, "mode": "natural", "outputFormat": "png", "jobId": id_a},
        files={"image": ("same.png", img_a, "image/png")},
    )
    res_b = client.post(
        "/api/image/upscale",
        data={"scale": 2, "mode": "natural", "outputFormat": "png", "jobId": id_b},
        files={"image": ("same.png", img_b, "image/png")},
    )
    assert res_a.status_code == 200
    assert res_b.status_code == 200

    job_a = image_job_service.get(id_a)
    job_b = image_job_service.get(id_b)
    assert job_a.original_path != job_b.original_path


def test_oversized_image_rejected_safely(client, monkeypatch):
    from backend.config import settings
    from backend.services.image_upscaler import calculate_max_safe_dimensions

    # Temporarily set max safe limit to 50,000 pixels
    monkeypatch.setattr(settings, "max_safe_image_pixels", 50_000)

    # 100x100 image (10,000 pixels)
    # At 2x: 200x200 = 40,000 pixels (<= 50,000 -> fits 2x)
    # At 4x: 400x400 = 160,000 pixels (> 50,000 -> exceeds limit)
    img_bytes = create_test_image_bytes(100, 100)
    job_id = str(uuid4())

    response = client.post(
        "/api/image/upscale",
        data={"scale": 4, "mode": "natural", "outputFormat": "png", "jobId": job_id},
        files={"image": ("large-photo.png", img_bytes, "image/png")},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "4× output exceeds the maximum supported image size." in detail
    assert "Choose 2× or reduce the source/output dimensions." in detail

    # Test aspect ratio preservation in calculate_max_safe_dimensions
    safe_w, safe_h, safe_scale = calculate_max_safe_dimensions(6000, 4000, max_pixels=100_000_000, max_dim=16000)
    assert safe_w * safe_h <= 100_000_000
    assert safe_w <= 16000 and safe_h <= 16000
    # Aspect ratio should match original 6000:4000 (1.5)
    assert abs((safe_w / safe_h) - (6000 / 4000)) < 0.01

