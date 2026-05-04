from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from labordaten_backend.core.field_options import (
    BLUTGRUPPEN,
    GESCHLECHT_CODES,
    RHESUSFAKTOREN,
    ZIELRICHTUNGEN,
    validate_optional_code,
    validate_required_code,
)


class PersonCreate(BaseModel):
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date | None = None
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None

    @field_validator("geschlecht_code")
    @classmethod
    def validate_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")

    @field_validator("blutgruppe")
    @classmethod
    def validate_blutgruppe(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=BLUTGRUPPEN, field_label="Blutgruppe")

    @field_validator("rhesusfaktor")
    @classmethod
    def validate_rhesusfaktor(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=RHESUSFAKTOREN, field_label="Rhesusfaktor")


class PersonUpdate(BaseModel):
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date | None = None
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None

    @field_validator("anzeigename")
    @classmethod
    def validate_anzeigename(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Personen brauchen einen Anzeigenamen.")
        return cleaned

    @field_validator("geschlecht_code")
    @classmethod
    def validate_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")

    @field_validator("blutgruppe")
    @classmethod
    def validate_blutgruppe(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=BLUTGRUPPEN, field_label="Blutgruppe")

    @field_validator("rhesusfaktor")
    @classmethod
    def validate_rhesusfaktor(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=RHESUSFAKTOREN, field_label="Rhesusfaktor")


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date | None = None
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
    messwerte_anzahl: int = 0


class ZielbereichOverrideCreate(BaseModel):
    zielbereich_id: str
    zielrichtung: str | None = None
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    bemerkung: str | None = None

    @field_validator("zielrichtung")
    @classmethod
    def validate_zielrichtung(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_required_code(value, valid_values=ZIELRICHTUNGEN, field_label="Zielrichtung")


class ZielbereichOverrideRead(BaseModel):
    id: str
    person_id: str
    zielbereich_id: str
    laborparameter_id: str
    parameter_anzeigename: str
    wert_typ: str
    basis_zielrichtung: str
    basis_untere_grenze_num: float | None = None
    basis_obere_grenze_num: float | None = None
    basis_einheit: str | None = None
    basis_soll_text: str | None = None
    zielrichtung: str
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: str | None = None
