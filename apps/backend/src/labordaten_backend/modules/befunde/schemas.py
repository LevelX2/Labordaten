from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from labordaten_backend.core.field_options import BEFUND_QUELLE_TYPEN, validate_required_code


class BefundCreate(BaseModel):
    person_id: str
    labor_id: str | None = None
    dokument_id: str | None = None
    entnahmedatum: date | None = None
    befunddatum: date | None = None
    eingangsdatum: date | None = None
    bemerkung: str | None = None
    quelle_typ: str = "manuell"

    @field_validator("quelle_typ")
    @classmethod
    def validate_quelle_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=BEFUND_QUELLE_TYPEN, field_label="Befundquelle")


class BefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_id: str
    person_anzeigename: str | None = None
    labor_id: str | None = None
    labor_name: str | None = None
    dokument_id: str | None = None
    dokument_dateiname: str | None = None
    dokument_pfad: str | None = None
    entnahmedatum: date | None = None
    befunddatum: date | None = None
    eingangsdatum: date | None = None
    bemerkung: str | None = None
    quelle_typ: str
    duplikat_warnung: bool
    messwerte_anzahl: int = 0
    erstellt_am: datetime
    geaendert_am: datetime
