from __future__ import annotations

import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from labordaten_backend.models.base import Base


class Wissensseite(Base):
    __tablename__ = "wissensseite"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pfad_relativ: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    titel_cache: Mapped[str | None] = mapped_column(String(255))
    alias_cache: Mapped[str | None] = mapped_column(Text)
    frontmatter_json: Mapped[str | None] = mapped_column(Text)
    letzter_scan_am: Mapped[str | None] = mapped_column(String(40))
    aktiv: Mapped[bool] = mapped_column(Boolean, default=True)

