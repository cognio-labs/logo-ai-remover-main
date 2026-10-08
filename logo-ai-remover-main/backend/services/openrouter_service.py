import asyncio
import base64
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

DETECTION_PROMPT = """You are a computer-vision watermark detector.
Analyze these sampled frames from one video. Find only visible AI-generation
provider logos, Gemini/Veo marks, AI badges, or persistent generation
watermarks. Do not treat subtitles, captions, ordinary scene text, faces, or
objects as watermarks. Return JSON only, with this schema:
{"watermark_detected":true,"confidence":0.96,"regions":[{"x":0.82,"y":0.04,
"width":0.12,"height":0.08,"confidence":0.96,"type":"ai_watermark"}]}
Coordinates are normalized from 0 to 1. Return at most three regions. If no
watermark is visible return:
{"watermark_detected":false,"confidence":0,"regions":[]}
Do not describe the frames and do not hallucinate a watermark."""

DOCUMENT_DETECTION_PROMPT = """You are analyzing a document image to identify visible, user-added annotation or removable overlay regions.

Identify candidate:
- marker strokes
- pen scribbles
- highlighter strokes
- decorative overlays
- ordinary watermark overlays

Do not classify signatures, official seals, certification marks, security features, or authentication marks as removable.

Return JSON only.

For every candidate provide:
x
y
width
height
type
confidence

Coordinates must be normalized from 0 to 1.

If no safe removable candidate exists:
{"regions": []}"""


class OpenRouterException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code

    def to_dict(self) -> dict:
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
            },
        }


class OpenRouterUnavailable(OpenRouterException):
    def __init__(self, message: str = "AI detection temporarily unavailable."):
        super().__init__(code="AI_PROVIDER_UNAVAILABLE", message=message, status_code=503)


class OpenRouterValidationError(OpenRouterException):
    def __init__(self, message: str):
        super().__init__(code="INVALID_REQUEST", message=message, status_code=400)


class OpenRouterLimitExceeded(OpenRouterException):
    def __init__(self, limit_type: str):
        code = f"{limit_type.upper()}_AI_LIMIT_REACHED"
        msg = f"Your {limit_type.lower()} AI usage limit has been reached."
        super().__init__(code=code, message=msg, status_code=429)


def _json_payload(content: str) -> dict:
    cleaned = re.sub(r"^\s*```(?:json)?|```\s*$", "", content.strip(), flags=re.I)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise OpenRouterUnavailable("The detection model did not return structured JSON")
    return json.loads(cleaned[start : end + 1])


