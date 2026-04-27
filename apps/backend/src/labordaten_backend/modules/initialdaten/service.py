from __future__ import annotations

import json
from datetime import datetime, timezone
from importlib import resources
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.parameter_dublettenausschluss import ParameterDublettenausschluss
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.parameter_klassifikation import ParameterKlassifikation
from labordaten_backend.models.parameter_umrechnungsregel import ParameterUmrechnungsregel
from labordaten_backend.models.wissensseite import Wissensseite
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_quelle import ZielbereichQuelle
from labordaten_backend.models.zielwert_paket import ZielwertPaket

INITIALDATEN_SNAPSHOT_RESOURCE = "initialdaten_snapshot.json"

STAMMDATEN_TABELLEN = (
    "wissensseite",
    "einheit",
    "einheit_alias",
    "laborparameter",
    "laborparameter_alias",
    "parameter_gruppe",
    "gruppen_parameter",
    "parameter_klassifikation",
    "parameter_umrechnungsregel",
    "zielbereich_quelle",
    "zielwert_paket",
    "zielbereich",
    "parameter_dublettenausschluss",
)

NUTZERDATEN_TABELLEN = (
    "person",
    "labor",
    "dokument",
    "befund",
    "messwert",
    "messwert_referenz",
    "planung_einmalig",
    "planung_zyklisch",
    "importvorgang",
    "import_pruefpunkt",
    "zielbereich_person_override",
)

STATUS_TABELLEN = STAMMDATEN_TABELLEN + NUTZERDATEN_TABELLEN


def load_initialdaten_snapshot() -> dict[str, Any]:
    try:
        snapshot_ref = resources.files(__package__).joinpath(INITIALDATEN_SNAPSHOT_RESOURCE)
        return json.loads(snapshot_ref.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}


def get_initialdaten_status(db: Session) -> dict[str, Any]:
    snapshot = load_initialdaten_snapshot()
    counts = {table_name: _table_count(db, table_name) for table_name in STATUS_TABELLEN}
    stammdaten_vorhanden = any(counts[table_name] > 0 for table_name in STAMMDATEN_TABELLEN)
    nutzerdaten_vorhanden = any(counts[table_name] > 0 for table_name in NUTZERDATEN_TABELLEN)
    return {
        "snapshot_verfuegbar": bool(snapshot),
        "snapshot_version": snapshot.get("metadata", {}).get("version") if snapshot else None,
        "stammdaten_vorhanden": stammdaten_vorhanden,
        "nutzerdaten_vorhanden": nutzerdaten_vorhanden,
        "initialimport_empfohlen": bool(snapshot) and not stammdaten_vorhanden,
        "tabellen": counts,
    }


def apply_initialdaten(
    db: Session,
    *,
    aktualisieren: bool = False,
    snapshot: dict[str, Any] | None = None,
) -> dict[str, Any]:
    seed = snapshot if snapshot is not None else load_initialdaten_snapshot()
    if not seed:
        raise ValueError("Kein Initialdaten-Snapshot gefunden.")

    result = _empty_result(seed, aktualisieren)

    wissensseiten_by_path = _import_wissensseiten(db, seed, result, aktualisieren)
    einheiten_by_kuerzel = _import_einheiten(db, seed, result, aktualisieren)
    parameter_by_key = _import_laborparameter(db, seed, result, aktualisieren, wissensseiten_by_path)
    gruppen_by_name = _import_parameter_gruppen(db, seed, result, aktualisieren, wissensseiten_by_path)

    _import_einheit_aliase(db, seed, result, aktualisieren, einheiten_by_kuerzel)
    _import_parameter_aliase(db, seed, result, aktualisieren, parameter_by_key)
    _import_gruppen_parameter(db, seed, result, aktualisieren, gruppen_by_name, parameter_by_key)
    _import_parameter_klassifikationen(db, seed, result, aktualisieren, parameter_by_key)
    _import_parameter_umrechnungsregeln(db, seed, result, aktualisieren, parameter_by_key)
    zielbereich_quellen_by_key = _import_zielbereich_quellen(db, seed, result, aktualisieren)
    zielwert_pakete_by_key = _import_zielwert_pakete(db, seed, result, aktualisieren, zielbereich_quellen_by_key)
    _import_zielbereiche(
        db,
        seed,
        result,
        aktualisieren,
        parameter_by_key,
        zielbereich_quellen_by_key,
        zielwert_pakete_by_key,
    )
    _import_dublettenausschluesse(db, seed, result, aktualisieren, parameter_by_key)

    db.commit()
    return result


