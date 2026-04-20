from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LaborCreate(BaseModel):
    name: str
    adresse: str | None = None
    bemerkung: str | None = None


class LaborRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    adresse: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime

