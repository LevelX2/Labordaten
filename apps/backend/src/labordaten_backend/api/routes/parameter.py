from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.parameter import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.ParameterRead])
def list_parameter(db: Session = Depends(get_db)) -> list[schemas.ParameterRead]:
    return service.list_parameter(db)


@router.post("", response_model=schemas.ParameterRead, status_code=status.HTTP_201_CREATED)
def create_parameter(
    payload: schemas.ParameterCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterRead:
    return service.create_parameter(db, payload)


@router.get("/{parameter_id}", response_model=schemas.ParameterRead)
def get_parameter(parameter_id: str, db: Session = Depends(get_db)) -> schemas.ParameterRead:
    parameter = service.get_parameter(db, parameter_id)
    if parameter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parameter nicht gefunden.")
    return parameter


@router.get("/{parameter_id}/aliase", response_model=list[schemas.ParameterAliasRead])
def list_parameter_aliase(parameter_id: str, db: Session = Depends(get_db)) -> list[schemas.ParameterAliasRead]:
    try:
        return service.list_parameter_aliase(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{parameter_id}/aliase",
    response_model=schemas.ParameterAliasRead,
    status_code=status.HTTP_201_CREATED,
)
def create_parameter_alias(
    parameter_id: str,
    payload: schemas.ParameterAliasCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterAliasRead:
    try:
        return service.create_parameter_alias(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
