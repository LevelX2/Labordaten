from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class PlanungZyklisch(Base, TimestampMixin):
    __tablename__ = "planung_zyklisch"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), nullable=False)
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    intervall_wert: Mapped[int] = mapped_column(Integer, nullable=False)
    intervall_typ: Mapped[str] = mapped_column(String(20), nullable=False, default="monate")
    startdatum: Mapped[date] = mapped_column(Date, nullable=False)
    enddatum: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="aktiv")
    prioritaet: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    karenz_tage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    letzte_relevante_messung_id: Mapped[str | None] = mapped_column(ForeignKey("messwert.id"))
    naechste_faelligkeit: Mapped[date | None] = mapped_column(Date)
