from fastapi import APIRouter, HTTPException, Query

from labordaten_backend.modules.wissensbasis import schemas, service

router = APIRouter(prefix="/wissensbasis")


@router.get("/seiten", response_model=list[schemas.WissensseiteListRead])
def list_wissensseiten(q: str | None = Query(default=None)) -> list[schemas.WissensseiteListRead]:
    return service.list_wissensseiten(q)


@router.get("/detail", response_model=schemas.WissensseiteDetailRead)
def get_wissensseite_detail(pfad_relativ: str = Query(...)) -> schemas.WissensseiteDetailRead:
    detail = service.get_wissensseite_detail(pfad_relativ)
    if detail is None:
        raise HTTPException(status_code=404, detail="Wissensseite nicht gefunden.")
    return detail
