from __future__ import annotations

from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_parameter_key_is_generated_from_display_name(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        assert parameter.interner_schluessel == "vitamin_d3_25_oh"


def test_parameter_key_gets_suffix_for_duplicate_display_name(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        first_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Glukose nüchtern",
                wert_typ_standard="numerisch",
            ),
        )
        second_parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Glukose nüchtern",
                wert_typ_standard="numerisch",
            ),
        )

        assert first_parameter.interner_schluessel == "glukose_nuechtern"
        assert second_parameter.interner_schluessel == "glukose_nuechtern_2"
