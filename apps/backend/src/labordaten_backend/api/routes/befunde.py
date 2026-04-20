from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.befunde import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.BefundRead])
def list_befunde(db: Session = Depends(get_db)) -> list[schemas.BefundRead]:
    return service.list_befunde(db)


@router.post("", response_model=schemas.BefundRead, status_code=status.HTTP_201_CREATED)
def create_befund(payload: schemas.BefundCreate, db: Session = Depends(get_db)) -> schemas.BefundRead:
    return service.create_befund(db, payload)


@router.get("/{befund_id}", response_model=schemas.BefundRead)
def get_befund(befund_id: str, db: Session = Depends(get_db)) -> schemas.BefundRead:
    befund = service.get_befund(db, befund_id)
    if befund is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Befund nicht gefunden.")
    return befund

