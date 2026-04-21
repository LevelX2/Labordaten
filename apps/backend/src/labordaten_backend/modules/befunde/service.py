from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.dokument import Dokument
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.befunde.schemas import BefundCreate, BefundRead


def list_befunde(db: Session) -> list[BefundRead]:
    stmt = (
        select(
            Befund,
            Person.anzeigename,
            Labor.name,
            Dokument.dateiname,
            Dokument.pfad_absolut,
            func.count(Messwert.id),
        )
        .join(Person, Befund.person_id == Person.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
        .outerjoin(Dokument, Befund.dokument_id == Dokument.id)
        .outerjoin(Messwert, Messwert.befund_id == Befund.id)
        .group_by(Befund.id, Person.anzeigename, Labor.name, Dokument.dateiname, Dokument.pfad_absolut)
        .order_by(Befund.entnahmedatum.desc(), Befund.erstellt_am.desc())
    )
    return [
        _build_befund_read(
            befund,
            person_anzeigename=person_anzeigename,
            labor_name=labor_name,
            dokument_dateiname=dokument_dateiname,
            dokument_pfad=dokument_pfad,
            messwerte_anzahl=messwerte_anzahl,
        )
        for befund, person_anzeigename, labor_name, dokument_dateiname, dokument_pfad, messwerte_anzahl in db.execute(stmt)
    ]


def create_befund(db: Session, payload: BefundCreate) -> BefundRead:
    befund = Befund(**payload.model_dump())
    db.add(befund)
    db.commit()
    db.refresh(befund)
    return get_befund(db, befund.id)


def get_befund(db: Session, befund_id: str) -> BefundRead | None:
    stmt = (
        select(
            Befund,
            Person.anzeigename,
            Labor.name,
            Dokument.dateiname,
            Dokument.pfad_absolut,
            func.count(Messwert.id),
        )
        .join(Person, Befund.person_id == Person.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
        .outerjoin(Dokument, Befund.dokument_id == Dokument.id)
        .outerjoin(Messwert, Messwert.befund_id == Befund.id)
        .where(Befund.id == befund_id)
        .group_by(Befund.id, Person.anzeigename, Labor.name, Dokument.dateiname, Dokument.pfad_absolut)
    )
    row = db.execute(stmt).first()
    if row is None:
        return None

    befund, person_anzeigename, labor_name, dokument_dateiname, dokument_pfad, messwerte_anzahl = row
    return _build_befund_read(
        befund,
        person_anzeigename=person_anzeigename,
        labor_name=labor_name,
        dokument_dateiname=dokument_dateiname,
        dokument_pfad=dokument_pfad,
        messwerte_anzahl=messwerte_anzahl,
    )


def _build_befund_read(
    befund: Befund,
    *,
    person_anzeigename: str | None,
    labor_name: str | None,
    dokument_dateiname: str | None,
    dokument_pfad: str | None,
    messwerte_anzahl: int,
) -> BefundRead:
    return BefundRead.model_validate(befund, from_attributes=True).model_copy(
        update={
            "person_anzeigename": person_anzeigename,
            "labor_name": labor_name,
            "dokument_dateiname": dokument_dateiname,
            "dokument_pfad": dokument_pfad,
            "messwerte_anzahl": messwerte_anzahl,
        }
    )
