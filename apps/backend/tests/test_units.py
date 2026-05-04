from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service
from labordaten_backend.modules.personen import schemas as personen_schemas
from labordaten_backend.modules.personen import service as personen_service
from labordaten_backend.modules.zielbereiche import schemas as zielbereiche_schemas
from labordaten_backend.modules.zielbereiche import service as zielbereiche_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_target_ranges_require_known_units(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        with pytest.raises(ValueError, match="Einheiten-Stammdaten"):
            zielbereiche_service.create_zielbereich(
                db,
                parameter.id,
                zielbereiche_schemas.ZielbereichCreate(
                    wert_typ="numerisch",
                    untere_grenze_num=30.0,
                    obere_grenze_num=250.0,
                    einheit="µg/l",
                ),
            )

        zielbereich = zielbereiche_service.create_zielbereich(
            db,
            parameter.id,
            zielbereiche_schemas.ZielbereichCreate(
                wert_typ="numerisch",
                untere_grenze_num=30.0,
                obere_grenze_num=250.0,
                einheit="ng/ml",
            ),
        )

        person = personen_service.create_person(
            db,
            personen_schemas.PersonCreate(
                anzeigename="Ludwig",
                geburtsdatum=date(1964, 1, 12),
            ),
        )

        with pytest.raises(ValueError, match="Einheiten-Stammdaten"):
            personen_service.create_zielbereich_override(
                db,
                person.id,
                personen_schemas.ZielbereichOverrideCreate(
                    zielbereich_id=zielbereich.id,
                    untere_grenze_num=40.0,
                    einheit="µg/l",
                ),
            )


def test_target_direction_is_stored_and_inherited_by_person_override(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µg/l"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Aluminium im Vollblut",
                standard_einheit="µg/l",
                wert_typ_standard="numerisch",
            ),
        )
        zielbereich = zielbereiche_service.create_zielbereich(
            db,
            parameter.id,
            zielbereiche_schemas.ZielbereichCreate(
                wert_typ="numerisch",
                zielbereich_typ="optimalbereich",
                zielrichtung="je_niedriger_desto_besser",
                obere_grenze_num=11.4,
                einheit="µg/l",
            ),
        )

        person = personen_service.create_person(
            db,
            personen_schemas.PersonCreate(
                anzeigename="Ludwig",
                geburtsdatum=date(1964, 1, 12),
            ),
        )
        override = personen_service.create_zielbereich_override(
            db,
            person.id,
            personen_schemas.ZielbereichOverrideCreate(
                zielbereich_id=zielbereich.id,
                obere_grenze_num=8.0,
                einheit="µg/l",
            ),
        )

        assert zielbereich.zielrichtung == "je_niedriger_desto_besser"
        assert override.basis_zielrichtung == "je_niedriger_desto_besser"
        assert override.zielrichtung == "je_niedriger_desto_besser"


def test_import_takeover_adds_missing_units_to_master_data(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            geburtsdatum=date(1964, 1, 12),
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Parathormon",
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
                                "originalParametername": "Parathormon",
                                "wertTyp": "numerisch",
                                "wertRohText": "41",
                                "wertNum": 41.0,
                                "einheitOriginal": "pg/ml",
                                "referenzTextOriginal": "15 bis 65",
                                "untereGrenzeNum": 15.0,
                                "obereGrenzeNum": 65.0,
                                "referenzEinheit": "pg/ml",
                            }
                        ],
                    }
                )
            ),
        )

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        assert uebernommen.status == "uebernommen"

        einheit = db.scalar(select(Einheit).where(Einheit.kuerzel == "pg/ml"))
        messwert = db.scalar(select(Messwert).where(Messwert.importvorgang_id == detail.id))

        assert einheit is not None
        assert messwert is not None
        assert messwert.einheit_original == "pg/ml"


def test_unit_alias_resolves_to_canonical_unit(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheit = einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="Tsd./µl"))
        alias = einheiten_service.create_einheit_alias(
            db,
            einheit.id,
            einheiten_schemas.EinheitAliasCreate(alias_text="/nl"),
        )

        assert alias.alias_text == "/nl"
        assert einheiten_service.require_existing_einheit(db, "/nl") == "Tsd./µl"
        assert einheiten_service.ensure_einheit_exists(db, "/nl") == "Tsd./µl"

        gespeicherter_alias = db.scalar(select(EinheitAlias).where(EinheitAlias.alias_text == "/nl"))
        assert gespeicherter_alias is not None
        assert gespeicherter_alias.einheit_id == einheit.id


def test_trailing_unit_footnote_marker_resolves_to_canonical_unit(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="µmol/l"))

        assert einheiten_service.normalize_einheit("µmol/l*") == "µmol/l"
        assert einheiten_service.normalize_einheit("µmol/l [1]") == "µmol/l"
        assert einheiten_service.require_existing_einheit(db, "µmol/l*") == "µmol/l"


def test_import_takeover_uses_canonical_unit_when_alias_exists(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            geburtsdatum=date(1964, 1, 12),
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        einheit = einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="Tsd./µl"))
        einheiten_service.create_einheit_alias(
            db,
            einheit.id,
            einheiten_schemas.EinheitAliasCreate(alias_text="/nl"),
        )

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Leukozyten",
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
                                "originalParametername": "Leukozyten",
                                "wertTyp": "numerisch",
                                "wertRohText": "5,4",
                                "wertNum": 5.4,
                                "einheitOriginal": "/nl",
                                "referenzTextOriginal": "4,0 bis 10,0",
                                "untereGrenzeNum": 4.0,
                                "obereGrenzeNum": 10.0,
                                "referenzEinheit": "/nl",
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
        referenz = db.scalar(
            select(MesswertReferenz)
            .join(Messwert, MesswertReferenz.messwert_id == Messwert.id)
            .where(Messwert.importvorgang_id == detail.id)
        )
        alias_einheit = db.scalar(select(Einheit).where(Einheit.kuerzel == "/nl"))

        assert messwert is not None
        assert referenz is not None
        assert messwert.einheit_original == "Tsd./µl"
        assert referenz.einheit == "Tsd./µl"
        assert alias_einheit is None
