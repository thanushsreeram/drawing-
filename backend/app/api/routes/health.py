from fastapi import APIRouter
from app.models.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
def get_health() -> HealthResponse:
    """
    Returns application status and verification information.
    Expected response:
    {
        "status": "ok",
        "app": "SketchFlow AI"
    }
    """
    return HealthResponse(
        status="ok",
        app="SketchFlow AI",
    )
