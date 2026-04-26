from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


VALID_INTERVAL_TYPES = {"tage", "wochen", "monate", "jahre"}
VALID_PLAN_STATUSES = {"aktiv", "pausiert", "beendet"}
VALID_REMINDER_STATUSES = {"offen", "naechster_termin", "erledigt", "uebersprungen", "abgebrochen"}


class PlanungZyklischCreate(BaseModel):
    person_id: str
    laborparameter_id: str
    intervall_wert: int
    intervall_typ: str = "monate"
    startdatum: date
    enddatum: date | None = None
    status: str = "aktiv"
    prioritaet: int = 0
    karenz_tage: int = 0
    bemerkung: str | None = None

    @field_validator("intervall_typ")
    @classmethod
    def validate_interval_type(cls, value: str) -> str:
        if value not in VALID_INTERVAL_TYPES:
            raise ValueError("Unbekannter Intervalltyp.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_PLAN_STATUSES:
            raise ValueError("Unbekannter Planungsstatus.")
        return value

    @field_validator("intervall_wert")
    @classmethod
    def validate_interval_value(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Der Intervallwert muss größer als 0 sein.")
        return value

    @field_validator("karenz_tage")
    @classmethod
    def validate_karenz(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Karenztage dürfen nicht negativ sein.")
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> "PlanungZyklischCreate":
        if self.enddatum and self.enddatum < self.startdatum:
            raise ValueError("Das Enddatum darf nicht vor dem Startdatum liegen.")
        return self


class PlanungZyklischBatchCreate(BaseModel):
    person_id: str
    laborparameter_ids: list[str]
    intervall_wert: int
    intervall_typ: str = "monate"
    startdatum: date
    enddatum: date | None = None
    status: str = "aktiv"
    prioritaet: int = 0
    karenz_tage: int = 0
    bemerkung: str | None = None

    @field_validator("laborparameter_ids")
    @classmethod
    def validate_parameter_ids(cls, value: list[str]) -> list[str]:
        unique_values = list(dict.fromkeys(value))
        if not unique_values:
            raise ValueError("Mindestens ein Parameter muss ausgewählt sein.")
        if len(unique_values) != len(value):
            raise ValueError("Ein Parameter darf nur einmal ausgewählt werden.")
        return value

    @field_validator("intervall_typ")
    @classmethod
    def validate_interval_type(cls, value: str) -> str:
        if value not in VALID_INTERVAL_TYPES:
            raise ValueError("Unbekannter Intervalltyp.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_PLAN_STATUSES:
            raise ValueError("Unbekannter Planungsstatus.")
        return value

    @field_validator("intervall_wert")
    @classmethod
    def validate_interval_value(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Der Intervallwert muss größer als 0 sein.")
        return value

    @field_validator("karenz_tage")
    @classmethod
    def validate_karenz(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Karenztage dürfen nicht negativ sein.")
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> "PlanungZyklischBatchCreate":
        if self.enddatum and self.enddatum < self.startdatum:
            raise ValueError("Das Enddatum darf nicht vor dem Startdatum liegen.")
        return self


class PlanungZyklischUpdate(BaseModel):
    intervall_wert: int | None = None
    intervall_typ: str | None = None
    startdatum: date | None = None
    enddatum: date | None = None
    status: str | None = None
    prioritaet: int | None = None
    karenz_tage: int | None = None
    bemerkung: str | None = None

    @field_validator("intervall_typ")
    @classmethod
    def validate_interval_type(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_INTERVAL_TYPES:
            raise ValueError("Unbekannter Intervalltyp.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_PLAN_STATUSES:
            raise ValueError("Unbekannter Planungsstatus.")
        return value

    @field_validator("intervall_wert")
    @classmethod
    def validate_interval_value(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("Der Intervallwert muss größer als 0 sein.")
        return value

    @field_validator("karenz_tage")
    @classmethod
    def validate_karenz(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("Karenztage dürfen nicht negativ sein.")
        return value


class PlanungZyklischRead(BaseModel):
    id: str
    person_id: str
    laborparameter_id: str
    intervall_wert: int
    intervall_typ: str
    startdatum: date
    enddatum: date | None = None
    status: str
    prioritaet: int
    karenz_tage: int
    bemerkung: str | None = None
    letzte_relevante_messung_id: str | None = None
    letzte_relevante_messung_datum: date | None = None
    naechste_faelligkeit: date | None = None
    faelligkeitsstatus: str
    erstellt_am: datetime
    geaendert_am: datetime


class PlanungEinmaligCreate(BaseModel):
    person_id: str
    laborparameter_id: str
    status: str = "offen"
    zieltermin_datum: date | None = None
    bemerkung: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_REMINDER_STATUSES:
            raise ValueError("Unbekannter Vormerkungsstatus.")
        return value


class PlanungEinmaligBatchCreate(BaseModel):
    person_id: str
    laborparameter_ids: list[str]
    status: str = "offen"
    zieltermin_datum: date | None = None
    bemerkung: str | None = None

    @field_validator("laborparameter_ids")
    @classmethod
    def validate_parameter_ids(cls, value: list[str]) -> list[str]:
        unique_values = list(dict.fromkeys(value))
        if not unique_values:
            raise ValueError("Mindestens ein Parameter muss ausgewählt sein.")
        if len(unique_values) != len(value):
            raise ValueError("Ein Parameter darf nur einmal ausgewählt werden.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_REMINDER_STATUSES:
            raise ValueError("Unbekannter Vormerkungsstatus.")
        return value


class PlanungEinmaligUpdate(BaseModel):
    status: str | None = None
    zieltermin_datum: date | None = None
    bemerkung: str | None = None
    erledigt_durch_messwert_id: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_REMINDER_STATUSES:
            raise ValueError("Unbekannter Vormerkungsstatus.")
        return value


class PlanungEinmaligRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_id: str
    laborparameter_id: str
    status: str
    zieltermin_datum: date | None = None
    bemerkung: str | None = None
    erledigt_durch_messwert_id: str | None = None
    erstellt_am: datetime
    geaendert_am: datetime


class FaelligkeitRead(BaseModel):
    planung_typ: str
    planung_id: str
    person_id: str
    laborparameter_id: str
    status: str
    prioritaet: int | None = None
    bemerkung: str | None = None
    letzte_relevante_messung_id: str | None = None
    letzte_relevante_messung_datum: date | None = None
    naechste_faelligkeit: date | None = None
    zieltermin_datum: date | None = None
    intervall_label: str | None = None
