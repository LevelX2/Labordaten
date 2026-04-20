from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.referenzen import schemas, service

router = APIRouter()


@router.get("/messwerte/{messwert_id}/referenzen", response_model=list[schemas.ReferenzRead])
def list_referenzen(messwert_id: str, db: Session = Depends(get_db)) -> list[schemas.ReferenzRead]:
    return service.list_referenzen(db, messwert_id)


@router.post(
    "/messwerte/{messwert_id}/referenzen",
    response_model=schemas.ReferenzRead,
    status_code=status.HTTP_201_CREATED,
)
def create_referenz(
    messwert_id: str,
    payload: schemas.ReferenzCreate,
    db: Session = Depends(get_db),
) -> schemas.ReferenzRead:
    try:
        return service.create_referenz(db, messwert_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

