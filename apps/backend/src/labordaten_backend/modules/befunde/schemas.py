from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class BefundCreate(BaseModel):
    person_id: str
    labor_id: str | None = None
    dokument_id: str | None = None
    entnahmedatum: date | None = None
    befunddatum: date | None = None
    eingangsdatum: date | None = None
    bemerkung: str | None = None
    quelle_typ: str = "manuell"


class BefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_id: str
    labor_id: str | None = None
    dokument_id: str | None = None
    entnahmedatum: date | None = None
    befunddatum: date | None = None
    eingangsdatum: date | None = None
    bemerkung: str | None = None
    quelle_typ: str
    duplikat_warnung: bool
    erstellt_am: datetime
    geaendert_am: datetime

