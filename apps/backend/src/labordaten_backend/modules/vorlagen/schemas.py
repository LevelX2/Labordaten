from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from labordaten_backend.core.field_options import PARAMETER_KLASSIFIKATIONEN, validate_required_code

AnsichtVorlageBereich = Literal["auswertung", "bericht"]
AnsichtVorlageTyp = Literal["auswertung_verlauf", "arztbericht_liste", "verlaufsbericht_zeitachse"]

VORLAGE_TYPEN_PRO_BEREICH: dict[str, tuple[str, ...]] = {
    "auswertung": ("auswertung_verlauf",),
    "bericht": ("arztbericht_liste", "verlaufsbericht_zeitachse"),
}


class VorlageFilterConfig(BaseModel):
    person_ids: list[str] = Field(default_factory=list)
    laborparameter_ids: list[str] = Field(default_factory=list)
    gruppen_ids: list[str] = Field(default_factory=list)
    klassifikationen: list[str] = Field(default_factory=list)
    labor_ids: list[str] = Field(default_factory=list)
    datum_von: date | None = None
    datum_bis: date | None = None

    @field_validator("klassifikationen")
    @classmethod
    def validate_klassifikationen(cls, values: list[str]) -> list[str]:
        return [
            validate_required_code(value, valid_values=PARAMETER_KLASSIFIKATIONEN, field_label="Klassifikation")
            for value in values
        ]


class AuswertungVorlageOptionen(BaseModel):
    include_laborreferenz: bool = True
    include_zielbereich: bool = True
    diagramm_darstellung: Literal["verlauf", "punkte", "punkte_bereiche"] = "verlauf"
    zeitraum_darstellung: Literal["wertezeitraum", "selektionszeitraum"] = "wertezeitraum"
    messwerttabelle_standard_offen: bool = False


class ArztberichtVorlageOptionen(BaseModel):
    include_referenzbereich: bool = True
    include_labor: bool = True
    include_befundbemerkung: bool = True
    include_messwertbemerkung: bool = True
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)


class VerlaufsberichtVorlageOptionen(BaseModel):
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)


class AuswertungVorlageKonfiguration(BaseModel):
    filter: VorlageFilterConfig = Field(default_factory=VorlageFilterConfig)
    optionen: AuswertungVorlageOptionen = Field(default_factory=AuswertungVorlageOptionen)


class ArztberichtVorlageKonfiguration(BaseModel):
    filter: VorlageFilterConfig = Field(default_factory=VorlageFilterConfig)
    optionen: ArztberichtVorlageOptionen = Field(default_factory=ArztberichtVorlageOptionen)


class VerlaufsberichtVorlageKonfiguration(BaseModel):
    filter: VorlageFilterConfig = Field(default_factory=VorlageFilterConfig)
    optionen: VerlaufsberichtVorlageOptionen = Field(default_factory=VerlaufsberichtVorlageOptionen)


class AnsichtVorlageCreate(BaseModel):
    name: str
    bereich: AnsichtVorlageBereich
    vorlage_typ: AnsichtVorlageTyp
    beschreibung: str | None = None
    konfiguration_json: dict[str, Any]
    sortierung: int | None = None


class AnsichtVorlageUpdate(BaseModel):
    name: str
    beschreibung: str | None = None
    konfiguration_json: dict[str, Any]
    sortierung: int | None = None


class AnsichtVorlageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    bereich: str
    vorlage_typ: str
    beschreibung: str | None = None
    konfiguration_json: dict[str, Any]
    schema_version: str
    aktiv: bool
    sortierung: int | None = None
    zuletzt_verwendet_am: datetime | None = None
    erstellt_am: datetime
    geaendert_am: datetime


class AnsichtVorlageDeleteResult(BaseModel):
    id: str
    geloescht: bool
