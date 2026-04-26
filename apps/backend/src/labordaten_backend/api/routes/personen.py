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


@router.patch("/{person_id}", response_model=schemas.PersonRead)
def update_person(
    person_id: str,
    payload: schemas.PersonUpdate,
    db: Session = Depends(get_db),
) -> schemas.PersonRead:
    try:
        return service.update_person(db, person_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{person_id}", response_model=schemas.PersonRead)
def get_person(person_id: str, db: Session = Depends(get_db)) -> schemas.PersonRead:
    person = service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return person


@router.get("/{person_id}/zielbereich-overrides", response_model=list[schemas.ZielbereichOverrideRead])
def list_zielbereich_overrides(person_id: str, db: Session = Depends(get_db)) -> list[schemas.ZielbereichOverrideRead]:
    person = service.get_person(db, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return service.list_zielbereich_overrides(db, person_id)


@router.post(
    "/{person_id}/zielbereich-overrides",
    response_model=schemas.ZielbereichOverrideRead,
    status_code=status.HTTP_201_CREATED,
)
def create_zielbereich_override(
    person_id: str,
    payload: schemas.ZielbereichOverrideCreate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichOverrideRead:
    try:
        return service.create_zielbereich_override(db, person_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
