from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class EinheitCreate(BaseModel):
    kuerzel: str

    @field_validator("kuerzel")
    @classmethod
    def validate_kuerzel(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Das Einheitenkürzel darf nicht leer sein.")
        return cleaned


class EinheitAliasCreate(BaseModel):
    alias_text: str
    bemerkung: str | None = None

    @field_validator("alias_text")
    @classmethod
    def validate_alias_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Der Alias darf nicht leer sein.")
        return cleaned


class EinheitAliasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    einheit_id: str
    alias_text: str
    alias_normalisiert: str
    bemerkung: str | None = None
    erstellt_am: datetime
    geaendert_am: datetime


class EinheitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kuerzel: str
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
    aliase: list[EinheitAliasRead] = []
