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


def _make_client(monkeypatch, tmp_path: Path) -> tuple[TestClient, sessionmaker[Session]]:
    runtime_store = _DummyRuntimeSettingsStore(tmp_path)
    monkeypatch.setattr("labordaten_backend.main.get_runtime_settings_store", lambda: runtime_store)
    monkeypatch.setattr(
        "labordaten_backend.modules.wissensbasis.service.get_runtime_settings_store",
        lambda: runtime_store,
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
    client = TestClient(app)
    return client, test_session_factory


def test_create_wissensseite_writes_markdown_inside_knowledge_root(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        response = client.post(
            "/api/wissensbasis/seiten",
            json={
                "pfad_relativ": "02 Wissen/Parameter/Ferritin.md",
                "titel": "Ferritin",
                "inhalt_markdown": "Speicherform des Eisens.",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["pfad_relativ"] == "02 Wissen/Parameter/Ferritin.md"
        assert body["titel"] == "Ferritin"
        assert "# Ferritin" in (tmp_path / "knowledge" / "02 Wissen" / "Parameter" / "Ferritin.md").read_text(
            encoding="utf-8"
        )

        traversal_response = client.post(
            "/api/wissensbasis/seiten",
            json={"pfad_relativ": "../nicht-erlaubt.md", "titel": "Nicht erlaubt"},
        )
        assert traversal_response.status_code == 400


def test_parameter_can_link_to_wissensseite(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        page_response = client.post(
            "/api/wissensbasis/seiten",
            json={"pfad_relativ": "02 Wissen/Parameter/CRP.md", "titel": "CRP"},
        )
        assert page_response.status_code == 201

        parameter_response = client.post(
            "/api/parameter",
            json={"anzeigename": "CRP", "wert_typ_standard": "numerisch"},
        )
        assert parameter_response.status_code == 201
        parameter_id = parameter_response.json()["id"]

        link_response = client.patch(
            f"/api/parameter/{parameter_id}/wissensseite",
            json={"pfad_relativ": "02 Wissen/Parameter/CRP.md"},
        )
        assert link_response.status_code == 200
        assert link_response.json()["wissensseite_pfad_relativ"] == "02 Wissen/Parameter/CRP.md"

        detail_response = client.get(f"/api/parameter/{parameter_id}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["wissensseite_pfad_relativ"] == "02 Wissen/Parameter/CRP.md"
        assert detail["wissensseite_titel"] == "CRP"


def test_parameter_create_api_auto_creates_fachwissen_page(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        parameter_response = client.post(
            "/api/parameter",
            json={
                "anzeigename": "Ferritin",
                "beschreibung": "Ferritin beschreibt die Eisenspeicher.",
                "wert_typ_standard": "numerisch",
                "standard_einheit": None,
                "primaere_klassifikation": "schluesselwert",
            },
        )
        assert parameter_response.status_code == 201
        parameter = parameter_response.json()
        assert parameter["wissensseite_pfad_relativ"] == "02 Parameter/Allgemein/Ferritin.md"
        assert parameter["wissensseite_titel"] == "Ferritin"

        page_path = tmp_path / "knowledge" / "02 Parameter" / "Allgemein" / "Ferritin.md"
        assert page_path.exists()
        content = page_path.read_text(encoding="utf-8")
        assert "# Ferritin" in content
        assert "Ferritin beschreibt die Eisenspeicher." in content
        assert "- Primär: schluesselwert" in content


def test_delete_wissensseite_removes_unlinked_markdown(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        create_response = client.post(
            "/api/wissensbasis/seiten",
            json={"pfad_relativ": "02 Wissen/Parameter/Unverknuepft.md", "titel": "Unverknüpft"},
        )
        assert create_response.status_code == 201

        delete_response = client.delete(
            "/api/wissensbasis/seiten",
            params={"pfad_relativ": "02 Wissen/Parameter/Unverknuepft.md"},
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["geloescht"] is True
        assert not (tmp_path / "knowledge" / "02 Wissen" / "Parameter" / "Unverknuepft.md").exists()


def test_delete_wissensseite_blocks_raw_sources_and_parameter_links(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        raw_dir = tmp_path / "knowledge" / "01 Rohquellen"
        raw_dir.mkdir(parents=True)
        (raw_dir / "Quelle.md").write_text("# Quelle\n", encoding="utf-8")

        raw_delete_response = client.delete(
            "/api/wissensbasis/seiten",
            params={"pfad_relativ": "01 Rohquellen/Quelle.md"},
        )
        assert raw_delete_response.status_code == 400
        assert (raw_dir / "Quelle.md").exists()

        raw_detail_response = client.get(
            "/api/wissensbasis/detail",
            params={"pfad_relativ": "01 Rohquellen/Quelle.md"},
        )
        assert raw_detail_response.status_code == 200
        assert raw_detail_response.json()["loeschbar"] is False

        page_response = client.post(
            "/api/wissensbasis/seiten",
            json={"pfad_relativ": "02 Wissen/Parameter/Ferritin.md", "titel": "Ferritin"},
        )
        assert page_response.status_code == 201
        parameter_response = client.post(
            "/api/parameter",
            json={"anzeigename": "Ferritin", "wert_typ_standard": "numerisch"},
        )
        assert parameter_response.status_code == 201
        parameter_id = parameter_response.json()["id"]
        link_response = client.patch(
            f"/api/parameter/{parameter_id}/wissensseite",
            json={"pfad_relativ": "02 Wissen/Parameter/Ferritin.md"},
        )
        assert link_response.status_code == 200

        linked_delete_response = client.delete(
            "/api/wissensbasis/seiten",
            params={"pfad_relativ": "02 Wissen/Parameter/Ferritin.md"},
        )
        assert linked_delete_response.status_code == 400
        assert (tmp_path / "knowledge" / "02 Wissen" / "Parameter" / "Ferritin.md").exists()

        linked_detail_response = client.get(
            "/api/wissensbasis/detail",
            params={"pfad_relativ": "02 Wissen/Parameter/Ferritin.md"},
        )
        assert linked_detail_response.status_code == 200
        linked_detail = linked_detail_response.json()
        assert linked_detail["loeschbar"] is False
        assert "Ferritin" in linked_detail["loesch_sperrgrund"]
