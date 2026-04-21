from __future__ import annotations

import hashlib
import mimetypes
import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from labordaten_backend.core.runtime_settings import get_runtime_settings_store
from labordaten_backend.models.base import utcnow
from labordaten_backend.models.dokument import Dokument


def get_documents_root() -> Path:
    runtime_settings = get_runtime_settings_store().get()
    root = Path(runtime_settings.documents_path).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def store_document_file(
    *,
    content: bytes,
    original_filename: str,
    content_type: str | None,
    dokument_typ: str,
    originalquelle_behalten: bool,
    bemerkung: str | None = None,
) -> Dokument:
    root = get_documents_root()
    now = datetime.now()
    target_dir = root / dokument_typ / now.strftime("%Y") / now.strftime("%m")
    target_dir.mkdir(parents=True, exist_ok=True)

    original_name = original_filename or f"{dokument_typ}.bin"
    ext = Path(original_name).suffix
    stem = Path(original_name).stem or dokument_typ
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or dokument_typ
    stored_name = f"{now.strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}_{safe_stem}{ext}"
    target_path = target_dir / stored_name
    target_path.write_bytes(content)

    checksum = hashlib.sha256(content).hexdigest()
    relative_path = target_path.relative_to(root).as_posix()

    return Dokument(
        dokument_typ=dokument_typ,
        pfad_relativ=relative_path,
        pfad_absolut=str(target_path),
        dateiname=original_name,
        mime_typ=content_type,
        dateigroesse_bytes=len(content),
        checksumme_sha256=checksum,
        originalquelle_behalten=originalquelle_behalten,
        bemerkung=bemerkung,
        erstellt_am=utcnow().isoformat(),
    )


def store_existing_document_path(
    *,
    source_path: str | Path,
    dokument_typ: str,
    originalquelle_behalten: bool,
    bemerkung: str | None = None,
) -> Dokument:
    source = Path(source_path).expanduser().resolve()
    if not source.exists():
        raise ValueError(f"Die Dokumentquelle '{source}' wurde nicht gefunden.")
    if not source.is_file():
        raise ValueError(f"Die Dokumentquelle '{source}' ist keine Datei.")

    content_type, _ = mimetypes.guess_type(source.name)
    source_note = f"Originalpfad: {source}"
    merged_bemerkung = source_note if not bemerkung else f"{bemerkung}\n{source_note}"

    return store_document_file(
        content=source.read_bytes(),
        original_filename=source.name,
        content_type=content_type,
        dokument_typ=dokument_typ,
        originalquelle_behalten=originalquelle_behalten,
        bemerkung=merged_bemerkung,
    )
