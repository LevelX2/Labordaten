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


def test_catalog_lists_orfanos_boeckel_package(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        response = client.get("/api/zielwert-paket-katalog")

    assert response.status_code == 200
    packages = response.json()
    assert packages[0]["paket_schluessel"] == "orfanos_boeckel_ksg_2026"
    assert packages[0]["quelle"]["name"] == "Nährstoff- und Hormontherapie - Der Präventions-Leitfaden"
    assert packages[0]["quelle"]["quellen_typ"] == "buch"
    assert packages[0]["eintraege_anzahl"] >= 5
    assert packages[0]["installiert"] is False


def test_lithium_prevention_package_preview_and_install(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        preview_response = client.post(
            "/api/zielwert-paket-katalog/lithium_praevention_biovis_2026/vorschau",
            json={
                "fehlende_parameter_anlegen": True,
                "fehlende_einheiten_anlegen": True,
                "prueffaelle_anlegen": False,
            },
        )

        assert preview_response.status_code == 200
        preview = preview_response.json()
        assert preview["paket"]["name"] == "Präventionswerte Lithium"
        assert preview["paket"]["quelle"]["quellen_typ"] == "labor"
        assert preview["paket"]["eintraege_anzahl"] == 1
        lithium_entry = preview["eintraege"][0]
        assert lithium_entry["parameter_schluessel"] == "lithium_blut"
        assert lithium_entry["untere_grenze_num"] == 25
        assert lithium_entry["obere_grenze_num"] == 350
        assert lithium_entry["einheit"] == "µg/l"

        install_response = client.post(
            "/api/zielwert-paket-katalog/lithium_praevention_biovis_2026/installieren",
            json={
                "fehlende_parameter_anlegen": True,
                "fehlende_einheiten_anlegen": True,
                "prueffaelle_anlegen": False,
            },
        )

        assert install_response.status_code == 201
        install_result = install_response.json()
        assert install_result["angelegte_parameter_anzahl"] == 1
        assert install_result["angelegte_zielbereiche_anzahl"] == 1
        installed_entry = install_result["vorschau"]["eintraege"][0]
        assert installed_entry["aktion"] == "bestehend"
        assert installed_entry["bemerkung"].startswith("Die Quelle trennt den präventivmedizinischen Vollblutbereich")


def test_package_preview_reports_missing_parameters_and_target_direction(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        response = client.post(
            "/api/zielwert-paket-katalog/orfanos_boeckel_ksg_2026/vorschau",
            json={"fehlende_parameter_anlegen": False, "fehlende_einheiten_anlegen": True, "prueffaelle_anlegen": False},
        )

    assert response.status_code == 200
    preview = response.json()
    assert preview["parameter_fehlen_anzahl"] == preview["paket"]["eintraege_anzahl"]
    ages = next(entry for entry in preview["eintraege"] if entry["parameter_schluessel"] == "ages_advanced_glycation_endproducts")
    assert ages["aktion"] == "parameter_fehlt"
    assert ages["zielrichtung"] == "je_niedriger_desto_besser"
    assert ages["obere_grenze_num"] == 50
    assert ages["quelle_stelle"] == "Laborbezug: IMD Berlin"


def test_package_install_creates_source_package_parameters_units_and_is_idempotent(monkeypatch, tmp_path: Path) -> None:
    client = _make_client(monkeypatch, tmp_path)
    with client:
        install_response = client.post(
            "/api/zielwert-paket-katalog/orfanos_boeckel_ksg_2026/installieren",
            json={"fehlende_parameter_anlegen": True, "fehlende_einheiten_anlegen": True, "prueffaelle_anlegen": False},
        )
        assert install_response.status_code == 201
        install_result = install_response.json()
        assert install_result["angelegte_parameter_anzahl"] == install_result["vorschau"]["paket"]["eintraege_anzahl"]
        assert install_result["angelegte_zielbereiche_anzahl"] == install_result["vorschau"]["paket"]["eintraege_anzahl"]
        assert install_result["vorschau"]["bestehend_anzahl"] == install_result["vorschau"]["paket"]["eintraege_anzahl"]

        second_install_response = client.post(
            "/api/zielwert-paket-katalog/orfanos_boeckel_ksg_2026/installieren",
            json={"fehlende_parameter_anlegen": True, "fehlende_einheiten_anlegen": True, "prueffaelle_anlegen": False},
        )
        assert second_install_response.status_code == 201
        second_result = second_install_response.json()
        assert second_result["angelegte_parameter_anzahl"] == 0
        assert second_result["angelegte_zielbereiche_anzahl"] == 0
        assert second_result["uebersprungene_zielbereiche_anzahl"] == second_result["vorschau"]["paket"]["eintraege_anzahl"]

        packages_response = client.get("/api/zielwert-pakete")
        assert packages_response.status_code == 200
        package = packages_response.json()[0]
        assert package["paket_schluessel"] == "orfanos_boeckel_ksg_2026"
        assert package["aktive_zielbereiche_anzahl"] == install_result["vorschau"]["paket"]["eintraege_anzahl"]

        ages_preview = next(
            entry
            for entry in install_result["vorschau"]["eintraege"]
            if entry["parameter_schluessel"] == "ages_advanced_glycation_endproducts"
        )
        ages_targets_response = client.get(f"/api/parameter/{ages_preview['parameter_id']}/zielbereiche")
        assert ages_targets_response.status_code == 200
        ages_target = ages_targets_response.json()[0]
        legacy_patch_response = client.patch(
            f"/api/zielbereiche/{ages_target['id']}",
            json={
                "zielbereich_typ": ages_target["zielbereich_typ"],
                "zielrichtung": ages_target["zielrichtung"],
                "zielbereich_quelle_id": ages_target["zielbereich_quelle_id"],
                "zielwert_paket_id": ages_target["zielwert_paket_id"],
                "untere_grenze_num": ages_target["untere_grenze_num"],
                "obere_grenze_num": ages_target["obere_grenze_num"],
                "einheit": ages_target["einheit"],
                "quelle_original_text": ages_target["quelle_original_text"],
                "quelle_stelle": "KSG-Klassifikation, Tabelle S01",
                "bemerkung": ages_target["bemerkung"],
            },
        )
        assert legacy_patch_response.status_code == 200

        deactivate_response = client.patch(
            f"/api/zielwert-pakete/{package['id']}",
            json={
                "paket_schluessel": package["paket_schluessel"],
                "name": package["name"],
                "zielbereich_quelle_id": package["zielbereich_quelle_id"],
                "version": package["version"],
                "jahr": package["jahr"],
                "beschreibung": package["beschreibung"],
                "bemerkung": package["bemerkung"],
                "aktiv": False,
            },
        )
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["aktive_zielbereiche_anzahl"] == 0

        reactivate_response = client.post(
            "/api/zielwert-paket-katalog/orfanos_boeckel_ksg_2026/installieren",
            json={"fehlende_parameter_anlegen": True, "fehlende_einheiten_anlegen": True, "prueffaelle_anlegen": False},
        )
        assert reactivate_response.status_code == 201
        assert reactivate_response.json()["reaktivierte_zielbereiche_anzahl"] == install_result["vorschau"]["paket"]["eintraege_anzahl"]
        updated_ages_targets_response = client.get(f"/api/parameter/{ages_preview['parameter_id']}/zielbereiche")
        assert updated_ages_targets_response.status_code == 200
        updated_ages_targets = updated_ages_targets_response.json()
        assert len(updated_ages_targets) == 1
        assert updated_ages_targets[0]["quelle_stelle"] == "Laborbezug: IMD Berlin"
