from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class ParameterKlassifikation(Base, TimestampMixin):
    __tablename__ = "parameter_klassifikation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    klassifikation: Mapped[str] = mapped_column(String(40), nullable=False)
    kontext_beschreibung: Mapped[str | None] = mapped_column(Text)
    begruendung: Mapped[str | None] = mapped_column(Text)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
