from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.person import Person
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_person_override import ZielbereichPersonOverride
from labordaten_backend.models.base import utcnow
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.personen.schemas import PersonCreate
from labordaten_backend.modules.personen.schemas import ZielbereichOverrideCreate, ZielbereichOverrideRead


def list_personen(db: Session) -> list[Person]:
    return list(db.scalars(select(Person).order_by(Person.anzeigename)))


def create_person(db: Session, payload: PersonCreate) -> Person:
    person = Person(**payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def get_person(db: Session, person_id: str) -> Person | None:
    return db.get(Person, person_id)


def list_zielbereich_overrides(db: Session, person_id: str) -> list[ZielbereichOverrideRead]:
    stmt = (
        select(ZielbereichPersonOverride, Zielbereich, Laborparameter)
        .join(Zielbereich, ZielbereichPersonOverride.zielbereich_id == Zielbereich.id)
        .join(Laborparameter, Zielbereich.laborparameter_id == Laborparameter.id)
        .where(ZielbereichPersonOverride.person_id == person_id)
        .where(ZielbereichPersonOverride.aktiv.is_(True))
        .order_by(Laborparameter.anzeigename.asc(), ZielbereichPersonOverride.erstellt_am.desc())
    )
    return [
        ZielbereichOverrideRead(
            id=override.id,
            person_id=override.person_id,
            zielbereich_id=override.zielbereich_id,
            laborparameter_id=zielbereich.laborparameter_id,
            parameter_anzeigename=parameter.anzeigename,
            wert_typ=zielbereich.wert_typ,
            basis_untere_grenze_num=zielbereich.untere_grenze_num,
            basis_obere_grenze_num=zielbereich.obere_grenze_num,
            basis_einheit=zielbereich.einheit,
            basis_soll_text=zielbereich.soll_text,
            untere_grenze_num=override.untere_grenze_num,
            obere_grenze_num=override.obere_grenze_num,
            einheit=override.einheit,
            soll_text=override.soll_text,
            bemerkung=override.bemerkung,
            aktiv=override.aktiv,
            erstellt_am=override.erstellt_am,
        )
        for override, zielbereich, parameter in db.execute(stmt)
    ]


def create_zielbereich_override(
    db: Session,
    person_id: str,
    payload: ZielbereichOverrideCreate,
) -> ZielbereichOverrideRead:
    person = db.get(Person, person_id)
    if person is None:
        raise ValueError("Die gewählte Person existiert nicht.")

    zielbereich = db.get(Zielbereich, payload.zielbereich_id)
    if zielbereich is None or not zielbereich.aktiv:
        raise ValueError("Der gewählte allgemeine Zielbereich existiert nicht.")

    existing_stmt = (
        select(ZielbereichPersonOverride)
        .where(ZielbereichPersonOverride.person_id == person_id)
        .where(ZielbereichPersonOverride.zielbereich_id == payload.zielbereich_id)
        .where(ZielbereichPersonOverride.aktiv.is_(True))
    )
    if db.scalar(existing_stmt) is not None:
        raise ValueError("Für diese Person gibt es bereits eine aktive Überschreibung für diesen Zielbereich.")

    if zielbereich.wert_typ == "numerisch" and payload.untere_grenze_num is None and payload.obere_grenze_num is None:
        raise ValueError("Numerische Überschreibungen brauchen mindestens eine eigene Grenze.")
    if zielbereich.wert_typ == "text" and not payload.soll_text:
        raise ValueError("Text-Überschreibungen brauchen einen Solltext.")

    override = ZielbereichPersonOverride(
        person_id=person_id,
        zielbereich_id=payload.zielbereich_id,
        untere_grenze_num=payload.untere_grenze_num,
        obere_grenze_num=payload.obere_grenze_num,
        einheit=(
            einheiten_service.require_existing_einheit(db, payload.einheit)
            if zielbereich.wert_typ == "numerisch"
            else None
        ),
        soll_text=payload.soll_text,
        bemerkung=payload.bemerkung,
        erstellt_am=utcnow().isoformat(),
    )
    db.add(override)
    db.commit()
    db.refresh(override)

    parameter = db.get(Laborparameter, zielbereich.laborparameter_id)
    if parameter is None:
        raise ValueError("Der zugehörige Parameter des Zielbereichs existiert nicht.")

    return ZielbereichOverrideRead(
        id=override.id,
        person_id=override.person_id,
        zielbereich_id=override.zielbereich_id,
        laborparameter_id=zielbereich.laborparameter_id,
        parameter_anzeigename=parameter.anzeigename,
        wert_typ=zielbereich.wert_typ,
        basis_untere_grenze_num=zielbereich.untere_grenze_num,
        basis_obere_grenze_num=zielbereich.obere_grenze_num,
        basis_einheit=zielbereich.einheit,
        basis_soll_text=zielbereich.soll_text,
        untere_grenze_num=override.untere_grenze_num,
        obere_grenze_num=override.obere_grenze_num,
        einheit=override.einheit,
        soll_text=override.soll_text,
        bemerkung=override.bemerkung,
        aktiv=override.aktiv,
        erstellt_am=override.erstellt_am,
    )
