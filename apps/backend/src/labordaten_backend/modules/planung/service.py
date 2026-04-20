from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.modules.planung.schemas import (
    FaelligkeitRead,
    PlanungEinmaligCreate,
    PlanungEinmaligUpdate,
    PlanungZyklischCreate,
    PlanungZyklischRead,
    PlanungZyklischUpdate,
)


@dataclass
class LetzteMessungInfo:
    messwert_id: str
    datum: date


def list_planung_zyklisch(
    db: Session,
    person_id: str | None = None,
    status: str | None = None,
) -> list[PlanungZyklischRead]:
    stmt = select(PlanungZyklisch).order_by(PlanungZyklisch.erstellt_am.desc())
    if person_id:
        stmt = stmt.where(PlanungZyklisch.person_id == person_id)
    if status:
        stmt = stmt.where(PlanungZyklisch.status == status)
    planungen = list(db.scalars(stmt))
    return [_build_zyklisch_read(db, planung) for planung in planungen]


def create_planung_zyklisch(db: Session, payload: PlanungZyklischCreate) -> PlanungZyklischRead:
    _assert_person_and_parameter_exist(db, payload.person_id, payload.laborparameter_id)
    if payload.status == "aktiv":
        _assert_no_duplicate_active_plan(db, payload.person_id, payload.laborparameter_id)

    planung = PlanungZyklisch(**payload.model_dump())
    db.add(planung)
    db.commit()
    db.refresh(planung)
    return _build_zyklisch_read(db, planung)


def update_planung_zyklisch(
    db: Session,
    planung_id: str,
    payload: PlanungZyklischUpdate,
) -> PlanungZyklischRead | None:
    planung = db.get(PlanungZyklisch, planung_id)
    if planung is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(planung, key, value)

    if planung.enddatum and planung.enddatum < planung.startdatum:
        raise ValueError("Das Enddatum darf nicht vor dem Startdatum liegen.")

    if planung.status == "aktiv":
        _assert_no_duplicate_active_plan(db, planung.person_id, planung.laborparameter_id, exclude_id=planung.id)

    db.add(planung)
    db.commit()
    db.refresh(planung)
    return _build_zyklisch_read(db, planung)


def list_planung_einmalig(
    db: Session,
    person_id: str | None = None,
    status: str | None = None,
) -> list[PlanungEinmalig]:
    stmt = select(PlanungEinmalig).order_by(PlanungEinmalig.erstellt_am.desc())
    if person_id:
        stmt = stmt.where(PlanungEinmalig.person_id == person_id)
    if status:
        stmt = stmt.where(PlanungEinmalig.status == status)
    return list(db.scalars(stmt))


def create_planung_einmalig(db: Session, payload: PlanungEinmaligCreate) -> PlanungEinmalig:
    _assert_person_and_parameter_exist(db, payload.person_id, payload.laborparameter_id)

    planung = PlanungEinmalig(**payload.model_dump())
    db.add(planung)
    db.commit()
    db.refresh(planung)
    return planung


def update_planung_einmalig(
    db: Session,
    planung_id: str,
    payload: PlanungEinmaligUpdate,
) -> PlanungEinmalig | None:
    planung = db.get(PlanungEinmalig, planung_id)
    if planung is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    erledigt_durch_messwert_id = updates.get("erledigt_durch_messwert_id")
    if erledigt_durch_messwert_id:
        messwert = db.get(Messwert, erledigt_durch_messwert_id)
        if messwert is None:
            raise ValueError("Der verknüpfte Messwert existiert nicht.")
        if messwert.person_id != planung.person_id or messwert.laborparameter_id != planung.laborparameter_id:
            raise ValueError("Der Messwert passt nicht zu Person und Parameter der Vormerkung.")

    for key, value in updates.items():
        setattr(planung, key, value)

    db.add(planung)
    db.commit()
    db.refresh(planung)
    return planung


