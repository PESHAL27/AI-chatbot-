from fastapi import APIRouter
from app.schemas.chat import HealthCheckResponse

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health", response_model=HealthCheckResponse, summary="Backend Health Check")
async def health_check():
    """
    Health check endpoint to verify backend operational status.
    """
    return HealthCheckResponse(status="ok", service="PML Backend")
