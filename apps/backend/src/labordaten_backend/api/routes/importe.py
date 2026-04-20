from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.importe import schemas, service

router = APIRouter(prefix="/importe")


@router.get("", response_model=list[schemas.ImportvorgangListRead])
def list_importe(db: Session = Depends(get_db)) -> list[schemas.ImportvorgangListRead]:
    return service.list_importe(db)


@router.post("/entwurf", response_model=schemas.ImportvorgangDetailRead, status_code=status.HTTP_201_CREATED)
def create_import_entwurf(
    payload: schemas.ImportEntwurfCreate,
    db: Session = Depends(get_db),
) -> schemas.ImportvorgangDetailRead:
    try:
        return service.create_import_entwurf(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{import_id}", response_model=schemas.ImportvorgangDetailRead)
def get_import_detail(import_id: str, db: Session = Depends(get_db)) -> schemas.ImportvorgangDetailRead:
    detail = service.get_import_detail(db, import_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Importvorgang nicht gefunden.")
    return detail


@router.get("/{import_id}/pruefpunkte", response_model=list[schemas.ImportPruefpunktRead])
def list_pruefpunkte(import_id: str, db: Session = Depends(get_db)) -> list[schemas.ImportPruefpunktRead]:
    return service.list_pruefpunkte(db, import_id)


@router.post("/{import_id}/uebernehmen", response_model=schemas.ImportvorgangDetailRead)
def uebernehmen_import(
    import_id: str,
    payload: schemas.ImportUebernehmenRequest,
    db: Session = Depends(get_db),
) -> schemas.ImportvorgangDetailRead:
    try:
        return service.uebernehmen_import(db, import_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{import_id}/verwerfen", response_model=schemas.ImportvorgangDetailRead)
def verwerfen_import(import_id: str, db: Session = Depends(get_db)) -> schemas.ImportvorgangDetailRead:
    try:
        return service.verwerfen_import(db, import_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
