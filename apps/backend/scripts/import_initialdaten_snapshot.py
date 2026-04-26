from __future__ import annotations

import argparse
import json
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from labordaten_backend.core.db.session import SessionLocal
from labordaten_backend.modules.initialdaten.service import apply_initialdaten


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialdaten-Snapshot in die konfigurierte Labordaten-DB laden.")
    parser.add_argument("--snapshot", type=Path, help="Optionaler JSON-Snapshot statt des Paket-Snapshots.")
    parser.add_argument(
        "--aktualisieren",
        action="store_true",
        help="Bestehende Stammdaten anhand des Snapshots aktualisieren.",
    )
    args = parser.parse_args()

    snapshot = None
    if args.snapshot is not None:
        snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))

    db = SessionLocal()
    try:
        result = apply_initialdaten(db, aktualisieren=args.aktualisieren, snapshot=snapshot)
    finally:
        db.close()

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
