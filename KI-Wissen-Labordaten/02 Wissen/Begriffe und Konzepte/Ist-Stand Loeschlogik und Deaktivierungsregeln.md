---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-22
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-22 Rueckmeldung Loeschlogik und Deaktivierungsregeln.md
  - ../../../apps/backend/src/labordaten_backend/modules/loeschlogik/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/loeschlogik/service.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/loeschlogik.py
  - ../../../apps/backend/tests/test_delete_logic_api.py
tags:
  - loeschlogik
  - deaktivierung
  - stammdaten
  - historie
  - provenienz
  - ist-stand
---

# Ist-Stand Löschlogik und Deaktivierungsregeln

## Kurzfassung
Seit dem 2026-04-22 enthält das Backend eine zentrale Löschprüfung mit getrennter Ausführung für die wichtigsten risikoreichen Fachobjekte. Der aktuelle Zuschnitt deckt `person`, `befund`, `messwert`, `importvorgang`, `einheit`, `labor`, `laborparameter`, `parameter_gruppe`, `zielbereich` und `parameter_umrechnungsregel` ab und unterscheidet konsequent zwischen `direkt`, `kaskade` und `blockiert`.

## Technischer Zuschnitt
- Die API stellt einen einheitlichen Prüf- und Ausführungspfad bereit:
  - `GET /api/loeschpruefung/{entitaet_typ}/{entitaet_id}`
  - `POST /api/loeschpruefung/{entitaet_typ}/{entitaet_id}/ausfuehren`
- Die Prüfung liefert einen konsistenten Vertrag mit:
  - `modus`
  - `empfehlung`
  - `abhaengigkeiten`
  - `blockierungsgruende`
  - `hinweise`
  - `optionen`
- Die eigentliche Lösch- oder Deaktivierungsaktion läuft getrennt von der Vorschau und prüft serverseitig erneut, ob die Entität in der aktuellen Nutzungslage tatsächlich gelöscht werden darf.

## Aktuell umgesetzte Entitäten

### `person`
- Eine Person ohne fachliche Abhängigkeiten ist direkt löschbar.
- Sobald `befund`, `messwert`, `planung_zyklisch`, `planung_einmalig` oder `zielbereich_person_override` vorhanden sind, wird normales Löschen blockiert.
- In diesem Fall empfiehlt die Prüfung `deaktivieren` statt hartem Löschen.

### `befund`
- Ein Befund kann gelöscht werden.
- Vorhandene `messwert`-Datensätze werden mitgelöscht.
- Vorhandene `messwert_referenz`-Datensätze werden darunter ebenfalls mitgelöscht.
- Verknüpfte Dokumente bleiben dabei unverändert bestehen und werden nicht automatisch gelöscht.

### `messwert`
- Ein Messwert kann gelöscht werden.
- Vorhandene `messwert_referenz`-Datensätze werden mitgelöscht.
- Wenn der zugehörige `befund` danach leer würde, wird dieser leere Befund standardmäßig mitgelöscht.
- Betroffene Planungen werden in derselben Transaktion repariert.

### `importvorgang`
- Ein Importvorgang ist löschbar, solange noch keine übernommenen `befund`- oder `messwert`-Datensätze auf ihn zurückverweisen.
- Vorhandene `import_pruefpunkt`-Datensätze werden dabei mitgelöscht.
- Sobald echte Fachobjekte übernommen wurden, wird das Löschen blockiert, weil der Importvorgang dann als Provenienzanker dient.

### `einheit`
- Eine unbenutzte Einheit ist löschbar.
- Vorhandene `einheit_alias`-Datensätze werden dabei mitgelöscht.
- Sobald die Einheit in fachlichen Nutzungen vorkommt, wird das Löschen blockiert und `deaktivieren` empfohlen.

### `labor`
- Ein unbenutztes Labor ist löschbar.
- Sobald `befund`-Datensätze darauf verweisen, wird normales Löschen blockiert.
- In diesem Fall empfiehlt die Prüfung `deaktivieren`, damit die Befundhistorie stabil bleibt.

