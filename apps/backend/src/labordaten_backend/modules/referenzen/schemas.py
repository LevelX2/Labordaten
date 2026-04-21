from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from labordaten_backend.core.field_options import (
    GESCHLECHT_CODES,
    REFERENZ_GRENZ_OPERATOREN,
    REFERENZ_TYPEN,
    WERT_TYPEN,
    validate_optional_code,
    validate_required_code,
)
from labordaten_backend.core.labor_value_formatting import (
    DEFAULT_LOWER_REFERENCE_OPERATOR,
    DEFAULT_UPPER_REFERENCE_OPERATOR,
)


class ReferenzCreate(BaseModel):
    referenz_typ: str = "labor"
    wert_typ: str = "numerisch"
    referenz_text_original: str | None = None
    untere_grenze_num: float | None = None
    untere_grenze_operator: str | None = None
    obere_grenze_num: float | None = None
    obere_grenze_operator: str | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None

    @field_validator("referenz_typ")
    @classmethod
    def validate_referenz_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=REFERENZ_TYPEN, field_label="Referenztyp")

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

    @field_validator("geschlecht_code")
    @classmethod
    def validate_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")

    @field_validator("untere_grenze_operator", "obere_grenze_operator")
    @classmethod
    def validate_grenze_operator(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=REFERENZ_GRENZ_OPERATOREN, field_label="Grenzoperator")

    @model_validator(mode="after")
    def validate_reference(self) -> "ReferenzCreate":
        if (
            self.wert_typ == "numerisch"
            and self.untere_grenze_num is None
            and self.obere_grenze_num is None
            and not self.referenz_text_original
        ):
            raise ValueError("Numerische Referenzen brauchen Grenzen oder einen Originaltext.")
        if self.wert_typ == "text" and not (self.soll_text or self.referenz_text_original):
            raise ValueError("Textreferenzen brauchen einen Solltext oder Originaltext.")
        if self.wert_typ == "numerisch":
            if self.untere_grenze_num is not None and self.untere_grenze_operator is None:
                self.untere_grenze_operator = DEFAULT_LOWER_REFERENCE_OPERATOR
            if self.obere_grenze_num is not None and self.obere_grenze_operator is None:
                self.obere_grenze_operator = DEFAULT_UPPER_REFERENCE_OPERATOR
            if self.untere_grenze_operator and not self.untere_grenze_operator.startswith("groesser"):
                raise ValueError("Die untere Grenze braucht einen Operator 'groesser_als' oder 'groesser_gleich'.")
            if self.obere_grenze_operator and not self.obere_grenze_operator.startswith("kleiner"):
                raise ValueError("Die obere Grenze braucht einen Operator 'kleiner_als' oder 'kleiner_gleich'.")
        return self


class ReferenzRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    messwert_id: str
    referenz_typ: str
    referenz_text_original: str | None = None
    wert_typ: str
    untere_grenze_num: float | None = None
    untere_grenze_operator: str | None = None
    obere_grenze_num: float | None = None
    obere_grenze_operator: str | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None
