from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Loeschmodus = Literal["direkt", "kaskade", "blockiert"]
Loeschaktion = Literal["loeschen", "deaktivieren"]
Loeschempfehlung = Literal["loeschen", "deaktivieren", "nicht_loeschen"]
AbhaengigkeitKategorie = Literal["kind", "nutzung", "folge"]


class LoeschAbhaengigkeitRead(BaseModel):
    objekt_typ: str
    anzahl: int
    kategorie: AbhaengigkeitKategorie
    beschreibung: str | None = None


class LoeschOptionenRead(BaseModel):
    deaktivieren_verfuegbar: bool = False
    leeren_befund_mitloeschen_standard: bool = False


class LoeschPruefungRead(BaseModel):
    entitaet_typ: str
    entitaet_id: str
    anzeige_name: str
    modus: Loeschmodus
    empfehlung: Loeschempfehlung
    standard_aktion: Loeschaktion | None = None
    abhaengigkeiten: list[LoeschAbhaengigkeitRead] = Field(default_factory=list)
    blockierungsgruende: list[str] = Field(default_factory=list)
    hinweise: list[str] = Field(default_factory=list)
    optionen: LoeschOptionenRead = Field(default_factory=LoeschOptionenRead)


class LoeschAusfuehrenRequest(BaseModel):
    aktion: Loeschaktion = "loeschen"
    leeren_befund_mitloeschen: bool = True


class LoeschAusfuehrungRead(BaseModel):
    entitaet_typ: str
    entitaet_id: str
    aktion: Loeschaktion
    geloeschte_objekte: list[LoeschAbhaengigkeitRead] = Field(default_factory=list)
    aktualisierte_objekte: list[LoeschAbhaengigkeitRead] = Field(default_factory=list)
    hinweise: list[str] = Field(default_factory=list)
