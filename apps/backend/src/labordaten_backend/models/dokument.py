from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base


class Dokument(Base):
    __tablename__ = "dokument"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dokument_typ: Mapped[str] = mapped_column(String(50), nullable=False)
    pfad_relativ: Mapped[str | None] = mapped_column(Text)
    pfad_absolut: Mapped[str | None] = mapped_column(Text)
    dateiname: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_typ: Mapped[str | None] = mapped_column(String(100))
    dateigroesse_bytes: Mapped[int | None] = mapped_column(Integer)
    checksumme_sha256: Mapped[str | None] = mapped_column(String(64))
    originalquelle_behalten: Mapped[bool] = mapped_column(Boolean, default=False)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    erstellt_am: Mapped[str | None] = mapped_column(String(40))

