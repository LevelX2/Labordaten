from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.modules.zielbereiche.schemas import ZielbereichCreate


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

    zielbereich = Zielbereich(laborparameter_id=laborparameter_id, **payload.model_dump())
    db.add(zielbereich)
    db.commit()
    db.refresh(zielbereich)
    return zielbereich

