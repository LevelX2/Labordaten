from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.zielbereiche.schemas import ZielbereichCreate, ZielbereichUpdate


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
    zielbereich_data["einheit"] = (
        einheiten_service.require_existing_einheit(db, payload.einheit)
        if payload.wert_typ == "numerisch"
        else None
    )

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

    zielbereich.zielbereich_typ = payload.zielbereich_typ
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
    zielbereich.bemerkung = payload.bemerkung.strip() if payload.bemerkung and payload.bemerkung.strip() else None

    db.add(zielbereich)
    db.commit()
    db.refresh(zielbereich)
    return zielbereich
