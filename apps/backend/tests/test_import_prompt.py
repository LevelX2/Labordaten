from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.models.base import Base
from labordaten_backend.models.dokument import Dokument
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.import_pruefpunkt import ImportPruefpunkt
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.person import Person
from labordaten_backend.modules.gruppen import schemas as gruppen_schemas
from labordaten_backend.modules.gruppen import service as gruppen_service
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


class _DummyRuntimeSettingsStore:
    def __init__(self, tmp_path: Path) -> None:
        self._model = RuntimeSettingsModel(
            data_path=str(tmp_path.resolve()),
            documents_path=str((tmp_path / "documents").resolve()),
            knowledge_path=str((tmp_path / "knowledge").resolve()),
        )

    def get(self) -> RuntimeSettingsModel:
        return self._model


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_import_prompt_does_not_include_person_context(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="m",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        prompt = import_service.create_import_prompt(
            db,
            import_schemas.ImportPromptCreate(promptTyp="laborbericht"),
        )

        assert '"person": {' not in prompt.prompt_text
        assert person.id not in prompt.prompt_text
        assert '"anzeigename": "Ludwig"' not in prompt.prompt_text
        assert "Ludwig Hirth" not in prompt.prompt_text
        assert "1964-01-12" not in prompt.prompt_text
        assert '"geschlecht' not in prompt.prompt_text
        assert 'Setze "befund.personId" nicht' in prompt.prompt_text


def test_import_prompt_contains_file_json_and_context_instructions(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12))
        db.add(person)
        labor = Labor(name="Bioscientia")
        db.add(labor)
        unit = Einheit(kuerzel="ng/ml")
        db.add(unit)
        db.flush()
        db.add(EinheitAlias(einheit_id=unit.id, alias_text="ng/mL", alias_normalisiert="ngml"))
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_alias(
            db,
            parameter.id,
            parameter_schemas.ParameterAliasCreate(alias_text="Ferritin i.S."),
        )
        gruppe = gruppen_service.create_gruppe(db, gruppen_schemas.GruppeCreate(name="Eisenstoffwechsel"))
        db.add(GruppenParameter(parameter_gruppe_id=gruppe.id, laborparameter_id=parameter.id))
        db.commit()
        db.refresh(person)

        prompt = import_service.create_import_prompt(
            db,
            import_schemas.ImportPromptCreate(promptTyp="laborbericht"),
        )

        text = prompt.prompt_text
        assert "Werte das komplette angehängte Dokument aus" in text
        assert "kurzen Überblick" in text
        assert "```json" in text
        assert '"quelleTyp" muss "ki_json" sein' in text
        assert '"befund" braucht mindestens "entnahmedatum"' in text
        assert '"befund.personId" soll weggelassen werden' in text
        assert '"name": "Bioscientia"' in text
        assert '"anzeigename": "Ferritin"' in text
        assert '"Ferritin i.S."' in text
        assert '"kuerzel": "ng/ml"' in text
        assert '"ng/mL"' in text
        assert '"name": "Eisenstoffwechsel"' in text
        assert '"parameterVorschlaege"' in text
        assert "Parameter-Vorschläge" in text
        assert '"beschreibungKurz"' in text
        assert '"kiHinweis"' in text
        assert 'Originale Labor-Kommentare zu einzelnen Werten in "bemerkungKurz" oder "bemerkungLang"' in text
        assert 'Eigene KI-Anmerkungen, Extraktionszweifel, Mapping-Hinweise' in text
        assert "vom konkreten Bericht und Import unabhängige Fachbeschreibung" in text
        assert "Empfehlungen, Zusatzuntersuchungen, Einsendehinweise" in text
        assert 'lasse "beschreibungKurz" weg oder null' in text
        assert "ausschließlich in \"begruendungAusDokument\"" in text
        assert prompt.schema_version == "1.0"
        assert "Labore: 1" in prompt.kontext_zusammenfassung
        assert "Parameter: 1" in prompt.kontext_zusammenfassung
        assert "Prompt: Laborbericht" in prompt.kontext_zusammenfassung
        assert 'setze sie als Originaltext in "personHinweis"' in text


