from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.zielbereiche import schemas, service

router = APIRouter()


@router.get("/parameter/{parameter_id}/zielbereiche", response_model=list[schemas.ZielbereichRead])
def list_zielbereiche(parameter_id: str, db: Session = Depends(get_db)) -> list[schemas.ZielbereichRead]:
    return service.list_zielbereiche(db, parameter_id)


@router.post(
    "/parameter/{parameter_id}/zielbereiche",
    response_model=schemas.ZielbereichRead,
    status_code=status.HTTP_201_CREATED,
)
def create_zielbereich(
    parameter_id: str,
    payload: schemas.ZielbereichCreate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichRead:
    try:
        return service.create_zielbereich(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/zielbereiche/{zielbereich_id}", response_model=schemas.ZielbereichRead)
def update_zielbereich(
    zielbereich_id: str,
    payload: schemas.ZielbereichUpdate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichRead:
    try:
        return service.update_zielbereich(db, zielbereich_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
