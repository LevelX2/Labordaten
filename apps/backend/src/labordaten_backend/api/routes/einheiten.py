from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.einheiten import schemas, service

router = APIRouter(prefix="/einheiten")


@router.get("", response_model=list[schemas.EinheitRead])
def list_einheiten(db: Session = Depends(get_db)) -> list[schemas.EinheitRead]:
    return service.list_einheiten(db)


@router.post("", response_model=schemas.EinheitRead, status_code=status.HTTP_201_CREATED)
def create_einheit(
    payload: schemas.EinheitCreate,
    db: Session = Depends(get_db),
) -> schemas.EinheitRead:
    try:
        return service.create_einheit(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{einheit_id}/aliase", response_model=list[schemas.EinheitAliasRead])
def list_einheit_aliase(
    einheit_id: str,
    db: Session = Depends(get_db),
) -> list[schemas.EinheitAliasRead]:
    try:
        return service.list_einheit_aliase(db, einheit_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{einheit_id}/aliase",
    response_model=schemas.EinheitAliasRead,
    status_code=status.HTTP_201_CREATED,
)
def create_einheit_alias(
    einheit_id: str,
    payload: schemas.EinheitAliasCreate,
    db: Session = Depends(get_db),
) -> schemas.EinheitAliasRead:
    try:
        return service.create_einheit_alias(db, einheit_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
