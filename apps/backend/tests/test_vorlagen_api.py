from __future__ import annotations

from pathlib import Path

import labordaten_backend.models  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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


def test_auswertung_template_can_be_saved_loaded_and_marked_used(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    payload = {
        "name": "Eisenwerte Verlauf",
        "bereich": "auswertung",
        "vorlage_typ": "auswertung_verlauf",
        "konfiguration_json": {
            "filter": {
                "person_ids": ["person-1"],
                "laborparameter_ids": ["parameter-1"],
                "gruppen_ids": [],
                "klassifikationen": ["schluesselwert"],
                "labor_ids": [],
                "datum_von": "2025-01-01",
                "datum_bis": "2025-12-31",
            },
            "optionen": {
                "include_laborreferenz": True,
                "include_zielbereich": False,
                "diagramm_darstellung": "punkte_bereiche",
                "zeitraum_darstellung": "selektionszeitraum",
                "messwerttabelle_standard_offen": True,
            },
        },
    }

    with client:
        create_response = client.post("/api/vorlagen", json=payload)
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["name"] == "Eisenwerte Verlauf"
        assert created["konfiguration_json"]["optionen"]["include_zielbereich"] is False

        list_response = client.get("/api/vorlagen?bereich=auswertung")
        assert list_response.status_code == 200
        assert [item["id"] for item in list_response.json()] == [created["id"]]

        apply_response = client.post(f"/api/vorlagen/{created['id']}/anwenden")
        assert apply_response.status_code == 200
        assert apply_response.json()["zuletzt_verwendet_am"] is not None


def test_template_rejects_wrong_type_pair(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)

    with client:
        response = client.post(
            "/api/vorlagen",
            json={
                "name": "Falsche Vorlage",
                "bereich": "auswertung",
                "vorlage_typ": "arztbericht_liste",
                "konfiguration_json": {"filter": {}, "optionen": {}},
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Vorlagentyp und Bereich passen nicht zusammen."


def test_template_update_and_delete(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)

    with client:
        create_response = client.post(
            "/api/vorlagen",
            json={
                "name": "Arztbericht",
                "bereich": "bericht",
                "vorlage_typ": "arztbericht_liste",
                "konfiguration_json": {
                    "filter": {"person_ids": ["person-1"]},
                    "optionen": {"include_labor": False},
                },
            },
        )
        assert create_response.status_code == 201
        template_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/vorlagen/{template_id}",
            json={
                "name": "Arztbericht Schilddrüse",
                "beschreibung": "Kontrolle",
                "konfiguration_json": {
                    "filter": {"person_ids": ["person-1"], "klassifikationen": ["krankwert"]},
                    "optionen": {"include_labor": True},
                },
            },
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Arztbericht Schilddrüse"
        assert update_response.json()["beschreibung"] == "Kontrolle"

        delete_response = client.delete(f"/api/vorlagen/{template_id}")
        assert delete_response.status_code == 200
        assert delete_response.json() == {"id": template_id, "geloescht": True}

        list_response = client.get("/api/vorlagen?bereich=bericht")
        assert list_response.status_code == 200
        assert list_response.json() == []
