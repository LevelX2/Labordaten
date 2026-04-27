from __future__ import annotations

import json
from importlib.resources import files
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_quelle import ZielbereichQuelle
from labordaten_backend.models.zielwert_paket import ZielwertPaket
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter.normalization import normalize_parameter_name
from labordaten_backend.modules.zielbereiche.schemas import (
    ZielwertPaketInstallationRequest,
    ZielwertPaketInstallationResult,
    ZielwertPaketKatalogQuelleRead,
    ZielwertPaketKatalogRead,
    ZielwertPaketVorschauEintragRead,
    ZielwertPaketVorschauRead,
)

CatalogPackage = dict[str, Any]
CatalogEntry = dict[str, Any]


def list_katalog(db: Session) -> list[ZielwertPaketKatalogRead]:
    return [_build_katalog_read(db, package) for package in _load_catalog()]


def preview_paket(
    db: Session,
    paket_schluessel: str,
    payload: ZielwertPaketInstallationRequest | None = None,
) -> ZielwertPaketVorschauRead:
    options = payload or ZielwertPaketInstallationRequest()
    package = _require_catalog_package(paket_schluessel)
    katalog_read = _build_katalog_read(db, package)
    entries = [_build_preview_entry(db, katalog_read.installiert_paket_id, entry, options) for entry in package["eintraege"]]
    return _build_preview_read(katalog_read, entries)


def install_paket(
    db: Session,
    paket_schluessel: str,
    payload: ZielwertPaketInstallationRequest,
) -> ZielwertPaketInstallationResult:
    package = _require_catalog_package(paket_schluessel)
    preview_before = preview_paket(db, paket_schluessel, payload)
    blocking_entries = [
        entry
        for entry in preview_before.eintraege
        if entry.aktion in {"parameter_fehlt", "einheit_fehlt", "pruefung_erforderlich"}
    ]
    if blocking_entries:
        raise ValueError("Das Paket enthält noch Einträge, die vor der Anlage geklärt werden müssen.")

    angelegte_parameter = 0
    angelegte_einheiten = 0
    angelegte_zielbereiche = 0
    reaktivierte_zielbereiche = 0
    uebersprungene_zielbereiche = 0

    source = _ensure_source(db, package["quelle"])
    paket = _ensure_package(db, package, source.id)

    for entry in package["eintraege"]:
        if entry.get("pruefstatus") == "pruefen" and not payload.prueffaelle_anlegen:
            uebersprungene_zielbereiche += 1
            continue

        target_definition = entry["zielbereich"]
        unit = _clean_optional(target_definition.get("einheit"))
        if unit is not None:
            unit_exists_before = _unit_exists(db, unit)
            if payload.fehlende_einheiten_anlegen:
                unit = einheiten_service.ensure_einheit_exists(db, unit)
                if not unit_exists_before:
                    angelegte_einheiten += 1
            else:
                unit = einheiten_service.require_existing_einheit(db, unit)

        parameter, created_parameter = _ensure_parameter(db, entry["parameter"], payload.fehlende_parameter_anlegen)
        if created_parameter:
            angelegte_parameter += 1

        existing_target = _find_matching_target(db, paket.id, parameter.id, target_definition)
        if existing_target is not None:
            _sync_target_metadata(existing_target, source.id, target_definition)
            if existing_target.aktiv:
                uebersprungene_zielbereiche += 1
                continue
            existing_target.aktiv = True
            db.add(existing_target)
            reaktivierte_zielbereiche += 1
            continue

        zielbereich = Zielbereich(
            laborparameter_id=parameter.id,
            zielbereich_quelle_id=source.id,
            zielwert_paket_id=paket.id,
            wert_typ=parameter.wert_typ_standard,
            zielbereich_typ=target_definition["zielbereich_typ"],
            zielrichtung=target_definition["zielrichtung"],
            untere_grenze_num=target_definition.get("untere_grenze_num"),
            obere_grenze_num=target_definition.get("obere_grenze_num"),
            einheit=unit if parameter.wert_typ_standard == "numerisch" else None,
            soll_text=_clean_optional(target_definition.get("soll_text")),
            quelle_original_text=_clean_optional(target_definition.get("quelle_original_text")),
            quelle_stelle=_clean_optional(target_definition.get("quelle_stelle")),
            bemerkung=_clean_optional(target_definition.get("bemerkung")),
        )
        db.add(zielbereich)
        angelegte_zielbereiche += 1

    db.commit()
    db.refresh(paket)
    source_id = source.id
    preview_after = preview_paket(db, paket_schluessel, payload)
    return ZielwertPaketInstallationResult(
        paket_id=paket.id,
        zielbereich_quelle_id=source_id,
        angelegte_parameter_anzahl=angelegte_parameter,
        angelegte_einheiten_anzahl=angelegte_einheiten,
        angelegte_zielbereiche_anzahl=angelegte_zielbereiche,
        reaktivierte_zielbereiche_anzahl=reaktivierte_zielbereiche,
        uebersprungene_zielbereiche_anzahl=uebersprungene_zielbereiche,
        vorschau=preview_after,
    )


