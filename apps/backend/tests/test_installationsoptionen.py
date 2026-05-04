from __future__ import annotations

import json
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from labordaten_backend.models.base import Base
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.modules.installationsoptionen.service import process_pending_installation_options


def _make_session(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def test_installationsoptionen_returns_empty_result_without_pending_file(tmp_path: Path) -> None:
    db = _make_session(tmp_path)
    try:
        result = process_pending_installation_options(db, options_file=tmp_path / "pending-install-options.json")
    finally:
        db.close()

    assert result.pending_vorhanden is False
    assert result.verarbeitet is False
    assert result.naechste_schritte_anzeigen is False


def test_installationsoptionen_processes_standarddaten_and_archives_file(tmp_path: Path) -> None:
    options_file = tmp_path / "pending-install-options.json"
    options_file.write_text(
        json.dumps(
            {
                "version": 1,
                "quelle": "test",
                "installationstyp": "neuinstallation",
                "standarddaten_laden": True,
                "standarddaten_aktualisieren": False,
                "naechste_schritte_anzeigen": True,
                "zielwertpakete": [],
            }
        ),
        encoding="utf-8",
    )
    db = _make_session(tmp_path)
    try:
        result = process_pending_installation_options(db, options_file=options_file)

        assert result.pending_vorhanden is True
        assert result.verarbeitet is True
        assert result.standarddaten_angewendet is True
        assert result.naechste_schritte_anzeigen is True
        assert result.fehler == []
        assert db.scalar(select(Laborparameter)) is not None
    finally:
        db.close()

    assert not options_file.exists()
    assert (tmp_path / "installationsoptionen-letzter-lauf.json").exists()
    assert list(tmp_path.glob("pending-install-options-verarbeitet-*.json"))
