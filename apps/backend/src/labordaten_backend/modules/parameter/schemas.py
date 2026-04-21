from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ParameterCreate(BaseModel):
    interner_schluessel: str
    anzeigename: str
    beschreibung: str | None = None
    standard_einheit: str | None = None
    wert_typ_standard: str = "numerisch"
    sortierschluessel: str | None = None


class ParameterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    interner_schluessel: str
    anzeigename: str
    beschreibung: str | None = None
    standard_einheit: str | None = None
    wert_typ_standard: str
    sortierschluessel: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime


class ParameterAliasCreate(BaseModel):
    alias_text: str
    bemerkung: str | None = None


class ParameterAliasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    laborparameter_id: str
    alias_text: str
    alias_normalisiert: str
    bemerkung: str | None = None
    erstellt_am: datetime
    geaendert_am: datetime
