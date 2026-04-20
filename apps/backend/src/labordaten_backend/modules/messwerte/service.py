from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.modules.messwerte.schemas import MesswertCreate


def list_messwerte(
    db: Session,
    *,
    person_id: str | None = None,
    laborparameter_id: str | None = None,
) -> list[Messwert]:
    stmt = select(Messwert).order_by(Messwert.erstellt_am.desc())
    if person_id:
        stmt = stmt.where(Messwert.person_id == person_id)
    if laborparameter_id:
        stmt = stmt.where(Messwert.laborparameter_id == laborparameter_id)
    return list(db.scalars(stmt))


def create_messwert(db: Session, payload: MesswertCreate) -> Messwert:
    befund = db.get(Befund, payload.befund_id)
    if befund is None:
        raise ValueError("Der zugehörige Befund existiert nicht.")
    if befund.person_id != payload.person_id:
        raise ValueError("Messwert und Befund müssen derselben Person zugeordnet sein.")

    messwert = Messwert(**payload.model_dump())
    db.add(messwert)
    db.commit()
    db.refresh(messwert)
    return messwert


def get_messwert(db: Session, messwert_id: str) -> Messwert | None:
    return db.get(Messwert, messwert_id)

