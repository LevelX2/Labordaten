from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, utcnow


class ImportPruefpunkt(Base):
    __tablename__ = "import_pruefpunkt"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    importvorgang_id: Mapped[str] = mapped_column(ForeignKey("importvorgang.id"), nullable=False)
    objekt_typ: Mapped[str] = mapped_column(String(40), nullable=False)
    objekt_schluessel_temp: Mapped[str | None] = mapped_column(String(120))
    pruefart: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    meldung: Mapped[str] = mapped_column(Text, nullable=False)
    bestaetigt_vom_nutzer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    bestaetigt_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
