from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PersonCreate(BaseModel):
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    anzeigename: str
    vollname: str | None = None
    geburtsdatum: date
    geschlecht_code: str | None = None
    blutgruppe: str | None = None
    rhesusfaktor: str | None = None
    hinweise_allgemein: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime


class ZielbereichOverrideCreate(BaseModel):
    zielbereich_id: str
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    bemerkung: str | None = None


class ZielbereichOverrideRead(BaseModel):
    id: str
    person_id: str
    zielbereich_id: str
    laborparameter_id: str
    parameter_anzeigename: str
    wert_typ: str
    basis_untere_grenze_num: float | None = None
    basis_obere_grenze_num: float | None = None
    basis_einheit: str | None = None
    basis_soll_text: str | None = None
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: str | None = None
