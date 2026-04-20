from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


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
    bemerkung_kurz: str | None = None
    bemerkung_lang: str | None = None
    unsicher_flag: bool
    pruefbedarf_flag: bool
    erstellt_am: datetime
    geaendert_am: datetime

