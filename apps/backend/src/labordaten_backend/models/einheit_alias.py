from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class EinheitAlias(Base, TimestampMixin):
    __tablename__ = "einheit_alias"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    einheit_id: Mapped[str] = mapped_column(ForeignKey("einheit.id"), nullable=False)
    alias_text: Mapped[str] = mapped_column(String(50), nullable=False)
    alias_normalisiert: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    bemerkung: Mapped[str | None] = mapped_column(Text)
