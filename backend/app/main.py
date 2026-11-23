from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage directories exist at application startup
    for subfolder in ["uploads", "sheets", "steps", "lessons"]:
        target_dir = settings.STORAGE_DIR / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
    yield


def create_application() -> FastAPI:
    """
    Application factory pattern for FastAPI.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        description="SketchFlow AI - AI-powered drawing tutor backend",
        lifespan=lifespan,
    )

    # Configure CORS safely for local development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Register API routers
    app.include_router(health.router, prefix="/api")

    return app


app = create_application()
