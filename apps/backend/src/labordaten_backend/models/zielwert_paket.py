from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class ZielwertPaket(Base, TimestampMixin):
    __tablename__ = "zielwert_paket"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    paket_schluessel: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    zielbereich_quelle_id: Mapped[str | None] = mapped_column(ForeignKey("zielbereich_quelle.id"))
    version: Mapped[str | None] = mapped_column(String(80))
    jahr: Mapped[int | None] = mapped_column(Integer)
    beschreibung: Mapped[str | None] = mapped_column(Text)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
