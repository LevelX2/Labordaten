from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.vorlagen import schemas, service

router = APIRouter(prefix="/vorlagen")


@router.get("", response_model=list[schemas.AnsichtVorlageRead])
def list_vorlagen(
    bereich: str | None = Query(default=None),
    vorlage_typ: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.AnsichtVorlageRead]:
    return service.list_vorlagen(db, bereich=bereich, vorlage_typ=vorlage_typ)


@router.post("", response_model=schemas.AnsichtVorlageRead, status_code=status.HTTP_201_CREATED)
def create_vorlage(
    payload: schemas.AnsichtVorlageCreate,
    db: Session = Depends(get_db),
) -> schemas.AnsichtVorlageRead:
    try:
        return service.create_vorlage(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{vorlage_id}", response_model=schemas.AnsichtVorlageRead)
def get_vorlage(vorlage_id: str, db: Session = Depends(get_db)) -> schemas.AnsichtVorlageRead:
    vorlage = service.get_vorlage(db, vorlage_id)
    if vorlage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vorlage nicht gefunden.")
    return vorlage


@router.patch("/{vorlage_id}", response_model=schemas.AnsichtVorlageRead)
def update_vorlage(
    vorlage_id: str,
    payload: schemas.AnsichtVorlageUpdate,
    db: Session = Depends(get_db),
) -> schemas.AnsichtVorlageRead:
    try:
        return service.update_vorlage(db, vorlage_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{vorlage_id}/anwenden", response_model=schemas.AnsichtVorlageRead)
def apply_vorlage(vorlage_id: str, db: Session = Depends(get_db)) -> schemas.AnsichtVorlageRead:
    try:
        return service.mark_vorlage_used(db, vorlage_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{vorlage_id}", response_model=schemas.AnsichtVorlageDeleteResult)
def delete_vorlage(vorlage_id: str, db: Session = Depends(get_db)) -> schemas.AnsichtVorlageDeleteResult:
    try:
        return service.delete_vorlage(db, vorlage_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
