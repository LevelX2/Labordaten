from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.modules.befunde.schemas import BefundCreate


def list_befunde(db: Session) -> list[Befund]:
    return list(db.scalars(select(Befund).order_by(Befund.entnahmedatum.desc(), Befund.erstellt_am.desc())))


def create_befund(db: Session, payload: BefundCreate) -> Befund:
    befund = Befund(**payload.model_dump())
    db.add(befund)
    db.commit()
    db.refresh(befund)
    return befund


def get_befund(db: Session, befund_id: str) -> Befund | None:
    return db.get(Befund, befund_id)

