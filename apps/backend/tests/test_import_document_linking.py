from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.core import documents as documents_core
from labordaten_backend.core.runtime_settings import RuntimeSettingsModel
from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.dokument import Dokument
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.modules.importe import schemas as import_schemas
from labordaten_backend.modules.importe import service as import_service


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


def test_json_import_links_local_document_and_persists_reference_context(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(documents_core, "get_runtime_settings_store", lambda: _DummyRuntimeSettingsStore(tmp_path))

    source_dir = tmp_path / "eingang"
    source_dir.mkdir(parents=True, exist_ok=True)
    source_file = source_dir / "bioscientia.pdf"
    source_file.write_bytes(b"%PDF-1.4 test")

    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
        )
        parameter = Laborparameter(
            interner_schluessel="beta_crosslaps",
            anzeigename="beta-CrossLaps",
            standard_einheit="ng/ml",
            wert_typ_standard="numerisch",
        )
        db.add(person)
        db.add(parameter)
        db.commit()
        db.refresh(person)
        db.refresh(parameter)

        payload_json = json.dumps(
            {
                "schemaVersion": "1.0",
                "quelleTyp": "ki_json",
                "befund": {
                    "personId": person.id,
                    "laborName": "Bioscientia MVZ Labor Saar GmbH",
                    "entnahmedatum": "2026-01-20",
                    "befunddatum": "2026-01-27",
                    "dokumentPfad": str(source_file),
                },
                "messwerte": [
                    {
                        "parameterId": parameter.id,
                        "originalParametername": "beta-CrossLaps",
                        "wertTyp": "numerisch",
                        "wertRohText": "0,35",
                        "wertNum": 0.35,
                        "einheitOriginal": "ng/ml",
                        "referenzTextOriginal": "60 - <70 Jahre 0,13 - 0,75 ng/ml",
                        "untereGrenzeNum": 0.13,
                        "obereGrenzeNum": 0.75,
                        "referenzEinheit": "ng/ml",
                        "referenzAlterMinTage": 21915,
                        "referenzAlterMaxTage": 25567,
                        "referenzBemerkung": "Altersbezogener Bereich laut Befund",
                    }
                ],
            }
        )

        detail = import_service.create_import_entwurf(
            db,
            import_schemas.ImportEntwurfCreate(
                payload_json=payload_json,
                bemerkung="Testimport mit Dokument",
            ),
        )

        assert detail.dokument_id is not None
        assert detail.dokument_dateiname == "bioscientia.pdf"
        assert detail.befund.dokument_dateiname == "bioscientia.pdf"
        assert detail.befund.dokument_pfad is not None
        assert Path(detail.befund.dokument_pfad).exists()
        assert detail.messwerte[0].untere_grenze_num == 0.13
        assert detail.messwerte[0].obere_grenze_num == 0.75
        assert detail.messwerte[0].referenz_alter_min_tage == 21915
        assert detail.messwerte[0].referenz_alter_max_tage == 25567

        uebernommen = import_service.uebernehmen_import(
            db,
            detail.id,
            import_schemas.ImportUebernehmenRequest(),
        )

        assert uebernommen.status == "uebernommen"

        importvorgang = db.get(Importvorgang, detail.id)
        assert importvorgang is not None
        assert importvorgang.dokument_id == detail.dokument_id

        befund = db.scalar(select(Befund).where(Befund.importvorgang_id == detail.id))
        assert befund is not None
        assert befund.dokument_id == detail.dokument_id

        dokument = db.get(Dokument, detail.dokument_id)
        assert dokument is not None
        assert dokument.dateiname == "bioscientia.pdf"
        assert Path(dokument.pfad_absolut).exists()

        referenz = db.scalar(select(MesswertReferenz).where(MesswertReferenz.referenz_text_original.is_not(None)))
        assert referenz is not None
        assert referenz.untere_grenze_num == 0.13
        assert referenz.obere_grenze_num == 0.75
        assert referenz.alter_min_tage == 21915
        assert referenz.alter_max_tage == 25567
        assert referenz.bemerkung == "Altersbezogener Bereich laut Befund"
