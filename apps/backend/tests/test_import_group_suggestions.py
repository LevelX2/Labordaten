from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.gruppen import schemas as gruppen_schemas
from labordaten_backend.modules.gruppen import service as gruppen_service
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_import_detail_builds_group_suggestions_and_similar_groups(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="m",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        ferritin = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        transferrin = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Transferrin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        gruppe = gruppen_service.create_gruppe(
            db,
            gruppen_schemas.GruppeCreate(name="Eisenstatus"),
        )
        gruppen_service.merge_gruppen_parameter(
            db,
            gruppe.id,
            gruppen_schemas.GruppenParameterAssignRequest(
                eintraege=[gruppen_schemas.GruppenParameterAssignItem(laborparameter_id=ferritin.id)]
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
                            "entnahmedatum": "2026-04-22",
                        },
                        "messwerte": [
                            {
                                "parameterId": ferritin.id,
                                "originalParametername": "Ferritin",
                                "wertTyp": "numerisch",
                                "wertRohText": "41",
                                "wertNum": 41,
                                "einheitOriginal": "ng/ml",
                            },
                            {
                                "parameterId": transferrin.id,
                                "originalParametername": "Transferrin",
                                "wertTyp": "numerisch",
                                "wertRohText": "270",
                                "wertNum": 270,
                                "einheitOriginal": "ng/ml",
                            },
                        ],
                        "gruppenVorschlaege": [
                            {
                                "name": "Eisenstatus",
                                "messwertIndizes": [0, 1],
                            }
                        ],
                    }
                )
            ),
        )

        assert len(detail.gruppenvorschlaege) == 1
        suggestion = detail.gruppenvorschlaege[0]
        assert suggestion.name == "Eisenstatus"
        assert suggestion.parameter_namen == ["Ferritin", "Transferrin"]
        assert suggestion.anwendbar is True
        assert len(suggestion.aehnliche_gruppen) == 1
        assert suggestion.aehnliche_gruppen[0].name == "Eisenstatus"
        assert suggestion.aehnliche_gruppen[0].gemeinsame_parameter_anzahl == 1
        assert suggestion.aehnliche_gruppen[0].namensaehnlich is True


def test_apply_import_group_suggestions_merges_parameters_into_existing_group(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="m",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        ferritin = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        transferrin = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Transferrin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        gruppe = gruppen_service.create_gruppe(
            db,
            gruppen_schemas.GruppeCreate(name="Eisenstatus"),
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
                            "entnahmedatum": "2026-04-22",
                        },
                        "messwerte": [
                            {
                                "parameterId": ferritin.id,
                                "originalParametername": "Ferritin",
                                "wertTyp": "numerisch",
                                "wertRohText": "41",
                                "wertNum": 41,
                                "einheitOriginal": "ng/ml",
                            },
                            {
                                "parameterId": transferrin.id,
                                "originalParametername": "Transferrin",
                                "wertTyp": "numerisch",
                                "wertRohText": "270",
                                "wertNum": 270,
                                "einheitOriginal": "ng/ml",
                            },
                        ],
                        "gruppenVorschlaege": [
                            {
                                "name": "Eisenstatus",
                                "messwertIndizes": [0, 1],
                            }
                        ],
                    }
                )
            ),
        )

        import_service.uebernehmen_import(db, detail.id, import_schemas.ImportUebernehmenRequest())

        result = import_service.anwenden_gruppenvorschlaege(
            db,
            detail.id,
            import_schemas.ImportGruppenvorschlaegeAnwendenRequest(
                vorschlaege=[
                    import_schemas.ImportGruppenvorschlagAnwendenItem(
                        vorschlag_index=0,
                        aktion="vorhanden",
                        gruppe_id=gruppe.id,
                    )
                ]
            ),
        )

        assert len(result.ergebnisse) == 1
        assert result.ergebnisse[0].gruppe_id == gruppe.id
        assert result.ergebnisse[0].zugeordnete_parameter_anzahl == 2

        gruppen_parameter = gruppen_service.list_gruppen_parameter(db, gruppe.id)
        assert [item.parameter_anzeigename for item in gruppen_parameter] == ["Ferritin", "Transferrin"]


def test_file_import_builds_group_suggestions_from_group_column(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="m",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        csv_content = (
            "gruppe;parameter;wert;einheit;entnahmedatum;person_id\n"
            f"Eisenstatus;Ferritin;41;ng/ml;2026-04-22;{person.id}\n"
            f"Eisenstatus;Transferrin;270;ng/ml;2026-04-22;{person.id}\n"
            "Spurenelemente;Zink;92;µg/dl;2026-04-22;\n"
        ).encode("utf-8")

        detail = import_service.create_import_entwurf_from_file(
            db,
            filename="gruppen.csv",
            content_type="text/csv",
            content=csv_content,
            person_id_override=None,
            labor_id_override=None,
            labor_name_override="Testlabor",
            entnahmedatum_override=None,
            befunddatum_override=None,
            befund_bemerkung_override=None,
            import_bemerkung="CSV-Test",
            quelle_behalten=False,
        )

        assert detail.quelle_typ == "csv"
        assert [item.name for item in detail.gruppenvorschlaege] == ["Eisenstatus", "Spurenelemente"]
        assert detail.gruppenvorschlaege[0].messwert_indizes == [0, 1]
        assert detail.gruppenvorschlaege[1].messwert_indizes == [2]
