from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class Labor(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "labor"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    adresse: Mapped[str | None] = mapped_column(Text)
    bemerkung: Mapped[str | None] = mapped_column(Text)

