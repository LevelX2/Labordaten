from collections import defaultdict

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import conversions as parameter_conversions
from labordaten_backend.modules.messwerte.schemas import MesswertCreate, MesswertRead


def list_messwerte(
    db: Session,
    *,
    person_ids: list[str] | None = None,
    laborparameter_ids: list[str] | None = None,
    gruppen_ids: list[str] | None = None,
    labor_ids: list[str] | None = None,
    datum_von=None,
    datum_bis=None,
) -> list[MesswertRead]:
    stmt: Select = (
        select(Messwert, Person, Laborparameter, Befund, Labor)
        .join(Person, Messwert.person_id == Person.id)
        .join(Laborparameter, Messwert.laborparameter_id == Laborparameter.id)
        .join(Befund, Messwert.befund_id == Befund.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
    )
    if person_ids:
        stmt = stmt.where(Messwert.person_id.in_(person_ids))
    if laborparameter_ids:
        stmt = stmt.where(Messwert.laborparameter_id.in_(laborparameter_ids))
    if labor_ids:
        stmt = stmt.where(Befund.labor_id.in_(labor_ids))
    if datum_von:
        stmt = stmt.where(Befund.entnahmedatum >= datum_von)
    if datum_bis:
        stmt = stmt.where(Befund.entnahmedatum <= datum_bis)
    if gruppen_ids:
        parameter_subquery = (
            select(GruppenParameter.laborparameter_id)
            .where(GruppenParameter.parameter_gruppe_id.in_(gruppen_ids))
            .distinct()
        )
        stmt = stmt.where(Messwert.laborparameter_id.in_(parameter_subquery))

    stmt = stmt.order_by(Befund.entnahmedatum.desc(), Messwert.erstellt_am.desc())
    rows = list(db.execute(stmt))
    gruppen_map = _load_group_names(db, [messwert.laborparameter_id for messwert, *_ in rows])

    return [
        MesswertRead(
            id=messwert.id,
            person_id=messwert.person_id,
            befund_id=messwert.befund_id,
            laborparameter_id=messwert.laborparameter_id,
            original_parametername=messwert.original_parametername,
            wert_typ=messwert.wert_typ,
            wert_operator=messwert.wert_operator,
            wert_roh_text=messwert.wert_roh_text,
            wert_num=messwert.wert_num,
            wert_text=messwert.wert_text,
            einheit_original=messwert.einheit_original,
            wert_normiert_num=messwert.wert_normiert_num,
            einheit_normiert=messwert.einheit_normiert,
            umrechnungsregel_id=messwert.umrechnungsregel_id,
            bemerkung_kurz=messwert.bemerkung_kurz,
            bemerkung_lang=messwert.bemerkung_lang,
            unsicher_flag=messwert.unsicher_flag,
            pruefbedarf_flag=messwert.pruefbedarf_flag,
            person_anzeigename=person.anzeigename,
            parameter_anzeigename=parameter.anzeigename,
            labor_id=labor.id if labor is not None else None,
            labor_name=labor.name if labor is not None else None,
            entnahmedatum=befund.entnahmedatum.isoformat() if befund.entnahmedatum else None,
            gruppen_namen=gruppen_map.get(messwert.laborparameter_id, []),
            erstellt_am=messwert.erstellt_am,
            geaendert_am=messwert.geaendert_am,
        )
        for messwert, person, parameter, befund, labor in rows
    ]


def create_messwert(db: Session, payload: MesswertCreate) -> Messwert:
    befund = db.get(Befund, payload.befund_id)
    if befund is None:
        raise ValueError("Der zugehörige Befund existiert nicht.")
    if befund.person_id != payload.person_id:
        raise ValueError("Messwert und Befund müssen derselben Person zugeordnet sein.")

    messwert_data = payload.model_dump()
    messwert_data["einheit_original"] = (
        einheiten_service.require_existing_einheit(db, payload.einheit_original)
        if payload.wert_typ == "numerisch"
        else None
    )
    normalized = parameter_conversions.resolve_measurement_normalization(
        db,
        laborparameter_id=payload.laborparameter_id,
        wert_typ=payload.wert_typ,
        wert_num=payload.wert_num,
        einheit_original=messwert_data["einheit_original"],
    )
    messwert_data["wert_normiert_num"] = normalized.wert_normiert_num
    messwert_data["einheit_normiert"] = normalized.einheit_normiert
    messwert_data["umrechnungsregel_id"] = normalized.umrechnungsregel_id

    messwert = Messwert(**messwert_data)
    db.add(messwert)
    db.commit()
    db.refresh(messwert)
    return messwert


def get_messwert(db: Session, messwert_id: str) -> Messwert | None:
    return db.get(Messwert, messwert_id)


def _load_group_names(db: Session, laborparameter_ids: list[str]) -> dict[str, list[str]]:
    if not laborparameter_ids:
        return {}

    stmt = (
        select(GruppenParameter.laborparameter_id, ParameterGruppe.name)
        .join(ParameterGruppe, GruppenParameter.parameter_gruppe_id == ParameterGruppe.id)
        .where(GruppenParameter.laborparameter_id.in_(laborparameter_ids))
        .where(ParameterGruppe.aktiv.is_(True))
        .order_by(ParameterGruppe.name.asc())
    )
    grouped: dict[str, list[str]] = defaultdict(list)
    for laborparameter_id, gruppen_name in db.execute(stmt):
        grouped[laborparameter_id].append(gruppen_name)
    return grouped
