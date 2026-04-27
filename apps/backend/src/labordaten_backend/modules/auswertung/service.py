from __future__ import annotations

from collections import defaultdict
from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from labordaten_backend.core.labor_value_formatting import (
    format_numeric_measurement_value,
    format_numeric_reference_range,
)
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_person_override import ZielbereichPersonOverride
from labordaten_backend.modules.auswertung.schemas import (
    AuswertungPunkt,
    AuswertungRequest,
    AuswertungResponse,
    AuswertungsSerie,
    AuswertungsStatistik,
    GesamtzahlenResponse,
)


def get_gesamtzahlen(db: Session) -> GesamtzahlenResponse:
    return GesamtzahlenResponse(
        personen_anzahl=_count_rows(db, Person),
        parameter_anzahl=_count_rows(db, Laborparameter),
        messwerte_anzahl=_count_rows(db, Messwert),
        befunde_anzahl=_count_rows(db, Befund),
    )


def build_auswertung(db: Session, payload: AuswertungRequest) -> AuswertungResponse:
    persons = _load_persons_or_raise(db, payload.person_ids)
    rows = list(_execute_measurement_query(db, payload))
    references = _load_reference_map(db, [messwert.id for messwert, _, _, _, _ in rows])
    overrides_by_person_parameter = _load_target_override_map(db, payload.person_ids)
    targets_by_parameter = _load_target_map(db, {parameter.id for _, _, parameter, _, _ in rows})

    grouped: dict[str, list[tuple[Messwert, Befund, Laborparameter, Labor | None, Person]]] = defaultdict(list)
    for row in rows:
        grouped[row[2].id].append(row)

    serien: list[AuswertungsSerie] = []
    for parameter_id, parameter_rows in sorted(grouped.items(), key=lambda item: item[1][0][2].anzeigename.lower()):
        parameter = parameter_rows[0][2]
        punkte: list[AuswertungPunkt] = []

        for messwert, befund, _, labor, person in sorted(
            parameter_rows,
            key=lambda item: (item[4].anzeigename.lower(), _effective_date(item[1], item[0]) or date.min),
        ):
            current_date = _effective_date(befund, messwert)
            referenz = _select_applicable_reference(references.get(messwert.id, []), person, current_date)
            zielbereich = _select_applicable_target(
                person=person,
                current_date=current_date,
                override=overrides_by_person_parameter.get((person.id, parameter_id)),
                candidates=targets_by_parameter.get(parameter_id, []),
            )
            punkte.append(
                AuswertungPunkt(
                    messwert_id=messwert.id,
                    person_id=person.id,
                    person_anzeigename=person.anzeigename,
                    parameter_primaere_klassifikation=parameter.primaere_klassifikation,
                    datum=current_date,
                    wert_typ=messwert.wert_typ,
                    wert_operator=messwert.wert_operator,
                    wert_anzeige=_format_measurement_value(messwert),
                    wert_num=messwert.wert_num,
                    wert_text=messwert.wert_text,
                    einheit=messwert.einheit_original,
                    labor_name=labor.name if labor is not None else None,
                    befundbemerkung=befund.bemerkung,
                    messwertbemerkung=messwert.bemerkung_kurz,
                    laborreferenz_untere_num=referenz.untere_grenze_num if payload.include_laborreferenz and referenz is not None else None,
                    laborreferenz_obere_num=referenz.obere_grenze_num if payload.include_laborreferenz and referenz is not None else None,
                    laborreferenz_einheit=referenz.einheit if payload.include_laborreferenz and referenz is not None else None,
                    laborreferenz_text=_format_reference_text(referenz) if payload.include_laborreferenz and referenz is not None else None,
                    zielbereich_untere_num=zielbereich["untere_grenze_num"] if payload.include_zielbereich and zielbereich is not None else None,
                    zielbereich_obere_num=zielbereich["obere_grenze_num"] if payload.include_zielbereich and zielbereich is not None else None,
                    zielbereich_einheit=zielbereich["einheit"] if payload.include_zielbereich and zielbereich is not None else None,
                    zielbereich_text=zielbereich["text"] if payload.include_zielbereich and zielbereich is not None else None,
                    zielbereich_zielrichtung=zielbereich["zielrichtung"] if payload.include_zielbereich and zielbereich is not None else None,
                )
            )

        serien.append(
            AuswertungsSerie(
                laborparameter_id=parameter_id,
                parameter_anzeigename=parameter.anzeigename,
                parameter_beschreibung=parameter.beschreibung,
                parameter_primaere_klassifikation=parameter.primaere_klassifikation,
                wert_typ_standard=parameter.wert_typ_standard,
                standard_einheit=parameter.standard_einheit,
                statistik=_build_statistics(punkte),
                punkte=punkte,
            )
        )

    return AuswertungResponse(person_ids=[person.id for person in persons], serien=serien)


