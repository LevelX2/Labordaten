from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.berichte import schemas, service

router = APIRouter(prefix="/berichte")


@router.post("/arztbericht-vorschau", response_model=schemas.ArztberichtResponse)
def arztbericht_vorschau(
    payload: schemas.ArztberichtRequest,
    db: Session = Depends(get_db),
) -> schemas.ArztberichtResponse:
    return service.build_arztbericht(db, payload)


@router.post("/verlauf-vorschau", response_model=schemas.VerlaufsberichtResponse)
def verlauf_vorschau(
    payload: schemas.VerlaufsberichtRequest,
    db: Session = Depends(get_db),
) -> schemas.VerlaufsberichtResponse:
    return service.build_verlaufsbericht(db, payload)
