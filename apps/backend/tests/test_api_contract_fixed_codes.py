from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from labordaten_backend.api.deps import get_db
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.main import create_app
from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person


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


def test_create_person_api_accepts_fixed_gender_codes_and_rejects_free_text(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        response = client.post(
            "/api/personen",
            json={
                "anzeigename": "Ludwig",
                "geburtsdatum": "1964-01-12",
                "geschlecht_code": "w",
                "hinweise_allgemein": None,
            },
        )

        assert response.status_code == 201
        assert response.json()["geschlecht_code"] == "w"

        invalid_response = client.post(
            "/api/personen",
            json={
                "anzeigename": "Ludwig 2",
                "geburtsdatum": "1964-01-12",
                "geschlecht_code": "Männlich",
            },
        )

        assert invalid_response.status_code == 422


def test_create_referenz_api_enforces_fixed_value_and_gender_codes(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add(Einheit(kuerzel="ng/ml"))
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code="m")
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)

        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)

        messwert = Messwert(
            person_id=person.id,
            befund_id=befund.id,
            laborparameter_id=parameter.id,
            original_parametername="Ferritin",
            wert_typ="numerisch",
            wert_operator="exakt",
            wert_roh_text="41",
            wert_num=41.0,
            einheit_original="ng/ml",
        )
        db.add(messwert)
        db.commit()
        db.refresh(messwert)
        messwert_id = messwert.id

    with client:
        response = client.post(
            f"/api/messwerte/{messwert_id}/referenzen",
            json={
                "referenz_typ": "labor",
                "wert_typ": "numerisch",
                "untere_grenze_num": 12,
                "obere_grenze_num": 48,
                "einheit": "ng/ml",
                "geschlecht_code": "w",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["referenz_typ"] == "labor"
        assert body["geschlecht_code"] == "w"

        invalid_response = client.post(
            f"/api/messwerte/{messwert_id}/referenzen",
            json={
                "referenz_typ": "extern",
                "wert_typ": "numerisch",
                "untere_grenze_num": 12,
                "einheit": "ng/ml",
                "geschlecht_code": "M",
            },
        )

        assert invalid_response.status_code == 422


def test_create_zielbereich_api_enforces_fixed_value_and_gender_codes(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add(Einheit(kuerzel="ng/ml"))
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        db.add(parameter)
        db.commit()
        db.refresh(parameter)
        parameter_id = parameter.id

    with client:
        response = client.post(
            f"/api/parameter/{parameter_id}/zielbereiche",
            json={
                "wert_typ": "numerisch",
                "untere_grenze_num": 15,
                "obere_grenze_num": 150,
                "einheit": "ng/ml",
                "geschlecht_code": "d",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["wert_typ"] == "numerisch"
        assert body["geschlecht_code"] == "d"

        invalid_response = client.post(
            f"/api/parameter/{parameter_id}/zielbereiche",
            json={
                "wert_typ": "zahl",
                "untere_grenze_num": 15,
                "einheit": "ng/ml",
                "geschlecht_code": "Divers",
            },
        )

        assert invalid_response.status_code == 422
