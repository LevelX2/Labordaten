from __future__ import annotations

from pydantic import BaseModel, Field


class InitialdatenStatusRead(BaseModel):
    snapshot_verfuegbar: bool
    snapshot_version: str | None = None
    stammdaten_vorhanden: bool
    nutzerdaten_vorhanden: bool
    initialimport_empfohlen: bool
    tabellen: dict[str, int]


class InitialdatenApplyRequest(BaseModel):
    aktualisieren: bool = Field(
        default=False,
        description="Bestehende Stammdaten mit Snapshotwerten aktualisieren.",
    )


class InitialdatenApplyResult(BaseModel):
    snapshot_version: str | None = None
    aktualisieren: bool
    angelegt: dict[str, int]
    aktualisiert: dict[str, int]
    uebersprungen: dict[str, int]
