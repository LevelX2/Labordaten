from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from labordaten_backend.core.field_options import PARAMETER_KLASSIFIKATIONEN, validate_required_code

BerichtSortierung = Literal["person_entnahmezeitpunkt", "person_berichtsgruppe_sortierung_entnahmezeitpunkt"]


class ArztberichtRequest(BaseModel):
    person_ids: list[str]
    laborparameter_ids: list[str] = []
    gruppen_ids: list[str] = []
    klassifikationen: list[str] = []
    labor_ids: list[str] = []
    datum_von: date | None = None
    datum_bis: date | None = None
    include_referenzbereich: bool = True
    include_referenzgrafik: bool = False
    include_labor: bool = True
    include_befundbemerkung: bool = True
    include_messwertbemerkung: bool = True
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)
    sortierung: BerichtSortierung = "person_entnahmezeitpunkt"
    auffaelligkeiten_zuerst: bool = False

    @field_validator("klassifikationen")
    @classmethod
    def validate_klassifikationen(cls, values: list[str]) -> list[str]:
        return [
            validate_required_code(value, valid_values=PARAMETER_KLASSIFIKATIONEN, field_label="Klassifikation")
            for value in values
        ]


class ArztberichtEintrag(BaseModel):
    messwert_id: str
    person_id: str
    person_anzeigename: str
    laborparameter_id: str
    parameter_anzeigename: str
    parameter_primaere_klassifikation: str | None = None
    datum: date | None = None
    wert_typ: str
    wert_anzeige: str
    wert_num: float | None = None
    einheit: str | None = None
    wert_original_num: float | None = None
    einheit_original: str | None = None
    wert_normiert_num: float | None = None
    einheit_normiert: str | None = None
    referenzbereich: str | None = None
    referenz_untere_num: float | None = None
    referenz_obere_num: float | None = None
    referenz_einheit: str | None = None
    labor_name: str | None = None
    befundbemerkung: str | None = None
    messwertbemerkung: str | None = None
    gruppen_namen: list[str] = Field(default_factory=list)
    primaere_berichtsgruppe: str | None = None
    sortierung_in_gruppe: int | None = None
    ausserhalb_referenzbereich: bool | None = None


class ArztberichtResponse(BaseModel):
    person_ids: list[str]
    eintraege: list[ArztberichtEintrag]


class VerlaufsberichtRequest(BaseModel):
    person_ids: list[str]
    laborparameter_ids: list[str] = []
    gruppen_ids: list[str] = []
    klassifikationen: list[str] = []
    labor_ids: list[str] = []
    datum_von: date | None = None
    datum_bis: date | None = None
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)
    sortierung: BerichtSortierung = "person_entnahmezeitpunkt"
    auffaelligkeiten_zuerst: bool = False

    @field_validator("klassifikationen")
    @classmethod
    def validate_klassifikationen(cls, values: list[str]) -> list[str]:
        return [
            validate_required_code(value, valid_values=PARAMETER_KLASSIFIKATIONEN, field_label="Klassifikation")
            for value in values
        ]


class VerlaufsberichtPunkt(BaseModel):
    messwert_id: str
    person_id: str
    person_anzeigename: str
    laborparameter_id: str
    parameter_anzeigename: str
    parameter_primaere_klassifikation: str | None = None
    datum: date | None = None
    wert_typ: str
    wert_anzeige: str
    wert_num: float | None = None
    wert_text: str | None = None
    einheit: str | None = None
    wert_original_num: float | None = None
    einheit_original: str | None = None
    wert_normiert_num: float | None = None
    einheit_normiert: str | None = None
    labor_name: str | None = None
    gruppen_namen: list[str] = Field(default_factory=list)
    primaere_berichtsgruppe: str | None = None
    sortierung_in_gruppe: int | None = None
    ausserhalb_referenzbereich: bool | None = None


class VerlaufsberichtResponse(BaseModel):
    person_ids: list[str]
    punkte: list[VerlaufsberichtPunkt]
