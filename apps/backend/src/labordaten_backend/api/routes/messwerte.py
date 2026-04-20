from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.messwerte import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.MesswertRead])
def list_messwerte(
    person_id: str | None = Query(default=None),
    laborparameter_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.MesswertRead]:
    return service.list_messwerte(db, person_id=person_id, laborparameter_id=laborparameter_id)


@router.post("", response_model=schemas.MesswertRead, status_code=status.HTTP_201_CREATED)
def create_messwert(
    payload: schemas.MesswertCreate,
    db: Session = Depends(get_db),
) -> schemas.MesswertRead:
    try:
        return service.create_messwert(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{messwert_id}", response_model=schemas.MesswertRead)
def get_messwert(messwert_id: str, db: Session = Depends(get_db)) -> schemas.MesswertRead:
    messwert = service.get_messwert(db, messwert_id)
    if messwert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Messwert nicht gefunden.")
    return messwert

