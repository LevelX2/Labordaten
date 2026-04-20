from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base


class ZielbereichPersonOverride(Base):
    __tablename__ = "zielbereich_person_override"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), nullable=False)
    zielbereich_id: Mapped[str] = mapped_column(ForeignKey("zielbereich.id"), nullable=False)
    untere_grenze_num: Mapped[float | None] = mapped_column(Float)
    obere_grenze_num: Mapped[float | None] = mapped_column(Float)
    einheit: Mapped[str | None] = mapped_column(String(50))
    soll_text: Mapped[str | None] = mapped_column(Text)
    bemerkung: Mapped[str | None] = mapped_column(Text)
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)
    erstellt_am: Mapped[str | None] = mapped_column(String(40))

