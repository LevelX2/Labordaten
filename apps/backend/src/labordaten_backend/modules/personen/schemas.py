from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PersonCreate(BaseModel):
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime

