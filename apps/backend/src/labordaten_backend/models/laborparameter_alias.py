from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class LaborparameterAlias(Base, TimestampMixin):
    __tablename__ = "laborparameter_alias"
    __table_args__ = (
        UniqueConstraint("laborparameter_id", "alias_normalisiert", name="uq_laborparameter_alias_parameter_alias"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    alias_text: Mapped[str] = mapped_column(String(200), nullable=False)
    alias_normalisiert: Mapped[str] = mapped_column(String(200), nullable=False)
    bemerkung: Mapped[str | None] = mapped_column(Text)
