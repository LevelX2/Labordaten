from __future__ import annotations

from pathlib import Path

import labordaten_backend.models  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from labordaten_backend.api.deps import get_db
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.main import create_app
from labordaten_backend.models.base import Base


class _DummyRuntimeSettingsStore:
    def __init__(self, tmp_path: Path) -> None:
        self._model = RuntimeSettingsModel(
            data_path=str(tmp_path.resolve()),
            documents_path=str((tmp_path / "documents").resolve()),
            knowledge_path=str((tmp_path / "knowledge").resolve()),
        )

    def get(self) -> RuntimeSettingsModel:
        return self._model


def _make_client(monkeypatch, tmp_path: Path) -> TestClient:
    monkeypatch.setattr(
        "labordaten_backend.main.get_runtime_settings_store",
        lambda: _DummyRuntimeSettingsStore(tmp_path),
    )
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    test_session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    def _get_test_db():
        db = test_session_factory()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = _get_test_db
    return TestClient(app)


def test_group_name_and_description_can_be_updated(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        create_response = client.post(
            "/api/gruppen",
            json={"name": "Eisenstatus", "beschreibung": "Alt"},
        )
        assert create_response.status_code == 201
        group_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/gruppen/{group_id}",
            json={"name": "Eisenstoffwechsel", "beschreibung": "Ferritin und Transferrin"},
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == "Eisenstoffwechsel"
        assert updated["beschreibung"] == "Ferritin und Transferrin"
        assert updated["parameter_anzahl"] == 0

        list_response = client.get("/api/gruppen")
        assert list_response.status_code == 200
        assert list_response.json()[0]["name"] == "Eisenstoffwechsel"


def test_group_update_rejects_empty_name(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        create_response = client.post("/api/gruppen", json={"name": "Eisenstatus"})
        assert create_response.status_code == 201
        group_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/gruppen/{group_id}",
            json={"name": "   ", "beschreibung": None},
        )

        assert update_response.status_code == 400
        assert update_response.json()["detail"] == "Gruppen brauchen einen Namen."
