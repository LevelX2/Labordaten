from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class Messwert(Base, TimestampMixin):
    __tablename__ = "messwert"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), nullable=False)
    befund_id: Mapped[str] = mapped_column(ForeignKey("befund.id"), nullable=False)
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    original_parametername: Mapped[str] = mapped_column(String(200), nullable=False)
    wert_typ: Mapped[str] = mapped_column(String(20), nullable=False)
    wert_operator: Mapped[str] = mapped_column(String(30), nullable=False, default="exakt")
    wert_roh_text: Mapped[str] = mapped_column(Text, nullable=False)
    wert_num: Mapped[float | None] = mapped_column(Float)
    wert_text: Mapped[str | None] = mapped_column(Text)
    einheit_original: Mapped[str | None] = mapped_column(String(50))
    wert_normiert_num: Mapped[float | None] = mapped_column(Float)
    einheit_normiert: Mapped[str | None] = mapped_column(String(50))
    umrechnungsregel_id: Mapped[str | None] = mapped_column(String(36))
    bemerkung_kurz: Mapped[str | None] = mapped_column(String(255))
    bemerkung_lang: Mapped[str | None] = mapped_column(Text)
    unsicher_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    pruefbedarf_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    importvorgang_id: Mapped[str | None] = mapped_column(ForeignKey("importvorgang.id"))

