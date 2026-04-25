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
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.models.import_pruefpunkt import ImportPruefpunkt
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.parameter_umrechnungsregel import ParameterUmrechnungsregel
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_person_override import ZielbereichPersonOverride


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


def test_person_without_dependencies_is_directly_deletable(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person = Person(anzeigename="Anna", geburtsdatum=date(1990, 4, 2))
        db.add(person)
        db.commit()
        db.refresh(person)
        person_id = person.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/person/{person_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "direkt"
        assert body["empfehlung"] == "loeschen"

        ausfuehrung = client.post(f"/api/loeschpruefung/person/{person_id}/ausfuehren", json={"aktion": "loeschen"})
        assert ausfuehrung.status_code == 200

    with test_session_factory() as db:
        assert db.get(Person, person_id) is None


def test_person_with_history_is_blocked_but_can_be_deactivated(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person = Person(anzeigename="Ben", geburtsdatum=date(1985, 5, 20))
        db.add(person)
        db.commit()
        db.refresh(person)
        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        person_id = person.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/person/{person_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "blockiert"
        assert body["empfehlung"] == "deaktivieren"

        blocked_delete = client.post(f"/api/loeschpruefung/person/{person_id}/ausfuehren", json={"aktion": "loeschen"})
        assert blocked_delete.status_code == 400

        deaktivieren = client.post(
            f"/api/loeschpruefung/person/{person_id}/ausfuehren",
            json={"aktion": "deaktivieren"},
        )
        assert deaktivieren.status_code == 200

    with test_session_factory() as db:
        refreshed = db.get(Person, person_id)
        assert refreshed is not None
        assert refreshed.aktiv is False


def test_delete_messwert_repairs_planning_and_removes_empty_befund(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        einheit = Einheit(kuerzel="ng/ml")
        person = Person(anzeigename="Clara", geburtsdatum=date(1992, 7, 8))
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        db.add_all([einheit, person, parameter])
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

        referenz = MesswertReferenz(
            messwert_id=messwert.id,
            referenz_typ="labor",
            wert_typ="numerisch",
            untere_grenze_num=12.0,
            obere_grenze_num=48.0,
            einheit="ng/ml",
        )
        zyklisch = PlanungZyklisch(
            person_id=person.id,
            laborparameter_id=parameter.id,
            intervall_wert=6,
            intervall_typ="monate",
            startdatum=date(2026, 1, 1),
            status="aktiv",
            karenz_tage=7,
            letzte_relevante_messung_id=messwert.id,
            naechste_faelligkeit=date(2026, 10, 21),
        )
        einmalig = PlanungEinmalig(
            person_id=person.id,
            laborparameter_id=parameter.id,
            status="erledigt",
            erledigt_durch_messwert_id=messwert.id,
            zieltermin_datum=date(2026, 4, 22),
        )
        db.add_all([referenz, zyklisch, einmalig])
        db.commit()
        messwert_id = messwert.id
        befund_id = befund.id
        zyklisch_id = zyklisch.id
        einmalig_id = einmalig.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/messwert/{messwert_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "kaskade"
        assert body["optionen"]["leeren_befund_mitloeschen_standard"] is True

        ausfuehrung = client.post(f"/api/loeschpruefung/messwert/{messwert_id}/ausfuehren", json={"aktion": "loeschen"})
        assert ausfuehrung.status_code == 200
        result = ausfuehrung.json()
        deleted_types = {item["objekt_typ"] for item in result["geloeschte_objekte"]}
        updated_types = {item["objekt_typ"] for item in result["aktualisierte_objekte"]}
        assert {"messwert", "messwert_referenz", "befund"} <= deleted_types
        assert {"planung_zyklisch", "planung_einmalig"} <= updated_types

    with test_session_factory() as db:
        assert db.get(Messwert, messwert_id) is None
        assert db.get(Befund, befund_id) is None
        assert db.scalar(select(MesswertReferenz).where(MesswertReferenz.messwert_id == messwert_id)) is None
        refreshed_zyklisch = db.get(PlanungZyklisch, zyklisch_id)
        refreshed_einmalig = db.get(PlanungEinmalig, einmalig_id)
        assert refreshed_zyklisch is not None
        assert refreshed_zyklisch.letzte_relevante_messung_id is None
        assert refreshed_einmalig is not None
        assert refreshed_einmalig.erledigt_durch_messwert_id is None
        assert refreshed_einmalig.status == "offen"


def test_importvorgang_with_imported_data_is_blocked(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person = Person(anzeigename="Dora", geburtsdatum=date(1988, 3, 14))
        importvorgang = Importvorgang(quelle_typ="json", status="uebernommen")
        db.add_all([person, importvorgang])
        db.commit()
        db.refresh(person)
        db.refresh(importvorgang)

        befund = Befund(
            person_id=person.id,
            entnahmedatum=date(2026, 4, 21),
            quelle_typ="import",
            importvorgang_id=importvorgang.id,
        )
        db.add(befund)
        db.commit()
        import_id = importvorgang.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/importvorgang/{import_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "blockiert"
        assert body["empfehlung"] == "nicht_loeschen"

        blocked_delete = client.post(
            f"/api/loeschpruefung/importvorgang/{import_id}/ausfuehren",
            json={"aktion": "loeschen"},
        )
        assert blocked_delete.status_code == 400


def test_used_unit_is_blocked_and_unused_unit_with_alias_can_be_deleted(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        used_unit = Einheit(kuerzel="mg/dl")
        deletable_unit = Einheit(kuerzel="ug/l")
        db.add_all([used_unit, deletable_unit])
        db.commit()
        db.refresh(used_unit)
        db.refresh(deletable_unit)
        parameter = Laborparameter(
            interner_schluessel="glukose",
            anzeigename="Glukose",
            standard_einheit="mg/dl",
            wert_typ_standard="numerisch",
        )
        alias = EinheitAlias(
            einheit_id=deletable_unit.id,
            alias_text="µg/l",
            alias_normalisiert="ug/l",
        )
        db.add_all([parameter, alias])
        db.commit()
        used_unit_id = used_unit.id
        deletable_unit_id = deletable_unit.id

    with client:
        used_pruefung = client.get(f"/api/loeschpruefung/einheit/{used_unit_id}")
        assert used_pruefung.status_code == 200
        used_body = used_pruefung.json()
        assert used_body["modus"] == "blockiert"
        assert used_body["empfehlung"] == "deaktivieren"

        deletable_pruefung = client.get(f"/api/loeschpruefung/einheit/{deletable_unit_id}")
        assert deletable_pruefung.status_code == 200
        deletable_body = deletable_pruefung.json()
        assert deletable_body["modus"] == "kaskade"

        delete_response = client.post(
            f"/api/loeschpruefung/einheit/{deletable_unit_id}/ausfuehren",
            json={"aktion": "loeschen"},
        )
        assert delete_response.status_code == 200

    with test_session_factory() as db:
        assert db.get(Einheit, deletable_unit_id) is None
        assert db.scalar(select(EinheitAlias).where(EinheitAlias.einheit_id == deletable_unit_id)) is None


def test_used_labor_is_blocked_and_can_be_deactivated(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        labor = Labor(name="MVZ Labor")
        person = Person(anzeigename="Eva", geburtsdatum=date(1991, 11, 3))
        db.add_all([labor, person])
        db.commit()
        db.refresh(labor)
        db.refresh(person)
        db.add(Befund(person_id=person.id, labor_id=labor.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell"))
        db.commit()
        labor_id = labor.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/labor/{labor_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "blockiert"
        assert body["empfehlung"] == "deaktivieren"

        deaktivieren = client.post(f"/api/loeschpruefung/labor/{labor_id}/ausfuehren", json={"aktion": "deaktivieren"})
        assert deaktivieren.status_code == 200

    with test_session_factory() as db:
        labor = db.get(Labor, labor_id)
        assert labor is not None
        assert labor.aktiv is False


def test_unused_parameter_with_children_is_deleted_cascading(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add_all([Einheit(kuerzel="ng/ml"), Einheit(kuerzel="nmol/l")])
        db.commit()
        parameter = Laborparameter(
            interner_schluessel="vitamin_d",
            anzeigename="Vitamin D",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        gruppe = ParameterGruppe(name="Vitamine")
        db.add_all([parameter, gruppe])
        db.commit()
        db.refresh(parameter)
        db.refresh(gruppe)

        zielbereich = Zielbereich(
            laborparameter_id=parameter.id,
            wert_typ="numerisch",
            untere_grenze_num=30.0,
            obere_grenze_num=100.0,
            einheit="ng/ml",
        )
        db.add_all(
            [
                LaborparameterAlias(
                    laborparameter_id=parameter.id,
                    alias_text="25 OH Vitamin D",
                    alias_normalisiert="25ohvitamind",
                ),
                ParameterUmrechnungsregel(
                    laborparameter_id=parameter.id,
                    von_einheit="ng/ml",
                    nach_einheit="nmol/l",
                    regel_typ="faktor",
                    faktor=2.5,
                ),
                GruppenParameter(parameter_gruppe_id=gruppe.id, laborparameter_id=parameter.id),
                zielbereich,
            ]
        )
        db.commit()
        db.refresh(zielbereich)
        person = Person(anzeigename="Finn", geburtsdatum=date(1993, 6, 2))
        db.add(person)
        db.commit()
        db.refresh(person)
        db.add(
            ZielbereichPersonOverride(
                person_id=person.id,
                zielbereich_id=zielbereich.id,
                untere_grenze_num=35.0,
                obere_grenze_num=90.0,
                einheit="ng/ml",
            )
        )
        db.commit()
        parameter_id = parameter.id
        zielbereich_id = zielbereich.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/laborparameter/{parameter_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "kaskade"

        ausfuehrung = client.post(f"/api/loeschpruefung/laborparameter/{parameter_id}/ausfuehren", json={"aktion": "loeschen"})
        assert ausfuehrung.status_code == 200
        deleted_types = {item["objekt_typ"] for item in ausfuehrung.json()["geloeschte_objekte"]}
        assert {
            "laborparameter",
            "laborparameter_alias",
            "parameter_umrechnungsregel",
            "gruppen_parameter",
            "zielbereich",
            "zielbereich_person_override",
        } <= deleted_types

    with test_session_factory() as db:
        assert db.get(Laborparameter, parameter_id) is None
        assert db.scalar(select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == parameter_id)) is None
        assert db.scalar(select(ParameterUmrechnungsregel).where(ParameterUmrechnungsregel.laborparameter_id == parameter_id)) is None
        assert db.scalar(select(GruppenParameter).where(GruppenParameter.laborparameter_id == parameter_id)) is None
        assert db.get(Zielbereich, zielbereich_id) is None
        assert db.scalar(select(ZielbereichPersonOverride).where(ZielbereichPersonOverride.zielbereich_id == zielbereich_id)) is None


def test_used_parameter_is_blocked_and_can_be_deactivated(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add(Einheit(kuerzel="mg/dl"))
        person = Person(anzeigename="Gina", geburtsdatum=date(1990, 8, 17))
        parameter = Laborparameter(
            interner_schluessel="glukose",
            anzeigename="Glukose",
            standard_einheit="mg/dl",
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
        db.add(
            Messwert(
                person_id=person.id,
                befund_id=befund.id,
                laborparameter_id=parameter.id,
                original_parametername="Glukose",
                wert_typ="numerisch",
                wert_operator="exakt",
                wert_roh_text="88",
                wert_num=88.0,
                einheit_original="mg/dl",
            )
        )
        db.commit()
        parameter_id = parameter.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/laborparameter/{parameter_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "blockiert"
        assert body["empfehlung"] == "deaktivieren"

        deaktivieren = client.post(
            f"/api/loeschpruefung/laborparameter/{parameter_id}/ausfuehren",
            json={"aktion": "deaktivieren"},
        )
        assert deaktivieren.status_code == 200

    with test_session_factory() as db:
        parameter = db.get(Laborparameter, parameter_id)
        assert parameter is not None
        assert parameter.aktiv is False


def test_group_and_target_range_delete_cascade_children(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add(Einheit(kuerzel="ng/ml"))
        db.commit()
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        gruppe = ParameterGruppe(name="Mineralstoffe")
        person = Person(anzeigename="Hanna", geburtsdatum=date(1987, 2, 9))
        db.add_all([parameter, gruppe, person])
        db.commit()
        db.refresh(parameter)
        db.refresh(gruppe)
        db.refresh(person)
        db.add(GruppenParameter(parameter_gruppe_id=gruppe.id, laborparameter_id=parameter.id))
        zielbereich = Zielbereich(
            laborparameter_id=parameter.id,
            wert_typ="numerisch",
            untere_grenze_num=20.0,
            obere_grenze_num=200.0,
            einheit="ng/ml",
        )
        db.add(zielbereich)
        db.commit()
        db.refresh(zielbereich)
        db.add(
            ZielbereichPersonOverride(
                person_id=person.id,
                zielbereich_id=zielbereich.id,
                untere_grenze_num=25.0,
                obere_grenze_num=180.0,
                einheit="ng/ml",
            )
        )
        db.commit()
        gruppe_id = gruppe.id
        zielbereich_id = zielbereich.id

    with client:
        gruppe_pruefung = client.get(f"/api/loeschpruefung/parameter_gruppe/{gruppe_id}")
        assert gruppe_pruefung.status_code == 200
        assert gruppe_pruefung.json()["modus"] == "kaskade"
        gruppe_delete = client.post(f"/api/loeschpruefung/parameter_gruppe/{gruppe_id}/ausfuehren", json={"aktion": "loeschen"})
        assert gruppe_delete.status_code == 200

        zielbereich_pruefung = client.get(f"/api/loeschpruefung/zielbereich/{zielbereich_id}")
        assert zielbereich_pruefung.status_code == 200
        assert zielbereich_pruefung.json()["modus"] == "kaskade"
        zielbereich_delete = client.post(f"/api/loeschpruefung/zielbereich/{zielbereich_id}/ausfuehren", json={"aktion": "loeschen"})
        assert zielbereich_delete.status_code == 200

    with test_session_factory() as db:
        assert db.get(ParameterGruppe, gruppe_id) is None
        assert db.scalar(select(GruppenParameter).where(GruppenParameter.parameter_gruppe_id == gruppe_id)) is None
        assert db.get(Zielbereich, zielbereich_id) is None
        assert db.scalar(select(ZielbereichPersonOverride).where(ZielbereichPersonOverride.zielbereich_id == zielbereich_id)) is None


def test_conversion_rule_used_by_measurements_is_blocked_and_can_be_deactivated(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        db.add_all([Einheit(kuerzel="ng/ml"), Einheit(kuerzel="nmol/l")])
        db.commit()
        person = Person(anzeigename="Ivan", geburtsdatum=date(1984, 1, 4))
        parameter = Laborparameter(
            interner_schluessel="vitamin_d",
            anzeigename="Vitamin D",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)
        regel = ParameterUmrechnungsregel(
            laborparameter_id=parameter.id,
            von_einheit="ng/ml",
            nach_einheit="nmol/l",
            regel_typ="faktor",
            faktor=2.5,
        )
        db.add(regel)
        db.commit()
        db.refresh(regel)
        befund = Befund(person_id=person.id, entnahmedatum=date(2026, 4, 21), quelle_typ="manuell")
        db.add(befund)
        db.commit()
        db.refresh(befund)
        db.add(
            Messwert(
                person_id=person.id,
                befund_id=befund.id,
                laborparameter_id=parameter.id,
                original_parametername="Vitamin D",
                wert_typ="numerisch",
                wert_operator="exakt",
                wert_roh_text="40",
                wert_num=40.0,
                einheit_original="ng/ml",
                wert_normiert_num=100.0,
                einheit_normiert="nmol/l",
                umrechnungsregel_id=regel.id,
            )
        )
        db.commit()
        regel_id = regel.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/parameter_umrechnungsregel/{regel_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "blockiert"
        assert body["empfehlung"] == "deaktivieren"

        deaktivieren = client.post(
            f"/api/loeschpruefung/parameter_umrechnungsregel/{regel_id}/ausfuehren",
            json={"aktion": "deaktivieren"},
        )
        assert deaktivieren.status_code == 200

    with test_session_factory() as db:
        regel = db.get(ParameterUmrechnungsregel, regel_id)
        assert regel is not None
        assert regel.aktiv is False


def test_cyclic_planning_is_directly_deletable(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person = Person(anzeigename="Jule", geburtsdatum=date(1994, 5, 12))
        parameter = Laborparameter(
            interner_schluessel="ferritin",
            anzeigename="Ferritin",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)
        planung = PlanungZyklisch(
            person_id=person.id,
            laborparameter_id=parameter.id,
            intervall_wert=6,
            intervall_typ="monate",
            startdatum=date(2026, 4, 1),
            status="aktiv",
            karenz_tage=14,
        )
        db.add(planung)
        db.commit()
        planung_id = planung.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/planung_zyklisch/{planung_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "direkt"
        assert body["empfehlung"] == "loeschen"

        ausfuehrung = client.post(
            f"/api/loeschpruefung/planung_zyklisch/{planung_id}/ausfuehren",
            json={"aktion": "loeschen"},
        )
        assert ausfuehrung.status_code == 200

    with test_session_factory() as db:
        assert db.get(PlanungZyklisch, planung_id) is None


def test_one_time_planning_is_directly_deletable(monkeypatch, tmp_path: Path) -> None:
    client, test_session_factory = _make_client(monkeypatch, tmp_path)
    with test_session_factory() as db:
        person = Person(anzeigename="Kira", geburtsdatum=date(1995, 9, 21))
        parameter = Laborparameter(
            interner_schluessel="vitamin_b12",
            anzeigename="Vitamin B12",
            wert_typ_standard="numerisch",
        )
        db.add_all([person, parameter])
        db.commit()
        db.refresh(person)
        db.refresh(parameter)
        planung = PlanungEinmalig(
            person_id=person.id,
            laborparameter_id=parameter.id,
            status="offen",
            zieltermin_datum=date(2026, 5, 1),
        )
        db.add(planung)
        db.commit()
        planung_id = planung.id

    with client:
        pruefung = client.get(f"/api/loeschpruefung/planung_einmalig/{planung_id}")
        assert pruefung.status_code == 200
        body = pruefung.json()
        assert body["modus"] == "direkt"
        assert body["empfehlung"] == "loeschen"

        ausfuehrung = client.post(
            f"/api/loeschpruefung/planung_einmalig/{planung_id}/ausfuehren",
            json={"aktion": "loeschen"},
        )
        assert ausfuehrung.status_code == 200

    with test_session_factory() as db:
        assert db.get(PlanungEinmalig, planung_id) is None
