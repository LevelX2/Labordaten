from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class Laborparameter(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "laborparameter"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    interner_schluessel: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    anzeigename: Mapped[str] = mapped_column(String(200), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text)
    standard_einheit: Mapped[str | None] = mapped_column(String(50))
    wert_typ_standard: Mapped[str] = mapped_column(String(20), nullable=False, default="numerisch")
    wissensseite_id: Mapped[str | None] = mapped_column(ForeignKey("wissensseite.id"))
    sortierschluessel: Mapped[str | None] = mapped_column(String(120))

