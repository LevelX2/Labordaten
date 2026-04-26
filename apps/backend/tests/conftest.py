from __future__ import annotations

from pathlib import Path

import pytest

from labordaten_backend.core.runtime_settings import RuntimeSettingsModel


class _TestKnowledgeRuntimeSettingsStore:
    def __init__(self, tmp_path: Path) -> None:
        self._model = RuntimeSettingsModel(
            data_path=str(tmp_path.resolve()),
            documents_path=str((tmp_path / "documents").resolve()),
            knowledge_path=str((tmp_path / "knowledge").resolve()),
        )

    def get(self) -> RuntimeSettingsModel:
        return self._model


@pytest.fixture(autouse=True)
def _isolate_wissensbasis_runtime(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    runtime_store = _TestKnowledgeRuntimeSettingsStore(tmp_path)
    monkeypatch.setattr(
        "labordaten_backend.modules.wissensbasis.service.get_runtime_settings_store",
        lambda: runtime_store,
    )
