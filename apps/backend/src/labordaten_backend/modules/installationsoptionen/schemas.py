from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PendingZielwertPaket(BaseModel):
    paket_schluessel: str
    fehlende_parameter_anlegen: bool = True
    fehlende_einheiten_anlegen: bool = True
    prueffaelle_anlegen: bool = False


class PendingInstallationOptions(BaseModel):
    version: int = 1
    quelle: str = "installer"
    installationstyp: str = "neuinstallation"
    standarddaten_laden: bool = True
    standarddaten_aktualisieren: bool = False
    naechste_schritte_anzeigen: bool = True
    zielwertpakete: list[PendingZielwertPaket] = Field(default_factory=list)


class InstalliertesZielwertPaketRead(BaseModel):
    paket_schluessel: str
    angelegte_parameter_anzahl: int = 0
    angelegte_einheiten_anzahl: int = 0
    angelegte_zielbereiche_anzahl: int = 0
    reaktivierte_zielbereiche_anzahl: int = 0
    uebersprungene_zielbereiche_anzahl: int = 0


class InstallationOptionsProcessResult(BaseModel):
    options_file: str
    pending_vorhanden: bool = False
    verarbeitet: bool = False
    installationstyp: str | None = None
    standarddaten_angewendet: bool = False
    initialdaten_result: dict[str, Any] | None = None
    zielwertpakete_installiert: list[InstalliertesZielwertPaketRead] = Field(default_factory=list)
    fehler: list[str] = Field(default_factory=list)
    naechste_schritte_anzeigen: bool = False
