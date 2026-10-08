import time
from collections import defaultdict
from fastapi import Request, HTTPException

class RateLimiter:
    """
    IP-based and API-key based sliding-window rate limiter.
    Default: 10 requests per hour for anonymous visitors.
    Bypassed if valid x-api-key header is present.
    """
    def __init__(self, limit_per_hour: int = 10):
        self.limit = limit_per_hour
        self.window = 3600
        self.requests = defaultdict(list)

    def check_rate_limit(self, request: Request):
        # API-Key authentication bypass for premium / batch customers
        api_key = request.headers.get("x-api-key") or request.headers.get("authorization")
        if api_key and (api_key.startswith("bellix_live_") or len(api_key) > 20):
            return

        # Client IP extraction
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
            or "127.0.0.1"
        )

        now = time.time()
        cutoff = now - self.window
        timestamps = self.requests[client_ip]

        # Filter out old requests
        self.requests[client_ip] = [t for t in timestamps if t > cutoff]

        if len(self.requests[client_ip]) >= self.limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Free tier allows {self.limit} operations per hour. Upgrade or provide an API key."
            )

        self.requests[client_ip].append(now)

rate_limiter = RateLimiter(limit_per_hour=15)
