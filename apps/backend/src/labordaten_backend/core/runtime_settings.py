from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from pydantic import BaseModel, Field

from labordaten_backend.core.config import get_settings


class RuntimeSettingsModel(BaseModel):
    data_path: str
    documents_path: str
    knowledge_path: str
    import_store_source_files_default: bool = True
    report_include_labor_default: bool = True
    report_include_reference_default: bool = True
    allow_api_key_usage: bool = False
    import_auto_create_lab_default: bool = True
    darstellung_normierte_vergleiche: bool = False
    bericht_standardvorlage: str | None = None
    bemerkung: str | None = Field(default=None)


class RuntimeSettingsStore:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._file_lock = Lock()

    def _settings_file(self) -> Path:
        return Path(self._settings.runtime_settings_file).expanduser().resolve()

    def _default_model(self) -> RuntimeSettingsModel:
        database_path = _extract_sqlite_path(self._settings.database_url) or Path.cwd()
        data_path = database_path.parent if database_path.is_file() or database_path.suffix else database_path
        return RuntimeSettingsModel(
            data_path=str(data_path.resolve()),
            documents_path=str(Path(self._settings.documents_dir).expanduser().resolve()),
            knowledge_path=str(Path(self._settings.knowledge_dir).expanduser().resolve()),
        )

    def get(self) -> RuntimeSettingsModel:
        path = self._settings_file()
        if not path.exists():
            model = self._default_model()
            self.save(model)
            return model

        with self._file_lock:
            payload = json.loads(path.read_text(encoding="utf-8"))
        return RuntimeSettingsModel.model_validate(payload)

    def save(self, model: RuntimeSettingsModel) -> RuntimeSettingsModel:
        normalized = _normalize_model(model)
        path = self._settings_file()
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._file_lock:
            path.write_text(
                json.dumps(normalized.model_dump(mode="json"), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        return normalized


def _extract_sqlite_path(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite:///"):
        return None
    raw_path = database_url.removeprefix("sqlite:///")
    if not raw_path:
        return None
    return Path(raw_path).expanduser().resolve()


def _normalize_model(model: RuntimeSettingsModel) -> RuntimeSettingsModel:
    return RuntimeSettingsModel(
        **{
            **model.model_dump(),
            "data_path": str(Path(model.data_path).expanduser().resolve()),
            "documents_path": str(Path(model.documents_path).expanduser().resolve()),
            "knowledge_path": str(Path(model.knowledge_path).expanduser().resolve()),
        }
    )


_runtime_settings_store: RuntimeSettingsStore | None = None


def get_runtime_settings_store() -> RuntimeSettingsStore:
    global _runtime_settings_store
    if _runtime_settings_store is None:
        _runtime_settings_store = RuntimeSettingsStore()
    return _runtime_settings_store
