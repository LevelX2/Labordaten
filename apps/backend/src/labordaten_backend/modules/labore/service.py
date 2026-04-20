from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.labor import Labor
from labordaten_backend.modules.labore.schemas import LaborCreate


def list_labore(db: Session) -> list[Labor]:
    return list(db.scalars(select(Labor).order_by(Labor.name)))


def create_labor(db: Session, payload: LaborCreate) -> Labor:
    labor = Labor(**payload.model_dump())
    db.add(labor)
    db.commit()
    db.refresh(labor)
    return labor


def get_labor(db: Session, labor_id: str) -> Labor | None:
    return db.get(Labor, labor_id)

