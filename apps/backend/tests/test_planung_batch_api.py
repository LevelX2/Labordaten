from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
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


def _seed_person_and_parameters(
    db: Session,
) -> tuple[Person, Laborparameter, Laborparameter]:
    person = Person(anzeigename="Laura", geburtsdatum=date(1990, 1, 1))
    ferritin = Laborparameter(
        interner_schluessel="ferritin",
        anzeigename="Ferritin",
        wert_typ_standard="numerisch",
    )
    vitamin_d = Laborparameter(
        interner_schluessel="vitamin_d",
        anzeigename="Vitamin D",
        wert_typ_standard="numerisch",
    )
    db.add_all([person, ferritin, vitamin_d])
    db.commit()
    db.refresh(person)
    db.refresh(ferritin)
    db.refresh(vitamin_d)
    return person, ferritin, vitamin_d


def test_cyclic_planning_batch_creates_individual_plans(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person, ferritin, vitamin_d = _seed_person_and_parameters(db)

    with client:
        response = client.post(
            "/api/planung/zyklisch/batch",
            json={
                "person_id": person.id,
                "laborparameter_ids": [ferritin.id, vitamin_d.id],
                "intervall_wert": 6,
                "intervall_typ": "monate",
                "startdatum": "2026-04-26",
                "karenz_tage": 30,
                "bemerkung": "Halbjährlich kontrollieren",
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert [item["laborparameter_id"] for item in body] == [ferritin.id, vitamin_d.id]
    assert {item["faelligkeitsstatus"] for item in body} == {"geplant"}

    with test_session_factory() as db:
        rows = list(db.scalars(select(PlanungZyklisch).order_by(PlanungZyklisch.laborparameter_id)))
        assert len(rows) == 2
        assert {row.laborparameter_id for row in rows} == {ferritin.id, vitamin_d.id}


def test_cyclic_planning_batch_rejects_duplicates_without_partial_insert(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person, ferritin, vitamin_d = _seed_person_and_parameters(db)
        person_id = person.id
        ferritin_id = ferritin.id
        vitamin_d_id = vitamin_d.id
        db.add(
            PlanungZyklisch(
                person_id=person_id,
                laborparameter_id=ferritin_id,
                intervall_wert=3,
                intervall_typ="monate",
                startdatum=date(2026, 1, 1),
                status="aktiv",
            )
        )
        db.commit()

    with client:
        response = client.post(
            "/api/planung/zyklisch/batch",
            json={
                "person_id": person_id,
                "laborparameter_ids": [ferritin_id, vitamin_d_id],
                "intervall_wert": 6,
                "intervall_typ": "monate",
                "startdatum": "2026-04-26",
            },
        )

    assert response.status_code == 400
    assert "bereits eine aktive zyklische Planung" in response.json()["detail"]

    with test_session_factory() as db:
        rows = list(db.scalars(select(PlanungZyklisch)))
        assert len(rows) == 1
        assert rows[0].laborparameter_id == ferritin_id


def test_one_time_planning_batch_creates_individual_reminders(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person, ferritin, vitamin_d = _seed_person_and_parameters(db)

    with client:
        response = client.post(
            "/api/planung/einmalig/batch",
            json={
                "person_id": person.id,
                "laborparameter_ids": [ferritin.id, vitamin_d.id],
                "status": "naechster_termin",
                "zieltermin_datum": "2026-10-26",
                "bemerkung": "Beim nächsten Termin mitnehmen",
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert [item["laborparameter_id"] for item in body] == [ferritin.id, vitamin_d.id]
    assert {item["status"] for item in body} == {"naechster_termin"}

    with test_session_factory() as db:
        rows = list(db.scalars(select(PlanungEinmalig)))
        assert len(rows) == 2
        assert {row.laborparameter_id for row in rows} == {ferritin.id, vitamin_d.id}
