from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.berichte import schemas as bericht_schemas
from labordaten_backend.modules.berichte import service as bericht_service
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_trend_report_uses_selected_display_unit_when_all_points_support_it(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mmol/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="glukose",
                anzeigename="Glukose",
                standard_einheit="mmol/l",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 1, 15), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 2, 15), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        db.add_all(
            [
                Messwert(
                    person_id=person.id,
                    befund_id=first_befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Glukose",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="90",
                    wert_num=90.0,
                    einheit_original="mg/dl",
                    wert_normiert_num=5.0,
                    einheit_normiert="mmol/l",
                ),
                Messwert(
                    person_id=person.id,
                    befund_id=second_befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Glukose",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="5.3",
                    wert_num=5.3,
                    einheit_original="mmol/l",
                    wert_normiert_num=95.4,
                    einheit_normiert="mg/dl",
                ),
            ]
        )
        db.commit()

        report = bericht_service.build_verlaufsbericht(
            db,
            bericht_schemas.VerlaufsberichtRequest(
                person_ids=[person.id],
                einheit_auswahl={parameter.id: "mmol/l"},
            ),
        )

        assert len(report.punkte) == 2
        assert [punkt.einheit for punkt in report.punkte] == ["mmol/l", "mmol/l"]
        assert [punkt.wert_num for punkt in report.punkte] == [5.0, 5.3]
        assert report.punkte[0].wert_original_num == 90.0
        assert report.punkte[0].wert_normiert_num == 5.0


def test_trend_report_rejects_unit_when_not_all_points_support_it(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mmol/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="natrium",
                anzeigename="Natrium",
                standard_einheit="mmol/l",
                wert_typ_standard="numerisch",
            ),
        )

        befund = Befund(person_id=person.id, entnahmedatum=date(2024, 3, 10), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        db.add(
            Messwert(
                person_id=person.id,
                befund_id=befund.id,
                laborparameter_id=parameter.id,
                original_parametername="Natrium",
                wert_typ="numerisch",
                wert_operator="exakt",
                wert_roh_text="141",
                wert_num=141.0,
                einheit_original="mmol/l",
            )
        )
        db.commit()

        with pytest.raises(ValueError, match="nicht sauber dargestellt"):
            bericht_service.build_verlaufsbericht(
                db,
                bericht_schemas.VerlaufsberichtRequest(
                    person_ids=[person.id],
                    einheit_auswahl={parameter.id: "mg/dl"},
                ),
            )