def _count_rows(db: Session, model) -> int:
    return int(db.scalar(select(func.count()).select_from(model)) or 0)


def _execute_measurement_query(db: Session, payload: AuswertungRequest):
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

    stmt = stmt.order_by(Laborparameter.anzeigename.asc(), Person.anzeigename.asc(), Befund.entnahmedatum.asc(), Messwert.erstellt_am.asc())
    return db.execute(stmt)


def _load_reference_map(db: Session, messwert_ids: list[str]) -> dict[str, list[MesswertReferenz]]:
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
    return grouped


def _load_target_override_map(db: Session, person_ids: list[str]) -> dict[tuple[str, str], dict[str, float | str | None]]:
    stmt = (
        select(ZielbereichPersonOverride, Zielbereich)
        .join(Zielbereich, ZielbereichPersonOverride.zielbereich_id == Zielbereich.id)
        .where(ZielbereichPersonOverride.person_id.in_(person_ids))
        .where(ZielbereichPersonOverride.aktiv.is_(True))
        .where(Zielbereich.aktiv.is_(True))
        .order_by(ZielbereichPersonOverride.erstellt_am.desc())
    )
    mapping: dict[tuple[str, str], dict[str, float | str | None]] = {}
    for override, zielbereich in db.execute(stmt):
        mapping.setdefault(
            (override.person_id, zielbereich.laborparameter_id),
            {
                "untere_grenze_num": override.untere_grenze_num,
                "obere_grenze_num": override.obere_grenze_num,
                "einheit": override.einheit or zielbereich.einheit,
                "text": override.soll_text or zielbereich.soll_text,
                "zielrichtung": override.zielrichtung,
                "geschlecht_code": zielbereich.geschlecht_code,
                "alter_min_tage": zielbereich.alter_min_tage,
                "alter_max_tage": zielbereich.alter_max_tage,
            },
        )
    return mapping


def _load_target_map(db: Session, parameter_ids: set[str]) -> dict[str, list[Zielbereich]]:
    if not parameter_ids:
        return {}

    stmt = (
        select(Zielbereich)
        .where(Zielbereich.laborparameter_id.in_(parameter_ids))
        .where(Zielbereich.aktiv.is_(True))
        .order_by(Zielbereich.erstellt_am.desc())
    )
    grouped: dict[str, list[Zielbereich]] = defaultdict(list)
    for zielbereich in db.scalars(stmt):
        grouped[zielbereich.laborparameter_id].append(zielbereich)
    return grouped


def _select_applicable_reference(
    references: list[MesswertReferenz],
    person: Person,
    current_date: date | None,
) -> MesswertReferenz | None:
    if not references:
        return None
    matching = [referenz for referenz in references if _matches_context(person, current_date, referenz.geschlecht_code, referenz.alter_min_tage, referenz.alter_max_tage)]
    return matching[0] if matching else references[0]


