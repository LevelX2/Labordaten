from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from labordaten_backend.core.documents import get_documents_root
from labordaten_backend.models.dokument import Dokument


def get_dokument(db: Session, dokument_id: str) -> Dokument | None:
    return db.get(Dokument, dokument_id)


def resolve_dokument_path(dokument: Dokument) -> Path:
    root = get_documents_root()

    if dokument.pfad_relativ:
        relative_path = (root / dokument.pfad_relativ).resolve()
        try:
            relative_path.relative_to(root)
        except ValueError as exc:
            raise ValueError("Der relative Dokumentpfad liegt außerhalb der konfigurierten Dokumentablage.") from exc
        if relative_path.exists() and relative_path.is_file():
            return relative_path

    if dokument.pfad_absolut:
        absolute_path = Path(dokument.pfad_absolut).expanduser().resolve()
        if absolute_path.exists() and absolute_path.is_file():
            return absolute_path

    raise ValueError(f"Die Datei für das Dokument '{dokument.dateiname}' wurde nicht gefunden.")
