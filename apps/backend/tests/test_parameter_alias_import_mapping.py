from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
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


def test_import_auto_maps_parameter_via_alias_without_manual_mapping(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))

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


def test_import_takeover_can_ignore_single_measurement(tmp_path: Path) -> None:
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
                                "originalParametername": "Hinweis Fremdleistung Labor 43",
                                "wertTyp": "text",
                                "wertRohText": "CO unten",
                                "wertText": "CO unten",
                            },
                        ],
                    }
                )
            ),
        )

        detail = import_service.update_import_pruefentscheidung(
            db,
            detail.id,
            import_schemas.ImportPruefentscheidungRequest(
                messwertIndex=1,
                aktion="ignorieren",
            ),
        )

        assert detail.messwerte[1].parameter_mapping_herkunft == "ignoriert"
        assert detail.warnung_anzahl == 0

        neu_geladen = import_service.get_import_detail(db, detail.id)
        assert neu_geladen is not None
        assert neu_geladen.messwerte[1].parameter_mapping_herkunft == "ignoriert"

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        stored = list(db.scalars(select(Messwert).where(Messwert.importvorgang_id == detail.id)))
        assert len(stored) == 1
        assert stored[0].original_parametername == "Ferritin"
        assert uebernommen.messwerte[1].parameter_mapping_herkunft == "ignoriert"
        assert uebernommen.messwerte[1].parameter_id is None


