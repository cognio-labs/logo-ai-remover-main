import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_stripe_status_not_connected():
    response = client.get("/api/v1/stripe/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "NOT CONNECTED"
    assert "STRIPE_SECRET_KEY" in data["required_vars"]


def test_ai_models_endpoint():
    response = client.get("/api/v1/ai/models")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "default_model" in data


def test_ai_chat_missing_model():
    response = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_REQUEST"


def test_ai_chat_malformed_json():
    response = client.post(
        "/api/v1/ai/chat",
        content=b"invalid-json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_REQUEST"
