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
from labordaten_backend.modules.messwerte import schemas as messwert_schemas
from labordaten_backend.modules.messwerte import service as messwert_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_updating_standard_unit_recalculates_existing_normalized_measurements(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        db.commit()
        db.refresh(person)

        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/dl"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mmol/l"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Glukose",
                standard_einheit="mmol/l",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_umrechnungsregel(
            db,
            parameter.id,
            parameter_schemas.ParameterUmrechnungsregelCreate(
                von_einheit="mg/dl",
                nach_einheit="mmol/l",
                regel_typ="faktor",
                faktor=0.0555,
                rundung_stellen=2,
            ),
        )
        second_rule = parameter_service.create_parameter_umrechnungsregel(
            db,
            parameter.id,
            parameter_schemas.ParameterUmrechnungsregelCreate(
                von_einheit="mg/dl",
                nach_einheit="mg/l",
                regel_typ="faktor",
                faktor=10.0,
                rundung_stellen=1,
            ),
        )

        messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=befund.id,
                laborparameter_id=parameter.id,
                original_parametername="Glukose",
                wert_typ="numerisch",
                wert_roh_text="90",
                wert_num=90.0,
                einheit_original="mg/dl",
            ),
        )
        assert messwert.wert_normiert_num == 5.0
        assert messwert.einheit_normiert == "mmol/l"

        result = parameter_service.update_parameter_standard_einheit(
            db,
            parameter.id,
            parameter_schemas.ParameterStandardEinheitUpdate(standard_einheit="mg/l"),
        )

        refreshed = db.get(Messwert, messwert.id)
        assert refreshed is not None
        assert result.standard_einheit == "mg/l"
        assert result.neu_berechnete_messwerte == 1
        assert refreshed.wert_normiert_num == 900.0
        assert refreshed.einheit_normiert == "mg/l"
        assert refreshed.umrechnungsregel_id == second_rule.id
