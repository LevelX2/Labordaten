from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DATABASE = Path(__file__).resolve().parents[1] / "labordaten.db"
DEFAULT_OUTPUT = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "labordaten_backend"
    / "modules"
    / "initialdaten"
    / "initialdaten_snapshot.json"
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialdaten-Snapshot aus einer Labordaten-SQLite-DB erzeugen.")
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--version", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    args = parser.parse_args()

    snapshot = build_snapshot(args.database, args.version)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Initialdaten-Snapshot geschrieben: {args.output}")


def build_snapshot(database_path: Path, version: str) -> dict[str, Any]:
    con = sqlite3.connect(database_path)
    con.row_factory = sqlite3.Row
    try:
        return {
            "metadata": {
                "version": version,
                "exportiert_am": datetime.now(timezone.utc).isoformat(),
                "quelle": str(database_path),
                "hinweis": "Stammdaten-Snapshot ohne Personen, Befunde, Messwerte, Dokumente, Planung und Importhistorie.",
            },
            "wissensseiten": _wissensseiten(con),
            "einheiten": _einheiten(con),
            "einheit_aliase": _einheit_aliase(con),
            "laborparameter": _laborparameter(con),
            "laborparameter_aliase": _laborparameter_aliase(con),
            "parameter_gruppen": _parameter_gruppen(con),
            "gruppen_parameter": _gruppen_parameter(con),
            "parameter_klassifikationen": _parameter_klassifikationen(con),
            "parameter_umrechnungsregeln": _parameter_umrechnungsregeln(con),
            "zielbereich_quellen": _zielbereich_quellen(con),
            "zielbereiche": _zielbereiche(con),
            "parameter_dublettenausschluesse": _parameter_dublettenausschluesse(con),
        }
    finally:
        con.close()


def _rows(con: sqlite3.Connection, sql: str) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql)]


def _bools(rows: list[dict[str, Any]], *fields: str) -> list[dict[str, Any]]:
    for row in rows:
        for field in fields:
            if field in row and row[field] is not None:
                row[field] = bool(row[field])
    return rows


def _wissensseiten(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT pfad_relativ, titel_cache, alias_cache, frontmatter_json, letzter_scan_am, aktiv
            FROM wissensseite
            ORDER BY pfad_relativ
            """,
        ),
        "aktiv",
    )


def _einheiten(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(con, "SELECT kuerzel, aktiv FROM einheit ORDER BY kuerzel"),
        "aktiv",
    )


def _einheit_aliase(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _rows(
        con,
        """
        SELECT e.kuerzel AS einheit_kuerzel, ea.alias_text, ea.alias_normalisiert, ea.bemerkung
        FROM einheit_alias ea
        JOIN einheit e ON e.id = ea.einheit_id
        ORDER BY e.kuerzel, ea.alias_normalisiert
        """,
    )


def _laborparameter(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT
                lp.interner_schluessel,
                lp.anzeigename,
                lp.beschreibung,
                lp.standard_einheit,
                lp.wert_typ_standard,
                lp.primaere_klassifikation,
                ws.pfad_relativ AS wissensseite_pfad,
                lp.sortierschluessel,
                lp.aktiv
            FROM laborparameter lp
            LEFT JOIN wissensseite ws ON ws.id = lp.wissensseite_id
            ORDER BY lp.interner_schluessel
            """,
        ),
        "aktiv",
    )


def _laborparameter_aliase(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _rows(
        con,
        """
        SELECT
            lp.interner_schluessel AS parameter_schluessel,
            la.alias_text,
            la.alias_normalisiert,
            la.bemerkung
        FROM laborparameter_alias la
        JOIN laborparameter lp ON lp.id = la.laborparameter_id
        ORDER BY lp.interner_schluessel, la.alias_normalisiert
        """,
    )


def _parameter_gruppen(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT
                pg.name,
                pg.beschreibung,
                ws.pfad_relativ AS wissensseite_pfad,
                pg.aktiv
            FROM parameter_gruppe pg
            LEFT JOIN wissensseite ws ON ws.id = pg.wissensseite_id
            ORDER BY pg.name
            """,
        ),
        "aktiv",
    )


def _gruppen_parameter(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _rows(
        con,
        """
        SELECT
            pg.name AS gruppe_name,
            lp.interner_schluessel AS parameter_schluessel,
            gp.sortierung
        FROM gruppen_parameter gp
        JOIN parameter_gruppe pg ON pg.id = gp.parameter_gruppe_id
        JOIN laborparameter lp ON lp.id = gp.laborparameter_id
        ORDER BY pg.name, gp.sortierung, lp.interner_schluessel
        """,
    )


def _parameter_klassifikationen(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT
                lp.interner_schluessel AS parameter_schluessel,
                pk.klassifikation,
                pk.kontext_beschreibung,
                pk.begruendung,
                pk.aktiv
            FROM parameter_klassifikation pk
            JOIN laborparameter lp ON lp.id = pk.laborparameter_id
            ORDER BY lp.interner_schluessel, pk.klassifikation, pk.kontext_beschreibung
            """,
        ),
        "aktiv",
    )


def _parameter_umrechnungsregeln(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT
                lp.interner_schluessel AS parameter_schluessel,
                pur.von_einheit,
                pur.nach_einheit,
                pur.regel_typ,
                pur.faktor,
                pur.offset,
                pur.formel_text,
                pur.rundung_stellen,
                pur.quelle_beschreibung,
                pur.bemerkung,
                pur.aktiv
            FROM parameter_umrechnungsregel pur
            JOIN laborparameter lp ON lp.id = pur.laborparameter_id
            ORDER BY lp.interner_schluessel, pur.von_einheit, pur.nach_einheit
            """,
        ),
        "aktiv",
    )


def _zielbereiche(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT
                lp.interner_schluessel AS parameter_schluessel,
                zq.name AS zielbereich_quelle_name,
                zq.titel AS zielbereich_quelle_titel,
                zq.jahr AS zielbereich_quelle_jahr,
                zq.version AS zielbereich_quelle_version,
                z.wert_typ,
                z.zielbereich_typ,
                z.untere_grenze_num,
                z.obere_grenze_num,
                z.einheit,
                z.soll_text,
                z.geschlecht_code,
                z.alter_min_tage,
                z.alter_max_tage,
                z.quelle_original_text,
                z.quelle_stelle,
                z.bemerkung,
                z.aktiv
            FROM zielbereich z
            JOIN laborparameter lp ON lp.id = z.laborparameter_id
            LEFT JOIN zielbereich_quelle zq ON zq.id = z.zielbereich_quelle_id
            ORDER BY lp.interner_schluessel, zq.name, z.zielbereich_typ, z.geschlecht_code, z.alter_min_tage, z.alter_max_tage
            """,
        ),
        "aktiv",
    )


def _zielbereich_quellen(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _bools(
        _rows(
            con,
            """
            SELECT name, quellen_typ, titel, jahr, version, bemerkung, aktiv
            FROM zielbereich_quelle
            ORDER BY name, jahr, titel, version
            """,
        ),
        "aktiv",
    )


def _parameter_dublettenausschluesse(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return _rows(
        con,
        """
        SELECT
            lp1.interner_schluessel AS erster_parameter_schluessel,
            lp2.interner_schluessel AS zweiter_parameter_schluessel
        FROM parameter_dublettenausschluss pda
        JOIN laborparameter lp1 ON lp1.id = pda.erster_parameter_id
        JOIN laborparameter lp2 ON lp2.id = pda.zweiter_parameter_id
        ORDER BY erster_parameter_schluessel, zweiter_parameter_schluessel
        """,
    )


if __name__ == "__main__":
    main()
