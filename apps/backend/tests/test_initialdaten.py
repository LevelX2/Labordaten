from __future__ import annotations

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from labordaten_backend.models.base import Base
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.modules.initialdaten.service import apply_initialdaten, get_initialdaten_status


def _make_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def test_initialdaten_status_recommends_import_for_empty_masterdata(tmp_path) -> None:
    db = _make_session(tmp_path)
    try:
        status = get_initialdaten_status(db)
    finally:
        db.close()

    assert status["snapshot_verfuegbar"] is True
    assert status["stammdaten_vorhanden"] is False
    assert status["initialimport_empfohlen"] is True


def test_initialdaten_apply_imports_masterdata_and_is_idempotent(tmp_path) -> None:
    db = _make_session(tmp_path)
    snapshot = {
        "metadata": {"version": "test"},
        "wissensseiten": [
            {
                "pfad_relativ": "02 Parameter/Allgemein/Ferritin.md",
                "titel_cache": "Ferritin",
                "aktiv": True,
            }
        ],
        "einheiten": [{"kuerzel": "ng/ml", "aktiv": True}],
        "einheit_aliase": [
            {
                "einheit_kuerzel": "ng/ml",
                "alias_text": "ng/mL",
                "alias_normalisiert": "ng/ml",
            }
        ],
        "laborparameter": [
            {
                "interner_schluessel": "ferritin",
                "anzeigename": "Ferritin",
                "beschreibung": "Speichereisen.",
                "standard_einheit": "ng/ml",
                "wert_typ_standard": "numerisch",
                "wissensseite_pfad": "02 Parameter/Allgemein/Ferritin.md",
                "aktiv": True,
            }
        ],
        "laborparameter_aliase": [
            {
                "parameter_schluessel": "ferritin",
                "alias_text": "Ferritin i.S.",
                "alias_normalisiert": "ferritinis",
            }
        ],
        "parameter_gruppen": [
            {
                "name": "Eisenstatus",
                "beschreibung": "Eisenbezogene Werte.",
                "aktiv": True,
            }
        ],
        "gruppen_parameter": [
            {
                "gruppe_name": "Eisenstatus",
                "parameter_schluessel": "ferritin",
                "sortierung": 1,
            }
        ],
        "parameter_klassifikationen": [],
        "parameter_umrechnungsregeln": [],
        "zielbereiche": [],
        "parameter_dublettenausschluesse": [],
    }

    try:
        first = apply_initialdaten(db, snapshot=snapshot)
        second = apply_initialdaten(db, snapshot=snapshot)

        assert first["angelegt"]["laborparameter"] == 1
        assert first["angelegt"]["parameter_gruppen"] == 1
        assert first["angelegt"]["gruppen_parameter"] == 1
        assert second["uebersprungen"]["laborparameter"] == 1
        assert db.scalar(select(Laborparameter).where(Laborparameter.interner_schluessel == "ferritin")) is not None
        assert db.scalar(select(ParameterGruppe).where(ParameterGruppe.name == "Eisenstatus")) is not None
        assert db.scalar(select(Einheit).where(Einheit.kuerzel == "ng/ml")) is not None
        assert db.scalar(select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == "ferritinis")) is not None
        assert db.scalar(select(GruppenParameter)) is not None
    finally:
        db.close()


def test_initialdaten_apply_updates_existing_rows_when_requested(tmp_path) -> None:
    db = _make_session(tmp_path)
    snapshot = {
        "metadata": {"version": "test"},
        "wissensseiten": [],
        "einheiten": [],
        "einheit_aliase": [],
        "laborparameter": [
            {
                "interner_schluessel": "ferritin",
                "anzeigename": "Ferritin",
                "beschreibung": "Alt",
                "wert_typ_standard": "numerisch",
                "aktiv": True,
            }
        ],
        "laborparameter_aliase": [],
        "parameter_gruppen": [],
        "gruppen_parameter": [],
        "parameter_klassifikationen": [],
        "parameter_umrechnungsregeln": [],
        "zielbereiche": [],
        "parameter_dublettenausschluesse": [],
    }

    try:
        apply_initialdaten(db, snapshot=snapshot)
        snapshot["laborparameter"][0]["beschreibung"] = "Neu"

        result = apply_initialdaten(db, aktualisieren=True, snapshot=snapshot)

        parameter = db.scalar(select(Laborparameter).where(Laborparameter.interner_schluessel == "ferritin"))
        assert parameter is not None
        assert parameter.beschreibung == "Neu"
        assert result["aktualisiert"]["laborparameter"] == 1
    finally:
        db.close()
