from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class ParameterDublettenausschluss(Base, TimestampMixin):
    __tablename__ = "parameter_dublettenausschluss"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    erster_parameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    zweiter_parameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    paar_schluessel: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
