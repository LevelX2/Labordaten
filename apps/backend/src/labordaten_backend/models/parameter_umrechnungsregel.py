from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class ParameterUmrechnungsregel(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "parameter_umrechnungsregel"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    von_einheit: Mapped[str] = mapped_column(String(50), nullable=False)
    nach_einheit: Mapped[str] = mapped_column(String(50), nullable=False)
    regel_typ: Mapped[str] = mapped_column(String(30), nullable=False)
    faktor: Mapped[float | None] = mapped_column(Float)
    offset: Mapped[float | None] = mapped_column(Float)
    formel_text: Mapped[str | None] = mapped_column(Text)
    rundung_stellen: Mapped[int | None] = mapped_column(Integer)
    quelle_beschreibung: Mapped[str | None] = mapped_column(Text)
    bemerkung: Mapped[str | None] = mapped_column(Text)
