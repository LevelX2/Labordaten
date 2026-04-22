from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.loeschlogik import schemas, service

router = APIRouter(prefix="/loeschpruefung")


@router.get("/{entitaet_typ}/{entitaet_id}", response_model=schemas.LoeschPruefungRead)
def get_loeschpruefung(
    entitaet_typ: str,
    entitaet_id: str,
    db: Session = Depends(get_db),
) -> schemas.LoeschPruefungRead:
    try:
        return service.get_loeschpruefung(db, entitaet_typ, entitaet_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{entitaet_typ}/{entitaet_id}/ausfuehren", response_model=schemas.LoeschAusfuehrungRead)
def execute_loeschaktion(
    entitaet_typ: str,
    entitaet_id: str,
    payload: schemas.LoeschAusfuehrenRequest,
    db: Session = Depends(get_db),
) -> schemas.LoeschAusfuehrungRead:
    try:
        return service.execute_loeschaktion(db, entitaet_typ, entitaet_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
