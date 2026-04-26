from datetime import date

from pydantic import BaseModel, field_validator

from labordaten_backend.core.field_options import PARAMETER_KLASSIFIKATIONEN, validate_required_code


class GesamtzahlenResponse(BaseModel):
    personen_anzahl: int
    parameter_anzahl: int
    messwerte_anzahl: int
    befunde_anzahl: int


class AuswertungRequest(BaseModel):
    person_ids: list[str]
    laborparameter_ids: list[str] = []
    gruppen_ids: list[str] = []
    klassifikationen: list[str] = []
    labor_ids: list[str] = []
    datum_von: date | None = None
    datum_bis: date | None = None
    include_laborreferenz: bool = True
    include_zielbereich: bool = True

    @field_validator("klassifikationen")
    @classmethod
    def validate_klassifikationen(cls, values: list[str]) -> list[str]:
        return [
            validate_required_code(value, valid_values=PARAMETER_KLASSIFIKATIONEN, field_label="Klassifikation")
            for value in values
        ]


class AuswertungsStatistik(BaseModel):
    anzahl_messungen: int
    personen_anzahl: int = 0
    zeitraum_von: date | None = None
    zeitraum_bis: date | None = None
    letzte_messung_datum: date | None = None
    letzter_wert_anzeige: str | None = None
    minimum_num: float | None = None
    maximum_num: float | None = None
    trendrichtung: str = "unveraendert"


class AuswertungPunkt(BaseModel):
    messwert_id: str
    person_id: str
    person_anzeigename: str
    parameter_primaere_klassifikation: str | None = None
    datum: date | None = None
    wert_typ: str
    wert_operator: str = "exakt"
    wert_anzeige: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit: str | None = None
    labor_name: str | None = None
    befundbemerkung: str | None = None
    messwertbemerkung: str | None = None
    laborreferenz_untere_num: float | None = None
    laborreferenz_obere_num: float | None = None
    laborreferenz_einheit: str | None = None
    laborreferenz_text: str | None = None
    zielbereich_untere_num: float | None = None
    zielbereich_obere_num: float | None = None
    zielbereich_einheit: str | None = None
    zielbereich_text: str | None = None


class AuswertungsSerie(BaseModel):
    laborparameter_id: str
    parameter_anzeigename: str
    parameter_primaere_klassifikation: str | None = None
    wert_typ_standard: str
    standard_einheit: str | None = None
    statistik: AuswertungsStatistik
    punkte: list[AuswertungPunkt]


class AuswertungResponse(BaseModel):
    person_ids: list[str]
    serien: list[AuswertungsSerie]
