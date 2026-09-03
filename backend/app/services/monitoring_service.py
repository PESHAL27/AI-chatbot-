import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field

logger = logging.getLogger("pml.monitoring")

@dataclass
class RequestMetric:
    request_id: str
    endpoint: str
    method: str
    user_id: str
    status_code: int
    duration_ms: float
    tools_called: List[str] = field(default_factory=list)
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MonitoringService:
    """
    Production-grade monitoring, latency metrics, and API cost tracking.
    """
    _instance: Optional["MonitoringService"] = None

    # Pricing per 1M tokens (GPT-4o-mini baseline)
    INPUT_COST_PER_1M = 0.15
    OUTPUT_COST_PER_1M = 0.60

    def __init__(self):
        self.metrics_history: List[RequestMetric] = []
        self.max_history = 1000  # retain last 1000 requests in memory
        self.total_requests = 0
        self.total_errors = 0
        self.tool_counts: Dict[str, int] = {
            "web_search": 0,
            "calculator": 0,
            "rag": 0,
            "vision": 0,
            "memory": 0
        }
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.total_cost_usd = 0.0

    @classmethod
    def get_instance(cls) -> "MonitoringService":
        if cls._instance is None:
            cls._instance = MonitoringService()
        return cls._instance

    @staticmethod
    def generate_request_id() -> str:
        return f"pml-req-{uuid.uuid4().hex[:12]}"

    def record_request(
        self,
        request_id: str,
        endpoint: str,
        method: str,
        user_id: str,
        status_code: int,
        duration_ms: float,
        tools_called: Optional[List[str]] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        error: Optional[str] = None
    ) -> RequestMetric:
        # Calculate cost
        cost = ((prompt_tokens / 1_000_000) * self.INPUT_COST_PER_1M) + \
               ((completion_tokens / 1_000_000) * self.OUTPUT_COST_PER_1M)

        metric = RequestMetric(
            request_id=request_id,
            endpoint=endpoint,
            method=method,
            user_id="guest_session" if (not user_id or str(user_id).startswith("guest")) else f"user_{user_id[:6]}...",
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            tools_called=tools_called or [],
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=round(cost, 6),
            error=error
        )

        self.metrics_history.append(metric)
        if len(self.metrics_history) > self.max_history:
            self.metrics_history.pop(0)

        self.total_requests += 1
        if status_code >= 400 or error:
            self.total_errors += 1

        self.total_prompt_tokens += prompt_tokens
        self.total_completion_tokens += completion_tokens
        self.total_cost_usd += cost

        if tools_called:
            for t in tools_called:
                self.tool_counts[t] = self.tool_counts.get(t, 0) + 1

        logger.info(
            f"[PML Mon] req_id={request_id} | path={endpoint} | status={status_code} | "
            f"dur={round(duration_ms, 1)}ms | tools={tools_called or []} | cost=${round(cost, 5)}"
        )
        return metric

    def get_summary_metrics(self) -> Dict[str, Any]:
        """
        Calculates aggregate operational metrics and P50/P95 latency.
        """
        durations = [m.duration_ms for m in self.metrics_history]
        durations.sort()
        count = len(durations)

        p50 = durations[int(count * 0.5)] if count > 0 else 0.0
        p95 = durations[int(count * 0.95)] if count > 0 else 0.0
        p99 = durations[int(count * 0.99)] if count > 0 else 0.0
        avg_latency = round(sum(durations) / count, 2) if count > 0 else 0.0

        error_rate = round((self.total_errors / self.total_requests * 100), 2) if self.total_requests > 0 else 0.0

        return {
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate_pct": error_rate,
            "latency": {
                "avg_ms": avg_latency,
                "p50_ms": p50,
                "p95_ms": p95,
                "p99_ms": p99
            },
            "tokens": {
                "prompt_tokens": self.total_prompt_tokens,
                "completion_tokens": self.total_completion_tokens,
                "total_tokens": self.total_prompt_tokens + self.total_completion_tokens
            },
            "cost": {
                "estimated_cost_usd": round(self.total_cost_usd, 4),
                "currency": "USD"
            },
            "tools_usage": self.tool_counts,
            "recent_requests_logged": len(self.metrics_history),
            "status": "healthy"
        }

monitoring_service = MonitoringService.get_instance()
