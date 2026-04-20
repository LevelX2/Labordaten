from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.modules.parameter.schemas import ParameterCreate


def list_parameter(db: Session) -> list[Laborparameter]:
    return list(db.scalars(select(Laborparameter).order_by(Laborparameter.anzeigename)))


def create_parameter(db: Session, payload: ParameterCreate) -> Laborparameter:
    parameter = Laborparameter(**payload.model_dump())
    db.add(parameter)
    db.commit()
    db.refresh(parameter)
    return parameter


def get_parameter(db: Session, parameter_id: str) -> Laborparameter | None:
    return db.get(Laborparameter, parameter_id)

