import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.services.monitoring_service import monitoring_service

logger = logging.getLogger("pml.middleware")

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assigns unique X-Request-ID to all requests and correlates latency & status.
    """
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or f"pml-req-{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
        start_time = time.time()

        try:
            response: Response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000
            response.headers["X-Request-ID"] = req_id

            # Skip monitoring noise for static assets
            if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
                monitoring_service.record_request(
                    request_id=req_id,
                    endpoint=request.url.path,
                    method=request.method,
                    user_id="anonymous",
                    status_code=response.status_code,
                    duration_ms=duration_ms
                )
            return response
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            monitoring_service.record_request(
                request_id=req_id,
                endpoint=request.url.path,
                method=request.method,
                user_id="anonymous",
                status_code=500,
                duration_ms=duration_ms,
                error=str(exc)
            )
            raise
