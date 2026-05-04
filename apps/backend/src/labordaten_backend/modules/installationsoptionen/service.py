from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.orm import Session

from labordaten_backend.core.config import get_settings
from labordaten_backend.modules.initialdaten import service as initialdaten_service
from labordaten_backend.modules.installationsoptionen.schemas import (
    InstallationOptionsProcessResult,
    InstalliertesZielwertPaketRead,
    PendingInstallationOptions,
)
from labordaten_backend.modules.zielbereiche.schemas import ZielwertPaketInstallationRequest
from labordaten_backend.modules.zielwertpakete import service as zielwertpakete_service


def process_pending_installation_options(
    db: Session,
    *,
    options_file: Path | None = None,
) -> InstallationOptionsProcessResult:
    path = _resolve_options_file(options_file)
    result = InstallationOptionsProcessResult(options_file=str(path), pending_vorhanden=path.exists())
    if not path.exists():
        return result

    try:
        payload = PendingInstallationOptions.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError, json.JSONDecodeError) as exc:
        result.fehler.append(f"Installationsoptionen konnten nicht gelesen werden: {exc}")
        _archive_options_file(path, result, suffix="fehler")
        return result

    result.installationstyp = payload.installationstyp

    if payload.standarddaten_laden:
        try:
            initialdaten_result = initialdaten_service.apply_initialdaten(
                db,
                aktualisieren=payload.standarddaten_aktualisieren,
            )
            result.standarddaten_angewendet = True
            result.initialdaten_result = dict(initialdaten_result)
        except Exception as exc:  # noqa: BLE001
            result.fehler.append(f"Grunddaten konnten nicht geladen werden: {exc}")

    for paket in payload.zielwertpakete:
        try:
            paket_result = zielwertpakete_service.install_paket(
                db,
                paket.paket_schluessel,
                ZielwertPaketInstallationRequest(
                    fehlende_parameter_anlegen=paket.fehlende_parameter_anlegen,
                    fehlende_einheiten_anlegen=paket.fehlende_einheiten_anlegen,
                    prueffaelle_anlegen=paket.prueffaelle_anlegen,
                ),
            )
            result.zielwertpakete_installiert.append(
                InstalliertesZielwertPaketRead(
                    paket_schluessel=paket.paket_schluessel,
                    angelegte_parameter_anzahl=paket_result.angelegte_parameter_anzahl,
                    angelegte_einheiten_anzahl=paket_result.angelegte_einheiten_anzahl,
                    angelegte_zielbereiche_anzahl=paket_result.angelegte_zielbereiche_anzahl,
                    reaktivierte_zielbereiche_anzahl=paket_result.reaktivierte_zielbereiche_anzahl,
                    uebersprungene_zielbereiche_anzahl=paket_result.uebersprungene_zielbereiche_anzahl,
                )
            )
        except Exception as exc:  # noqa: BLE001
            result.fehler.append(f"Zielwertpaket '{paket.paket_schluessel}' konnte nicht geladen werden: {exc}")

    result.verarbeitet = True
    if payload.naechste_schritte_anzeigen and (result.standarddaten_angewendet or result.zielwertpakete_installiert):
        result.naechste_schritte_anzeigen = True

    _archive_options_file(path, result, suffix="verarbeitet")
    return result


def _resolve_options_file(options_file: Path | None) -> Path:
    if options_file is not None:
        return options_file
    return Path(get_settings().install_options_file).expanduser()


def _archive_options_file(path: Path, result: InstallationOptionsProcessResult, *, suffix: str) -> None:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_path = path.with_name(f"{path.stem}-{suffix}-{timestamp}{path.suffix}")
    try:
        path.rename(archive_path)
        result_path = path.with_name("installationsoptionen-letzter-lauf.json")
        result_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
    except OSError as exc:
        result.fehler.append(f"Installationsoptionen konnten nicht archiviert werden: {exc}")
