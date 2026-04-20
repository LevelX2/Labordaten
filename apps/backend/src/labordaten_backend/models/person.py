from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class Person(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "person"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    anzeigename: Mapped[str] = mapped_column(String(200), nullable=False)
    vollname: Mapped[str | None] = mapped_column(String(200))
    geburtsdatum: Mapped[date] = mapped_column(Date, nullable=False)
    geschlecht_code: Mapped[str | None] = mapped_column(String(40))
    blutgruppe: Mapped[str | None] = mapped_column(String(20))
    rhesusfaktor: Mapped[str | None] = mapped_column(String(10))
    hinweise_allgemein: Mapped[str | None] = mapped_column(Text)

