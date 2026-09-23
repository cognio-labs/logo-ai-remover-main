import asyncio
import base64
import json
import re

import httpx

from backend.config import settings


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



class OpenRouterUnavailable(RuntimeError):
    pass


def _json_payload(content: str) -> dict:
    cleaned = re.sub(r"^\s*\`\`\`(?:json)?|\`\`\`\s*$", "", content.strip(), flags=re.I)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise OpenRouterUnavailable("The detection model did not return structured JSON")
    return json.loads(cleaned[start : end + 1])


class OpenRouterService:
    endpoint = "https://openrouter.ai/api/v1/chat/completions"

    async def analyze_video_sample(self, jpeg_frames: list[bytes]) -> dict:
        if not settings.openrouter_api_key:
            raise OpenRouterUnavailable(
                "AI detection temporarily unavailable. Configure OPENROUTER_API_KEY and retry."
            )
        content: list[dict] = [{"type": "text", "text": DETECTION_PROMPT}]
        for frame in jpeg_frames:
            encoded = base64.b64encode(frame).decode("ascii")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
                }
            )
        last_error = "AI detection temporarily unavailable. Please retry."
        for model in (settings.openrouter_model, settings.openrouter_fallback_model):
            for attempt in range(3):
                try:
                    async with httpx.AsyncClient(timeout=settings.openrouter_timeout_seconds) as client:
                        response = await client.post(
                            self.endpoint,
                            headers={
                                "Authorization": f"Bearer {settings.openrouter_api_key}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://pixelrefine.app",
                                "X-Title": "PixelRefine Watermark Detector",
                            },
                            json={
                                "model": model,
                                "messages": [{"role": "user", "content": content}],
                                "temperature": 0,
                                "response_format": {"type": "json_object"},
                            },
                        )
                    if response.status_code in {429, 408, 500, 502, 503, 504}:
                        last_error = f"OpenRouter returned {response.status_code}"
                        await asyncio.sleep(1.5 * (attempt + 1))
                        continue
                    response.raise_for_status()
                    body = response.json()
                    result = _json_payload(body["choices"][0]["message"]["content"])
                    result["model"] = model
                    return result
                except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError) as exc:
                    last_error = str(exc)
                    if attempt < 2:
                        await asyncio.sleep(1.5 * (attempt + 1))
            # Try the configured fallback model after bounded retries.
        raise OpenRouterUnavailable(f"AI detection temporarily unavailable. Please retry. ({last_error})")

    def detect_watermark(self, jpeg_frames: list[bytes]) -> dict:
        return asyncio.run(self.analyze_video_sample(jpeg_frames))

    async def analyze_document_image(self, jpeg_image: bytes) -> dict:
        if not settings.openrouter_api_key:
            raise OpenRouterUnavailable(
                "AI detection temporarily unavailable. Configure OPENROUTER_API_KEY or use automatic local detection."
            )
        encoded = base64.b64encode(jpeg_image).decode("ascii")
        content: list[dict] = [
            {"type": "text", "text": DOCUMENT_DETECTION_PROMPT},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
            },
        ]
        last_error = "AI document detection temporarily unavailable."
        for model in (settings.openrouter_model, settings.openrouter_fallback_model):
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=settings.openrouter_timeout_seconds) as client:
                        response = await client.post(
                            self.endpoint,
                            headers={
                                "Authorization": f"Bearer {settings.openrouter_api_key}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://pixelrefine.app",
                                "X-Title": "PixelRefine Document Detector",
                            },
                            json={
                                "model": model,
                                "messages": [{"role": "user", "content": content}],
                                "temperature": 0,
                                "response_format": {"type": "json_object"},
                            },
                        )
                    if response.status_code in {429, 408, 500, 502, 503, 504}:
                        last_error = f"OpenRouter returned {response.status_code}"
                        await asyncio.sleep(1.2 * (attempt + 1))
                        continue
                    response.raise_for_status()
                    body = response.json()
                    result = _json_payload(body["choices"][0]["message"]["content"])
                    result["model"] = model
                    return result
                except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError) as exc:
                    last_error = str(exc)
                    if attempt < 1:
                        await asyncio.sleep(1.0)
        raise OpenRouterUnavailable(f"AI document detection unavailable ({last_error})")

    def detect_document_watermark(self, jpeg_image: bytes) -> dict:
        return asyncio.run(self.analyze_document_image(jpeg_image))


openrouter_service = OpenRouterService()

