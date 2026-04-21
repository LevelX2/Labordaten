from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import ActiveMixin, Base, TimestampMixin


class Einheit(Base, TimestampMixin, ActiveMixin):
    __tablename__ = "einheit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kuerzel: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