### `laborparameter`
- Ein unbenutzter Parameter ist löschbar.
- Beim Löschen werden pflegende Kindobjekte mit entfernt:
  - `laborparameter_alias`
  - `parameter_umrechnungsregel`
  - `gruppen_parameter`
  - `zielbereich`
  - darunter auch `zielbereich_person_override`
- Sobald `messwert`, `planung_zyklisch` oder `planung_einmalig` vorhanden sind, wird normales Löschen blockiert und `deaktivieren` empfohlen.

### `parameter_gruppe`
- Eine unbenutzte Gruppe ist direkt löschbar.
- Vorhandene `gruppen_parameter`-Datensätze werden beim Löschen der Gruppe mit entfernt.

### `zielbereich`
- Ein Zielbereich ist löschbar.
- Vorhandene `zielbereich_person_override`-Datensätze werden dabei mitgelöscht.

### `parameter_umrechnungsregel`
- Eine unbenutzte Umrechnungsregel ist löschbar.
- Sobald `messwert.umrechnungsregel_id` noch auf sie verweist, wird normales Löschen blockiert und `deaktivieren` empfohlen.

## Nutzungsprüfung bei Einheiten
- Die Nutzungsprüfung für `einheit` stützt sich nicht nur auf relationale Verknüpfungen.
- Zusätzlich werden bekannte fachliche Verwendungen in denormalisierten Feldern berücksichtigt:
  - `laborparameter.standard_einheit`
  - `parameter_umrechnungsregel.von_einheit`
  - `parameter_umrechnungsregel.nach_einheit`
  - `messwert.einheit_original`
  - `messwert.einheit_normiert`
  - `messwert_referenz.einheit`
  - `zielbereich.einheit`
  - `zielbereich_person_override.einheit`
- Dadurch soll verhindert werden, dass technisch löschbare, aber fachlich noch verwendete Einheiten zu Datenschiefständen führen.

## Reparaturlogik bei gelöschten Messwerten
- `planung_einmalig` mit `erledigt_durch_messwert_id` auf den gelöschten Messwert wird wieder geöffnet:
  - Verweis auf `null`
  - Status bei bisher `erledigt` zurück auf `offen`
- `planung_zyklisch` für dieselbe Kombination aus Person und Parameter wird neu bewertet:
  - letzte relevante Messung neu suchen
  - `letzte_relevante_messung_id` aktualisieren
  - `naechste_faelligkeit` neu berechnen
- Diese Reparaturen sind Teil derselben Transaktion wie die Löschoperation.

## Dokumente und Dateien
- Die aktuelle erste Backend-Runde behandelt Dokumentdatensätze noch nicht als eigene Löschentität.
- Verknüpfte Dokumente an `befund` oder `importvorgang` bleiben bei den jetzt umgesetzten Löschpfaden unverändert erhalten.
- Die spätere gesonderte Dokumentlöschung soll weiterhin Datenbankdatensatz und physische Datei getrennt behandeln.

## Bewusste Grenzen des aktuellen Stands
- Die zentrale Löschlogik deckt bereits die wichtigsten Fachobjekte ab, aber noch nicht den kompletten Projektumfang.
- Noch nicht in diesen generischen Pfad eingebunden sind unter anderem:
  - `dokument`
  - `wissensseite`
  - `einstellung`
  - `datenbasis_sperre`
- Für diese Entitäten ist die fachliche Richtung bereits grundsätzlich geklärt, aber die zentrale technische Ausführung folgt erst in weiteren Schritten.

## Verifikation
- Die neue Löschlogik ist durch eigene API-Regressionstests für Direktlöschung, Kaskadenlöschung, Blockierung und Deaktivierung abgesichert.
- Zusätzlich liefen nach dem Ausbau alle vorhandenen Backend-Tests erneut erfolgreich durch.
