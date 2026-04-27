from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.zielbereiche import schemas, service
from labordaten_backend.modules.zielwertpakete import service as zielwertpakete_service

router = APIRouter()


@router.get("/zielbereich-quellen", response_model=list[schemas.ZielbereichQuelleRead])
def list_zielbereich_quellen(db: Session = Depends(get_db)) -> list[schemas.ZielbereichQuelleRead]:
    return service.list_zielbereich_quellen(db)


@router.post(
    "/zielbereich-quellen",
    response_model=schemas.ZielbereichQuelleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_zielbereich_quelle(
    payload: schemas.ZielbereichQuelleCreate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichQuelleRead:
    try:
        return service.create_zielbereich_quelle(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/zielbereich-quellen/{zielbereich_quelle_id}", response_model=schemas.ZielbereichQuelleRead)
def update_zielbereich_quelle(
    zielbereich_quelle_id: str,
    payload: schemas.ZielbereichQuelleUpdate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichQuelleRead:
    try:
        return service.update_zielbereich_quelle(db, zielbereich_quelle_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/zielwert-pakete", response_model=list[schemas.ZielwertPaketRead])
def list_zielwert_pakete(db: Session = Depends(get_db)) -> list[schemas.ZielwertPaketRead]:
    return service.list_zielwert_pakete(db)


@router.post(
    "/zielwert-pakete",
    response_model=schemas.ZielwertPaketRead,
    status_code=status.HTTP_201_CREATED,
)
def create_zielwert_paket(
    payload: schemas.ZielwertPaketCreate,
    db: Session = Depends(get_db),
) -> schemas.ZielwertPaketRead:
    try:
        return service.create_zielwert_paket(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/zielwert-pakete/{zielwert_paket_id}", response_model=schemas.ZielwertPaketRead)
def update_zielwert_paket(
    zielwert_paket_id: str,
    payload: schemas.ZielwertPaketUpdate,
    db: Session = Depends(get_db),
) -> schemas.ZielwertPaketRead:
    try:
        return service.update_zielwert_paket(db, zielwert_paket_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/zielwert-paket-katalog", response_model=list[schemas.ZielwertPaketKatalogRead])
def list_zielwert_paket_katalog(db: Session = Depends(get_db)) -> list[schemas.ZielwertPaketKatalogRead]:
    return zielwertpakete_service.list_katalog(db)


@router.post("/zielwert-paket-katalog/{paket_schluessel}/vorschau", response_model=schemas.ZielwertPaketVorschauRead)
def preview_zielwert_paket(
    paket_schluessel: str,
    payload: schemas.ZielwertPaketInstallationRequest | None = None,
    db: Session = Depends(get_db),
) -> schemas.ZielwertPaketVorschauRead:
    try:
        return zielwertpakete_service.preview_paket(db, paket_schluessel, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/zielwert-paket-katalog/{paket_schluessel}/installieren",
    response_model=schemas.ZielwertPaketInstallationResult,
    status_code=status.HTTP_201_CREATED,
)
def install_zielwert_paket(
    paket_schluessel: str,
    payload: schemas.ZielwertPaketInstallationRequest,
    db: Session = Depends(get_db),
) -> schemas.ZielwertPaketInstallationResult:
    try:
        return zielwertpakete_service.install_paket(db, paket_schluessel, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/parameter/{parameter_id}/zielbereiche", response_model=list[schemas.ZielbereichRead])
def list_zielbereiche(parameter_id: str, db: Session = Depends(get_db)) -> list[schemas.ZielbereichRead]:
    return service.list_zielbereiche(db, parameter_id)


@router.post(
    "/parameter/{parameter_id}/zielbereiche",
    response_model=schemas.ZielbereichRead,
    status_code=status.HTTP_201_CREATED,
)
def create_zielbereich(
    parameter_id: str,
    payload: schemas.ZielbereichCreate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichRead:
    try:
        return service.create_zielbereich(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/zielbereiche/{zielbereich_id}", response_model=schemas.ZielbereichRead)
def update_zielbereich(
    zielbereich_id: str,
    payload: schemas.ZielbereichUpdate,
    db: Session = Depends(get_db),
) -> schemas.ZielbereichRead:
    try:
        return service.update_zielbereich(db, zielbereich_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
