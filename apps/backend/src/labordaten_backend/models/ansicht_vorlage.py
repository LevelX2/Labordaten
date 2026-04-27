from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class AnsichtVorlage(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "ansicht_vorlage"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    bereich: Mapped[str] = mapped_column(String(40), nullable=False)
    vorlage_typ: Mapped[str] = mapped_column(String(60), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text)
    konfiguration_json: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1")
    sortierung: Mapped[int | None] = mapped_column(Integer)
    zuletzt_verwendet_am: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