def _load_catalog() -> list[CatalogPackage]:
    catalog_path = files("labordaten_backend.modules.zielwertpakete").joinpath("paket_katalog.json")
    with catalog_path.open("r", encoding="utf-8") as catalog_file:
        payload = json.load(catalog_file)
    return list(payload)


def _require_catalog_package(paket_schluessel: str) -> CatalogPackage:
    for package in _load_catalog():
        if package["paket_schluessel"] == paket_schluessel:
            return package
    raise ValueError("Zielwertpaket-Katalogeintrag nicht gefunden.")


def _build_katalog_read(db: Session, package: CatalogPackage) -> ZielwertPaketKatalogRead:
    installed = db.scalar(select(ZielwertPaket).where(ZielwertPaket.paket_schluessel == package["paket_schluessel"]))
    active_count = 0
    if installed is not None:
        active_count = int(
            db.scalar(
                select(func.count(Zielbereich.id)).where(
                    Zielbereich.zielwert_paket_id == installed.id,
                    Zielbereich.aktiv.is_(True),
                )
            )
            or 0
        )
    prueffaelle = sum(1 for entry in package["eintraege"] if entry.get("pruefstatus") == "pruefen")
    return ZielwertPaketKatalogRead(
        paket_schluessel=package["paket_schluessel"],
        name=package["name"],
        version=package.get("version"),
        jahr=package.get("jahr"),
        beschreibung=package.get("beschreibung"),
        bemerkung=package.get("bemerkung"),
        quelle=ZielwertPaketKatalogQuelleRead(**package["quelle"]),
        eintraege_anzahl=len(package["eintraege"]),
        prueffaelle_anzahl=prueffaelle,
        installiert=installed is not None,
        installiert_paket_id=installed.id if installed is not None else None,
        installiert_aktiv=installed.aktiv if installed is not None else None,
        aktive_zielbereiche_anzahl=active_count,
    )


