from datetime import date

from pydantic import BaseModel


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


class ArztberichtEintrag(BaseModel):
    person_id: str
    person_anzeigename: str
    laborparameter_id: str
    parameter_anzeigename: str
    datum: date | None = None
    wert_anzeige: str
    einheit: str | None = None
    referenzbereich: str | None = None
    labor_name: str | None = None
    befundbemerkung: str | None = None
    messwertbemerkung: str | None = None


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


class VerlaufsberichtPunkt(BaseModel):
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
    labor_name: str | None = None


class VerlaufsberichtResponse(BaseModel):
    person_ids: list[str]
    punkte: list[VerlaufsberichtPunkt]
