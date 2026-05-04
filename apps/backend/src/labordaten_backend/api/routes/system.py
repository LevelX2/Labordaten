from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.core.config import get_settings
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.modules.initialdaten import schemas as initialdaten_schemas
from labordaten_backend.modules.initialdaten import service as initialdaten_service
from labordaten_backend.modules.installationsoptionen import schemas as installationsoptionen_schemas
from labordaten_backend.modules.installationsoptionen import service as installationsoptionen_service

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


@router.get("/system/initialdaten/status", response_model=initialdaten_schemas.InitialdatenStatusRead)
def get_initialdaten_status(db: Session = Depends(get_db)) -> initialdaten_schemas.InitialdatenStatusRead:
    return initialdaten_service.get_initialdaten_status(db)


@router.post("/system/initialdaten/anwenden", response_model=initialdaten_schemas.InitialdatenApplyResult)
def apply_initialdaten(
    payload: initialdaten_schemas.InitialdatenApplyRequest,
    db: Session = Depends(get_db),
) -> initialdaten_schemas.InitialdatenApplyResult:
    try:
        return initialdaten_service.apply_initialdaten(db, aktualisieren=payload.aktualisieren)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/system/installationsoptionen/verarbeiten",
    response_model=installationsoptionen_schemas.InstallationOptionsProcessResult,
)
def process_installation_options(
    db: Session = Depends(get_db),
) -> installationsoptionen_schemas.InstallationOptionsProcessResult:
    return installationsoptionen_service.process_pending_installation_options(db)