def list_faelligkeiten(db: Session, person_id: str | None = None) -> list[FaelligkeitRead]:
    faelligkeiten: list[FaelligkeitRead] = []

    for planung in _load_due_relevant_cyclic_plans(db, person_id):
        read_model = _build_zyklisch_read(db, planung)
        if read_model.faelligkeitsstatus in {"bald_faellig", "faellig", "ueberfaellig"}:
            faelligkeiten.append(
                FaelligkeitRead(
                    planung_typ="zyklisch",
                    planung_id=planung.id,
                    person_id=planung.person_id,
                    laborparameter_id=planung.laborparameter_id,
                    status=read_model.faelligkeitsstatus,
                    prioritaet=planung.prioritaet,
                    bemerkung=planung.bemerkung,
                    letzte_relevante_messung_id=read_model.letzte_relevante_messung_id,
                    letzte_relevante_messung_datum=read_model.letzte_relevante_messung_datum,
                    naechste_faelligkeit=read_model.naechste_faelligkeit,
                    intervall_label=f"{planung.intervall_wert} {planung.intervall_typ}",
                )
            )

    stmt = select(PlanungEinmalig).order_by(
        PlanungEinmalig.zieltermin_datum.is_(None),
        PlanungEinmalig.zieltermin_datum.asc(),
        PlanungEinmalig.erstellt_am.asc(),
    )
    if person_id:
        stmt = stmt.where(PlanungEinmalig.person_id == person_id)
    stmt = stmt.where(PlanungEinmalig.status.in_(("offen", "naechster_termin")))

    for vormerkung in db.scalars(stmt):
        faelligkeiten.append(
            FaelligkeitRead(
                planung_typ="einmalig",
                planung_id=vormerkung.id,
                person_id=vormerkung.person_id,
                laborparameter_id=vormerkung.laborparameter_id,
                status=vormerkung.status,
                bemerkung=vormerkung.bemerkung,
                zieltermin_datum=vormerkung.zieltermin_datum,
            )
        )

    return sorted(
        faelligkeiten,
        key=lambda item: (
            _faelligkeit_sort_key(item.status),
            item.naechste_faelligkeit or item.zieltermin_datum or date.max,
            -(item.prioritaet or 0),
        ),
    )


def _load_due_relevant_cyclic_plans(db: Session, person_id: str | None) -> list[PlanungZyklisch]:
    stmt = select(PlanungZyklisch).where(PlanungZyklisch.status.in_(("aktiv", "pausiert"))).order_by(
        PlanungZyklisch.prioritaet.desc(),
        PlanungZyklisch.erstellt_am.desc(),
    )
    if person_id:
        stmt = stmt.where(PlanungZyklisch.person_id == person_id)
    return list(db.scalars(stmt))


def _build_zyklisch_read(db: Session, planung: PlanungZyklisch) -> PlanungZyklischRead:
    letzte_messung = _find_latest_measurement(db, planung.person_id, planung.laborparameter_id)
    basisdatum = planung.startdatum
    if letzte_messung and letzte_messung.datum > basisdatum:
        basisdatum = letzte_messung.datum

    naechste_faelligkeit = _add_interval(basisdatum, planung.intervall_wert, planung.intervall_typ)
    if planung.enddatum and naechste_faelligkeit and naechste_faelligkeit > planung.enddatum:
        naechste_faelligkeit = None

    return PlanungZyklischRead(
        id=planung.id,
        person_id=planung.person_id,
        laborparameter_id=planung.laborparameter_id,
        intervall_wert=planung.intervall_wert,
        intervall_typ=planung.intervall_typ,
        startdatum=planung.startdatum,
        enddatum=planung.enddatum,
        status=planung.status,
        prioritaet=planung.prioritaet,
        karenz_tage=planung.karenz_tage,
        bemerkung=planung.bemerkung,
        letzte_relevante_messung_id=letzte_messung.messwert_id if letzte_messung else None,
        letzte_relevante_messung_datum=letzte_messung.datum if letzte_messung else None,
        naechste_faelligkeit=naechste_faelligkeit,
        faelligkeitsstatus=_compute_due_status(planung, naechste_faelligkeit),
        erstellt_am=planung.erstellt_am,
        geaendert_am=planung.geaendert_am,
    )


