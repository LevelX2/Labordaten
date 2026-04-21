from datetime import date

from pydantic import BaseModel, Field


class ArztberichtRequest(BaseModel):
    person_ids: list[str]
    laborparameter_ids: list[str] = []
    gruppen_ids: list[str] = []
    labor_ids: list[str] = []
    datum_von: date | None = None
    datum_bis: date | None = None
    include_referenzbereich: bool = True
    include_labor: bool = True
    include_befundbemerkung: bool = True
    include_messwertbemerkung: bool = True
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)


class ArztberichtEintrag(BaseModel):
    messwert_id: str
    person_id: str
    person_anzeigename: str
    laborparameter_id: str
    parameter_anzeigename: str
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
    labor_name: str | None = None
    befundbemerkung: str | None = None
    messwertbemerkung: str | None = None
    gruppen_namen: list[str] = []
    ausserhalb_referenzbereich: bool | None = None


class ArztberichtResponse(BaseModel):
    person_ids: list[str]
    eintraege: list[ArztberichtEintrag]


class VerlaufsberichtRequest(BaseModel):
    person_ids: list[str]
    laborparameter_ids: list[str] = []
    gruppen_ids: list[str] = []
    labor_ids: list[str] = []
    datum_von: date | None = None
    datum_bis: date | None = None
    einheit_auswahl: dict[str, str] = Field(default_factory=dict)


class VerlaufsberichtPunkt(BaseModel):
    messwert_id: str
    person_id: str
    person_anzeigename: str
    laborparameter_id: str
    parameter_anzeigename: str
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
    gruppen_namen: list[str] = []
    ausserhalb_referenzbereich: bool | None = None


class VerlaufsberichtResponse(BaseModel):
    person_ids: list[str]
    punkte: list[VerlaufsberichtPunkt]
