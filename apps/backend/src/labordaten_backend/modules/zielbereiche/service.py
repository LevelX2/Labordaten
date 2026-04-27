from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_quelle import ZielbereichQuelle
from labordaten_backend.models.zielwert_paket import ZielwertPaket
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.zielbereiche.schemas import (
    ZielbereichCreate,
    ZielbereichQuelleCreate,
    ZielbereichQuelleUpdate,
    ZielbereichUpdate,
    ZielwertPaketCreate,
    ZielwertPaketUpdate,
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


def list_zielwert_pakete(db: Session, include_inactive: bool = False) -> list[ZielwertPaket]:
    stmt = select(ZielwertPaket)
    if not include_inactive:
        stmt = stmt.where(ZielwertPaket.aktiv.is_(True))
    stmt = stmt.order_by(ZielwertPaket.name, ZielwertPaket.version)
    pakete = list(db.scalars(stmt))
    _attach_package_counts(db, pakete)
    return pakete


def create_zielwert_paket(db: Session, payload: ZielwertPaketCreate) -> ZielwertPaket:
    _require_existing_zielbereich_quelle(db, payload.zielbereich_quelle_id)
    if db.scalar(select(ZielwertPaket).where(ZielwertPaket.paket_schluessel == payload.paket_schluessel.strip())):
        raise ValueError("Ein Zielwertpaket mit diesem Schlüssel existiert bereits.")
    paket = ZielwertPaket(**_clean_package_payload(payload))
    db.add(paket)
    db.commit()
    db.refresh(paket)
    _attach_package_counts(db, [paket])
    return paket


def update_zielwert_paket(db: Session, zielwert_paket_id: str, payload: ZielwertPaketUpdate) -> ZielwertPaket:
    paket = db.get(ZielwertPaket, zielwert_paket_id)
    if paket is None:
        raise ValueError("Zielwertpaket nicht gefunden.")
    _require_existing_zielbereich_quelle(db, payload.zielbereich_quelle_id)
    duplicate = db.scalar(
        select(ZielwertPaket).where(
            ZielwertPaket.paket_schluessel == payload.paket_schluessel.strip(),
            ZielwertPaket.id != zielwert_paket_id,
        )
    )
    if duplicate is not None:
        raise ValueError("Ein anderes Zielwertpaket mit diesem Schlüssel existiert bereits.")

    for key, value in _clean_package_payload(payload).items():
        setattr(paket, key, value)
    paket.aktiv = payload.aktiv
    if not payload.aktiv:
        db.query(Zielbereich).filter(Zielbereich.zielwert_paket_id == paket.id).update(
            {Zielbereich.aktiv: False},
            synchronize_session=False,
        )
    db.add(paket)
    db.commit()
    db.refresh(paket)
    _attach_package_counts(db, [paket])
    return paket


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
    paket = _resolve_zielwert_paket(db, payload.zielwert_paket_id)
    zielbereich_data["zielbereich_quelle_id"] = _resolve_target_source_id(
        payload.zielbereich_quelle_id,
        paket,
    )
    _require_existing_zielbereich_quelle(db, zielbereich_data["zielbereich_quelle_id"])
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

    paket = _resolve_zielwert_paket(db, payload.zielwert_paket_id)
    zielbereich_quelle_id = _resolve_target_source_id(payload.zielbereich_quelle_id, paket)
    _require_existing_zielbereich_quelle(db, zielbereich_quelle_id)
    zielbereich.zielbereich_typ = payload.zielbereich_typ
    zielbereich.zielrichtung = payload.zielrichtung
    zielbereich.zielbereich_quelle_id = zielbereich_quelle_id
    zielbereich.zielwert_paket_id = payload.zielwert_paket_id
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


def _resolve_zielwert_paket(db: Session, zielwert_paket_id: str | None) -> ZielwertPaket | None:
    if zielwert_paket_id is None:
        return None
    paket = db.get(ZielwertPaket, zielwert_paket_id)
    if paket is None or not paket.aktiv:
        raise ValueError("Zielwertpaket nicht gefunden oder nicht aktiv.")
    return paket


def _resolve_target_source_id(zielbereich_quelle_id: str | None, paket: ZielwertPaket | None) -> str | None:
    if paket is None or paket.zielbereich_quelle_id is None:
        return zielbereich_quelle_id
    if zielbereich_quelle_id is not None and zielbereich_quelle_id != paket.zielbereich_quelle_id:
        raise ValueError("Zielwertquelle und Zielwertpaket passen nicht zusammen.")
    return paket.zielbereich_quelle_id


def _attach_package_counts(db: Session, pakete: list[ZielwertPaket]) -> None:
    if not pakete:
        return
    package_ids = [paket.id for paket in pakete]
    total_counts = {
        package_id: count
        for package_id, count in db.execute(
            select(Zielbereich.zielwert_paket_id, func.count(Zielbereich.id))
            .where(Zielbereich.zielwert_paket_id.in_(package_ids))
            .group_by(Zielbereich.zielwert_paket_id)
        )
    }
    active_counts = {
        package_id: count
        for package_id, count in db.execute(
            select(Zielbereich.zielwert_paket_id, func.count(Zielbereich.id))
            .where(Zielbereich.zielwert_paket_id.in_(package_ids), Zielbereich.aktiv.is_(True))
            .group_by(Zielbereich.zielwert_paket_id)
        )
    }
    for paket in pakete:
        paket.zielbereiche_anzahl = int(total_counts.get(paket.id, 0))
        paket.aktive_zielbereiche_anzahl = int(active_counts.get(paket.id, 0))


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


def _clean_package_payload(payload: ZielwertPaketCreate | ZielwertPaketUpdate) -> dict[str, object]:
    return {
        "paket_schluessel": payload.paket_schluessel.strip(),
        "name": payload.name.strip(),
        "zielbereich_quelle_id": payload.zielbereich_quelle_id,
        "version": _clean_optional(payload.version),
        "jahr": payload.jahr,
        "beschreibung": _clean_optional(payload.beschreibung),
        "bemerkung": _clean_optional(payload.bemerkung),
    }
