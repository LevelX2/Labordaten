from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.personen import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.PersonRead])
def list_personen(db: Session = Depends(get_db)) -> list[schemas.PersonRead]:
    return service.list_personen(db)


@router.post("", response_model=schemas.PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(
    payload: schemas.PersonCreate,
    db: Session = Depends(get_db),
) -> schemas.PersonRead:
    return service.create_person(db, payload)


@router.get("/{person_id}", response_model=schemas.PersonRead)
def get_person(person_id: str, db: Session = Depends(get_db)) -> schemas.PersonRead:
    person = service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return person