def _build_preview_entry(
    db: Session,
    installed_package_id: str | None,
    entry: CatalogEntry,
    options: ZielwertPaketInstallationRequest,
) -> ZielwertPaketVorschauEintragRead:
    parameter_definition = entry["parameter"]
    target_definition = entry["zielbereich"]
    parameter = db.scalar(
        select(Laborparameter).where(
            Laborparameter.interner_schluessel == parameter_definition["interner_schluessel"]
        )
    )
    unit = _clean_optional(target_definition.get("einheit"))
    unit_exists = unit is None or _unit_exists(db, unit)
    target = (
        _find_matching_target(db, installed_package_id, parameter.id, target_definition)
        if installed_package_id is not None and parameter is not None
        else None
    )
    hints: list[str] = []
    action = "anlegen"
    if target is not None and target.aktiv:
        action = "bestehend"
    elif target is not None and not target.aktiv:
        action = "reaktivieren"
    elif parameter is None and not options.fehlende_parameter_anlegen:
        action = "parameter_fehlt"
        hints.append("Parameter wird nicht automatisch angelegt.")
    elif not unit_exists and not options.fehlende_einheiten_anlegen:
        action = "einheit_fehlt"
        hints.append("Einheit wird nicht automatisch angelegt.")
    elif entry.get("pruefstatus") == "pruefen" and not options.prueffaelle_anlegen:
        action = "pruefung_erforderlich"
        hints.append("Eintrag ist als Prüffall markiert.")

    if parameter is not None and parameter.standard_einheit and unit and parameter.standard_einheit != unit:
        hints.append(f"Standardeinheit des Parameters ist aktuell {parameter.standard_einheit}.")

    return ZielwertPaketVorschauEintragRead(
        eintrag_schluessel=entry["eintrag_schluessel"],
        parameter_schluessel=parameter_definition["interner_schluessel"],
        parameter_name=parameter_definition["anzeigename"],
        parameter_id=parameter.id if parameter is not None else None,
        parameter_existiert=parameter is not None,
        einheit=unit,
        einheit_existiert=unit_exists,
        zielbereich_typ=target_definition["zielbereich_typ"],
        zielrichtung=target_definition["zielrichtung"],
        untere_grenze_num=target_definition.get("untere_grenze_num"),
        obere_grenze_num=target_definition.get("obere_grenze_num"),
        soll_text=_clean_optional(target_definition.get("soll_text")),
        quelle_original_text=_clean_optional(target_definition.get("quelle_original_text")),
        quelle_stelle=_clean_optional(target_definition.get("quelle_stelle")),
        bemerkung=_clean_optional(target_definition.get("bemerkung")),
        pruefstatus=entry.get("pruefstatus", "freigegeben"),
        aktion=action,
        zielbereich_id=target.id if target is not None else None,
        hinweise=hints,
    )


def _build_preview_read(
    katalog_read: ZielwertPaketKatalogRead,
    entries: list[ZielwertPaketVorschauEintragRead],
) -> ZielwertPaketVorschauRead:
    return ZielwertPaketVorschauRead(
        paket=katalog_read,
        eintraege=entries,
        anzulegen_anzahl=sum(1 for entry in entries if entry.aktion in {"anlegen", "reaktivieren"}),
        bestehend_anzahl=sum(1 for entry in entries if entry.aktion == "bestehend"),
        parameter_fehlen_anzahl=sum(1 for entry in entries if entry.aktion == "parameter_fehlt"),
        einheiten_fehlen_anzahl=sum(1 for entry in entries if entry.aktion == "einheit_fehlt"),
        pruefung_erforderlich_anzahl=sum(1 for entry in entries if entry.aktion == "pruefung_erforderlich"),
    )


def _ensure_source(db: Session, source_definition: dict[str, Any]) -> ZielbereichQuelle:
    source = db.scalar(
        select(ZielbereichQuelle).where(
            ZielbereichQuelle.name == source_definition["name"],
            ZielbereichQuelle.titel == source_definition.get("titel"),
            ZielbereichQuelle.jahr == source_definition.get("jahr"),
            ZielbereichQuelle.version == source_definition.get("version"),
        )
    )
    if source is None:
        source = ZielbereichQuelle(
            name=source_definition["name"].strip(),
            quellen_typ=source_definition.get("quellen_typ", "experte"),
            titel=_clean_optional(source_definition.get("titel")),
            jahr=source_definition.get("jahr"),
            version=_clean_optional(source_definition.get("version")),
            bemerkung=_clean_optional(source_definition.get("bemerkung")),
        )
        db.add(source)
        db.flush()
        return source

    source.aktiv = True
    source.quellen_typ = source_definition.get("quellen_typ", source.quellen_typ)
    source.bemerkung = _clean_optional(source_definition.get("bemerkung"))
    db.add(source)
    db.flush()
    return source


