import time
import logging
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("pml.rate_limiter")

class RateLimiter:
    """
    In-memory sliding window rate limiter for FastAPI backend.
    Tracks request timestamps per client IP / user ID.
    """
    def __init__(self):
        # endpoint_prefix -> (max_requests, window_seconds)
        self.rules: Dict[str, Tuple[int, int]] = {
            "/api/chat": (30, 60),           # 30 chat requests per minute
            "/api/documents/upload": (10, 60), # 10 document uploads per minute
            "/api/memories": (60, 60),       # 60 memory requests per minute
            "default": (120, 60)             # 120 general requests per minute
        }
        # client_key:endpoint -> list of request timestamps
        self.request_history: Dict[str, List[float]] = {}
        self.last_cleanup = time.time()

    def _cleanup_expired(self):
        """Purges old timestamps to prevent memory leaks."""
        now = time.time()
        if now - self.last_cleanup > 300: # Clean every 5 minutes
            cutoff = now - 300
            keys_to_delete = []
            for key, timestamps in self.request_history.items():
                self.request_history[key] = [t for t in timestamps if t > cutoff]
                if not self.request_history[key]:
                    keys_to_delete.append(key)
            for k in keys_to_delete:
                del self.request_history[k]
            self.last_cleanup = now

    def is_rate_limited(self, client_id: str, path: str) -> Tuple[bool, int]:
        """
        Checks if the client has exceeded rate limits for the given endpoint path.
        Returns: (is_limited: bool, retry_after_seconds: int)
        """
        self._cleanup_expired()
        now = time.time()

        # Find matching rule
        max_requests, window_seconds = self.rules.get("default", (120, 60))
        for prefix, rule in self.rules.items():
            if prefix != "default" and path.startswith(prefix):
                max_requests, window_seconds = rule
                break

        key = f"{client_id}:{path}"
        timestamps = self.request_history.get(key, [])
        window_start = now - window_seconds
        valid_timestamps = [t for t in timestamps if t > window_start]

        if len(valid_timestamps) >= max_requests:
            oldest_in_window = valid_timestamps[0]
            retry_after = int(window_seconds - (now - oldest_in_window)) + 1
            return True, max(1, retry_after)

        valid_timestamps.append(now)
        self.request_history[key] = valid_timestamps
        return False, 0

rate_limiter = RateLimiter()

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for static docs and health checks
        if request.url.path in ("/health", "/api/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Extract client identifier (Forwarded-For, Client IP, or Auth Header)
        client_ip = request.client.host if request.client else "127.0.0.1"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        is_limited, retry_after = rate_limiter.is_rate_limited(client_ip, request.url.path)
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path} (retry in {retry_after}s)")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please wait a moment before sending more requests.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        return await call_next(request)
