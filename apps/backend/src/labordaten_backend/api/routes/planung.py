from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.planung import schemas, service

router = APIRouter(prefix="/planung")


@router.get("/zyklisch", response_model=list[schemas.PlanungZyklischRead])
def list_planung_zyklisch(
    person_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[schemas.PlanungZyklischRead]:
    return service.list_planung_zyklisch(db, person_id=person_id, status=status_filter)


@router.post("/zyklisch", response_model=schemas.PlanungZyklischRead, status_code=status.HTTP_201_CREATED)
def create_planung_zyklisch(
    payload: schemas.PlanungZyklischCreate,
    db: Session = Depends(get_db),
) -> schemas.PlanungZyklischRead:
    try:
        return service.create_planung_zyklisch(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/zyklisch/batch", response_model=list[schemas.PlanungZyklischRead], status_code=status.HTTP_201_CREATED)
def create_planung_zyklisch_batch(
    payload: schemas.PlanungZyklischBatchCreate,
    db: Session = Depends(get_db),
) -> list[schemas.PlanungZyklischRead]:
    try:
        return service.create_planung_zyklisch_batch(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/zyklisch/{planung_id}", response_model=schemas.PlanungZyklischRead)
def update_planung_zyklisch(
    planung_id: str,
    payload: schemas.PlanungZyklischUpdate,
    db: Session = Depends(get_db),
) -> schemas.PlanungZyklischRead:
    try:
        planung = service.update_planung_zyklisch(db, planung_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if planung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zyklische Planung nicht gefunden.")
    return planung


@router.get("/einmalig", response_model=list[schemas.PlanungEinmaligRead])
def list_planung_einmalig(
    person_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[schemas.PlanungEinmaligRead]:
    return service.list_planung_einmalig(db, person_id=person_id, status=status_filter)


@router.post("/einmalig", response_model=schemas.PlanungEinmaligRead, status_code=status.HTTP_201_CREATED)
def create_planung_einmalig(
    payload: schemas.PlanungEinmaligCreate,
    db: Session = Depends(get_db),
) -> schemas.PlanungEinmaligRead:
    try:
        return service.create_planung_einmalig(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/einmalig/batch", response_model=list[schemas.PlanungEinmaligRead], status_code=status.HTTP_201_CREATED)
def create_planung_einmalig_batch(
    payload: schemas.PlanungEinmaligBatchCreate,
    db: Session = Depends(get_db),
) -> list[schemas.PlanungEinmaligRead]:
    try:
        return service.create_planung_einmalig_batch(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/einmalig/{planung_id}", response_model=schemas.PlanungEinmaligRead)
def update_planung_einmalig(
    planung_id: str,
    payload: schemas.PlanungEinmaligUpdate,
    db: Session = Depends(get_db),
) -> schemas.PlanungEinmaligRead:
    try:
        planung = service.update_planung_einmalig(db, planung_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if planung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einmalige Vormerkung nicht gefunden.")
    return planung


@router.get("/faelligkeiten", response_model=list[schemas.FaelligkeitRead])
def list_faelligkeiten(
    person_id: str | None = Query(default=None),
    datum_von: date | None = Query(default=None),
    datum_bis: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.FaelligkeitRead]:
    if datum_von and datum_bis and datum_bis < datum_von:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das Bis-Datum darf nicht vor dem Von-Datum liegen.",
        )
    return service.list_faelligkeiten(
        db,
        person_id=person_id,
        datum_von=datum_von,
        datum_bis=datum_bis,
    )


@router.get("/faelligkeiten/pdf")
def download_faelligkeiten_pdf(
    person_id: str | None = Query(default=None),
    datum_von: date | None = Query(default=None),
    datum_bis: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Response:
    if datum_von and datum_bis and datum_bis < datum_von:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das Bis-Datum darf nicht vor dem Von-Datum liegen.",
        )
    filename, content = service.render_faelligkeiten_pdf(
        db,
        person_id=person_id,
        datum_von=datum_von,
        datum_bis=datum_bis,
    )
    return Response(
        content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
