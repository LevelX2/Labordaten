from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.gruppen import schemas, service

router = APIRouter(prefix="/gruppen")


@router.get("", response_model=list[schemas.GruppeRead])
def list_gruppen(db: Session = Depends(get_db)) -> list[schemas.GruppeRead]:
    return service.list_gruppen(db)


@router.post("", response_model=schemas.GruppeRead, status_code=status.HTTP_201_CREATED)
def create_gruppe(
    payload: schemas.GruppeCreate,
    db: Session = Depends(get_db),
) -> schemas.GruppeRead:
    gruppe = service.create_gruppe(db, payload)
    return schemas.GruppeRead.model_validate(gruppe, from_attributes=True).model_copy(update={"parameter_anzahl": 0})


@router.get("/{gruppe_id}", response_model=schemas.GruppeRead)
def get_gruppe(gruppe_id: str, db: Session = Depends(get_db)) -> schemas.GruppeRead:
    gruppe = service.get_gruppe(db, gruppe_id)
    if gruppe is None or not gruppe.aktiv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gruppe nicht gefunden.")
    return schemas.GruppeRead.model_validate(gruppe, from_attributes=True).model_copy(
        update={"parameter_anzahl": len(service.list_gruppen_parameter(db, gruppe_id))}
    )


@router.get("/{gruppe_id}/parameter", response_model=list[schemas.GruppenParameterRead])
def list_gruppen_parameter(gruppe_id: str, db: Session = Depends(get_db)) -> list[schemas.GruppenParameterRead]:
    gruppe = service.get_gruppe(db, gruppe_id)
    if gruppe is None or not gruppe.aktiv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gruppe nicht gefunden.")
    return service.list_gruppen_parameter(db, gruppe_id)


@router.put("/{gruppe_id}/parameter", response_model=list[schemas.GruppenParameterRead])
def replace_gruppen_parameter(
    gruppe_id: str,
    payload: schemas.GruppenParameterAssignRequest,
    db: Session = Depends(get_db),
) -> list[schemas.GruppenParameterRead]:
    try:
        return service.replace_gruppen_parameter(db, gruppe_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
