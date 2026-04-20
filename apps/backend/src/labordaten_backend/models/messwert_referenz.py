from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base


class MesswertReferenz(Base):
    __tablename__ = "messwert_referenz"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    messwert_id: Mapped[str] = mapped_column(ForeignKey("messwert.id"), nullable=False)
    referenz_typ: Mapped[str] = mapped_column(String(30), nullable=False, default="labor")
    referenz_text_original: Mapped[str | None] = mapped_column(Text)
    wert_typ: Mapped[str] = mapped_column(String(20), nullable=False, default="numerisch")
    untere_grenze_num: Mapped[float | None] = mapped_column(Float)
    obere_grenze_num: Mapped[float | None] = mapped_column(Float)
    einheit: Mapped[str | None] = mapped_column(String(50))
    soll_text: Mapped[str | None] = mapped_column(Text)
    geschlecht_code: Mapped[str | None] = mapped_column(String(40))
    alter_min_tage: Mapped[int | None] = mapped_column(Integer)
    alter_max_tage: Mapped[int | None] = mapped_column(Integer)
    bemerkung: Mapped[str | None] = mapped_column(Text)

