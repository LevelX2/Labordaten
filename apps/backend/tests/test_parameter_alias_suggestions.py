from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_parameter_alias_suggestions_are_derived_from_confirmed_measurements(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh",
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 1, 15), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 5, 10), quelle_typ="manuell")
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
                    original_parametername="Vitamin D3 (25-OH) LCMS",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="52.1",
                    wert_num=52.1,
                    einheit_original="ng/ml",
                ),
                Messwert(
                    person_id=person.id,
                    befund_id=second_befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Vitamin D3 (25-OH) LCMS",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="48.7",
                    wert_num=48.7,
                    einheit_original="ng/ml",
                ),
            ]
        )
        db.commit()

        suggestions = parameter_service.list_parameter_alias_suggestions(db)

        assert len(suggestions) == 1
        assert suggestions[0].laborparameter_id == parameter.id
        assert suggestions[0].parameter_anzeigename == "Vitamin D3 (25-OH)"
        assert suggestions[0].alias_text == "Vitamin D3 (25-OH) LCMS"
        assert suggestions[0].alias_normalisiert == "vitamind325ohlcms"
        assert suggestions[0].vorkommen_anzahl == 2

        parameter_service.create_parameter_alias(
            db,
            parameter.id,
            parameter_schemas.ParameterAliasCreate(alias_text="Vitamin D3 (25-OH) LCMS"),
        )

        assert parameter_service.list_parameter_alias_suggestions(db) == []
