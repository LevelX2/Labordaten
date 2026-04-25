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
from labordaten_backend.models.dokument import Dokument


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
    client = TestClient(app)
    return client, test_session_factory


def test_document_content_endpoint_serves_inline_pdf(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)

    documents_root = tmp_path / "documents" / "importquelle" / "2026" / "04"
    documents_root.mkdir(parents=True, exist_ok=True)
    document_file = documents_root / "20260423_testbefund.pdf"
    document_file.write_bytes(b"%PDF-1.4\nTestdokument")

    with test_session_factory() as db:
        dokument = Dokument(
            dokument_typ="importquelle",
            pfad_relativ="importquelle/2026/04/20260423_testbefund.pdf",
            pfad_absolut=str(document_file.resolve()),
            dateiname="Testbefund.pdf",
            mime_typ="application/pdf",
            originalquelle_behalten=True,
        )
        db.add(dokument)
        db.commit()
        db.refresh(dokument)
        dokument_id = dokument.id

    with client:
        response = client.get(f"/api/dokumente/{dokument_id}/inhalt")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/pdf")
        assert response.headers["content-disposition"] == 'inline; filename="Testbefund.pdf"'
        assert response.content == b"%PDF-1.4\nTestdokument"


def test_document_content_endpoint_can_force_download(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)

    documents_root = tmp_path / "documents"
    documents_root.mkdir(parents=True, exist_ok=True)
    document_file = documents_root / "werteliste.csv"
    document_file.write_text("parameter,wert\nFerritin,41\n", encoding="utf-8")

    with test_session_factory() as db:
        dokument = Dokument(
            dokument_typ="importquelle",
            pfad_relativ="werteliste.csv",
            pfad_absolut=str(document_file.resolve()),
            dateiname="werteliste.csv",
            mime_typ="text/csv",
            originalquelle_behalten=True,
        )
        db.add(dokument)
        db.commit()
        db.refresh(dokument)
        dokument_id = dokument.id

    with client:
        response = client.get(f"/api/dokumente/{dokument_id}/inhalt?download=true")
        assert response.status_code == 200
        assert response.headers["content-disposition"] == 'attachment; filename="werteliste.csv"'
