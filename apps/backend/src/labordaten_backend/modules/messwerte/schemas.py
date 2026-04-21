from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from labordaten_backend.core.field_options import (
    WERT_OPERATOREN,
    WERT_TYPEN,
    validate_required_code,
)


class MesswertCreate(BaseModel):
    person_id: str
    befund_id: str
    laborparameter_id: str
    original_parametername: str
    wert_typ: str
    wert_operator: str = "exakt"
    wert_roh_text: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit_original: str | None = None
    bemerkung_kurz: str | None = None
    bemerkung_lang: str | None = None
    unsicher_flag: bool = False
    pruefbedarf_flag: bool = False

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

    @field_validator("wert_operator")
    @classmethod
    def validate_wert_operator(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_OPERATOREN, field_label="Wertoperator")

    @model_validator(mode="after")
    def validate_value_fields(self) -> "MesswertCreate":
        if self.wert_typ == "numerisch" and self.wert_num is None and not self.pruefbedarf_flag:
            raise ValueError("Numerische Messwerte brauchen einen Zahlenwert oder Prüfbedarf.")
        if self.wert_typ == "text" and not (self.wert_text or self.wert_roh_text):
            raise ValueError("Qualitative Messwerte brauchen einen Textwert.")
        return self


class MesswertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_id: str
    befund_id: str
    laborparameter_id: str
    original_parametername: str
    wert_typ: str
    wert_operator: str
    wert_roh_text: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit_original: str | None = None
    wert_normiert_num: float | None = None
    einheit_normiert: str | None = None
    umrechnungsregel_id: str | None = None
    bemerkung_kurz: str | None = None
    bemerkung_lang: str | None = None
    unsicher_flag: bool
    pruefbedarf_flag: bool
    person_anzeigename: str | None = None
    parameter_anzeigename: str | None = None
    labor_id: str | None = None
    labor_name: str | None = None
    entnahmedatum: str | None = None
    gruppen_namen: list[str] = Field(default_factory=list)
    erstellt_am: datetime
    geaendert_am: datetime