def _ensure_package(db: Session, package: CatalogPackage, source_id: str) -> ZielwertPaket:
    paket = db.scalar(select(ZielwertPaket).where(ZielwertPaket.paket_schluessel == package["paket_schluessel"]))
    if paket is None:
        paket = ZielwertPaket(
            paket_schluessel=package["paket_schluessel"],
            name=package["name"],
            zielbereich_quelle_id=source_id,
            version=_clean_optional(package.get("version")),
            jahr=package.get("jahr"),
            beschreibung=_clean_optional(package.get("beschreibung")),
            bemerkung=_clean_optional(package.get("bemerkung")),
        )
        db.add(paket)
        db.flush()
        return paket

    paket.aktiv = True
    paket.name = package["name"]
    paket.zielbereich_quelle_id = source_id
    paket.version = _clean_optional(package.get("version"))
    paket.jahr = package.get("jahr")
    paket.beschreibung = _clean_optional(package.get("beschreibung"))
    paket.bemerkung = _clean_optional(package.get("bemerkung"))
    db.add(paket)
    db.flush()
    return paket


def _ensure_parameter(
    db: Session,
    parameter_definition: dict[str, Any],
    allow_create: bool,
) -> tuple[Laborparameter, bool]:
    parameter = db.scalar(
        select(Laborparameter).where(
            Laborparameter.interner_schluessel == parameter_definition["interner_schluessel"]
        )
    )
    if parameter is not None:
        parameter.aktiv = True
        db.add(parameter)
        db.flush()
        return parameter, False

    if not allow_create:
        raise ValueError(f"Parameter '{parameter_definition['anzeigename']}' fehlt.")

    standard_unit = einheiten_service.require_existing_einheit(
        db,
        parameter_definition.get("standard_einheit"),
        field_label="Standardeinheit",
    )
    parameter = Laborparameter(
        interner_schluessel=parameter_definition["interner_schluessel"],
        anzeigename=parameter_definition["anzeigename"],
        beschreibung=_clean_optional(parameter_definition.get("beschreibung")),
        standard_einheit=standard_unit,
        wert_typ_standard=parameter_definition.get("wert_typ_standard", "numerisch"),
        primaere_klassifikation=_clean_optional(parameter_definition.get("primaere_klassifikation")),
        sortierschluessel=parameter_definition["interner_schluessel"],
    )
    db.add(parameter)
    db.flush()
    return parameter, True


def _find_matching_target(
    db: Session,
    zielwert_paket_id: str | None,
    laborparameter_id: str,
    target_definition: dict[str, Any],
) -> Zielbereich | None:
    if zielwert_paket_id is None:
        return None
    targets = list(
        db.scalars(
            select(Zielbereich).where(
                Zielbereich.zielwert_paket_id == zielwert_paket_id,
                Zielbereich.laborparameter_id == laborparameter_id,
            )
        )
    )
    for target in targets:
        if _target_matches_definition(target, target_definition):
            return target
    return None


def _target_matches_definition(target: Zielbereich, target_definition: dict[str, Any]) -> bool:
    return (
        target.zielbereich_typ == target_definition["zielbereich_typ"]
        and target.zielrichtung == target_definition["zielrichtung"]
        and _numbers_equal(target.untere_grenze_num, target_definition.get("untere_grenze_num"))
        and _numbers_equal(target.obere_grenze_num, target_definition.get("obere_grenze_num"))
        and normalize_parameter_name(target.einheit) == normalize_parameter_name(target_definition.get("einheit"))
        and normalize_parameter_name(target.soll_text) == normalize_parameter_name(target_definition.get("soll_text"))
        and normalize_parameter_name(target.quelle_original_text)
        == normalize_parameter_name(target_definition.get("quelle_original_text"))
    )


def _sync_target_metadata(target: Zielbereich, source_id: str, target_definition: dict[str, Any]) -> None:
    target.zielbereich_quelle_id = source_id
    target.quelle_original_text = _clean_optional(target_definition.get("quelle_original_text"))
    target.quelle_stelle = _clean_optional(target_definition.get("quelle_stelle"))
    target.bemerkung = _clean_optional(target_definition.get("bemerkung"))


def _unit_exists(db: Session, unit: str) -> bool:
    cleaned = einheiten_service.normalize_einheit(unit)
    if cleaned is None:
        return True
    try:
        einheiten_service.require_existing_einheit(db, cleaned)
    except ValueError:
        return False
    return True


def _numbers_equal(left: float | None, right: float | None) -> bool:
    if left is None or right is None:
        return left is None and right is None
    return abs(float(left) - float(right)) < 0.0000001


def _clean_optional(value: object | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None