def _compute_due_status(planung: PlanungZyklisch, naechste_faelligkeit: date | None) -> str:
    if planung.status != "aktiv":
        return planung.status
    if naechste_faelligkeit is None:
        return "ohne_faelligkeit"

    heute = date.today()
    if planung.enddatum and heute > planung.enddatum:
        return "beendet"
    if heute > naechste_faelligkeit:
        return "ueberfaellig"
    if heute == naechste_faelligkeit:
        return "faellig"
    if planung.karenz_tage and heute >= naechste_faelligkeit - timedelta(days=planung.karenz_tage):
        return "bald_faellig"
    return "geplant"


def _find_latest_measurement(db: Session, person_id: str, laborparameter_id: str) -> LetzteMessungInfo | None:
    stmt = (
        select(Messwert, Befund.entnahmedatum, Befund.befunddatum)
        .join(Befund, Messwert.befund_id == Befund.id)
        .where(Messwert.person_id == person_id)
        .where(Messwert.laborparameter_id == laborparameter_id)
        .order_by(Messwert.erstellt_am.desc())
    )
    beste: LetzteMessungInfo | None = None
    for messwert, entnahmedatum, befunddatum in db.execute(stmt):
        effektives_datum = entnahmedatum or befunddatum or messwert.erstellt_am.date()
        if beste is None or effektives_datum > beste.datum:
            beste = LetzteMessungInfo(messwert_id=messwert.id, datum=effektives_datum)
    return beste


def _add_interval(basisdatum: date, intervall_wert: int, intervall_typ: str) -> date:
    if intervall_typ == "tage":
        return basisdatum + timedelta(days=intervall_wert)
    if intervall_typ == "wochen":
        return basisdatum + timedelta(weeks=intervall_wert)
    if intervall_typ == "monate":
        return _add_months(basisdatum, intervall_wert)
    if intervall_typ == "jahre":
        return _add_years(basisdatum, intervall_wert)
    raise ValueError("Unbekannter Intervalltyp.")


def _add_months(basisdatum: date, monate: int) -> date:
    zielmonat = basisdatum.month - 1 + monate
    jahr = basisdatum.year + zielmonat // 12
    monat = zielmonat % 12 + 1
    tag = min(basisdatum.day, monthrange(jahr, monat)[1])
    return date(jahr, monat, tag)


def _add_years(basisdatum: date, jahre: int) -> date:
    jahr = basisdatum.year + jahre
    tag = min(basisdatum.day, monthrange(jahr, basisdatum.month)[1])
    return date(jahr, basisdatum.month, tag)


def _assert_person_and_parameter_exist(db: Session, person_id: str, laborparameter_id: str) -> None:
    if db.get(Person, person_id) is None:
        raise ValueError("Die gewählte Person existiert nicht.")
    if db.get(Laborparameter, laborparameter_id) is None:
        raise ValueError("Der gewählte Parameter existiert nicht.")


def _assert_no_duplicate_active_plan(
    db: Session,
    person_id: str,
    laborparameter_id: str,
    exclude_id: str | None = None,
) -> None:
    stmt = (
        select(PlanungZyklisch)
        .where(PlanungZyklisch.person_id == person_id)
        .where(PlanungZyklisch.laborparameter_id == laborparameter_id)
        .where(PlanungZyklisch.status == "aktiv")
    )
    if exclude_id:
        stmt = stmt.where(PlanungZyklisch.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ValueError("Für diese Person und diesen Parameter existiert bereits eine aktive zyklische Planung.")


def _faelligkeit_sort_key(status: str) -> int:
    ranking = {
        "ueberfaellig": 0,
        "faellig": 1,
        "naechster_termin": 2,
        "bald_faellig": 3,
        "offen": 4,
    }
    return ranking.get(status, 9)
