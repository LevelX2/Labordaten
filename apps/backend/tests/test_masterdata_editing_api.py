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


def test_person_master_data_can_be_updated(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        create_response = client.post(
            "/api/personen",
            json={
                "anzeigename": "Ludwig",
                "vollname": "Ludwig Alt",
                "geburtsdatum": "1964-01-12",
                "geschlecht_code": "m",
            },
        )
        assert create_response.status_code == 201
        person_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/personen/{person_id}",
            json={
                "anzeigename": "Lui",
                "vollname": "Ludwig Neu",
                "geburtsdatum": "1964-01-13",
                "geschlecht_code": "m",
                "blutgruppe": "0",
                "rhesusfaktor": "positiv",
                "hinweise_allgemein": "Nüchternwerte bevorzugen",
            },
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["id"] == person_id
        assert updated["anzeigename"] == "Lui"
        assert updated["vollname"] == "Ludwig Neu"
        assert updated["geburtsdatum"] == "1964-01-13"
        assert updated["blutgruppe"] == "0"
        assert updated["rhesusfaktor"] == "positiv"
        assert updated["hinweise_allgemein"] == "Nüchternwerte bevorzugen"


def test_labor_master_data_can_be_updated(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        create_response = client.post(
            "/api/labore",
            json={"name": "Altes Labor", "adresse": "Altstraße 1"},
        )
        assert create_response.status_code == 201
        labor_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/labore/{labor_id}",
            json={
                "name": "MVZ Labor",
                "adresse": "Neue Straße 2",
                "bemerkung": "Hauptlabor",
            },
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["id"] == labor_id
        assert updated["name"] == "MVZ Labor"
        assert updated["adresse"] == "Neue Straße 2"
        assert updated["bemerkung"] == "Hauptlabor"


def test_general_target_range_can_be_updated_without_changing_parameter_or_id(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        assert client.post("/api/einheiten", json={"kuerzel": "ng/ml"}).status_code == 201
        parameter_response = client.post(
            "/api/parameter",
            json={
                "anzeigename": "Ferritin",
                "wert_typ_standard": "numerisch",
                "standard_einheit": "ng/ml",
            },
        )
        assert parameter_response.status_code == 201
        parameter_id = parameter_response.json()["id"]

        create_response = client.post(
            f"/api/parameter/{parameter_id}/zielbereiche",
            json={
                "wert_typ": "numerisch",
                "zielbereich_typ": "allgemein",
                "untere_grenze_num": 30,
                "obere_grenze_num": 250,
                "einheit": "ng/ml",
            },
        )
        assert create_response.status_code == 201
        zielbereich_id = create_response.json()["id"]

        update_response = client.patch(
            f"/api/zielbereiche/{zielbereich_id}",
            json={
                "zielbereich_typ": "optimalbereich",
                "untere_grenze_num": 50,
                "obere_grenze_num": 180,
                "einheit": "ng/ml",
                "geschlecht_code": "m",
                "bemerkung": "Nach fachlicher Prüfung angepasst",
            },
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["id"] == zielbereich_id
        assert updated["laborparameter_id"] == parameter_id
        assert updated["wert_typ"] == "numerisch"
        assert updated["zielbereich_typ"] == "optimalbereich"
        assert updated["untere_grenze_num"] == 50
        assert updated["obere_grenze_num"] == 180
        assert updated["geschlecht_code"] == "m"


def test_target_range_can_reference_structured_source(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        assert client.post("/api/einheiten", json={"kuerzel": "ng/ml"}).status_code == 201
        source_response = client.post(
            "/api/zielbereich-quellen",
            json={
                "name": "Dr. med. Helena Orfanos-Boeckel",
                "quellen_typ": "experte",
                "titel": "Nährstoff- und Hormontherapie",
                "jahr": 2026,
            },
        )
        assert source_response.status_code == 201
        source_id = source_response.json()["id"]

        parameter_response = client.post(
            "/api/parameter",
            json={
                "anzeigename": "Vitamin D 25-OH",
                "wert_typ_standard": "numerisch",
                "standard_einheit": "ng/ml",
            },
        )
        assert parameter_response.status_code == 201
        parameter_id = parameter_response.json()["id"]

        target_response = client.post(
            f"/api/parameter/{parameter_id}/zielbereiche",
            json={
                "wert_typ": "numerisch",
                "zielbereich_typ": "optimalbereich",
                "zielbereich_quelle_id": source_id,
                "untere_grenze_num": 50,
                "obere_grenze_num": 70,
                "einheit": "ng/ml",
                "quelle_original_text": "50-70 ng/ml",
                "quelle_stelle": "KSG Tab S15",
            },
        )
        assert target_response.status_code == 201
        target = target_response.json()
        assert target["zielbereich_quelle_id"] == source_id
        assert target["zielbereich_typ"] == "optimalbereich"
        assert target["quelle_original_text"] == "50-70 ng/ml"
        assert target["quelle_stelle"] == "KSG Tab S15"

        list_response = client.get("/api/zielbereich-quellen")
        assert list_response.status_code == 200
        assert list_response.json()[0]["name"] == "Dr. med. Helena Orfanos-Boeckel"
