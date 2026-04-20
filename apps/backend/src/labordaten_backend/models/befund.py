from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class Befund(Base, TimestampMixin):
    __tablename__ = "befund"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), nullable=False)
    labor_id: Mapped[str | None] = mapped_column(ForeignKey("labor.id"))
    dokument_id: Mapped[str | None] = mapped_column(ForeignKey("dokument.id"))
    entnahmedatum: Mapped[date | None] = mapped_column(Date)
    befunddatum: Mapped[date | None] = mapped_column(Date)
    eingangsdatum: Mapped[date | None] = mapped_column(Date)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    importvorgang_id: Mapped[str | None] = mapped_column(ForeignKey("importvorgang.id"))
    quelle_typ: Mapped[str] = mapped_column(String(30), nullable=False, default="manuell")
    duplikat_warnung: Mapped[bool] = mapped_column(Boolean, default=False)

