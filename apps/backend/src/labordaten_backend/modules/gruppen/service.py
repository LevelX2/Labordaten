from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import utcnow
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.modules.gruppen.schemas import (
    GruppeCreate,
    GruppeUpdate,
    GruppenParameterAssignItem,
    GruppenParameterAssignRequest,
    GruppenParameterRead,
    GruppeRead,
)


def list_gruppen(db: Session) -> list[GruppeRead]:
    stmt = (
        select(ParameterGruppe, func.count(GruppenParameter.id))
        .outerjoin(GruppenParameter, GruppenParameter.parameter_gruppe_id == ParameterGruppe.id)
        .where(ParameterGruppe.aktiv.is_(True))
        .group_by(ParameterGruppe.id)
        .order_by(ParameterGruppe.name.asc())
    )
    return [
        GruppeRead.model_validate(gruppe, from_attributes=True).model_copy(update={"parameter_anzahl": parameter_anzahl})
        for gruppe, parameter_anzahl in db.execute(stmt)
    ]


def create_gruppe(db: Session, payload: GruppeCreate) -> ParameterGruppe:
    gruppe = ParameterGruppe(**payload.model_dump())
    db.add(gruppe)
    db.commit()
    db.refresh(gruppe)
    return gruppe


def update_gruppe(db: Session, gruppe_id: str, payload: GruppeUpdate) -> ParameterGruppe:
    gruppe = db.get(ParameterGruppe, gruppe_id)
    if gruppe is None or not gruppe.aktiv:
        raise ValueError("Die gewählte Gruppe existiert nicht.")

    name = payload.name.strip()
    if not name:
        raise ValueError("Gruppen brauchen einen Namen.")

    gruppe.name = name
    gruppe.beschreibung = payload.beschreibung.strip() if payload.beschreibung and payload.beschreibung.strip() else None
    db.commit()
    db.refresh(gruppe)
    return gruppe


def get_gruppe(db: Session, gruppe_id: str) -> ParameterGruppe | None:
    return db.get(ParameterGruppe, gruppe_id)


def list_gruppen_parameter(db: Session, gruppe_id: str) -> list[GruppenParameterRead]:
    stmt = (
        select(GruppenParameter, Laborparameter)
        .join(Laborparameter, GruppenParameter.laborparameter_id == Laborparameter.id)
        .where(GruppenParameter.parameter_gruppe_id == gruppe_id)
        .order_by(GruppenParameter.sortierung.asc().nulls_last(), Laborparameter.anzeigename.asc())
    )
    return [
        GruppenParameterRead(
            id=zuordnung.id,
            parameter_gruppe_id=zuordnung.parameter_gruppe_id,
            laborparameter_id=parameter.id,
            parameter_anzeigename=parameter.anzeigename,
            interner_schluessel=parameter.interner_schluessel,
            wert_typ_standard=parameter.wert_typ_standard,
            standard_einheit=parameter.standard_einheit,
            sortierung=zuordnung.sortierung,
        )
        for zuordnung, parameter in db.execute(stmt)
    ]


def replace_gruppen_parameter(
    db: Session,
    gruppe_id: str,
    payload: GruppenParameterAssignRequest,
) -> list[GruppenParameterRead]:
    gruppe = db.get(ParameterGruppe, gruppe_id)
    if gruppe is None or not gruppe.aktiv:
        raise ValueError("Die gewählte Gruppe existiert nicht.")

    unique_parameter_ids = {eintrag.laborparameter_id for eintrag in payload.eintraege}
    if len(unique_parameter_ids) != len(payload.eintraege):
        raise ValueError("Ein Parameter darf innerhalb einer Gruppe nur einmal zugeordnet werden.")

    if unique_parameter_ids:
        existing_ids = set(
            db.scalars(select(Laborparameter.id).where(Laborparameter.id.in_(unique_parameter_ids)))
        )
        missing_ids = unique_parameter_ids - existing_ids
        if missing_ids:
            raise ValueError("Mindestens ein zugeordneter Parameter existiert nicht.")

    db.execute(delete(GruppenParameter).where(GruppenParameter.parameter_gruppe_id == gruppe_id))
    now = utcnow()
    for eintrag in payload.eintraege:
        db.add(
            GruppenParameter(
                parameter_gruppe_id=gruppe_id,
                laborparameter_id=eintrag.laborparameter_id,
                sortierung=eintrag.sortierung,
                erstellt_am=now,
                geaendert_am=now,
            )
        )

    db.commit()
    return list_gruppen_parameter(db, gruppe_id)


def merge_gruppen_parameter(
    db: Session,
    gruppe_id: str,
    payload: GruppenParameterAssignRequest,
) -> list[GruppenParameterRead]:
    gruppe = db.get(ParameterGruppe, gruppe_id)
    if gruppe is None or not gruppe.aktiv:
        raise ValueError("Die gewählte Gruppe existiert nicht.")

    existing_entries = list_gruppen_parameter(db, gruppe_id)
    merged_by_parameter_id = {
        item.laborparameter_id: GruppenParameterAssignItem(
            laborparameter_id=item.laborparameter_id,
            sortierung=item.sortierung,
        )
        for item in existing_entries
    }

    for eintrag in payload.eintraege:
        merged_by_parameter_id[eintrag.laborparameter_id] = eintrag

    return replace_gruppen_parameter(
        db,
        gruppe_id,
        GruppenParameterAssignRequest(eintraege=list(merged_by_parameter_id.values())),
    )
