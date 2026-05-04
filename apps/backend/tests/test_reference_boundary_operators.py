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
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.messwerte import schemas as messwert_schemas
from labordaten_backend.modules.messwerte import service as messwert_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service
from labordaten_backend.modules.berichte import schemas as bericht_schemas
from labordaten_backend.modules.berichte import service as bericht_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_context_matching_without_birthdate_skips_age_specific_ranges() -> None:
    person = Person(anzeigename="Ohne Geburtsdatum", geschlecht_code="m")

    assert auswertung_service._matches_context(person, date(2026, 5, 5), "m", None, None) is True
    assert auswertung_service._matches_context(person, date(2026, 5, 5), "m", 365, None) is False
    assert auswertung_service._matches_context(person, date(2026, 5, 5), "m", None, 36500) is False


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


def test_auswertung_converts_reference_lines_to_common_display_unit(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code="m")
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="nmol/l"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="25hydroxyvitamind",
                anzeigename="25-Hydroxy-Vitamin D",
                standard_einheit="µg/l",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2025, 1, 10), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2025, 2, 10), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        first_messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=first_befund.id,
                laborparameter_id=parameter.id,
                original_parametername="25-Hydroxy-Vitamin D",
                wert_typ="numerisch",
                wert_roh_text="100",
                wert_num=100.0,
                einheit_original="nmol/l",
            ),
        )
        second_messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=second_befund.id,
                laborparameter_id=parameter.id,
                original_parametername="25-Hydroxy-Vitamin D",
                wert_typ="numerisch",
                wert_roh_text="42",
                wert_num=42.0,
                einheit_original="µg/l",
            ),
        )

        parameter_service.create_parameter_umrechnungsregel(
            db,
            parameter.id,
            parameter_schemas.ParameterUmrechnungsregelCreate(
                von_einheit="nmol/l",
                nach_einheit="µg/l",
                regel_typ="faktor",
                faktor=0.4,
                rundung_stellen=1,
            ),
        )

        db.add_all(
            [
                MesswertReferenz(
                    messwert_id=first_messwert.id,
                    referenz_typ="labor",
                    wert_typ="numerisch",
                    untere_grenze_num=75.0,
                    obere_grenze_num=250.0,
                    einheit="nmol/l",
                    referenz_text_original="75 bis 250 nmol/l",
                ),
                MesswertReferenz(
                    messwert_id=second_messwert.id,
                    referenz_typ="labor",
                    wert_typ="numerisch",
                    untere_grenze_num=30.0,
                    obere_grenze_num=100.0,
                    einheit="µg/l",
                    referenz_text_original="30 bis 100 µg/l",
                ),
            ]
        )
        db.commit()

        response = auswertung_service.build_auswertung(
            db,
            auswertung_schemas.AuswertungRequest(person_ids=[person.id]),
        )

        assert len(response.serien) == 1
        first_point, second_point = response.serien[0].punkte
        assert first_point.einheit == "µg/l"
        assert first_point.wert_num == 40.0
        assert first_point.laborreferenz_einheit == "µg/l"
        assert first_point.laborreferenz_untere_num == 30.0
        assert first_point.laborreferenz_obere_num == 100.0
        assert first_point.laborreferenz_text == "30.0 bis 100.0 µg/l (Original: 75 bis 250 nmol/l)"
        assert second_point.einheit == "µg/l"
        assert second_point.wert_num == 42.0
        assert second_point.laborreferenz_untere_num == 30.0
        assert second_point.laborreferenz_obere_num == 100.0


def test_auswertung_uses_sufficient_vitamin_d_range_instead_of_intoxication_boundary(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code="m")
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="25hydroxyvitamind",
                anzeigename="25-Hydroxy-Vitamin D",
                standard_einheit="µg/l",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 5, 6), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2025, 1, 14), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        first_messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=first_befund.id,
                laborparameter_id=parameter.id,
                original_parametername="25-Hydroxy-Vitamin-D i. S.",
                wert_typ="numerisch",
                wert_roh_text="55,8",
                wert_num=55.8,
                einheit_original="µg/l",
            ),
        )
        second_messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=second_befund.id,
                laborparameter_id=parameter.id,
                original_parametername="25-Hydroxy-Vitamin-D",
                wert_typ="numerisch",
                wert_roh_text="66,6",
                wert_num=66.6,
                einheit_original="µg/l",
            ),
        )

        db.add_all(
            [
                MesswertReferenz(
                    messwert_id=first_messwert.id,
                    referenz_typ="labor",
                    wert_typ="numerisch",
                    untere_grenze_num=30.0,
                    obere_grenze_num=150.0,
                    einheit="µg/l",
                    referenz_text_original="30 - 150",
                    bemerkung="< 20 µg/l = Mangel; 20 - 29 µg/l = ungenügende Versorgung; 30 - 60 µg/l = ausreichende Versorgung; 61 - 150 µg/l = überdosiert, jedoch nicht toxisch; > 150 µg/l = Vitamin-D-Intoxikation",
                ),
                MesswertReferenz(
                    messwert_id=second_messwert.id,
                    referenz_typ="labor",
                    wert_typ="numerisch",
                    untere_grenze_num=30.0,
                    obere_grenze_num=150.0,
                    einheit="µg/l",
                    referenz_text_original="30 - 150",
                ),
            ]
        )
        db.commit()

        response = auswertung_service.build_auswertung(
            db,
            auswertung_schemas.AuswertungRequest(person_ids=[person.id]),
        )

        assert len(response.serien) == 1
        first_point, second_point = response.serien[0].punkte
        assert first_point.laborreferenz_untere_num == 30.0
        assert first_point.laborreferenz_obere_num == 60.0
        assert first_point.laborreferenz_text == "30.0 bis 60.0 µg/l (ausreichende Versorgung; Original: 30 - 150)"
        assert second_point.laborreferenz_untere_num == 30.0
        assert second_point.laborreferenz_obere_num == 60.0
        assert second_point.laborreferenz_text == "30.0 bis 60.0 µg/l (ausreichende Versorgung; Original: 30 - 150)"
