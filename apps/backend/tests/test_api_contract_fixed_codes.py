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
                "blutgruppe": "0",
                "rhesusfaktor": "negativ",
                "hinweise_allgemein": None,
            },
        )

        assert response.status_code == 201
        assert response.json()["geschlecht_code"] == "w"
        assert response.json()["blutgruppe"] == "0"
        assert response.json()["rhesusfaktor"] == "negativ"

        invalid_response = client.post(
            "/api/personen",
            json={
                "anzeigename": "Ludwig 2",
                "geburtsdatum": "1964-01-12",
                "geschlecht_code": "Männlich",
            },
        )

        assert invalid_response.status_code == 422

        invalid_blood_group_response = client.post(
            "/api/personen",
            json={
                "anzeigename": "Ludwig 3",
                "geburtsdatum": "1964-01-12",
                "geschlecht_code": "m",
                "blutgruppe": "A positiv",
                "rhesusfaktor": "+",
            },
        )

        assert invalid_blood_group_response.status_code == 422


def test_date_range_filters_reject_bis_before_von(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    invalid_range = {"datum_von": "2026-04-26", "datum_bis": "2026-04-25"}
    payload = {"person_ids": ["person-1"], **invalid_range}

    with client:
        responses = [
            client.get("/api/messwerte", params=invalid_range),
            client.post("/api/auswertung/verlauf", json=payload),
            client.post("/api/berichte/arztbericht-vorschau", json=payload),
            client.post("/api/berichte/verlauf-vorschau", json=payload),
            client.post("/api/berichte/arztbericht-pdf", json=payload),
            client.post("/api/berichte/verlauf-pdf", json=payload),
        ]

    assert [response.status_code for response in responses] == [400, 400, 400, 400, 400, 400]
    assert all(response.json()["detail"] == "Das Bis-Datum darf nicht vor dem Von-Datum liegen." for response in responses)


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
                "untere_grenze_operator": "groesser_als",
                "obere_grenze_num": 48,
                "obere_grenze_operator": "kleiner_gleich",
                "einheit": "ng/ml",
                "geschlecht_code": "w",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["referenz_typ"] == "labor"
        assert body["geschlecht_code"] == "w"
        assert body["untere_grenze_operator"] == "groesser_als"
        assert body["obere_grenze_operator"] == "kleiner_gleich"

        invalid_response = client.post(
            f"/api/messwerte/{messwert_id}/referenzen",
            json={
                "referenz_typ": "extern",
                "wert_typ": "numerisch",
                "untere_grenze_num": 12,
                "untere_grenze_operator": "exakt",
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
                "zielbereich_typ": "optimalbereich",
                "untere_grenze_num": 15,
                "obere_grenze_num": 150,
                "einheit": "ng/ml",
                "geschlecht_code": "d",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["wert_typ"] == "numerisch"
        assert body["zielbereich_typ"] == "optimalbereich"
        assert body["geschlecht_code"] == "d"

        invalid_response = client.post(
            f"/api/parameter/{parameter_id}/zielbereiche",
            json={
                "wert_typ": "zahl",
                "zielbereich_typ": "wunschbereich",
                "untere_grenze_num": 15,
                "einheit": "ng/ml",
                "geschlecht_code": "Divers",
            },
        )

        assert invalid_response.status_code == 422


def test_parameter_api_supports_primary_and_additional_ksg_classifications(monkeypatch, tmp_path: Path) -> None:
    client, _ = _make_client(monkeypatch, tmp_path)
    with client:
        response = client.post(
            "/api/parameter",
            json={
                "anzeigename": "Vitamin D",
                "wert_typ_standard": "numerisch",
                "primaere_klassifikation": "gesundmachwert",
            },
        )

        assert response.status_code == 201
        parameter = response.json()
        assert parameter["primaere_klassifikation"] == "gesundmachwert"

        update_response = client.patch(
            f"/api/parameter/{parameter['id']}/primaere-klassifikation",
            json={"primaere_klassifikation": "schluesselwert"},
        )

        assert update_response.status_code == 200
        assert update_response.json()["primaere_klassifikation"] == "schluesselwert"

        additional_response = client.post(
            f"/api/parameter/{parameter['id']}/klassifikationen",
            json={
                "klassifikation": "krankwert",
                "kontext_beschreibung": "Schwerer Mangel oder Überversorgung",
                "begruendung": "Mehrfachrolle aus KSG-Systematik",
            },
        )

        assert additional_response.status_code == 201
        additional = additional_response.json()
        assert additional["klassifikation"] == "krankwert"

        list_response = client.get(f"/api/parameter/{parameter['id']}/klassifikationen")
        assert list_response.status_code == 200
        assert [item["klassifikation"] for item in list_response.json()] == ["krankwert"]

        invalid_response = client.post(
            f"/api/parameter/{parameter['id']}/klassifikationen",
            json={"klassifikation": "diagnosewert"},
        )
        assert invalid_response.status_code == 422


def test_list_messwerte_api_supports_multilevel_sorting(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person_anna = Person(anzeigename="Anna", geburtsdatum=date(1980, 1, 1), geschlecht_code="w")
        person_berta = Person(anzeigename="Berta", geburtsdatum=date(1982, 1, 1), geschlecht_code="w")
        parameter_crp = Laborparameter(
            interner_schluessel="crp",
            anzeigename="CRP",
            wert_typ_standard="numerisch",
            primaere_klassifikation="krankwert",
        )
        parameter_ferritin = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            wert_typ_standard="numerisch",
            primaere_klassifikation="schluesselwert",
        )
        db.add_all([person_anna, person_berta, parameter_crp, parameter_ferritin])
        db.commit()
        db.refresh(person_anna)
        db.refresh(person_berta)
        db.refresh(parameter_crp)
        db.refresh(parameter_ferritin)

        befund_anna_neu = Befund(person_id=person_anna.id, entnahmedatum=date(2026, 4, 22), quelle_typ="manuell")
        befund_anna_alt = Befund(person_id=person_anna.id, entnahmedatum=date(2026, 4, 20), quelle_typ="manuell")
        befund_berta = Befund(person_id=person_berta.id, entnahmedatum=date(2026, 4, 23), quelle_typ="manuell")
        db.add_all([befund_anna_neu, befund_anna_alt, befund_berta])
        db.commit()
        db.refresh(befund_anna_neu)
        db.refresh(befund_anna_alt)
        db.refresh(befund_berta)

        db.add_all(
            [
                Messwert(
                    person_id=person_anna.id,
                    befund_id=befund_anna_neu.id,
                    laborparameter_id=parameter_ferritin.id,
                    original_parametername="Ferritin",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="41",
                    wert_num=41.0,
                ),
                Messwert(
                    person_id=person_anna.id,
                    befund_id=befund_anna_alt.id,
                    laborparameter_id=parameter_crp.id,
                    original_parametername="CRP",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="5",
                    wert_num=5.0,
                ),
                Messwert(
                    person_id=person_berta.id,
                    befund_id=befund_berta.id,
                    laborparameter_id=parameter_crp.id,
                    original_parametername="CRP",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="8",
                    wert_num=8.0,
                ),
            ]
        )
        db.commit()

    with client:
        response = client.get(
            "/api/messwerte",
            params=[
                ("sort", "person:asc"),
                ("sort", "entnahmedatum:desc"),
                ("sort", "parameter:asc"),
            ],
        )

        assert response.status_code == 200
        body = response.json()
        assert [(item["person_anzeigename"], item["parameter_anzeigename"]) for item in body] == [
            ("Anna", "Ferritin"),
            ("Anna", "CRP"),
            ("Berta", "CRP"),
        ]
        assert [item["parameter_primaere_klassifikation"] for item in body] == [
            "schluesselwert",
            "krankwert",
            "krankwert",
        ]

        ksg_response = client.get("/api/messwerte", params={"klassifikationen": "krankwert"})
        assert ksg_response.status_code == 200
        assert [item["parameter_anzeigename"] for item in ksg_response.json()] == ["CRP", "CRP"]

        invalid_ksg_response = client.get("/api/messwerte", params={"klassifikationen": "freitext"})
        assert invalid_ksg_response.status_code == 400

        invalid_response = client.get("/api/messwerte", params={"sort": "wert:desc"})
        assert invalid_response.status_code == 400
