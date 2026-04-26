from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.wissensbasis import schemas, service

router = APIRouter(prefix="/wissensbasis")


@router.get("/seiten", response_model=list[schemas.WissensseiteListRead])
def list_wissensseiten(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.WissensseiteListRead]:
    return service.list_wissensseiten(q, db)


@router.get("/detail", response_model=schemas.WissensseiteDetailRead)
def get_wissensseite_detail(
    pfad_relativ: str = Query(...),
    db: Session = Depends(get_db),
) -> schemas.WissensseiteDetailRead:
    detail = service.get_wissensseite_detail(pfad_relativ, db)
    if detail is None:
        raise HTTPException(status_code=404, detail="Wissensseite nicht gefunden.")
    return detail


@router.post("/seiten", response_model=schemas.WissensseiteDetailRead, status_code=status.HTTP_201_CREATED)
def create_wissensseite(payload: schemas.WissensseiteCreate) -> schemas.WissensseiteDetailRead:
    try:
        return service.create_wissensseite(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/seiten", response_model=schemas.WissensseiteDeleteResult)
def delete_wissensseite(
    pfad_relativ: str = Query(...),
    db: Session = Depends(get_db),
) -> schemas.WissensseiteDeleteResult:
    try:
        result = service.delete_wissensseite(db, pfad_relativ)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wissensseite nicht gefunden.")
    return result
