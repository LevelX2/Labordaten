from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.labor import Labor
from labordaten_backend.modules.labore.schemas import LaborCreate, LaborUpdate


def list_labore(db: Session) -> list[Labor]:
    return list(db.scalars(select(Labor).order_by(Labor.name)))


def create_labor(db: Session, payload: LaborCreate) -> Labor:
    labor = Labor(**payload.model_dump())
    db.add(labor)
    db.commit()
    db.refresh(labor)
    return labor


def update_labor(db: Session, labor_id: str, payload: LaborUpdate) -> Labor:
    labor = db.get(Labor, labor_id)
    if labor is None:
        raise ValueError("Labor nicht gefunden.")

    for key, value in payload.model_dump().items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(labor, key, value)

    db.add(labor)
    db.commit()
    db.refresh(labor)
    return labor


def get_labor(db: Session, labor_id: str) -> Labor | None:
    return db.get(Labor, labor_id)
