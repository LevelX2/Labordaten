from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.auswertung import schemas, service

router = APIRouter(prefix="/auswertung")


@router.get("/gesamtzahlen", response_model=schemas.GesamtzahlenResponse)
def gesamtzahlen(db: Session = Depends(get_db)) -> schemas.GesamtzahlenResponse:
    return service.get_gesamtzahlen(db)


@router.post("/verlauf", response_model=schemas.AuswertungResponse)
def auswertung_verlauf(
    payload: schemas.AuswertungRequest,
    db: Session = Depends(get_db),
) -> schemas.AuswertungResponse:
    try:
        return service.build_auswertung(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
