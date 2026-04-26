from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GruppeCreate(BaseModel):
    name: str
    beschreibung: str | None = None


class GruppeUpdate(BaseModel):
    name: str
    beschreibung: str | None = None


class GruppeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    beschreibung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
    parameter_anzahl: int = 0


class GruppenParameterAssignItem(BaseModel):
    laborparameter_id: str
    sortierung: int | None = None


class GruppenParameterAssignRequest(BaseModel):
    eintraege: list[GruppenParameterAssignItem]


class GruppenParameterRead(BaseModel):
    id: str
    parameter_gruppe_id: str
    laborparameter_id: str
    parameter_anzeigename: str
    interner_schluessel: str
    wert_typ_standard: str
    standard_einheit: str | None = None
    sortierung: int | None = None
