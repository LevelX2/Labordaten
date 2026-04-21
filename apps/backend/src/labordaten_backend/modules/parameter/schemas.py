from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from labordaten_backend.core.field_options import (
    UMRECHNUNGSREGEL_TYPEN,
    WERT_TYPEN,
    validate_required_code,
)


class ParameterCreate(BaseModel):
    interner_schluessel: str | None = None
    anzeigename: str
    beschreibung: str | None = None
    standard_einheit: str | None = None
    wert_typ_standard: str = "numerisch"
    sortierschluessel: str | None = None

    @field_validator("wert_typ_standard")
    @classmethod
    def validate_wert_typ_standard(cls, value: str) -> str:
        return validate_required_code(value, valid_values=WERT_TYPEN, field_label="Werttyp")


class ParameterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    interner_schluessel: str
    anzeigename: str
    beschreibung: str | None = None
    standard_einheit: str | None = None
    wert_typ_standard: str
    sortierschluessel: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime


class ParameterStandardEinheitUpdate(BaseModel):
    standard_einheit: str | None = None


class ParameterStandardEinheitUpdateResult(BaseModel):
    parameter_id: str
    parameter_anzeigename: str
    standard_einheit: str | None = None
    neu_berechnete_messwerte: int = 0


class ParameterAliasCreate(BaseModel):
    alias_text: str
    bemerkung: str | None = None


class ParameterAliasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    laborparameter_id: str
    alias_text: str
    alias_normalisiert: str
    bemerkung: str | None = None
    erstellt_am: datetime
    geaendert_am: datetime


class ParameterAliasSuggestionRead(BaseModel):
    laborparameter_id: str
    parameter_anzeigename: str
    alias_text: str
    alias_normalisiert: str
    vorkommen_anzahl: int
    letzte_verwendung_am: datetime | None = None


class ParameterUmrechnungsregelCreate(BaseModel):
    von_einheit: str
    nach_einheit: str
    regel_typ: str
    faktor: float | None = None
    offset: float | None = None
    formel_text: str | None = None
    rundung_stellen: int | None = None
    quelle_beschreibung: str | None = None
    bemerkung: str | None = None

    @field_validator("regel_typ")
    @classmethod
    def validate_regel_typ(cls, value: str) -> str:
        return validate_required_code(value, valid_values=UMRECHNUNGSREGEL_TYPEN, field_label="Regeltyp")

    @field_validator("rundung_stellen")
    @classmethod
    def validate_rundung_stellen(cls, value: int | None) -> int | None:
        if value is None:
            return None
        if value < 0 or value > 12:
            raise ValueError("Rundungsstellen müssen zwischen 0 und 12 liegen.")
        return value


class ParameterUmrechnungsregelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    laborparameter_id: str
    von_einheit: str
    nach_einheit: str
    regel_typ: str
    faktor: float | None = None
    offset: float | None = None
    formel_text: str | None = None
    rundung_stellen: int | None = None
    quelle_beschreibung: str | None = None
    bemerkung: str | None = None
    aktiv: bool
    erstellt_am: datetime
    geaendert_am: datetime


class ParameterGruppenzuordnungRead(BaseModel):
    id: str
    parameter_gruppe_id: str
    gruppenname: str
    gruppen_sortierschluessel: str | None = None
    sortierung: int | None = None


class ParameterUsageSummaryRead(BaseModel):
    parameter_id: str
    anzeigename: str
    interner_schluessel: str
    standard_einheit: str | None = None
    wert_typ_standard: str
    messwerte_anzahl: int = 0
    gruppen_anzahl: int = 0
    zielbereiche_anzahl: int = 0
    planung_zyklisch_anzahl: int = 0
    planung_einmalig_anzahl: int = 0
    alias_anzahl: int = 0


class ParameterDuplicateSuggestionRead(BaseModel):
    ziel_parameter_id: str
    ziel_parameter_anzeigename: str
    quell_parameter_id: str
    quell_parameter_anzeigename: str
    gemeinsamer_name_vorschlag: str
    begruendung: str
    aehnlichkeit: float
    einheiten_hinweis: str | None = None
    ziel_parameter: ParameterUsageSummaryRead
    quell_parameter: ParameterUsageSummaryRead


class ParameterMergeRequest(BaseModel):
    ziel_parameter_id: str
    quell_parameter_id: str
    gemeinsamer_name: str


class ParameterMergeResultRead(BaseModel):
    ziel_parameter_id: str
    geloeschter_parameter_id: str
    gemeinsamer_name: str
    angelegte_aliase: list[str] = []
    uebersprungene_aliase: list[str] = []
    verschobene_messwerte: int = 0
    verschobene_zielbereiche: int = 0
    verschobene_planung_zyklisch: int = 0
    verschobene_planung_einmalig: int = 0
    verschobene_gruppenzuordnungen: int = 0
    entfernte_doppelte_gruppenzuordnungen: int = 0


class ParameterRenameRequest(BaseModel):
    neuer_name: str
    alten_namen_als_alias_anlegen: bool = True


class ParameterRenameResultRead(BaseModel):
    parameter_id: str
    neuer_name: str
    alter_name: str
    alias_angelegt: bool = False
    alias_name: str | None = None
