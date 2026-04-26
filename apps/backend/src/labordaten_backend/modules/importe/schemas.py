from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from labordaten_backend.core.field_options import (
    GESCHLECHT_CODES,
    PARAMETER_KLASSIFIKATIONEN,
    REFERENZ_GRENZ_OPERATOREN,
    WERT_OPERATOREN,
    WERT_TYPEN,
    validate_optional_code,
    validate_required_code,
)
from labordaten_backend.core.labor_value_formatting import (
    DEFAULT_LOWER_REFERENCE_OPERATOR,
    DEFAULT_UPPER_REFERENCE_OPERATOR,
)


class ImportBefundPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    person_id: str | None = Field(default=None, alias="personId")
    labor_id: str | None = Field(default=None, alias="laborId")
    labor_name: str | None = Field(default=None, alias="laborName")
    entnahmedatum: date = Field(alias="entnahmedatum")
    befunddatum: date | None = Field(default=None, alias="befunddatum")
    bemerkung: str | None = None
    dokument_pfad: str | None = Field(default=None, alias="dokumentPfad")


class ImportGruppenvorschlagPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    beschreibung: str | None = None
    messwert_indizes: list[int] = Field(alias="messwertIndizes")


class ImportParameterVorschlagPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    anzeigename: str
    wert_typ_standard: str | None = Field(default=None, alias="wertTypStandard")
    standard_einheit: str | None = Field(default=None, alias="standardEinheit")
    primaere_klassifikation: str | None = Field(default=None, alias="primaereKlassifikation")
    beschreibung_kurz: str | None = Field(default=None, alias="beschreibungKurz")
    moegliche_aliase: list[str] = Field(default_factory=list, alias="moeglicheAliase")
    begruendung_aus_dokument: str | None = Field(default=None, alias="begruendungAusDokument")
    unsicher_flag: bool = Field(default=False, alias="unsicherFlag")
    messwert_indizes: list[int] = Field(alias="messwertIndizes")

    @field_validator("wert_typ_standard")
    @classmethod
    def validate_wert_typ_standard(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

    @field_validator("primaere_klassifikation")
    @classmethod
    def validate_primaere_klassifikation(cls, value: str | None) -> str | None:
        return validate_optional_code(
            value,
            valid_values=PARAMETER_KLASSIFIKATIONEN,
            field_label="Primäre Klassifikation",
        )


class ImportMesswertPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    uebernahme_status: Literal["offen", "ignoriert"] = Field(default="offen", alias="uebernahmeStatus")
    pruef_aktion: Literal["vorhanden", "neu"] | None = Field(default=None, alias="pruefAktion")
    pruef_laborparameter_id: str | None = Field(default=None, alias="pruefLaborparameterId")
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
    ki_hinweis: str | None = Field(default=None, alias="kiHinweis")
    referenz_text_original: str | None = Field(default=None, alias="referenzTextOriginal")
    untere_grenze_num: float | None = Field(default=None, alias="untereGrenzeNum")
    untere_grenze_operator: str | None = Field(default=None, alias="untereGrenzeOperator")
    obere_grenze_num: float | None = Field(default=None, alias="obereGrenzeNum")
    obere_grenze_operator: str | None = Field(default=None, alias="obereGrenzeOperator")
    referenz_einheit: str | None = Field(default=None, alias="referenzEinheit")
    referenz_geschlecht_code: str | None = Field(default=None, alias="referenzGeschlechtCode")
    referenz_alter_min_tage: int | None = Field(default=None, alias="referenzAlterMinTage")
    referenz_alter_max_tage: int | None = Field(default=None, alias="referenzAlterMaxTage")
    referenz_bemerkung: str | None = Field(default=None, alias="referenzBemerkung")
    alias_uebernehmen: bool = Field(default=False, alias="aliasUebernehmen")
    unsicher_flag: bool = Field(default=False, alias="unsicherFlag")
    pruefbedarf_flag: bool = Field(default=False, alias="pruefbedarfFlag")

    @field_validator("wert_typ")
    @classmethod
    def validate_wert_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")

    @field_validator("wert_operator", mode="before")
    @classmethod
    def normalize_legacy_wert_operator(cls, value: str | None) -> str | None:
        if value is None:
            return value
        legacy_map = {
            "<": "kleiner_als",
            "<=": "kleiner_gleich",
            ">": "groesser_als",
            ">=": "groesser_gleich",
            "~": "ungefaehr",
        }
        return legacy_map.get(value, value)

    @field_validator("wert_operator")
    @classmethod
    def validate_wert_operator(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_OPERATOREN, field_label="Wertoperator")

    @field_validator("referenz_geschlecht_code")
    @classmethod
    def validate_referenz_geschlecht_code(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=GESCHLECHT_CODES, field_label="Geschlecht")

    @field_validator("untere_grenze_operator", "obere_grenze_operator")
    @classmethod
    def validate_grenze_operator(cls, value: str | None) -> str | None:
        return validate_optional_code(value, valid_values=REFERENZ_GRENZ_OPERATOREN, field_label="Grenzoperator")

    @field_validator("untere_grenze_operator", mode="after")
    @classmethod
    def default_untere_grenze_operator(cls, value: str | None, info) -> str | None:
        if info.data.get("untere_grenze_num") is not None and value is None:
            return DEFAULT_LOWER_REFERENCE_OPERATOR
        return value

    @field_validator("obere_grenze_operator", mode="after")
    @classmethod
    def default_obere_grenze_operator(cls, value: str | None, info) -> str | None:
        if info.data.get("obere_grenze_num") is not None and value is None:
            return DEFAULT_UPPER_REFERENCE_OPERATOR
        return value

    @model_validator(mode="after")
    def validate_reference_bound_operators(self) -> "ImportMesswertPayload":
        if self.untere_grenze_operator and not self.untere_grenze_operator.startswith("groesser"):
            raise ValueError("Die untere Referenzgrenze braucht 'groesser_als' oder 'groesser_gleich'.")
        if self.obere_grenze_operator and not self.obere_grenze_operator.startswith("kleiner"):
            raise ValueError("Die obere Referenzgrenze braucht 'kleiner_als' oder 'kleiner_gleich'.")
        return self


class ImportPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    schema_version: str = Field(alias="schemaVersion")
    quelle_typ: str = Field(alias="quelleTyp")
    person_hinweis: str | None = Field(default=None, alias="personHinweis")
    befund: ImportBefundPayload
    messwerte: list[ImportMesswertPayload]
    gruppen_vorschlaege: list[ImportGruppenvorschlagPayload] = Field(default_factory=list, alias="gruppenVorschlaege")
    parameter_vorschlaege: list[ImportParameterVorschlagPayload] = Field(
        default_factory=list,
        alias="parameterVorschlaege",
    )

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


class ImportPromptCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    prompt_typ: Literal["laborbericht", "tabelle"] = Field(default="laborbericht", alias="promptTyp")


class ImportPromptRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    prompt_text: str = Field(alias="promptText")
    kontext_zusammenfassung: str = Field(alias="kontextZusammenfassung")
    schema_version: str = Field(alias="schemaVersion")


class ImportParameterMapping(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messwert_index: int
    aktion: Literal["vorhanden", "neu", "ignorieren"] = "vorhanden"
    laborparameter_id: str | None = None
    neuer_parameter_name: str | None = Field(default=None, alias="neuerParameterName")
    alias_uebernehmen: bool = False


class ImportUebernehmenRequest(BaseModel):
    bestaetige_warnungen: bool = False
    person_id_override: str | None = None
    parameter_mappings: list[ImportParameterMapping] = []


class ImportPruefentscheidungRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    person_id: str | None = Field(default=None, alias="personId")
    messwert_index: int | None = Field(default=None, alias="messwertIndex")
    aktion: Literal["vorhanden", "neu", "ignorieren", "zuruecksetzen"] | None = None
    laborparameter_id: str | None = Field(default=None, alias="laborparameterId")
    alias_uebernehmen: bool | None = Field(default=None, alias="aliasUebernehmen")


class ImportKomplettEntfernenRequest(BaseModel):
    dokument_entfernen: bool = False


class ImportKomplettEntfernenRead(BaseModel):
    import_id: str
    dokument_id: str | None = None
    dokument_entfernt: bool = False
    pruefpunkte_entfernt: int = 0


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


class ImportAehnlicheGruppeRead(BaseModel):
    gruppe_id: str
    name: str
    parameter_anzahl: int
    gemeinsame_parameter_anzahl: int
    gemeinsame_parameter_namen: list[str] = []
    namensaehnlich: bool = False


class ImportGruppenvorschlagRead(BaseModel):
    index: int
    name: str
    beschreibung: str | None = None
    messwert_indizes: list[int]
    parameter_ids: list[str] = []
    parameter_namen: list[str] = []
    fehlende_messwert_indizes: list[int] = []
    aehnliche_gruppen: list[ImportAehnlicheGruppeRead] = []
    anwendbar: bool = False


class ImportParameterVorschlagRead(BaseModel):
    index: int
    anzeigename: str
    wert_typ_standard: str | None = None
    standard_einheit: str | None = None
    primaere_klassifikation: str | None = None
    beschreibung_kurz: str | None = None
    moegliche_aliase: list[str] = Field(default_factory=list)
    begruendung_aus_dokument: str | None = None
    unsicher_flag: bool = False
    messwert_indizes: list[int] = Field(default_factory=list)


class ImportMesswertPreviewRead(BaseModel):
    messwert_index: int
    parameter_id: str | None = None
    parameter_mapping_herkunft: str | None = None
    parameter_mapping_hinweis: str | None = None
    alias_uebernehmen: bool = False
    original_parametername: str
    wert_typ: str
    wert_operator: str = "exakt"
    wert_roh_text: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit_original: str | None = None
    bemerkung_kurz: str | None = None
    bemerkung_lang: str | None = None
    ki_hinweis: str | None = None
    unsicher_flag: bool = False
    pruefbedarf_flag: bool = False
    referenz_text_original: str | None = None
    untere_grenze_num: float | None = None
    untere_grenze_operator: str | None = None
    obere_grenze_num: float | None = None
    obere_grenze_operator: str | None = None
    referenz_einheit: str | None = None
    referenz_geschlecht_code: str | None = None
    referenz_alter_min_tage: int | None = None
    referenz_alter_max_tage: int | None = None
    referenz_bemerkung: str | None = None
    parameter_vorschlag: ImportParameterVorschlagRead | None = None


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
    gruppenvorschlaege: list[ImportGruppenvorschlagRead] = []
    parameter_vorschlaege: list[ImportParameterVorschlagRead] = Field(default_factory=list)
    pruefpunkte: list[ImportPruefpunktRead]


class ImportGruppenvorschlagAnwendenItem(BaseModel):
    vorschlag_index: int
    aktion: str
    gruppe_id: str | None = None
    gruppenname: str | None = None

    @field_validator("aktion")
    @classmethod
    def validate_aktion(cls, value: str) -> str:
        if value not in {"neu", "vorhanden", "ignorieren"}:
            raise ValueError("Aktion muss 'neu', 'vorhanden' oder 'ignorieren' sein.")
        return value


class ImportGruppenvorschlaegeAnwendenRequest(BaseModel):
    vorschlaege: list[ImportGruppenvorschlagAnwendenItem]


class ImportGruppenvorschlagErgebnisRead(BaseModel):
    vorschlag_index: int
    aktion: str
    gruppe_id: str | None = None
    gruppenname: str | None = None
    zugeordnete_parameter_anzahl: int = 0


class ImportGruppenvorschlaegeAnwendenResponse(BaseModel):
    ergebnisse: list[ImportGruppenvorschlagErgebnisRead]
