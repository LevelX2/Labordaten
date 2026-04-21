from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.modules.auswertung import schemas as auswertung_schemas
from labordaten_backend.modules.auswertung import service as auswertung_service
from labordaten_backend.modules.berichte import schemas as bericht_schemas
from labordaten_backend.modules.berichte import service as bericht_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_report_marks_strict_lower_reference_boundaries_as_outside(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code="m")
        parameter = Laborparameter(
            interner_schluessel="parathormon",
            anzeigename="Parathormon",
            standard_einheit="pg/ml",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)

        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        messwert = Messwert(
            person_id=person.id,
            befund_id=befund.id,
            laborparameter_id=parameter.id,
            original_parametername="Parathormon",
            wert_typ="numerisch",
            wert_operator="exakt",
            wert_roh_text="6",
            wert_num=6.0,
            einheit_original="pg/ml",
        )
        db.add(messwert)
        db.flush()
        db.add(
            MesswertReferenz(
                messwert_id=messwert.id,
                referenz_typ="labor",
                wert_typ="numerisch",
                untere_grenze_num=6.0,
                untere_grenze_operator="groesser_als",
                einheit="pg/ml",
                referenz_text_original="> 6 pg/ml",
            )
        )
        db.commit()

        report = bericht_service.build_arztbericht(
            db,
            bericht_schemas.ArztberichtRequest(person_ids=[person.id]),
        )

        assert len(report.eintraege) == 1
        assert report.eintraege[0].ausserhalb_referenzbereich is True
        assert report.eintraege[0].referenzbereich is not None
        assert "> 6.0 pg/ml" in report.eintraege[0].referenzbereich


def test_auswertung_keeps_measurement_operator_and_formats_one_sided_reference(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code="m")
        parameter = Laborparameter(
            interner_schluessel="crp_hs",
            anzeigename="CRP hs",
            standard_einheit="mg/l",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)

        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        messwert = Messwert(
            person_id=person.id,
            befund_id=befund.id,
            laborparameter_id=parameter.id,
            original_parametername="CRP hs",
            wert_typ="numerisch",
            wert_operator="kleiner_als",
            wert_roh_text="< 0,5",
            wert_num=0.5,
            einheit_original="mg/l",
        )
        db.add(messwert)
        db.flush()
        db.add(
            MesswertReferenz(
                messwert_id=messwert.id,
                referenz_typ="labor",
                wert_typ="numerisch",
                obere_grenze_num=8.0,
                obere_grenze_operator="kleiner_als",
                einheit="mg/l",
                referenz_text_original="< 8 mg/l",
            )
        )
        db.commit()

        response = auswertung_service.build_auswertung(
            db,
            auswertung_schemas.AuswertungRequest(person_ids=[person.id]),
        )

        assert len(response.serien) == 1
        punkt = response.serien[0].punkte[0]
        assert punkt.wert_operator == "kleiner_als"
        assert punkt.wert_anzeige.startswith("< 0.5")
        assert punkt.laborreferenz_text is not None
        assert punkt.laborreferenz_text.startswith("< 8")
