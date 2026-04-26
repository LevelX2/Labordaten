from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.berichte import schemas, service

router = APIRouter(prefix="/berichte")


def _validate_date_range(datum_von, datum_bis) -> None:
    if datum_von and datum_bis and datum_bis < datum_von:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das Bis-Datum darf nicht vor dem Von-Datum liegen.",
        )


@router.post("/arztbericht-vorschau", response_model=schemas.ArztberichtResponse)
def arztbericht_vorschau(
    payload: schemas.ArztberichtRequest,
    db: Session = Depends(get_db),
) -> schemas.ArztberichtResponse:
    _validate_date_range(payload.datum_von, payload.datum_bis)
    try:
        return service.build_arztbericht(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/verlauf-vorschau", response_model=schemas.VerlaufsberichtResponse)
def verlauf_vorschau(
    payload: schemas.VerlaufsberichtRequest,
    db: Session = Depends(get_db),
) -> schemas.VerlaufsberichtResponse:
    _validate_date_range(payload.datum_von, payload.datum_bis)
    try:
        return service.build_verlaufsbericht(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/arztbericht-pdf")
def arztbericht_pdf(
    payload: schemas.ArztberichtRequest,
    db: Session = Depends(get_db),
) -> Response:
    _validate_date_range(payload.datum_von, payload.datum_bis)
    try:
        filename, content = service.render_arztbericht_pdf(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/verlauf-pdf")
def verlauf_pdf(
    payload: schemas.VerlaufsberichtRequest,
    db: Session = Depends(get_db),
) -> Response:
    _validate_date_range(payload.datum_von, payload.datum_bis)
    try:
        filename, content = service.render_verlaufsbericht_pdf(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
