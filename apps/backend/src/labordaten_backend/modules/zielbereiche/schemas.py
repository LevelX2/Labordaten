from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from labordaten_backend.core.field_options import (
    GESCHLECHT_CODES,
    WERT_TYPEN,
    ZIELBEREICH_QUELLE_TYPEN,
    ZIELBEREICH_TYPEN,
    validate_optional_code,
    validate_required_code,
)


class ZielbereichQuelleCreate(BaseModel):
    name: str
    quellen_typ: str = "experte"
    titel: str | None = None
    jahr: int | None = None
    version: str | None = None
    bemerkung: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name der Zielwertquelle darf nicht leer sein.")
        return cleaned

    @field_validator("quellen_typ")
    @classmethod
    def validate_quellen_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=ZIELBEREICH_QUELLE_TYPEN, field_label="Quellentyp")


class ZielbereichQuelleUpdate(ZielbereichQuelleCreate):
    aktiv: bool = True


class ZielbereichQuelleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    quellen_typ: str
    titel: str | None = None
    jahr: int | None = None
    version: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime


class ZielwertPaketCreate(BaseModel):
    paket_schluessel: str
    name: str
    zielbereich_quelle_id: str | None = None
    version: str | None = None
    jahr: int | None = None
    beschreibung: str | None = None
    bemerkung: str | None = None

    @field_validator("paket_schluessel")
    @classmethod
    def validate_paket_schluessel(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Paketschlüssel darf nicht leer sein.")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_paket_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Paketname darf nicht leer sein.")
        return cleaned


class ZielwertPaketUpdate(ZielwertPaketCreate):
    aktiv: bool = True


class ZielwertPaketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    paket_schluessel: str
    name: str
    zielbereich_quelle_id: str | None = None
    version: str | None = None
    jahr: int | None = None
    beschreibung: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    zielbereiche_anzahl: int = 0
    aktive_zielbereiche_anzahl: int = 0
    erstellt_am: datetime
    geaendert_am: datetime


class ZielbereichCreate(BaseModel):
    wert_typ: str = "numerisch"
    zielbereich_typ: str = "allgemein"
    zielbereich_quelle_id: str | None = None
    zielwert_paket_id: str | None = None
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    quelle_original_text: str | None = None
    quelle_stelle: str | None = None
    bemerkung: str | None = None

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

    @field_validator("zielbereich_typ")
    @classmethod
    def validate_zielbereich_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=ZIELBEREICH_TYPEN, field_label="Zielbereichstyp")

    @field_validator("geschlecht_code")
    @classmethod
    def validate_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")

    @model_validator(mode="after")
    def validate_target(self) -> "ZielbereichCreate":
        if self.wert_typ == "numerisch" and self.untere_grenze_num is None and self.obere_grenze_num is None:
            raise ValueError("Numerische Zielbereiche brauchen mindestens eine Grenze.")
        if self.wert_typ == "text" and not self.soll_text:
            raise ValueError("Text-Zielbereiche brauchen einen Solltext.")
        return self


class ZielbereichUpdate(BaseModel):
    zielbereich_typ: str = "allgemein"
    zielbereich_quelle_id: str | None = None
    zielwert_paket_id: str | None = None
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    quelle_original_text: str | None = None
    quelle_stelle: str | None = None
    bemerkung: str | None = None

    @field_validator("zielbereich_typ")
    @classmethod
    def validate_zielbereich_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=ZIELBEREICH_TYPEN, field_label="Zielbereichstyp")

    @field_validator("geschlecht_code")
    @classmethod
    def validate_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")


class ZielbereichRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    laborparameter_id: str
    zielbereich_quelle_id: str | None = None
    zielwert_paket_id: str | None = None
    wert_typ: str
    zielbereich_typ: str
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    quelle_original_text: str | None = None
    quelle_stelle: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