def test_import_review_decision_persists_manual_parameter_mapping(tmp_path: Path) -> None:
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
                        "befund": {
                            "personId": person.id,
                            "entnahmedatum": "2026-04-22",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Ferritin Fremdbezeichnung",
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

        assert detail.messwerte[0].parameter_id is None
        assert detail.warnung_anzahl == 1

        gespeichert = import_service.update_import_pruefentscheidung(
            db,
            detail.id,
            import_schemas.ImportPruefentscheidungRequest(
                messwertIndex=0,
                aktion="vorhanden",
                laborparameterId=parameter.id,
                aliasUebernehmen=True,
            ),
        )

        assert gespeichert.messwerte[0].parameter_id == parameter.id
        assert gespeichert.messwerte[0].parameter_mapping_herkunft == "manuell"
        assert gespeichert.messwerte[0].alias_uebernehmen is True
        assert gespeichert.warnung_anzahl == 0

        neu_geladen = import_service.get_import_detail(db, detail.id)
        assert neu_geladen is not None
        assert neu_geladen.messwerte[0].parameter_id == parameter.id
        assert neu_geladen.messwerte[0].parameter_mapping_herkunft == "manuell"

        uebernommen = import_service.uebernehmen_import(db, detail.id, import_schemas.ImportUebernehmenRequest())
        assert uebernommen.status == "uebernommen"

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.laborparameter_id == parameter.id


def test_import_manual_mapping_can_create_alias_for_future_imports(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))

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
                anzeigename="25-Hydroxy-Vitamin D",
                standard_einheit="µg/l",
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
                            "laborName": "Labor Dr. Bayer",
                            "entnahmedatum": "2026-02-03",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Vit. D (25-OH)",
                                "wertTyp": "numerisch",
                                "wertRohText": "96.7",
                                "wertNum": 96.7,
                                "einheitOriginal": "µg/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.warnung_anzahl == 1
        assert detail.messwerte[0].parameter_id is None

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(
                parameter_mappings=[
                    import_schemas.ImportParameterMapping(
                        messwert_index=0,
                        laborparameter_id=parameter.id,
                        alias_uebernehmen=True,
                    )
                ]
            ),
        )

        assert uebernommen.status == "uebernommen"

        alias = db.scalar(
            select(LaborparameterAlias).where(LaborparameterAlias.alias_text == "Vit. D (25-OH)")
        )
        assert alias is not None
        assert alias.laborparameter_id == parameter.id

        second_detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=json.dumps(
                    {
                        "schemaVersion": "1.0",
                        "quelleTyp": "ki_json",
                        "befund": {
                            "personId": person.id,
                            "laborName": "Labor Dr. Bayer",
                            "entnahmedatum": "2026-03-03",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Vit. D (25-OH)",
                                "wertTyp": "numerisch",
                                "wertRohText": "88.4",
                                "wertNum": 88.4,
                                "einheitOriginal": "µg/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert second_detail.warnung_anzahl == 0
        assert second_detail.messwerte[0].parameter_id == parameter.id
        assert second_detail.messwerte[0].parameter_mapping_herkunft == "alias"


def test_import_takeover_can_create_missing_parameter_from_mapping(tmp_path: Path) -> None:
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

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=json.dumps(
                    {
                        "schemaVersion": "1.0",
                        "quelleTyp": "ki_json",
                        "befund": {
                            "personId": person.id,
                            "laborName": "Neues Labor",
                            "entnahmedatum": "2026-04-24",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Neuer Spezialwert",
                                "wertTyp": "numerisch",
                                "wertRohText": "12.4",
                                "wertNum": 12.4,
                                "einheitOriginal": "mg/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.warnung_anzahl == 1
        assert detail.messwerte[0].parameter_id is None

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(
                bestaetige_warnungen=True,
                parameter_mappings=[
                    import_schemas.ImportParameterMapping(
                        messwert_index=0,
                        aktion="neu",
                    )
                ],
            ),
        )

        assert uebernommen.status == "uebernommen"

        parameter = db.scalar(select(Laborparameter).where(Laborparameter.anzeigename == "Neuer Spezialwert"))
        assert parameter is not None
        assert parameter.standard_einheit == "mg/l"
        assert parameter.wert_typ_standard == "numerisch"

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.laborparameter_id == parameter.id


def test_import_takeover_uses_parameter_suggestion_for_new_parameter(tmp_path: Path) -> None:
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

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=json.dumps(
                    {
                        "schemaVersion": "1.0",
                        "quelleTyp": "ki_json",
                        "befund": {
                            "personId": person.id,
                            "laborName": "Neues Labor",
                            "entnahmedatum": "2026-04-24",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Lp(a)",
                                "wertTyp": "numerisch",
                                "wertRohText": "42",
                                "wertNum": 42,
                                "einheitOriginal": "mg/dl",
                                "bemerkungKurz": "Hinweis: Messung im Rahmen des Lipidprofils.",
                                "bemerkungLang": "Laborbericht-Kommentar: genetisch beeinflusster Risikoparameter.",
                            }
                        ],
                        "parameterVorschlaege": [
                            {
                                "anzeigename": "Lipoprotein a",
                                "wertTypStandard": "numerisch",
                                "standardEinheit": "mg/dl",
                                "beschreibungKurz": "Lipoprotein a ist ein lipoproteinbezogener Laborparameter.",
                                "moeglicheAliase": ["Lp(a)"],
                                "begruendungAusDokument": "Im Dokument steht Lp(a) mit mg/dl.",
                                "messwertIndizes": [0],
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.messwerte[0].parameter_vorschlag is not None
        assert detail.messwerte[0].parameter_vorschlag.anzeigename == "Lipoprotein a"
        assert detail.messwerte[0].parameter_vorschlag.beschreibung_kurz is not None

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(
                bestaetige_warnungen=True,
                parameter_mappings=[
                    import_schemas.ImportParameterMapping(
                        messwert_index=0,
                        aktion="neu",
                    )
                ],
            ),
        )

        assert uebernommen.status == "uebernommen"

        parameter = db.scalar(select(Laborparameter).where(Laborparameter.anzeigename == "Lipoprotein a"))
        assert parameter is not None
        assert parameter.standard_einheit == "mg/dl"
        assert parameter.wert_typ_standard == "numerisch"
        assert parameter.beschreibung == "Lipoprotein a ist ein lipoproteinbezogener Laborparameter."

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.bemerkung_kurz == "Hinweis: Messung im Rahmen des Lipidprofils."
        assert messwert.bemerkung_lang == "Laborbericht-Kommentar: genetisch beeinflusster Risikoparameter."


def test_import_alias_request_allows_same_alias_name_for_distinct_units(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/l"))
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="%"))

        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        serum_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="20:5w3 Eicosapentaensäure (EPA)",
                standard_einheit="mg/l",
                wert_typ_standard="numerisch",
            ),
        )
        erythrozyten_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="20:5w3 Eicosapentaensäure (EPA) i. Erythrozyten",
                standard_einheit="%",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_alias(
            db,
            erythrozyten_parameter.id,
            parameter_schemas.ParameterAliasCreate(alias_text="Eicosapentaensäure (EPA) 20:5"),
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
                            "entnahmedatum": "2026-04-24",
                        },
                        "messwerte": [
                            {
                                "parameterId": serum_parameter.id,
                                "originalParametername": "Eicosapentaensäure (EPA) 20:5",
                                "wertTyp": "numerisch",
                                "wertRohText": "61,0",
                                "wertNum": 61.0,
                                "einheitOriginal": "mg/l",
                                "aliasUebernehmen": True,
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.fehler_anzahl == 0
        assert detail.warnung_anzahl == 0

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        assert uebernommen.status == "uebernommen"

        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))
        assert messwert is not None
        assert messwert.laborparameter_id == serum_parameter.id

        aliases = list(db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.alias_text == "Eicosapentaensäure (EPA) 20:5")))
        assert {alias.laborparameter_id for alias in aliases} == {erythrozyten_parameter.id, serum_parameter.id}

        second_detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=json.dumps(
                    {
                        "schemaVersion": "1.0",
                        "quelleTyp": "ki_json",
                        "befund": {
                            "personId": person.id,
                            "entnahmedatum": "2026-04-25",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Eicosapentaensäure (EPA) 20:5",
                                "wertTyp": "numerisch",
                                "wertRohText": "62,0",
                                "wertNum": 62.0,
                                "einheitOriginal": "mg/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert second_detail.messwerte[0].parameter_id == serum_parameter.id
        assert second_detail.messwerte[0].parameter_mapping_herkunft == "alias"


def test_import_alias_request_for_existing_alias_with_same_unit_is_warning(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/l"))

        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        first_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="EPA alt",
                standard_einheit="mg/l",
                wert_typ_standard="numerisch",
            ),
        )
        second_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="EPA neu",
                standard_einheit="mg/l",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_alias(
            db,
            first_parameter.id,
            parameter_schemas.ParameterAliasCreate(alias_text="Eicosapentaensäure (EPA) 20:5"),
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
                            "entnahmedatum": "2026-04-24",
                        },
                        "messwerte": [
                            {
                                "parameterId": second_parameter.id,
                                "originalParametername": "Eicosapentaensäure (EPA) 20:5",
                                "wertTyp": "numerisch",
                                "wertRohText": "61,0",
                                "wertNum": 61.0,
                                "einheitOriginal": "mg/l",
                                "aliasUebernehmen": True,
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.fehler_anzahl == 0
        assert detail.warnung_anzahl == 1
        assert "nicht erneut angelegt" in detail.pruefpunkte[0].meldung

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(bestaetige_warnungen=True),
        )

        assert uebernommen.status == "uebernommen"
        aliases = list(db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.alias_text == "Eicosapentaensäure (EPA) 20:5")))
        assert len(aliases) == 1
        assert aliases[0].laborparameter_id == first_parameter.id


def test_import_alias_creation_conflict_blocks_takeover(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))

        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        target = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="25-Hydroxy-Vitamin D",
                standard_einheit="µg/l",
                wert_typ_standard="numerisch",
            ),
        )
        conflicting = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Vit. D (25-OH)",
                standard_einheit="µg/l",
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
                            "laborName": "Labor Dr. Bayer",
                            "entnahmedatum": "2026-02-03",
                        },
                        "messwerte": [
                            {
                                "originalParametername": "Vit. D (25-OH)",
                                "wertTyp": "numerisch",
                                "wertRohText": "96.7",
                                "wertNum": 96.7,
                                "einheitOriginal": "µg/l",
                            }
                        ],
                    }
                )
            ),
        )

        assert detail.warnung_anzahl == 0
        assert detail.messwerte[0].parameter_id == conflicting.id

        try:
            import_service.uebernehmen_import(
                db,
                detail.id,
                import_schemas.ImportUebernehmenRequest(
                    parameter_mappings=[
                        import_schemas.ImportParameterMapping(
                            messwert_index=0,
                            laborparameter_id=target.id,
                            alias_uebernehmen=True,
                        )
                    ]
                ),
            )
        except ValueError as exc:
            assert "kollidiert mit dem Anzeigenamen" in str(exc)
        else:
            raise AssertionError("Die Alias-Kollision hätte den Import blockieren müssen.")
