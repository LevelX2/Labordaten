from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base, TimestampMixin


class Importvorgang(Base, TimestampMixin):
    __tablename__ = "importvorgang"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quelle_typ: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="neu")
    person_id_vorschlag: Mapped[str | None] = mapped_column(ForeignKey("person.id"))
    dokument_id: Mapped[str | None] = mapped_column(ForeignKey("dokument.id"))
    roh_payload_text: Mapped[str | None] = mapped_column(Text)
    schema_version: Mapped[str | None] = mapped_column(String(30))
    fingerprint: Mapped[str | None] = mapped_column(String(120))
    warnungen_text: Mapped[str | None] = mapped_column(Text)
    bemerkung: Mapped[str | None] = mapped_column(Text)

