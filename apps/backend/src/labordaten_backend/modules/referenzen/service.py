from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.referenzen.schemas import ReferenzCreate


def list_referenzen(db: Session, messwert_id: str) -> list[MesswertReferenz]:
    stmt = select(MesswertReferenz).where(MesswertReferenz.messwert_id == messwert_id)
    return list(db.scalars(stmt))


def create_referenz(db: Session, messwert_id: str, payload: ReferenzCreate) -> MesswertReferenz:
    messwert = db.get(Messwert, messwert_id)
    if messwert is None:
        raise ValueError("Der zugehörige Messwert existiert nicht.")

    referenz_data = payload.model_dump()
    referenz_data["einheit"] = (
        einheiten_service.require_existing_einheit(db, payload.einheit)
        if payload.wert_typ == "numerisch"
        else None
    )

    referenz = MesswertReferenz(messwert_id=messwert_id, **referenz_data)
    db.add(referenz)
    db.commit()
    db.refresh(referenz)
    return referenz
