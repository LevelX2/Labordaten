from __future__ import annotations

from collections import defaultdict

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.modules.berichte.schemas import (
    ArztberichtEintrag,
    ArztberichtRequest,
    ArztberichtResponse,
    VerlaufsberichtPunkt,
    VerlaufsberichtRequest,
    VerlaufsberichtResponse,
)


def build_arztbericht(db: Session, payload: ArztberichtRequest) -> ArztberichtResponse:
    rows = list(_execute_measurement_query(db, payload.person_id, payload.laborparameter_ids, payload.datum_von, payload.datum_bis))
    latest_by_parameter: dict[str, tuple[Messwert, Befund, Laborparameter, Labor | None]] = {}

    for messwert, befund, parameter, labor in rows:
        current = latest_by_parameter.get(parameter.id)
        current_date = _effective_date(befund, messwert)
        if current is None or current_date >= _effective_date(current[1], current[0]):
            latest_by_parameter[parameter.id] = (messwert, befund, parameter, labor)

    referenzen = _load_reference_map(db, [messwert.id for messwert, _, _, _ in latest_by_parameter.values()])
    eintraege: list[ArztberichtEintrag] = []

    for parameter_id, (messwert, befund, parameter, labor) in sorted(
        latest_by_parameter.items(),
        key=lambda item: item[1][2].anzeigename.lower(),
    ):
        referenz = referenzen.get(messwert.id)
        eintraege.append(
            ArztberichtEintrag(
                laborparameter_id=parameter_id,
                parameter_anzeigename=parameter.anzeigename,
                datum=_effective_date(befund, messwert),
                wert_anzeige=_format_measurement_value(messwert),
                einheit=messwert.einheit_original,
                referenzbereich=_format_reference(referenz) if payload.include_referenzbereich else None,
                labor_name=labor.name if payload.include_labor and labor is not None else None,
                befundbemerkung=befund.bemerkung if payload.include_befundbemerkung else None,
                messwertbemerkung=messwert.bemerkung_kurz if payload.include_messwertbemerkung else None,
            )
        )

    return ArztberichtResponse(person_id=payload.person_id, eintraege=eintraege)


def build_verlaufsbericht(db: Session, payload: VerlaufsberichtRequest) -> VerlaufsberichtResponse:
    rows = list(_execute_measurement_query(db, payload.person_id, payload.laborparameter_ids, payload.datum_von, payload.datum_bis))
    punkte: list[VerlaufsberichtPunkt] = []

    for messwert, befund, parameter, labor in rows:
        punkte.append(
            VerlaufsberichtPunkt(
                laborparameter_id=parameter.id,
                parameter_anzeigename=parameter.anzeigename,
                datum=_effective_date(befund, messwert),
                wert_typ=messwert.wert_typ,
                wert_anzeige=_format_measurement_value(messwert),
                wert_num=messwert.wert_num,
                wert_text=messwert.wert_text,
                einheit=messwert.einheit_original,
                labor_name=labor.name if labor is not None else None,
            )
        )

    punkte.sort(key=lambda item: (item.parameter_anzeigename.lower(), item.datum or item.parameter_anzeigename))
    return VerlaufsberichtResponse(person_id=payload.person_id, punkte=punkte)


def _execute_measurement_query(
    db: Session,
    person_id: str,
    laborparameter_ids: list[str],
    datum_von,
    datum_bis,
):
    stmt: Select = (
        select(Messwert, Befund, Laborparameter, Labor)
        .join(Befund, Messwert.befund_id == Befund.id)
        .join(Laborparameter, Messwert.laborparameter_id == Laborparameter.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
        .where(Messwert.person_id == person_id)
    )

    if laborparameter_ids:
        stmt = stmt.where(Messwert.laborparameter_id.in_(laborparameter_ids))
    if datum_von:
        stmt = stmt.where(Befund.entnahmedatum >= datum_von)
    if datum_bis:
        stmt = stmt.where(Befund.entnahmedatum <= datum_bis)

    stmt = stmt.order_by(Befund.entnahmedatum.desc(), Messwert.erstellt_am.desc())
    return db.execute(stmt)


def _load_reference_map(db: Session, messwert_ids: list[str]) -> dict[str, MesswertReferenz]:
    if not messwert_ids:
        return {}

    stmt = (
        select(MesswertReferenz)
        .where(MesswertReferenz.messwert_id.in_(messwert_ids))
        .order_by(MesswertReferenz.messwert_id.asc(), MesswertReferenz.id.asc())
    )

    grouped: dict[str, list[MesswertReferenz]] = defaultdict(list)
    for referenz in db.scalars(stmt):
        grouped[referenz.messwert_id].append(referenz)
    return {messwert_id: referenzen[0] for messwert_id, referenzen in grouped.items()}


def _format_measurement_value(messwert: Messwert) -> str:
    if messwert.wert_typ == "text":
        return messwert.wert_text or messwert.wert_roh_text
    operator_prefix = {
        "exakt": "",
        "kleiner_als": "< ",
        "kleiner_gleich": "<= ",
        "groesser_als": "> ",
        "groesser_gleich": ">= ",
        "ungefaehr": "~ ",
    }.get(messwert.wert_operator, "")
    if messwert.wert_num is not None:
        return f"{operator_prefix}{messwert.wert_num}"
    return f"{operator_prefix}{messwert.wert_roh_text}"


def _format_reference(referenz: MesswertReferenz | None) -> str | None:
    if referenz is None:
        return None
    if referenz.wert_typ == "text":
        return referenz.soll_text or referenz.referenz_text_original
    lower = "—" if referenz.untere_grenze_num is None else str(referenz.untere_grenze_num)
    upper = "—" if referenz.obere_grenze_num is None else str(referenz.obere_grenze_num)
    einheit = f" {referenz.einheit}" if referenz.einheit else ""
    if referenz.referenz_text_original:
        return f"{lower} bis {upper}{einheit} ({referenz.referenz_text_original})"
    return f"{lower} bis {upper}{einheit}"


def _effective_date(befund: Befund, messwert: Messwert):
    return befund.entnahmedatum or befund.befunddatum or messwert.erstellt_am.date()
