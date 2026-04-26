from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class LaborCreate(BaseModel):
    name: str
    adresse: str | None = None
    bemerkung: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Labore brauchen einen Namen.")
        return cleaned


class LaborUpdate(BaseModel):
    name: str
    adresse: str | None = None
    bemerkung: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Labore brauchen einen Namen.")
        return cleaned


class LaborRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    adresse: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
