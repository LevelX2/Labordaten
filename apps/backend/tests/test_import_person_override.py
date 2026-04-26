from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.importvorgang import Importvorgang
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


def test_import_takeover_accepts_person_selected_after_draft(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Deborah", geburtsdatum=date(1989, 8, 31))
        db.add(person)
        db.commit()
        db.refresh(person)

        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
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
                        "personHinweis": "Deborah",
                        "befund": {
                            "entnahmedatum": "2026-04-25",
                        },
                        "messwerte": [
                            {
                                "parameterId": parameter.id,
                                "originalParametername": "Ferritin",
                                "wertTyp": "numerisch",
                                "wertRohText": "41",
                                "wertNum": 41,
                                "einheitOriginal": "ng/ml",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.befund.person_id is None
        assert any(item.pruefart == "person_zuordnung" and item.status == "fehler" for item in detail.pruefpunkte)

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(person_id_override=person.id),
        )

        assert uebernommen.status == "uebernommen"
        assert uebernommen.befund.person_id == person.id

        befund = db.scalar(select(Befund).where(Befund.importvorgang_id == detail.id))
        assert befund is not None
        assert befund.person_id == person.id

        importvorgang = db.get(Importvorgang, detail.id)
        assert importvorgang is not None
        assert importvorgang.person_id_vorschlag == person.id
        assert f'"personId": "{person.id}"' in (importvorgang.roh_payload_text or "")
