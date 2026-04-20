from pydantic import BaseModel, ConfigDict, model_validator


class ReferenzCreate(BaseModel):
    referenz_typ: str = "labor"
    wert_typ: str = "numerisch"
    referenz_text_original: str | None = None
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None

    @model_validator(mode="after")
    def validate_reference(self) -> "ReferenzCreate":
      if self.wert_typ == "numerisch" and self.untere_grenze_num is None and self.obere_grenze_num is None and not self.referenz_text_original:
          raise ValueError("Numerische Referenzen brauchen Grenzen oder einen Originaltext.")
      if self.wert_typ == "text" and not (self.soll_text or self.referenz_text_original):
          raise ValueError("Textreferenzen brauchen einen Solltext oder Originaltext.")
      return self


class ReferenzRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    messwert_id: str
    referenz_typ: str
    referenz_text_original: str | None = None
    wert_typ: str
    untere_grenze_num: float | None = None
    obere_grenze_num: float | None = None
    einheit: str | None = None
    soll_text: str | None = None
    geschlecht_code: str | None = None
    alter_min_tage: int | None = None
    alter_max_tage: int | None = None
    bemerkung: str | None = None

