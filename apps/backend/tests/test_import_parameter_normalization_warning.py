from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_import_warns_when_mapped_parameter_cannot_be_normalized_to_standard_unit(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="nmol/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
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
                                "originalParametername": "Vitamin D3 (25-OH)",
                                "wertTyp": "numerisch",
                                "wertRohText": "120",
                                "wertNum": 120.0,
                                "einheitOriginal": "nmol/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.fehler_anzahl == 0
        assert detail.warnung_anzahl == 1
        assert any(
            pruefpunkt.pruefart == "normierung_fehlt" and "führende Normeinheit 'ng/ml'" in pruefpunkt.meldung
            for pruefpunkt in detail.pruefpunkte
        )

        with pytest.raises(ValueError, match="Warnungen bewusst bestätigen"):
            import_service.uebernehmen_import(
                db,
                detail.id,
                import_schemas.ImportUebernehmenRequest(),
            )


def test_import_does_not_warn_when_original_unit_matches_standard_unit(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
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
                                "originalParametername": "Vitamin D3 (25-OH)",
                                "wertTyp": "numerisch",
                                "wertRohText": "48",
                                "wertNum": 48.0,
                                "einheitOriginal": "ng/ml",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.fehler_anzahl == 0
        assert detail.warnung_anzahl == 0
