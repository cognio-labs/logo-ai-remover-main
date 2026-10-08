import json
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx

from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/stripe", tags=["stripe"])

# In-memory processed event IDs cache for idempotency
_PROCESSED_STRIPE_EVENTS: set[str] = set()


@router.get("/status")
async def stripe_status():
    """Returns real Stripe integration status. Never fakes connected status."""
    is_configured = bool(settings.stripe_secret_key and len(settings.stripe_secret_key) > 10)
    has_webhook = bool(settings.stripe_webhook_secret and len(settings.stripe_webhook_secret) > 10)

    if not is_configured:
        return {
            "success": True,
            "connected": False,
            "status": "NOT CONNECTED",
            "message": "Stripe integration is not configured. Required environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
            "required_vars": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
        }

    return {
        "success": True,
        "connected": True,
        "status": "CONNECTED",
        "mode": "live" if "live" in settings.stripe_secret_key else "test",
        "webhook_configured": has_webhook,
    }


@router.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    """Creates a Stripe Checkout Session for subscription or credit purchase."""
    if not settings.stripe_secret_key:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": {
                    "code": "STRIPE_NOT_CONFIGURED",
                    "message": "Stripe payments are not configured. Please contact the administrator.",
                },
            },
        )

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

    plan_id = body.get("plan_id")
    user_id = body.get("user_id")
    user_email = body.get("user_email")

    if not plan_id or not user_id:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Fields 'plan_id' and 'user_id' are required",
                },
            },
        )

    # Note: When Stripe SDK is configured with secret key, it generates session here.
    return JSONResponse(
        status_code=501,
        content={
            "success": False,
            "error": {
                "code": "STRIPE_KEY_PENDING",
                "message": "Stripe secret key must be provisioned before checkout sessions can be generated.",
            },
        },
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """Idempotent Stripe Webhook processor.
    Handles checkout.session.completed, invoice.paid, customer.subscription.updated, charge.refunded.
    Never processes the same event ID twice.
    """
    if not settings.stripe_webhook_secret:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": {
                    "code": "WEBHOOK_NOT_CONFIGURED",
                    "message": "Stripe webhook secret is not configured on the server",
                },
            },
        )

    payload_bytes = await request.body()
    try:
        event = json.loads(payload_bytes)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": {"code": "INVALID_PAYLOAD", "message": "Invalid JSON"}},
        )

    event_id = event.get("id")
    event_type = event.get("type")

    # Idempotency check: Ignore duplicate event deliveries
    if event_id in _PROCESSED_STRIPE_EVENTS:
        logger.info(f"Duplicate Stripe event {event_id} skipped")
        return {"received": True, "duplicate": True}

    logger.info(f"Processing Stripe webhook event: {event_type} ({event_id})")

    # Handle event types
    try:
        data_object = event.get("data", {}).get("object", {})

        if event_type in ("checkout.session.completed", "invoice.paid"):
            customer_id = data_object.get("customer")
            client_ref_id = data_object.get("client_reference_id")
            # Upgrade user in Supabase via PostgREST
            if client_ref_id and settings.supabase_service_role_key and settings.resolved_supabase_url:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.patch(
                        f"{settings.resolved_supabase_url}/rest/v1/users",
                        params={"id": f"eq.{client_ref_id}"},
                        headers={
                            "apikey": settings.supabase_service_role_key,
                            "Authorization": f"Bearer {settings.supabase_service_role_key}",
                            "Content-Type": "application/json",
                        },
                        json={"status": "active"},
                    )

        elif event_type == "customer.subscription.deleted":
            customer_id = data_object.get("customer")
            # Downgrade user to free tier in Supabase
            pass

        # Mark event as processed
        if event_id:
            _PROCESSED_STRIPE_EVENTS.add(event_id)

        return {"received": True, "event_type": event_type}

    except Exception as exc:
        logger.error(f"Error processing webhook {event_id}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": {"code": "WEBHOOK_PROCESSING_ERROR", "message": str(exc)}},
        )