def test_import_prompt_table_variant_contains_table_prefix_and_same_context(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        db.add(Labor(name="Bioscientia"))
        db.add(Einheit(kuerzel="ng/ml"))
        db.flush()
        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        parameter_service.create_parameter_alias(
            db,
            parameter.id,
            parameter_schemas.ParameterAliasCreate(alias_text="Ferritin i.S."),
        )
        db.commit()

        prompt = import_service.create_import_prompt(
            db,
            import_schemas.ImportPromptCreate(promptTyp="tabelle"),
        )

        text = prompt.prompt_text
        assert "Analysiere die bereitgestellte Tabelle, CSV- oder Excel-Datei vollständig" in text
        assert "Erkenne Spalten wie Parameter, Wert, Einheit, Referenzbereich" in text
        assert '"name": "Bioscientia"' in text
        assert '"anzeigename": "Ferritin"' in text
        assert '"Ferritin i.S."' in text
        assert "Prompt: Tabelle/CSV/Excel" in prompt.kontext_zusammenfassung


def test_import_draft_accepts_ai_answer_with_json_code_block(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Deborah", geburtsdatum=date(1989, 8, 31))
        db.add(person)
        db.commit()
        db.refresh(person)

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=f"""
Überblick:
- 1 Messwert erkannt.
- Keine offensichtlichen Probleme.

```json
{{
  "schemaVersion": "1.0",
  "quelleTyp": "ki_json",
  "befund": {{
    "personId": "{person.id}",
    "entnahmedatum": "2026-04-25"
  }},
  "messwerte": [
    {{
      "originalParametername": "Ferritin",
      "wertTyp": "numerisch",
      "wertRohText": "41",
      "wertNum": 41,
      "einheitOriginal": "ng/ml"
    }}
  ]
}}
```
"""
            ),
        )

        assert detail.befund.person_id == person.id
        assert detail.messwerte_anzahl == 1
        assert detail.messwerte[0].original_parametername == "Ferritin"


def test_import_json_upload_stores_document_with_suggested_name(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "labordaten_backend.core.documents.get_runtime_settings_store",
        lambda: _DummyRuntimeSettingsStore(tmp_path),
    )

    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Deborah", geburtsdatum=date(1989, 8, 31))
        db.add(person)
        db.commit()
        db.refresh(person)

        detail = import_service.create_import_entwurf_from_json_upload(
            db,
            payload_json=f"""{{
              "schemaVersion": "1.0",
              "quelleTyp": "ki_json",
              "befund": {{
                "personId": "{person.id}",
                "laborName": "IMD Berlin MVZ",
                "entnahmedatum": "2026-04-25"
              }},
              "messwerte": [
                {{
                  "originalParametername": "Ferritin",
                  "wertTyp": "numerisch",
                  "wertRohText": "41",
                  "wertNum": 41,
                  "einheitOriginal": "ng/ml"
                }}
              ]
            }}""",
            person_id_override=None,
            import_bemerkung="Quelle aus externem KI-Chat",
            document_filename="scan.pdf",
            document_content_type="application/pdf",
            document_content=b"%PDF-1.4\nTest",
            document_name_override=None,
        )

        assert detail.dokument_id is not None
        assert detail.dokument_dateiname == "2026-04-25_IMD_Berlin_MVZ_Laborbericht.pdf"
        assert detail.befund.dokument_dateiname == detail.dokument_dateiname
        assert detail.befund.person_id is None


