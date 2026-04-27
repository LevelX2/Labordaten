from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from labordaten_backend.core.labor_value_formatting import format_numeric_measurement_value
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person


@dataclass(frozen=True)
class MeasurementDisplay:
    wert_anzeige: str
    wert_num: float | None
    einheit: str | None


MeasurementRow = tuple[Messwert, Befund, Laborparameter, Labor | None, Person]


def build_measurement_query(payload, *, newest_first: bool) -> Select:
    stmt: Select = (
        select(Messwert, Befund, Laborparameter, Labor, Person)
        .join(Befund, Messwert.befund_id == Befund.id)
        .join(Laborparameter, Messwert.laborparameter_id == Laborparameter.id)
        .join(Person, Messwert.person_id == Person.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
        .where(Messwert.person_id.in_(payload.person_ids))
    )

    if payload.laborparameter_ids:
        stmt = stmt.where(Messwert.laborparameter_id.in_(payload.laborparameter_ids))
    if payload.labor_ids:
        stmt = stmt.where(Befund.labor_id.in_(payload.labor_ids))
    if payload.gruppen_ids:
        parameter_subquery = (
            select(GruppenParameter.laborparameter_id)
            .where(GruppenParameter.parameter_gruppe_id.in_(payload.gruppen_ids))
            .distinct()
        )
        stmt = stmt.where(Messwert.laborparameter_id.in_(parameter_subquery))
    if payload.klassifikationen:
        stmt = stmt.where(Laborparameter.primaere_klassifikation.in_(payload.klassifikationen))
    if payload.datum_von:
        stmt = stmt.where(Befund.entnahmedatum >= payload.datum_von)
    if payload.datum_bis:
        stmt = stmt.where(Befund.entnahmedatum <= payload.datum_bis)

    if newest_first:
        return stmt.order_by(
            Person.anzeigename.asc(),
            Laborparameter.anzeigename.asc(),
            Befund.entnahmedatum.desc(),
            Messwert.erstellt_am.desc(),
        )
    return stmt.order_by(
        Laborparameter.anzeigename.asc(),
        Person.anzeigename.asc(),
        Befund.entnahmedatum.asc(),
        Messwert.erstellt_am.asc(),
    )


def execute_measurement_query(db: Session, payload, *, newest_first: bool):
    return db.execute(build_measurement_query(payload, newest_first=newest_first))


def effective_date(befund: Befund, messwert: Messwert):
    return befund.entnahmedatum or befund.befunddatum or messwert.erstellt_am.date()


def load_persons_or_raise(db: Session, person_ids: list[str]) -> list[Person]:
    if not person_ids:
        raise ValueError("Bitte mindestens eine Person auswählen.")
    persons = list(db.scalars(select(Person).where(Person.id.in_(person_ids)).order_by(Person.anzeigename.asc())))
    if len(persons) != len(set(person_ids)):
        raise ValueError("Mindestens eine ausgewählte Person existiert nicht.")
    return persons


def format_measurement_value(messwert: Messwert) -> str:
    if messwert.wert_typ == "text":
        return messwert.wert_text or messwert.wert_roh_text
    return format_numeric_measurement_value(messwert.wert_num, messwert.wert_operator, messwert.wert_roh_text)


def available_display_units(messwert: Messwert) -> set[str]:
    available_units: set[str] = set()
    if messwert.wert_num is not None and messwert.einheit_original:
        available_units.add(messwert.einheit_original)
    if messwert.wert_normiert_num is not None and messwert.einheit_normiert:
        available_units.add(messwert.einheit_normiert)
    return available_units


def resolve_measurement_display(messwert: Messwert, target_unit: str | None) -> MeasurementDisplay:
    if messwert.wert_typ == "text":
        return MeasurementDisplay(
            wert_anzeige=messwert.wert_text or messwert.wert_roh_text,
            wert_num=None,
            einheit=messwert.einheit_original,
        )

    if target_unit and target_unit != "original":
        if messwert.einheit_original == target_unit and messwert.wert_num is not None:
            return MeasurementDisplay(
                wert_anzeige=format_numeric_measurement_value(messwert.wert_num, messwert.wert_operator, messwert.wert_roh_text),
                wert_num=messwert.wert_num,
                einheit=messwert.einheit_original,
            )
        if messwert.einheit_normiert == target_unit and messwert.wert_normiert_num is not None:
            return MeasurementDisplay(
                wert_anzeige=format_numeric_measurement_value(
                    messwert.wert_normiert_num,
                    messwert.wert_operator,
                    messwert.wert_roh_text,
                ),
                wert_num=messwert.wert_normiert_num,
                einheit=messwert.einheit_normiert,
            )

    return MeasurementDisplay(
        wert_anzeige=format_measurement_value(messwert),
        wert_num=messwert.wert_num,
        einheit=messwert.einheit_original,
    )
