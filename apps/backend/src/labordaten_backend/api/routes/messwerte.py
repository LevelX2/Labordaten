from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.messwerte import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.MesswertRead])
def list_messwerte(
    person_ids: list[str] | None = Query(default=None),
    befund_ids: list[str] | None = Query(default=None),
    laborparameter_ids: list[str] | None = Query(default=None),
    gruppen_ids: list[str] | None = Query(default=None),
    labor_ids: list[str] | None = Query(default=None),
    datum_von: date | None = Query(default=None),
    datum_bis: date | None = Query(default=None),
    sort: list[str] | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.MesswertRead]:
    try:
        return service.list_messwerte(
            db,
            person_ids=person_ids,
            befund_ids=befund_ids,
            laborparameter_ids=laborparameter_ids,
            gruppen_ids=gruppen_ids,
            labor_ids=labor_ids,
            datum_von=datum_von,
            datum_bis=datum_bis,
            sort=sort,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


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
