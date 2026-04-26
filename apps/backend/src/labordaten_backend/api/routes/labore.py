from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.labore import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.LaborRead])
def list_labore(db: Session = Depends(get_db)) -> list[schemas.LaborRead]:
    return service.list_labore(db)


@router.post("", response_model=schemas.LaborRead, status_code=status.HTTP_201_CREATED)
def create_labor(payload: schemas.LaborCreate, db: Session = Depends(get_db)) -> schemas.LaborRead:
    return service.create_labor(db, payload)


@router.patch("/{labor_id}", response_model=schemas.LaborRead)
def update_labor(
    labor_id: str,
    payload: schemas.LaborUpdate,
    db: Session = Depends(get_db),
) -> schemas.LaborRead:
    try:
        return service.update_labor(db, labor_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{labor_id}", response_model=schemas.LaborRead)
def get_labor(labor_id: str, db: Session = Depends(get_db)) -> schemas.LaborRead:
    labor = service.get_labor(db, labor_id)
    if labor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Labor nicht gefunden.")
    return labor
