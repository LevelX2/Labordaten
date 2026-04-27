from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class Zielbereich(Base, TimestampMixin):
    __tablename__ = "zielbereich"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    laborparameter_id: Mapped[str] = mapped_column(ForeignKey("laborparameter.id"), nullable=False)
    zielbereich_quelle_id: Mapped[str | None] = mapped_column(ForeignKey("zielbereich_quelle.id"))
    wert_typ: Mapped[str] = mapped_column(String(20), nullable=False, default="numerisch")
    zielbereich_typ: Mapped[str] = mapped_column(String(40), nullable=False, default="allgemein")
    untere_grenze_num: Mapped[float | None] = mapped_column(Float)
    obere_grenze_num: Mapped[float | None] = mapped_column(Float)
    einheit: Mapped[str | None] = mapped_column(String(50))
    soll_text: Mapped[str | None] = mapped_column(Text)
    geschlecht_code: Mapped[str | None] = mapped_column(String(40))
    alter_min_tage: Mapped[int | None] = mapped_column(Integer)
    alter_max_tage: Mapped[int | None] = mapped_column(Integer)
    quelle_original_text: Mapped[str | None] = mapped_column(Text)
    quelle_stelle: Mapped[str | None] = mapped_column(String(255))
    bemerkung: Mapped[str | None] = mapped_column(Text)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
