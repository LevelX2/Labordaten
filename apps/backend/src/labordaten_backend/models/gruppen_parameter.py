from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class GruppenParameter(Base, TimestampMixin):
    __tablename__ = "gruppen_parameter"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parameter_gruppe_id: Mapped[str] = mapped_column(ForeignKey("parameter_gruppe.id"), nullable=False)
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    sortierung: Mapped[int | None] = mapped_column(Integer)
