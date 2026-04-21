from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_import_auto_maps_parameter_via_alias_without_manual_mapping(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
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
        parameter_service.create_parameter_alias(
            db,
            parameter.id,
            parameter_schemas.ParameterAliasCreate(
                alias_text="Vitamin D3 (25-OH) LCMS",
                bemerkung="Pur-life Schreibweise",
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
                            "laborName": "Pur-life GmbH",
                            "entnahmedatum": "2021-10-30",
                            "befunddatum": "2021-11-17",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Vitamin D3 (25-OH) LCMS",
                                "wertTyp": "numerisch",
                                "wertRohText": "65,7",
                                "wertNum": 65.7,
                                "einheitOriginal": "ng/ml",
                                "referenzTextOriginal": "> 20.0",
                                "untereGrenzeNum": 20.0,
                                "referenzEinheit": "ng/ml",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.warnung_anzahl == 0
        assert detail.fehler_anzahl == 0
        assert detail.messwerte[0].parameter_id == parameter.id
        assert detail.messwerte[0].parameter_mapping_herkunft == "alias"
        assert detail.messwerte[0].parameter_mapping_hinweis == "Vitamin D3 (25-OH) LCMS"

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        assert uebernommen.status == "uebernommen"

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.laborparameter_id == parameter.id
        assert messwert.original_parametername == "Vitamin D3 (25-OH) LCMS"
