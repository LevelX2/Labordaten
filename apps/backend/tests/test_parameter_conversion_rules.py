from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.messwerte import schemas as messwert_schemas
from labordaten_backend.modules.messwerte import service as messwert_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_conversion_rule_recalculates_existing_measurements(tmp_path: Path) -> None:
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

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Glukose",
                standard_einheit="mmol/l",
                wert_typ_standard="numerisch",
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
        assert messwert.wert_normiert_num is None

        rule = parameter_service.create_parameter_umrechnungsregel(
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

        refreshed = db.get(Messwert, messwert.id)
        assert refreshed is not None
        assert refreshed.wert_normiert_num == 5.0
        assert refreshed.einheit_normiert == "mmol/l"
        assert refreshed.umrechnungsregel_id == rule.id


def test_manual_measurement_creation_uses_conversion_rule(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        db.commit()
        db.refresh(person)

        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_umrechnungsregel(
            db,
            parameter.id,
            parameter_schemas.ParameterUmrechnungsregelCreate(
                von_einheit="µg/l",
                nach_einheit="ng/ml",
                regel_typ="faktor_plus_offset",
                faktor=1.0,
                offset=0.0,
                rundung_stellen=1,
            ),
        )

        messwert = messwert_service.create_messwert(
            db,
            messwert_schemas.MesswertCreate(
                person_id=person.id,
                befund_id=befund.id,
                laborparameter_id=parameter.id,
                original_parametername="Ferritin",
                wert_typ="numerisch",
                wert_roh_text="44",
                wert_num=44.0,
                einheit_original="µg/l",
            ),
        )

        assert messwert.wert_normiert_num == 44.0
        assert messwert.einheit_normiert == "ng/ml"
        assert messwert.umrechnungsregel_id is not None


def test_import_takeover_applies_formula_conversion_rule(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/l"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/dl"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Kupfer",
                standard_einheit="µg/dl",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_umrechnungsregel(
            db,
            parameter.id,
            parameter_schemas.ParameterUmrechnungsregelCreate(
                von_einheit="mg/l",
                nach_einheit="µg/dl",
                regel_typ="formel",
                formel_text="x * 100",
                rundung_stellen=1,
            ),
        )

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=json.dumps(
                    {
                        "schemaVersion": "1.0",
                        "quelleTyp": "ki_json",
                        "befund": {
                            "personId": person.id,
                            "entnahmedatum": "2026-04-21",
                        },
                        "messwerte": [
                            {
                                "parameterId": parameter.id,
                                "originalParametername": "Kupfer",
                                "wertTyp": "numerisch",
                                "wertRohText": "0.87",
                                "wertNum": 0.87,
                                "einheitOriginal": "mg/l",
                            }
                        ],
                    }
                )
            ),
        )

        import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.wert_normiert_num == 87.0
        assert messwert.einheit_normiert == "µg/dl"
        assert messwert.umrechnungsregel_id is not None
