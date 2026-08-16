from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.schemas.chat import HealthCheckResponse
from app.services.monitoring_service import monitoring_service
from app.auth.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api", tags=["Health & Monitoring"])

@router.get("/health", response_model=HealthCheckResponse, summary="Backend Health Check")
async def health_check():
    """
    Health check endpoint to verify backend operational status.
    """
    return HealthCheckResponse(
        status="ok", 
        service=f"{settings.APP_NAME} (FastAPI Production)",
        version="10.0.0"
    )

@router.get("/monitoring/metrics", summary="System Performance & Cost Metrics")
async def get_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns live performance telemetry, latency percentiles, and AI cost tracking.
    """
    metrics = monitoring_service.get_summary_metrics()
    return metrics