def _table_count(db: Session, table_name: str) -> int:
    return int(db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar_one())


def _empty_result(snapshot: dict[str, Any], aktualisieren: bool) -> dict[str, Any]:
    return {
        "snapshot_version": snapshot.get("metadata", {}).get("version"),
        "aktualisieren": aktualisieren,
        "angelegt": {},
        "aktualisiert": {},
        "uebersprungen": {},
    }


def _bump(result: dict[str, Any], bucket: str, key: str) -> None:
    values = result[bucket]
    values[key] = values.get(key, 0) + 1


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _setattr_many(obj: object, values: dict[str, Any]) -> None:
    for key, value in values.items():
        setattr(obj, key, value)


def _import_wissensseiten(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
) -> dict[str, Wissensseite]:
    rows = snapshot.get("wissensseiten", [])
    existing = {row.pfad_relativ: row for row in db.scalars(select(Wissensseite)).all()}
    now = _now()
    for row in rows:
        key = row["pfad_relativ"]
        values = {
            "pfad_relativ": key,
            "titel_cache": row.get("titel_cache"),
            "alias_cache": row.get("alias_cache"),
            "frontmatter_json": row.get("frontmatter_json"),
            "letzter_scan_am": row.get("letzter_scan_am"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        obj = existing.get(key)
        if obj is None:
            obj = Wissensseite(**values)
            existing[key] = obj
            db.add(obj)
            _bump(result, "angelegt", "wissensseiten")
        elif aktualisieren:
            _setattr_many(obj, values)
            _bump(result, "aktualisiert", "wissensseiten")
        else:
            _bump(result, "uebersprungen", "wissensseiten")
    db.flush()
    return existing


def _import_einheiten(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
) -> dict[str, Einheit]:
    rows = snapshot.get("einheiten", [])
    existing = {row.kuerzel: row for row in db.scalars(select(Einheit)).all()}
    for row in rows:
        key = row["kuerzel"]
        values = {"kuerzel": key, "aktiv": bool(row.get("aktiv", True))}
        obj = existing.get(key)
        if obj is None:
            obj = Einheit(**values)
            existing[key] = obj
            db.add(obj)
            _bump(result, "angelegt", "einheiten")
        elif aktualisieren:
            _setattr_many(obj, values)
            _bump(result, "aktualisiert", "einheiten")
        else:
            _bump(result, "uebersprungen", "einheiten")
    db.flush()
    return existing


def _import_laborparameter(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    wissensseiten_by_path: dict[str, Wissensseite],
) -> dict[str, Laborparameter]:
    rows = snapshot.get("laborparameter", [])
    existing = {row.interner_schluessel: row for row in db.scalars(select(Laborparameter)).all()}
    for row in rows:
        key = row["interner_schluessel"]
        wissensseite = wissensseiten_by_path.get(row.get("wissensseite_pfad"))
        values = {
            "interner_schluessel": key,
            "anzeigename": row["anzeigename"],
            "beschreibung": row.get("beschreibung"),
            "standard_einheit": row.get("standard_einheit"),
            "wert_typ_standard": row.get("wert_typ_standard", "numerisch"),
            "primaere_klassifikation": row.get("primaere_klassifikation"),
            "wissensseite_id": wissensseite.id if wissensseite else None,
            "sortierschluessel": row.get("sortierschluessel"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        obj = existing.get(key)
        if obj is None:
            obj = Laborparameter(**values)
            existing[key] = obj
            db.add(obj)
            _bump(result, "angelegt", "laborparameter")
        elif aktualisieren:
            _setattr_many(obj, values)
            _bump(result, "aktualisiert", "laborparameter")
        else:
            _bump(result, "uebersprungen", "laborparameter")
    db.flush()
    return existing


def _import_parameter_gruppen(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    wissensseiten_by_path: dict[str, Wissensseite],
) -> dict[str, ParameterGruppe]:
    rows = snapshot.get("parameter_gruppen", [])
    existing = {row.name: row for row in db.scalars(select(ParameterGruppe)).all()}
    for row in rows:
        key = row["name"]
        wissensseite = wissensseiten_by_path.get(row.get("wissensseite_pfad"))
        values = {
            "name": key,
            "beschreibung": row.get("beschreibung"),
            "wissensseite_id": wissensseite.id if wissensseite else None,
            "aktiv": bool(row.get("aktiv", True)),
        }
        obj = existing.get(key)
        if obj is None:
            obj = ParameterGruppe(**values)
            existing[key] = obj
            db.add(obj)
            _bump(result, "angelegt", "parameter_gruppen")
        elif aktualisieren:
            _setattr_many(obj, values)
            _bump(result, "aktualisiert", "parameter_gruppen")
        else:
            _bump(result, "uebersprungen", "parameter_gruppen")
    db.flush()
    return existing


def _import_einheit_aliase(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    einheiten_by_kuerzel: dict[str, Einheit],
) -> None:
    existing = {row.alias_normalisiert: row for row in db.scalars(select(EinheitAlias)).all()}
    for row in snapshot.get("einheit_aliase", []):
        einheit = einheiten_by_kuerzel.get(row["einheit_kuerzel"])
        if einheit is None:
            _bump(result, "uebersprungen", "einheit_aliase")
            continue
        key = row["alias_normalisiert"]
        values = {
            "einheit_id": einheit.id,
            "alias_text": row["alias_text"],
            "alias_normalisiert": key,
            "bemerkung": row.get("bemerkung"),
        }
        _upsert_simple(db, existing, key, EinheitAlias, values, result, "einheit_aliase", aktualisieren)


def _import_parameter_aliase(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    parameter_by_key: dict[str, Laborparameter],
) -> None:
    existing = {
        (row.laborparameter_id, row.alias_normalisiert): row
        for row in db.scalars(select(LaborparameterAlias)).all()
    }
    for row in snapshot.get("laborparameter_aliase", []):
        parameter = parameter_by_key.get(row["parameter_schluessel"])
        if parameter is None:
            _bump(result, "uebersprungen", "laborparameter_aliase")
            continue
        key = (parameter.id, row["alias_normalisiert"])
        values = {
            "laborparameter_id": parameter.id,
            "alias_text": row["alias_text"],
            "alias_normalisiert": row["alias_normalisiert"],
            "bemerkung": row.get("bemerkung"),
        }
        _upsert_simple(db, existing, key, LaborparameterAlias, values, result, "laborparameter_aliase", aktualisieren)


def _import_gruppen_parameter(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    gruppen_by_name: dict[str, ParameterGruppe],
    parameter_by_key: dict[str, Laborparameter],
) -> None:
    existing = {
        (row.parameter_gruppe_id, row.laborparameter_id): row
        for row in db.scalars(select(GruppenParameter)).all()
    }
    for row in snapshot.get("gruppen_parameter", []):
        gruppe = gruppen_by_name.get(row["gruppe_name"])
        parameter = parameter_by_key.get(row["parameter_schluessel"])
        if gruppe is None or parameter is None:
            _bump(result, "uebersprungen", "gruppen_parameter")
            continue
        key = (gruppe.id, parameter.id)
        values = {
            "parameter_gruppe_id": gruppe.id,
            "laborparameter_id": parameter.id,
            "sortierung": row.get("sortierung"),
        }
        _upsert_simple(db, existing, key, GruppenParameter, values, result, "gruppen_parameter", aktualisieren)


def _import_parameter_klassifikationen(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    parameter_by_key: dict[str, Laborparameter],
) -> None:
    existing = {
        (row.laborparameter_id, row.klassifikation, row.kontext_beschreibung): row
        for row in db.scalars(select(ParameterKlassifikation)).all()
    }
    for row in snapshot.get("parameter_klassifikationen", []):
        parameter = parameter_by_key.get(row["parameter_schluessel"])
        if parameter is None:
            _bump(result, "uebersprungen", "parameter_klassifikationen")
            continue
        key = (parameter.id, row["klassifikation"], row.get("kontext_beschreibung"))
        values = {
            "laborparameter_id": parameter.id,
            "klassifikation": row["klassifikation"],
            "kontext_beschreibung": row.get("kontext_beschreibung"),
            "begruendung": row.get("begruendung"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        _upsert_simple(db, existing, key, ParameterKlassifikation, values, result, "parameter_klassifikationen", aktualisieren)


def _import_parameter_umrechnungsregeln(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    parameter_by_key: dict[str, Laborparameter],
) -> None:
    existing = {
        (row.laborparameter_id, row.von_einheit, row.nach_einheit): row
        for row in db.scalars(select(ParameterUmrechnungsregel)).all()
    }
    for row in snapshot.get("parameter_umrechnungsregeln", []):
        parameter = parameter_by_key.get(row["parameter_schluessel"])
        if parameter is None:
            _bump(result, "uebersprungen", "parameter_umrechnungsregeln")
            continue
        key = (parameter.id, row["von_einheit"], row["nach_einheit"])
        values = {
            "laborparameter_id": parameter.id,
            "von_einheit": row["von_einheit"],
            "nach_einheit": row["nach_einheit"],
            "regel_typ": row["regel_typ"],
            "faktor": row.get("faktor"),
            "offset": row.get("offset"),
            "formel_text": row.get("formel_text"),
            "rundung_stellen": row.get("rundung_stellen"),
            "quelle_beschreibung": row.get("quelle_beschreibung"),
            "bemerkung": row.get("bemerkung"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        _upsert_simple(db, existing, key, ParameterUmrechnungsregel, values, result, "parameter_umrechnungsregeln", aktualisieren)


def _import_zielbereiche(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    parameter_by_key: dict[str, Laborparameter],
    zielbereich_quellen_by_key: dict[tuple[str, str | None, int | None, str | None], ZielbereichQuelle],
    zielwert_pakete_by_key: dict[str, ZielwertPaket],
) -> None:
    existing = {
        (
            row.laborparameter_id,
            row.zielbereich_quelle_id,
            row.zielwert_paket_id,
            row.wert_typ,
            row.zielbereich_typ,
            row.zielrichtung,
            row.geschlecht_code,
            row.alter_min_tage,
            row.alter_max_tage,
        ): row
        for row in db.scalars(select(Zielbereich)).all()
    }
    for row in snapshot.get("zielbereiche", []):
        parameter = parameter_by_key.get(row["parameter_schluessel"])
        if parameter is None:
            _bump(result, "uebersprungen", "zielbereiche")
            continue
        quelle = zielbereich_quellen_by_key.get(
            (
                row.get("zielbereich_quelle_name"),
                row.get("zielbereich_quelle_titel"),
                row.get("zielbereich_quelle_jahr"),
                row.get("zielbereich_quelle_version"),
            )
        ) if row.get("zielbereich_quelle_name") else None
        paket = zielwert_pakete_by_key.get(row["zielwert_paket_schluessel"]) if row.get("zielwert_paket_schluessel") else None
        zielbereich_quelle_id = quelle.id if quelle else None
        if paket is not None and paket.zielbereich_quelle_id and zielbereich_quelle_id is None:
            zielbereich_quelle_id = paket.zielbereich_quelle_id
        key = (
            parameter.id,
            zielbereich_quelle_id,
            paket.id if paket else None,
            row.get("wert_typ", "numerisch"),
            row.get("zielbereich_typ", "allgemein"),
            row.get("zielrichtung", "innerhalb_bereich"),
            row.get("geschlecht_code"),
            row.get("alter_min_tage"),
            row.get("alter_max_tage"),
        )
        values = {
            "laborparameter_id": parameter.id,
            "zielbereich_quelle_id": zielbereich_quelle_id,
            "zielwert_paket_id": paket.id if paket else None,
            "wert_typ": row.get("wert_typ", "numerisch"),
            "zielbereich_typ": row.get("zielbereich_typ", "allgemein"),
            "zielrichtung": row.get("zielrichtung", "innerhalb_bereich"),
            "untere_grenze_num": row.get("untere_grenze_num"),
            "obere_grenze_num": row.get("obere_grenze_num"),
            "einheit": row.get("einheit"),
            "soll_text": row.get("soll_text"),
            "geschlecht_code": row.get("geschlecht_code"),
            "alter_min_tage": row.get("alter_min_tage"),
            "alter_max_tage": row.get("alter_max_tage"),
            "quelle_original_text": row.get("quelle_original_text"),
            "quelle_stelle": row.get("quelle_stelle"),
            "bemerkung": row.get("bemerkung"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        _upsert_simple(db, existing, key, Zielbereich, values, result, "zielbereiche", aktualisieren)


def _import_zielbereich_quellen(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
) -> dict[tuple[str, str | None, int | None, str | None], ZielbereichQuelle]:
    existing = {
        (row.name, row.titel, row.jahr, row.version): row
        for row in db.scalars(select(ZielbereichQuelle)).all()
    }
    for row in snapshot.get("zielbereich_quellen", []):
        key = (
            row["name"],
            row.get("titel"),
            row.get("jahr"),
            row.get("version"),
        )
        values = {
            "name": row["name"],
            "quellen_typ": row.get("quellen_typ", "experte"),
            "titel": row.get("titel"),
            "jahr": row.get("jahr"),
            "version": row.get("version"),
            "bemerkung": row.get("bemerkung"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        _upsert_simple(db, existing, key, ZielbereichQuelle, values, result, "zielbereich_quellen", aktualisieren)
    db.flush()
    return existing


def _import_zielwert_pakete(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    zielbereich_quellen_by_key: dict[tuple[str, str | None, int | None, str | None], ZielbereichQuelle],
) -> dict[str, ZielwertPaket]:
    existing = {row.paket_schluessel: row for row in db.scalars(select(ZielwertPaket)).all()}
    for row in snapshot.get("zielwert_pakete", []):
        quelle = zielbereich_quellen_by_key.get(
            (
                row.get("zielbereich_quelle_name"),
                row.get("zielbereich_quelle_titel"),
                row.get("zielbereich_quelle_jahr"),
                row.get("zielbereich_quelle_version"),
            )
        ) if row.get("zielbereich_quelle_name") else None
        key = row["paket_schluessel"]
        values = {
            "paket_schluessel": key,
            "name": row["name"],
            "zielbereich_quelle_id": quelle.id if quelle else None,
            "version": row.get("version"),
            "jahr": row.get("jahr"),
            "beschreibung": row.get("beschreibung"),
            "bemerkung": row.get("bemerkung"),
            "aktiv": bool(row.get("aktiv", True)),
        }
        _upsert_simple(db, existing, key, ZielwertPaket, values, result, "zielwert_pakete", aktualisieren)
    db.flush()
    return existing


def _import_dublettenausschluesse(
    db: Session,
    snapshot: dict[str, Any],
    result: dict[str, Any],
    aktualisieren: bool,
    parameter_by_key: dict[str, Laborparameter],
) -> None:
    existing = {
        tuple(sorted([row.erster_parameter_id, row.zweiter_parameter_id])): row
        for row in db.scalars(select(ParameterDublettenausschluss)).all()
    }
    for row in snapshot.get("parameter_dublettenausschluesse", []):
        erster = parameter_by_key.get(row["erster_parameter_schluessel"])
        zweiter = parameter_by_key.get(row["zweiter_parameter_schluessel"])
        if erster is None or zweiter is None:
            _bump(result, "uebersprungen", "parameter_dublettenausschluesse")
            continue
        ids = sorted([erster.id, zweiter.id])
        key = (ids[0], ids[1])
        paar_schluessel = f"{ids[0]}::{ids[1]}"
        values = {
            "erster_parameter_id": ids[0],
            "zweiter_parameter_id": ids[1],
            "paar_schluessel": paar_schluessel,
        }
        _upsert_simple(
            db,
            existing,
            key,
            ParameterDublettenausschluss,
            values,
            result,
            "parameter_dublettenausschluesse",
            aktualisieren,
        )


def _upsert_simple(
    db: Session,
    existing: dict[Any, Any],
    key: Any,
    model: type,
    values: dict[str, Any],
    result: dict[str, Any],
    result_key: str,
    aktualisieren: bool,
) -> None:
    obj = existing.get(key)
    if obj is None:
        obj = model(**values)
        existing[key] = obj
        db.add(obj)
        _bump(result, "angelegt", result_key)
    elif aktualisieren:
        _setattr_many(obj, values)
        _bump(result, "aktualisiert", result_key)
    else:
        _bump(result, "uebersprungen", result_key)
