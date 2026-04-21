from __future__ import annotations

from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_parameter_rename_can_keep_old_name_as_alias(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh",
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        result = parameter_service.rename_parameter(
            db,
            parameter.id,
            parameter_schemas.ParameterRenameRequest(
                neuer_name="Vitamin D 25 Hydroxy",
                alten_namen_als_alias_anlegen=True,
            ),
        )

        assert result.neuer_name == "Vitamin D 25 Hydroxy"
        assert result.alter_name == "Vitamin D3 (25-OH)"
        assert result.alias_angelegt is True
        assert result.alias_name == "Vitamin D3 (25-OH)"

        aliases = list(
            db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == parameter.id))
        )
        assert len(aliases) == 1
        assert aliases[0].alias_text == "Vitamin D3 (25-OH)"
