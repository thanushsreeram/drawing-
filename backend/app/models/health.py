from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    app: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ok",
                "app": "SketchFlow AI",
            }
        }
    )