def test_import_json_upload_uses_selected_person_instead_of_json_person(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "labordaten_backend.core.documents.get_runtime_settings_store",
        lambda: _DummyRuntimeSettingsStore(tmp_path),
    )

    with _make_session(tmp_path) as db:
        json_person = Person(anzeigename="Aus JSON", geburtsdatum=date(1980, 1, 1))
        selected_person = Person(anzeigename="Auswahl UI", geburtsdatum=date(1989, 8, 31))
        db.add_all([json_person, selected_person])
        db.commit()
        db.refresh(json_person)
        db.refresh(selected_person)

        detail = import_service.create_import_entwurf_from_json_upload(
            db,
            payload_json=f"""{{
              "schemaVersion": "1.0",
              "quelleTyp": "ki_json",
              "befund": {{
                "personId": "{json_person.id}",
                "laborName": "IMD Berlin MVZ",
                "entnahmedatum": "2026-04-25"
              }},
              "messwerte": [
                {{
                  "originalParametername": "Ferritin",
                  "wertTyp": "numerisch",
                  "wertRohText": "41",
                  "wertNum": 41,
                  "einheitOriginal": "ng/ml"
                }}
              ]
            }}""",
            person_id_override=selected_person.id,
            import_bemerkung="Quelle aus externem KI-Chat",
            document_filename="scan.pdf",
            document_content_type="application/pdf",
            document_content=b"%PDF-1.4\nTest",
            document_name_override=None,
        )

        assert detail.befund.person_id == selected_person.id
        assert detail.befund.person_id != json_person.id
        assert detail.dokument_dateiname == "2026-04-25_Auswahl_UI_IMD_Berlin_MVZ_Laborbericht.pdf"


def test_import_complete_remove_deletes_attempt_checks_and_optional_document(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "labordaten_backend.core.documents.get_runtime_settings_store",
        lambda: _DummyRuntimeSettingsStore(tmp_path),
    )

    with _make_session(tmp_path) as db:
        person = Person(anzeigename="Deborah", geburtsdatum=date(1989, 8, 31))
        db.add(person)
        db.commit()
        db.refresh(person)

        detail = import_service.create_import_entwurf_from_json_upload(
            db,
            payload_json=f"""{{
              "schemaVersion": "1.0",
              "quelleTyp": "ki_json",
              "befund": {{
                "personId": "{person.id}",
                "entnahmedatum": "2026-04-25"
              }},
              "messwerte": [
                {{
                  "originalParametername": "Ferritin",
                  "wertTyp": "numerisch",
                  "wertRohText": "41",
                  "wertNum": 41,
                  "einheitOriginal": "ng/ml"
                }}
              ]
            }}""",
            person_id_override=None,
            import_bemerkung=None,
            document_filename="scan.pdf",
            document_content_type="application/pdf",
            document_content=b"%PDF-1.4\nTest",
            document_name_override=None,
        )

        import_id = detail.id
        dokument_id = detail.dokument_id
        assert dokument_id is not None
        dokument = db.get(Dokument, dokument_id)
        assert dokument is not None
        stored_path = tmp_path / "documents" / dokument.pfad_relativ
        assert stored_path.exists()

        result = import_service.komplett_entfernen_import(db, import_id, dokument_entfernen=True)

        assert result.import_id == import_id
        assert result.dokument_id == dokument_id
        assert result.dokument_entfernt is True
        assert result.pruefpunkte_entfernt >= 0
        assert db.get(Importvorgang, import_id) is None
        assert db.get(Dokument, dokument_id) is None
        assert db.scalar(select(ImportPruefpunkt).where(ImportPruefpunkt.importvorgang_id == import_id)) is None
        assert not stored_path.exists()


def test_import_draft_warns_when_person_hint_differs_from_context_person(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        deborah = Person(anzeigename="Deborah", geburtsdatum=date(1989, 8, 31))
        db.add(deborah)
        db.commit()
        db.refresh(deborah)

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=f"""{{
                  "schemaVersion": "1.0",
                  "quelleTyp": "ki_json",
                  "personHinweis": "Sabine Sänger-Hirth",
                  "befund": {{
                    "personId": "{deborah.id}",
                    "entnahmedatum": "2026-04-24"
                  }},
                  "messwerte": [
                    {{
                      "originalParametername": "Ferritin",
                      "wertTyp": "numerisch",
                      "wertRohText": "41",
                      "wertNum": 41,
                      "einheitOriginal": "ng/ml"
                    }}
                  ]
                }}"""
            ),
        )

        assert any(
            pruefpunkt.pruefart == "person_hinweis"
            and pruefpunkt.status == "warnung"
            and "Sabine Sänger-Hirth" in pruefpunkt.meldung
            for pruefpunkt in detail.pruefpunkte
        )