class OpenRouterService:
    endpoint = "https://openrouter.ai/api/v1/chat/completions"

    # =========================================================================
    # PHASE 5: REQUEST VALIDATION
    # =========================================================================
    def validate_request(self, payload: dict) -> None:
        """Validates payload before sending to OpenRouter.
        Prevents malformed requests and returns HTTP 400 with standardized error.
        """
        if not isinstance(payload, dict):
            raise OpenRouterValidationError("Request body must be a valid JSON object")

        if not settings.openrouter_api_key:
            raise OpenRouterException(
                code="AI_AUTHENTICATION_ERROR",
                message="OpenRouter API key is not configured on the server",
                status_code=500,
            )

        model = payload.get("model")
        if not model or not isinstance(model, str) or not model.strip():
            raise OpenRouterValidationError("Field 'model' is required and must be a non-empty string")

        messages = payload.get("messages")
        if messages is None or not isinstance(messages, list) or len(messages) == 0:
            raise OpenRouterValidationError("Field 'messages' must be a non-empty array")

        allowed_roles = {"system", "user", "assistant", "tool"}
        for idx, msg in enumerate(messages):
            if not isinstance(msg, dict):
                raise OpenRouterValidationError(f"Message at index {idx} must be a JSON object")

            role = msg.get("role")
            if role not in allowed_roles:
                raise OpenRouterValidationError(
                    f"Message at index {idx} has invalid role '{role}'. Allowed: {', '.join(sorted(allowed_roles))}"
                )

            content = msg.get("content")
            if content is None:
                raise OpenRouterValidationError(f"Message at index {idx} is missing required 'content' field")

            # Content can be str or list of parts (e.g. text + image_url)
            if isinstance(content, str):
                if not content.strip():
                    raise OpenRouterValidationError(f"Message content at index {idx} cannot be empty")
            elif isinstance(content, list):
                if len(content) == 0:
                    raise OpenRouterValidationError(f"Message content parts array at index {idx} cannot be empty")
            else:
                raise OpenRouterValidationError(
                    f"Message content at index {idx} must be a string or array of content blocks"
                )

    # =========================================================================
    # PHASE 8 & 9: DAILY & MONTHLY AI USAGE LIMITS
    # =========================================================================
    async def check_user_limits(self, user_id: Optional[str]) -> None:
        """Enforces daily and monthly token limits per user based on plan."""
        if not user_id or not settings.supabase_service_role_key or not settings.resolved_supabase_url:
            return

        try:
            now = datetime.now(timezone.utc)
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                }
                # 1. Fetch user's plan details
                user_res = await client.get(
                    f"{settings.resolved_supabase_url}/rest/v1/users",
                    params={"id": f"eq.{user_id}", "select": "plan"},
                    headers=headers,
                )
                if user_res.status_code != 200 or not user_res.json():
                    return
                user_plan_id = user_res.json()[0].get("plan", "free")

                plan_res = await client.get(
                    f"{settings.resolved_supabase_url}/rest/v1/plans",
                    params={"id": f"eq.{user_plan_id}", "select": "daily_ai_tokens,monthly_ai_tokens"},
                    headers=headers,
                )
                daily_limit = 5000
                monthly_limit = 100000
                if plan_res.status_code == 200 and plan_res.json():
                    pdata = plan_res.json()[0]
                    daily_limit = pdata.get("daily_ai_tokens") or 5000
                    monthly_limit = pdata.get("monthly_ai_tokens") or 100000

                # 2. Sum today's tokens
                today_res = await client.get(
                    f"{settings.resolved_supabase_url}/rest/v1/ai_usage",
                    params={
                        "user_id": f"eq.{user_id}",
                        "created_at": f"gte.{start_of_day}",
                        "select": "total_tokens",
                    },
                    headers=headers,
                )
                if today_res.status_code == 200:
                    today_tokens = sum(r.get("total_tokens", 0) for r in today_res.json())
                    if today_tokens >= daily_limit:
                        raise OpenRouterLimitExceeded("DAILY")

                # 3. Sum monthly tokens
                month_res = await client.get(
                    f"{settings.resolved_supabase_url}/rest/v1/ai_usage",
                    params={
                        "user_id": f"eq.{user_id}",
                        "created_at": f"gte.{start_of_month}",
                        "select": "total_tokens",
                    },
                    headers=headers,
                )
                if month_res.status_code == 200:
                    month_tokens = sum(r.get("total_tokens", 0) for r in month_res.json())
                    if month_tokens >= monthly_limit:
                        raise OpenRouterLimitExceeded("MONTHLY")

        except OpenRouterLimitExceeded:
            raise
        except Exception as exc:
            logger.warning(f"Failed to check user AI limits (non-fatal): {exc}")

    # =========================================================================
    # PHASE 7: TOKEN ACCOUNTING
    # =========================================================================
    async def record_usage(
        self,
        *,
        user_id: Optional[str],
        model: str,
        request_id: Optional[str],
        usage: Optional[dict],
    ) -> None:
        """Records actual token usage in public.ai_usage table."""
        if not settings.supabase_service_role_key or not settings.resolved_supabase_url:
            return

        has_usage = bool(usage and isinstance(usage, dict) and "total_tokens" in usage)
        input_tokens = int(usage.get("prompt_tokens", 0)) if has_usage else 0
        output_tokens = int(usage.get("completion_tokens", 0)) if has_usage else 0
        total_tokens = int(usage.get("total_tokens", 0)) if has_usage else 0
        usage_status = "ok" if has_usage else "unavailable"

        # Estimated cost: ~$0.20 per 1M tokens for free/budget models
        estimated_cost = round((total_tokens / 1_000_000.0) * 0.20, 6)

        record = {
            "user_id": user_id,
            "model": model,
            "request_id": request_id,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "estimated_cost": estimated_cost,
            "usage_status": usage_status,
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{settings.resolved_supabase_url}/rest/v1/ai_usage",
                    headers={
                        "apikey": settings.supabase_service_role_key,
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=record,
                )
        except Exception as exc:
            logger.warning(f"Failed to log AI token usage to Supabase: {exc}")

    # =========================================================================
    # PHASE 6: ERROR HANDLING & CALL DISPATCHER
    # =========================================================================
    async def chat_completion(
        self,
        payload: dict,
        user_id: Optional[str] = None,
    ) -> dict:
        """High-level completion with validation, limit check, error mapping, and token accounting."""
        self.validate_request(payload)
        await self.check_user_limits(user_id)

        target_model = payload.get("model", settings.openrouter_model)
        models_to_try = [target_model]
        if settings.openrouter_fallback_model and settings.openrouter_fallback_model not in models_to_try:
            models_to_try.append(settings.openrouter_fallback_model)

        last_error_code = "AI_PROVIDER_ERROR"
        last_error_message = "AI service request failed"
        last_status_code = 500

        for current_model in models_to_try:
            active_payload = dict(payload)
            active_payload["model"] = current_model

            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=settings.openrouter_timeout_seconds) as client:
                        resp = await client.post(
                            self.endpoint,
                            headers={
                                "Authorization": f"Bearer {settings.openrouter_api_key}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://bellix.us",
                                "X-Title": "Bellix.us AI Engine",
                            },
                            json=active_payload,
                        )

                    # Successful response (200)
                    if resp.status_code == 200:
                        data = resp.json()
                        usage = data.get("usage")
                        req_id = data.get("id")
                        asyncio.create_task(
                            self.record_usage(
                                user_id=user_id,
                                model=current_model,
                                request_id=req_id,
                                usage=usage,
                            )
                        )
                        return data

                    # Error handling by specific status code
                    status = resp.status_code
                    resp_json = {}
                    try:
                        resp_json = resp.json()
                    except Exception:
                        pass
                    provider_msg = resp_json.get("error", {}).get("message") or resp.text

                    if status == 400:
                        # If response_format caused 400, retry without it
                        if "response_format" in active_payload and attempt == 0:
                            del active_payload["response_format"]
                            continue
                        last_error_code = "INVALID_REQUEST"
                        last_error_message = f"Invalid request format for model {current_model}: {provider_msg}"
                        last_status_code = 400
                        break  # Don't retry same model on 400
                    elif status == 401:
                        last_error_code = "AI_AUTHENTICATION_ERROR"
                        last_error_message = "Authentication with AI provider failed"
                        last_status_code = 401
                        break
                    elif status == 403:
                        last_error_code = "AI_ACCESS_DENIED"
                        last_error_message = "Access denied to requested model"
                        last_status_code = 403
                        break
                    elif status == 404:
                        last_error_code = "AI_MODEL_NOT_FOUND"
                        last_error_message = f"Requested model '{current_model}' was not found"
                        last_status_code = 404
                        break  # Fallback to next model
                    elif status == 408:
                        last_error_code = "AI_REQUEST_TIMEOUT"
                        last_error_message = "AI provider request timed out"
                        last_status_code = 408
                    elif status == 429:
                        last_error_code = "AI_RATE_LIMITED"
                        last_error_message = "AI service rate limit reached. Please retry in a moment."
                        last_status_code = 429
                    elif status in (502, 503, 504):
                        last_error_code = "AI_PROVIDER_UNAVAILABLE"
                        last_error_message = "AI provider is temporarily unreachable"
                        last_status_code = 503
                    else:
                        last_error_code = "AI_PROVIDER_ERROR"
                        last_error_message = f"Upstream provider error ({status})"
                        last_status_code = 500

                    if attempt < 1:
                        await asyncio.sleep(1.0)

                except httpx.TimeoutException:
                    last_error_code = "AI_REQUEST_TIMEOUT"
                    last_error_message = "AI request timed out"
                    last_status_code = 408
                except httpx.HTTPError as exc:
                    last_error_code = "AI_PROVIDER_UNAVAILABLE"
                    last_error_message = f"Network connection error: {str(exc)}"
                    last_status_code = 503

        raise OpenRouterException(
            code=last_error_code,
            message=last_error_message,
            status_code=last_status_code,
        )

    # =========================================================================
    # EXISTING APPLICATION HELPERS (Preserved with enhanced resiliency)
    # =========================================================================
    async def analyze_video_sample(self, jpeg_frames: list[bytes], user_id: Optional[str] = None) -> dict:
        content: list[dict] = [{"type": "text", "text": DETECTION_PROMPT}]
        for frame in jpeg_frames:
            encoded = base64.b64encode(frame).decode("ascii")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
            })

        payload = {
            "model": settings.openrouter_model,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0,
        }
        res = await self.chat_completion(payload, user_id=user_id)
        msg_content = res["choices"][0]["message"]["content"]
        result = _json_payload(msg_content)
        result["model"] = res.get("model", settings.openrouter_model)
        return result

    def detect_watermark(self, jpeg_frames: list[bytes]) -> dict:
        return asyncio.run(self.analyze_video_sample(jpeg_frames))

    async def analyze_document_image(self, jpeg_image: bytes, user_id: Optional[str] = None) -> dict:
        encoded = base64.b64encode(jpeg_image).decode("ascii")
        content: list[dict] = [
            {"type": "text", "text": DOCUMENT_DETECTION_PROMPT},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
            },
        ]
        payload = {
            "model": settings.openrouter_model,
            "messages": [{"role": "user", "content": content}],
            "temperature": 0,
        }
        res = await self.chat_completion(payload, user_id=user_id)
        msg_content = res["choices"][0]["message"]["content"]
        result = _json_payload(msg_content)
        result["model"] = res.get("model", settings.openrouter_model)
        return result

    def detect_document_watermark(self, jpeg_image: bytes) -> dict:
        return asyncio.run(self.analyze_document_image(jpeg_image))


openrouter_service = OpenRouterService()
