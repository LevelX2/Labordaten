from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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


@router.post("/datei-entwurf", response_model=schemas.ImportvorgangDetailRead, status_code=status.HTTP_201_CREATED)
async def create_import_entwurf_from_file(
    file: UploadFile = File(...),
    person_id_override: str | None = Form(default=None),
    labor_id_override: str | None = Form(default=None),
    labor_name_override: str | None = Form(default=None),
    entnahmedatum_override: date | None = Form(default=None),
    befunddatum_override: date | None = Form(default=None),
    befund_bemerkung_override: str | None = Form(default=None),
    import_bemerkung: str | None = Form(default=None),
    quelle_behalten: bool = Form(default=False),
    db: Session = Depends(get_db),
) -> schemas.ImportvorgangDetailRead:
    try:
        return service.create_import_entwurf_from_file(
            db,
            filename=file.filename or "import.csv",
            content_type=file.content_type,
            content=await file.read(),
            person_id_override=person_id_override,
            labor_id_override=labor_id_override,
            labor_name_override=labor_name_override,
            entnahmedatum_override=entnahmedatum_override,
            befunddatum_override=befunddatum_override,
            befund_bemerkung_override=befund_bemerkung_override,
            import_bemerkung=import_bemerkung,
            quelle_behalten=quelle_behalten,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/json-entwurf", response_model=schemas.ImportvorgangDetailRead, status_code=status.HTTP_201_CREATED)
async def create_import_entwurf_from_json_upload(
    payload_json: str = Form(...),
    person_id_override: str | None = Form(default=None),
    import_bemerkung: str | None = Form(default=None),
    dokument_name: str | None = Form(default=None),
    dokument: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
) -> schemas.ImportvorgangDetailRead:
    try:
        return service.create_import_entwurf_from_json_upload(
            db,
            payload_json=payload_json,
            person_id_override=person_id_override,
            import_bemerkung=import_bemerkung,
            document_filename=dokument.filename if dokument is not None else None,
            document_content_type=dokument.content_type if dokument is not None else None,
            document_content=await dokument.read() if dokument is not None else None,
            document_name_override=dokument_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/prompt", response_model=schemas.ImportPromptRead)
def create_import_prompt(
    payload: schemas.ImportPromptCreate,
    db: Session = Depends(get_db),
) -> schemas.ImportPromptRead:
    try:
        return service.create_import_prompt(db, payload)
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


@router.post("/{import_id}/komplett-entfernen", response_model=schemas.ImportKomplettEntfernenRead)
def komplett_entfernen_import(
    import_id: str,
    payload: schemas.ImportKomplettEntfernenRequest,
    db: Session = Depends(get_db),
) -> schemas.ImportKomplettEntfernenRead:
    try:
        return service.komplett_entfernen_import(
            db,
            import_id,
            dokument_entfernen=payload.dokument_entfernen,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/{import_id}/gruppenvorschlaege/anwenden",
    response_model=schemas.ImportGruppenvorschlaegeAnwendenResponse,
)
def anwenden_gruppenvorschlaege(
    import_id: str,
    payload: schemas.ImportGruppenvorschlaegeAnwendenRequest,
    db: Session = Depends(get_db),
) -> schemas.ImportGruppenvorschlaegeAnwendenResponse:
    try:
        return service.anwenden_gruppenvorschlaege(db, import_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
