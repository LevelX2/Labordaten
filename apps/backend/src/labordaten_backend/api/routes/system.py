from fastapi import APIRouter, Request
from pydantic import BaseModel

from labordaten_backend.core.config import get_settings
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel

router = APIRouter()


class HealthRead(BaseModel):
    status: str
    app: str
    environment: str
    lock_status: str
    lock_message: str


@router.get("/system/health")
def healthcheck(request: Request) -> HealthRead:
    settings = get_settings()
    lock_status = request.app.state.lock_manager.status_payload()
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "lock_status": str(lock_status["status"]),
        "lock_message": str(lock_status["message"]),
    }


@router.get("/system/settings", response_model=RuntimeSettingsModel)
def get_runtime_settings(request: Request) -> RuntimeSettingsModel:
    return request.app.state.runtime_settings_store.get()


@router.put("/system/settings", response_model=RuntimeSettingsModel)
def update_runtime_settings(payload: RuntimeSettingsModel, request: Request) -> RuntimeSettingsModel:
    saved = request.app.state.runtime_settings_store.save(payload)
    request.app.state.lock_manager.reconfigure(saved.data_path)
    return saved


@router.get("/system/lock")
def get_lock_status(request: Request) -> dict[str, object]:
    return request.app.state.lock_manager.status_payload()


@router.post("/system/lock/reset")
def reset_lock(request: Request) -> dict[str, object]:
    request.app.state.lock_manager.reset()
    return request.app.state.lock_manager.status_payload()
