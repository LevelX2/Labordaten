from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_quelle import ZielbereichQuelle
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.zielbereiche.schemas import (
    ZielbereichCreate,
    ZielbereichQuelleCreate,
    ZielbereichQuelleUpdate,
    ZielbereichUpdate,
)


def list_zielbereich_quellen(db: Session, include_inactive: bool = False) -> list[ZielbereichQuelle]:
    stmt = select(ZielbereichQuelle)
    if not include_inactive:
        stmt = stmt.where(ZielbereichQuelle.aktiv.is_(True))
    stmt = stmt.order_by(ZielbereichQuelle.name, ZielbereichQuelle.jahr.desc())
    return list(db.scalars(stmt))


def create_zielbereich_quelle(db: Session, payload: ZielbereichQuelleCreate) -> ZielbereichQuelle:
    quelle = ZielbereichQuelle(**_clean_source_payload(payload))
    db.add(quelle)
    db.commit()
    db.refresh(quelle)
    return quelle


def update_zielbereich_quelle(
    db: Session,
    zielbereich_quelle_id: str,
    payload: ZielbereichQuelleUpdate,
) -> ZielbereichQuelle:
    quelle = db.get(ZielbereichQuelle, zielbereich_quelle_id)
    if quelle is None:
        raise ValueError("Zielwertquelle nicht gefunden.")
    for key, value in _clean_source_payload(payload).items():
        setattr(quelle, key, value)
    quelle.aktiv = payload.aktiv
    db.add(quelle)
    db.commit()
    db.refresh(quelle)
    return quelle


def list_zielbereiche(db: Session, laborparameter_id: str) -> list[Zielbereich]:
    stmt = (
        select(Zielbereich)
        .where(Zielbereich.laborparameter_id == laborparameter_id)
        .where(Zielbereich.aktiv.is_(True))
        .order_by(Zielbereich.erstellt_am.desc())
    )
    return list(db.scalars(stmt))


def create_zielbereich(db: Session, laborparameter_id: str, payload: ZielbereichCreate) -> Zielbereich:
    parameter = db.get(Laborparameter, laborparameter_id)
    if parameter is None:
        raise ValueError("Der zugehörige Parameter existiert nicht.")

    zielbereich_data = payload.model_dump()
    _require_existing_zielbereich_quelle(db, payload.zielbereich_quelle_id)
    zielbereich_data["einheit"] = (
        einheiten_service.require_existing_einheit(db, payload.einheit)
        if payload.wert_typ == "numerisch"
        else None
    )
    zielbereich_data["quelle_original_text"] = _clean_optional(payload.quelle_original_text)
    zielbereich_data["quelle_stelle"] = _clean_optional(payload.quelle_stelle)
    zielbereich_data["bemerkung"] = _clean_optional(payload.bemerkung)

    zielbereich = Zielbereich(laborparameter_id=laborparameter_id, **zielbereich_data)
    db.add(zielbereich)
    db.commit()
    db.refresh(zielbereich)
    return zielbereich


def update_zielbereich(db: Session, zielbereich_id: str, payload: ZielbereichUpdate) -> Zielbereich:
    zielbereich = db.get(Zielbereich, zielbereich_id)
    if zielbereich is None or not zielbereich.aktiv:
        raise ValueError("Zielbereich nicht gefunden.")

    if zielbereich.wert_typ == "numerisch" and payload.untere_grenze_num is None and payload.obere_grenze_num is None:
        raise ValueError("Numerische Zielbereiche brauchen mindestens eine Grenze.")
    if zielbereich.wert_typ == "text" and not payload.soll_text:
        raise ValueError("Text-Zielbereiche brauchen einen Solltext.")

    _require_existing_zielbereich_quelle(db, payload.zielbereich_quelle_id)
    zielbereich.zielbereich_typ = payload.zielbereich_typ
    zielbereich.zielbereich_quelle_id = payload.zielbereich_quelle_id
    zielbereich.untere_grenze_num = payload.untere_grenze_num if zielbereich.wert_typ == "numerisch" else None
    zielbereich.obere_grenze_num = payload.obere_grenze_num if zielbereich.wert_typ == "numerisch" else None
    zielbereich.einheit = (
        einheiten_service.require_existing_einheit(db, payload.einheit)
        if zielbereich.wert_typ == "numerisch"
        else None
    )
    zielbereich.soll_text = payload.soll_text.strip() if zielbereich.wert_typ == "text" and payload.soll_text else None
    zielbereich.geschlecht_code = payload.geschlecht_code
    zielbereich.alter_min_tage = payload.alter_min_tage
    zielbereich.alter_max_tage = payload.alter_max_tage
    zielbereich.quelle_original_text = _clean_optional(payload.quelle_original_text)
    zielbereich.quelle_stelle = _clean_optional(payload.quelle_stelle)
    zielbereich.bemerkung = _clean_optional(payload.bemerkung)

    db.add(zielbereich)
    db.commit()
    db.refresh(zielbereich)
    return zielbereich


def _require_existing_zielbereich_quelle(db: Session, zielbereich_quelle_id: str | None) -> None:
    if zielbereich_quelle_id is None:
        return
    quelle = db.get(ZielbereichQuelle, zielbereich_quelle_id)
    if quelle is None or not quelle.aktiv:
        raise ValueError("Zielwertquelle nicht gefunden oder nicht aktiv.")


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _clean_source_payload(payload: ZielbereichQuelleCreate | ZielbereichQuelleUpdate) -> dict[str, object]:
    return {
        "name": payload.name.strip(),
        "quellen_typ": payload.quellen_typ,
        "titel": _clean_optional(payload.titel),
        "jahr": payload.jahr,
        "version": _clean_optional(payload.version),
        "bemerkung": _clean_optional(payload.bemerkung),
    }
