from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from labordaten_backend.api.deps import get_db
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.main import create_app
from labordaten_backend.models.base import Base
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch


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


def test_faelligkeiten_can_be_filtered_by_due_date_range(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    today = date.today()

    with test_session_factory() as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        included_cyclic_parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            wert_typ_standard="numerisch",
        )
        outside_cyclic_parameter = Laborparameter(
            interner_schluessel="vitamin-d",
            anzeigename="Vitamin D",
            wert_typ_standard="numerisch",
        )
        included_once_parameter = Laborparameter(
            interner_schluessel="b12",
            anzeigename="Vitamin B12",
            wert_typ_standard="numerisch",
        )
        outside_once_parameter = Laborparameter(
            interner_schluessel="zink",
            anzeigename="Zink",
            wert_typ_standard="numerisch",
        )
        undated_once_parameter = Laborparameter(
            interner_schluessel="selen",
            anzeigename="Selen",
            wert_typ_standard="numerisch",
        )
        db.add_all(
            [
                person,
                included_cyclic_parameter,
                outside_cyclic_parameter,
                included_once_parameter,
                outside_once_parameter,
                undated_once_parameter,
            ]
        )
        db.commit()
        for item in [
            person,
            included_cyclic_parameter,
            outside_cyclic_parameter,
            included_once_parameter,
            outside_once_parameter,
            undated_once_parameter,
        ]:
            db.refresh(item)

        db.add_all(
            [
                PlanungZyklisch(
                    person_id=person.id,
                    laborparameter_id=included_cyclic_parameter.id,
                    intervall_wert=30,
                    intervall_typ="tage",
                    startdatum=today - timedelta(days=1),
                    status="aktiv",
                ),
                PlanungZyklisch(
                    person_id=person.id,
                    laborparameter_id=outside_cyclic_parameter.id,
                    intervall_wert=220,
                    intervall_typ="tage",
                    startdatum=today,
                    status="aktiv",
                ),
                PlanungEinmalig(
                    person_id=person.id,
                    laborparameter_id=included_once_parameter.id,
                    status="offen",
                    zieltermin_datum=today + timedelta(days=60),
                ),
                PlanungEinmalig(
                    person_id=person.id,
                    laborparameter_id=outside_once_parameter.id,
                    status="offen",
                    zieltermin_datum=today + timedelta(days=220),
                ),
                PlanungEinmalig(
                    person_id=person.id,
                    laborparameter_id=undated_once_parameter.id,
                    status="offen",
                    zieltermin_datum=None,
                ),
            ]
        )
        db.commit()
        expected_parameter_ids = {included_cyclic_parameter.id, included_once_parameter.id}

    with client:
        response = client.get(
            "/api/planung/faelligkeiten",
            params={
                "datum_von": today.isoformat(),
                "datum_bis": (today + timedelta(days=180)).isoformat(),
            },
        )

    assert response.status_code == 200
    parameter_ids = {item["laborparameter_id"] for item in response.json()}
    assert parameter_ids == expected_parameter_ids


def test_faelligkeiten_reject_invalid_date_range(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    today = date.today()

    with client:
        response = client.get(
            "/api/planung/faelligkeiten",
            params={
                "datum_von": today.isoformat(),
                "datum_bis": (today - timedelta(days=1)).isoformat(),
            },
        )

    assert response.status_code == 400


def test_faelligkeiten_pdf_download_returns_pdf(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    today = date.today()

    with test_session_factory() as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)
        person_id = person.id
        db.add(
            PlanungEinmalig(
                person_id=person_id,
                laborparameter_id=parameter.id,
                status="offen",
                zieltermin_datum=today + timedelta(days=14),
                bemerkung="Vor Arzttermin prüfen",
            )
        )
        db.commit()

    with client:
        response = client.get(
            "/api/planung/faelligkeiten/pdf",
            params={
                "person_id": person_id,
                "datum_von": today.isoformat(),
                "datum_bis": (today + timedelta(days=30)).isoformat(),
            },
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.headers["content-disposition"].startswith('attachment; filename="anstehende_messungen_ludwig_')
    assert response.content.startswith(b"%PDF")
