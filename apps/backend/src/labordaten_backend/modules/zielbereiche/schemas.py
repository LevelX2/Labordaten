from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from labordaten_backend.core.field_options import (
    GESCHLECHT_CODES,
    WERT_TYPEN,
    validate_optional_code,
    validate_required_code,
)


class ZielbereichCreate(BaseModel):
    wert_typ: str = "numerisch"
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

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


class ZielbereichRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    laborparameter_id: str
    wert_typ: str
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime
