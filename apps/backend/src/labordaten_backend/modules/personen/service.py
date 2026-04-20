from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.person import Person
from labordaten_backend.modules.personen.schemas import PersonCreate


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

