from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class ParameterGruppe(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "parameter_gruppe"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    beschreibung: Mapped[str | None] = mapped_column(Text)
    wissensseite_id: Mapped[str | None] = mapped_column(ForeignKey("wissensseite.id"))
