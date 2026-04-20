from fastapi import APIRouter

from labordaten_backend.core.config import get_settings

router = APIRouter()


@router.get("/system/health")
def healthcheck() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
    }

