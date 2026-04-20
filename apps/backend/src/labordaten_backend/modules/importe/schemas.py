from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ImportBefundPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    person_id: str | None = Field(default=None, alias="personId")
    labor_id: str | None = Field(default=None, alias="laborId")
    labor_name: str | None = Field(default=None, alias="laborName")
    entnahmedatum: date = Field(alias="entnahmedatum")
    befunddatum: date | None = Field(default=None, alias="befunddatum")
    bemerkung: str | None = None
    dokument_pfad: str | None = Field(default=None, alias="dokumentPfad")


class ImportMesswertPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    parameter_id: str | None = Field(default=None, alias="parameterId")
    original_parametername: str = Field(alias="originalParametername")
    wert_typ: str = Field(alias="wertTyp")
    wert_operator: str = Field(default="exakt", alias="wertOperator")
    wert_roh_text: str = Field(alias="wertRohText")
    wert_num: float | None = Field(default=None, alias="wertNum")
    wert_text: str | None = Field(default=None, alias="wertText")
    einheit_original: str | None = Field(default=None, alias="einheitOriginal")
    bemerkung_kurz: str | None = Field(default=None, alias="bemerkungKurz")
    bemerkung_lang: str | None = Field(default=None, alias="bemerkungLang")
    referenz_text_original: str | None = Field(default=None, alias="referenzTextOriginal")
    untere_grenze_num: float | None = Field(default=None, alias="untereGrenzeNum")
    obere_grenze_num: float | None = Field(default=None, alias="obereGrenzeNum")
    referenz_einheit: str | None = Field(default=None, alias="referenzEinheit")
    unsicher_flag: bool = Field(default=False, alias="unsicherFlag")
    pruefbedarf_flag: bool = Field(default=False, alias="pruefbedarfFlag")

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        if value not in {"numerisch", "text"}:
            raise ValueError("Nur numerische oder textuelle Messwerte sind erlaubt.")
        return value


class ImportPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    schema_version: str = Field(alias="schemaVersion")
    quelle_typ: str = Field(alias="quelleTyp")
    person_hinweis: str | None = Field(default=None, alias="personHinweis")
    befund: ImportBefundPayload
    messwerte: list[ImportMesswertPayload]

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, value: str) -> str:
        if value != "1.0":
            raise ValueError("Es wird aktuell nur das Importschema 1.0 unterstützt.")
        return value


class ImportEntwurfCreate(BaseModel):
    payload_json: str
    person_id_override: str | None = None
    dokument_id: str | None = None
    bemerkung: str | None = None


class ImportParameterMapping(BaseModel):
    messwert_index: int
    laborparameter_id: str


class ImportUebernehmenRequest(BaseModel):
    bestaetige_warnungen: bool = False
    parameter_mappings: list[ImportParameterMapping] = []


class ImportPruefpunktRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    importvorgang_id: str
    objekt_typ: str
    objekt_schluessel_temp: str | None = None
    pruefart: str
    status: str
    meldung: str
    bestaetigt_vom_nutzer: bool
    bestaetigt_am: datetime | None = None


class ImportMesswertPreviewRead(BaseModel):
    messwert_index: int
    parameter_id: str | None = None
    original_parametername: str
    wert_typ: str
    wert_roh_text: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit_original: str | None = None
    bemerkung_kurz: str | None = None
    referenz_text_original: str | None = None


class ImportBefundPreviewRead(BaseModel):
    person_id: str | None = None
    labor_id: str | None = None
    labor_name: str | None = None
    entnahmedatum: date
    befunddatum: date | None = None
    bemerkung: str | None = None
    dokument_id: str | None = None
    dokument_dateiname: str | None = None
    dokument_pfad: str | None = None


class ImportvorgangListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quelle_typ: str
    status: str
    person_id_vorschlag: str | None = None
    schema_version: str | None = None
    bemerkung: str | None = None
    dokument_id: str | None = None
    dokument_dateiname: str | None = None
    messwerte_anzahl: int
    fehler_anzahl: int
    warnung_anzahl: int
    erstellt_am: datetime
    geaendert_am: datetime


class ImportvorgangDetailRead(BaseModel):
    id: str
    quelle_typ: str
    status: str
    person_id_vorschlag: str | None = None
    schema_version: str | None = None
    bemerkung: str | None = None
    warnungen_text: str | None = None
    fingerprint: str | None = None
    dokument_id: str | None = None
    dokument_dateiname: str | None = None
    erstellt_am: datetime
    geaendert_am: datetime
    messwerte_anzahl: int
    fehler_anzahl: int
    warnung_anzahl: int
    befund: ImportBefundPreviewRead
    messwerte: list[ImportMesswertPreviewRead]
    pruefpunkte: list[ImportPruefpunktRead]
