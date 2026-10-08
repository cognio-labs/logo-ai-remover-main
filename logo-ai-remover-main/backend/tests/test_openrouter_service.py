import pytest
from backend.services.openrouter_service import (
    OpenRouterService,
    OpenRouterValidationError,
    OpenRouterException,
)


def test_validate_request_valid():
    svc = OpenRouterService()
    payload = {
        "model": "google/gemma-4-26b-a4b-it:free",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"},
        ],
    }
    # Should not raise
    svc.validate_request(payload)


def test_validate_request_missing_model():
    svc = OpenRouterService()
    payload = {
        "messages": [{"role": "user", "content": "Hello!"}],
    }
    with pytest.raises(OpenRouterValidationError) as exc:
        svc.validate_request(payload)
    assert "model" in str(exc.value)


def test_validate_request_invalid_role():
    svc = OpenRouterService()
    payload = {
        "model": "test-model",
        "messages": [{"role": "invalid_role", "content": "Hello!"}],
    }
    with pytest.raises(OpenRouterValidationError) as exc:
        svc.validate_request(payload)
    assert "invalid role" in str(exc.value)


def test_validate_request_empty_content():
    svc = OpenRouterService()
    payload = {
        "model": "test-model",
        "messages": [{"role": "user", "content": "   "}],
    }
    with pytest.raises(OpenRouterValidationError) as exc:
        svc.validate_request(payload)
    assert "empty" in str(exc.value)


def test_validate_request_not_dict():
    svc = OpenRouterService()
    with pytest.raises(OpenRouterValidationError):
        svc.validate_request(["not", "a", "dict"])