def _select_applicable_target(
    person: Person,
    current_date: date | None,
    override: dict[str, float | str | None] | None,
    candidates: list[Zielbereich],
) -> dict[str, float | str | None] | None:
    if override is not None and _matches_context(
        person,
        current_date,
        _as_optional_str(override.get("geschlecht_code")),
        _as_optional_int(override.get("alter_min_tage")),
        _as_optional_int(override.get("alter_max_tage")),
    ):
        return override

    for zielbereich in candidates:
        if _matches_context(person, current_date, zielbereich.geschlecht_code, zielbereich.alter_min_tage, zielbereich.alter_max_tage):
            return {
                "untere_grenze_num": zielbereich.untere_grenze_num,
                "obere_grenze_num": zielbereich.obere_grenze_num,
                "einheit": zielbereich.einheit,
                "text": zielbereich.soll_text,
                "zielrichtung": zielbereich.zielrichtung,
            }
    return None


def _matches_context(
    person: Person,
    current_date: date | None,
    geschlecht_code: str | None,
    alter_min_tage: int | None,
    alter_max_tage: int | None,
) -> bool:
    if geschlecht_code and person.geschlecht_code != geschlecht_code:
        return False
    if current_date is None:
        return True

    age_in_days = (current_date - person.geburtsdatum).days
    if alter_min_tage is not None and age_in_days < alter_min_tage:
        return False
    if alter_max_tage is not None and age_in_days > alter_max_tage:
        return False
    return True


def _build_statistics(points: list[AuswertungPunkt]) -> AuswertungsStatistik:
    dates = [punkt.datum for punkt in points if punkt.datum is not None]
    numeric_values = [punkt.wert_num for punkt in points if punkt.wert_num is not None]
    latest_point = max(points, key=lambda punkt: punkt.datum or date.min, default=None)

    trend = "unveraendert"
    numeric_points = [punkt for punkt in points if punkt.wert_num is not None]
    if len(numeric_points) >= 2:
        first = numeric_points[0].wert_num or 0
        last = numeric_points[-1].wert_num or 0
        delta = last - first
        tolerance = max(abs(first) * 0.05, 0.25)
        if delta > tolerance:
            trend = "steigend"
        elif delta < -tolerance:
            trend = "fallend"

    return AuswertungsStatistik(
        anzahl_messungen=len(points),
        personen_anzahl=len({punkt.person_id for punkt in points}),
        zeitraum_von=min(dates) if dates else None,
        zeitraum_bis=max(dates) if dates else None,
        letzte_messung_datum=latest_point.datum if latest_point is not None else None,
        letzter_wert_anzeige=latest_point.wert_anzeige if latest_point is not None else None,
        minimum_num=min(numeric_values) if numeric_values else None,
        maximum_num=max(numeric_values) if numeric_values else None,
        trendrichtung=trend,
    )


def _format_measurement_value(messwert: Messwert) -> str:
    if messwert.wert_typ == "text":
        return messwert.wert_text or messwert.wert_roh_text
    return format_numeric_measurement_value(messwert.wert_num, messwert.wert_operator, messwert.wert_roh_text)


def _format_reference_text(referenz: MesswertReferenz) -> str:
    if referenz.wert_typ == "text":
        return referenz.soll_text or referenz.referenz_text_original or "-"
    return (
        format_numeric_reference_range(
            lower_value=referenz.untere_grenze_num,
            upper_value=referenz.obere_grenze_num,
            lower_operator=referenz.untere_grenze_operator,
            upper_operator=referenz.obere_grenze_operator,
            unit=referenz.einheit,
        )
        or referenz.referenz_text_original
        or "-"
    )


def _effective_date(befund: Befund, messwert: Messwert):
    return befund.entnahmedatum or befund.befunddatum or messwert.erstellt_am.date()


def _load_persons_or_raise(db: Session, person_ids: list[str]) -> list[Person]:
    if not person_ids:
        raise ValueError("Bitte mindestens eine Person auswählen.")
    persons = list(db.scalars(select(Person).where(Person.id.in_(person_ids)).order_by(Person.anzeigename.asc())))
    if len(persons) != len(set(person_ids)):
        raise ValueError("Mindestens eine ausgewählte Person existiert nicht.")
    return persons


def _as_optional_str(value) -> str | None:
    return value if isinstance(value, str) else None


def _as_optional_int(value) -> int | None:
    return value if isinstance(value, int) else None
