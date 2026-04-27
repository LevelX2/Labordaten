from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class ZielbereichQuelle(Base, TimestampMixin):
    __tablename__ = "zielbereich_quelle"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quellen_typ: Mapped[str] = mapped_column(String(40), nullable=False, default="experte")
    titel: Mapped[str | None] = mapped_column(String(255))
    jahr: Mapped[int | None] = mapped_column(Integer)
    version: Mapped[str | None] = mapped_column(String(80))
    bemerkung: Mapped[str | None] = mapped_column(Text)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
