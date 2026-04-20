from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class PlanungEinmalig(Base, TimestampMixin):
    __tablename__ = "planung_einmalig"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), nullable=False)
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="offen")
    zieltermin_datum: Mapped[date | None] = mapped_column(Date)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    erledigt_durch_messwert_id: Mapped[str | None] = mapped_column(ForeignKey("messwert.id"))
