import logging
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.services.openrouter_service import (
    OpenRouterException,
    openrouter_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@router.post("/chat")
async def chat_proxy(
    request: Request,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Secure server-side proxy for OpenRouter chat completions.
    Enforces validation, daily/monthly limits, error mapping, and token accounting.
    Never exposes API keys or internal stack traces to the frontend.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Malformed JSON in request body",
                },
            },
        )

    try:
        result = await openrouter_service.chat_completion(body, user_id=x_user_id)
        return {
            "success": True,
            "data": result,
        }
    except OpenRouterException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )
    except Exception as exc:
        logger.error(f"Unexpected AI proxy error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "AI_PROVIDER_ERROR",
                    "message": "An unexpected error occurred while communicating with the AI provider",
                },
            },
        )


@router.get("/models")
async def list_models():
    """Returns available server-configured AI models."""
    return {
        "success": True,
        "default_model": settings.openrouter_model,
        "fallback_model": settings.openrouter_fallback_model,
        "configured": bool(settings.openrouter_api_key),
    }
