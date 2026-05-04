---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-05-05
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Initialdaten Stammdaten-Snapshot.md
  - ../../../apps/backend/scripts/export_initialdaten_snapshot.py
  - ../../../apps/backend/scripts/import_initialdaten_snapshot.py
  - ../../../apps/backend/src/labordaten_backend/modules/initialdaten/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/initialdaten/initialdaten_snapshot.json
  - ../../../apps/frontend/src/shared/components/InitialdatenStartupDialog.tsx
  - ../../../apps/frontend/src/shared/components/InitialdatenPanel.tsx
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
  - ../../../apps/frontend/src/features/zielwertpakete/ZielwertpaketePage.tsx
tags:
  - initialdaten
  - stammdaten
  - auslieferung
  - snapshot
  - datenpakete
  - zielwertpakete
---

# Ist-Stand Initialdaten und Stammdaten-Snapshot

## Kurzfassung
Für leere Installationen gibt es einen Initialdaten-Snapshot mit Erststart-Dialog und Einstellungsaktion. Er enthält fachliche Stammdaten, die eine heruntergeladene Anwendung ohne manuelle Vorpflege sofort nutzbar machen sollen.

Der Snapshot ist bewusst kein Nutzerdaten-Backup. Er enthält keine Personen, Befunde, Messwerte, Dokumente, Labore, Planungen oder Importhistorie.

Davon getrennt gibt es optionale Datenpakete. Sie sind nachladbare fachliche Sammlungen, die ein Anwender bewusst prüfen, einspielen und später geschlossen deaktivieren kann. Zielwertpakete wie die Orfanos-Boeckel-KSG-Optimalbereiche gehören in diese Spur und nicht fest in den neutralen Initialdaten-Snapshot.

## Enthaltene Grunddaten
Der aktuelle Snapshot `initialdaten_snapshot.json` enthält:
- `wissensseite`
- `einheit`
- `einheit_alias`
- `laborparameter`
- `laborparameter_alias`
- `parameter_gruppe`
- `gruppen_parameter`
- `parameter_klassifikation`
- `parameter_umrechnungsregel`
- `zielbereich`
- `parameter_dublettenausschluss`

Diese Tabellen bilden den fachlich wiederverwendbaren Grundbestand: kanonische Parameter, Parametergruppen, Zuordnungen, Aliasauflösung, Einheitenlogik, Umrechnung, Zielbereiche, KSG-Klassifikation und Links zu Laborwissen-Seiten.

## Nicht enthaltene Daten
Nicht in die Initialdaten gehören:
- `person`
- `labor`
- `dokument`
- `befund`
- `messwert`
- `messwert_referenz`
- `planung_einmalig`
- `planung_zyklisch`
- `importvorgang`
- `import_pruefpunkt`
- `zielbereich_person_override`

Diese Tabellen beschreiben konkrete Nutzer-, Verlaufs- oder Arbeitsdaten und dürfen beim Initialisieren einer leeren Installation nicht als Beispiel- oder Echtdaten übernommen werden.

## Technischer Stand
- `apps/backend/scripts/export_initialdaten_snapshot.py` erzeugt den Snapshot aus einer bestehenden SQLite-Datenbank.
- `apps/backend/scripts/import_initialdaten_snapshot.py` lädt den Paket-Snapshot oder eine explizit angegebene JSON-Datei in die konfigurierte Datenbank.
- `labordaten_backend.modules.initialdaten.service` enthält die wiederverwendbare Importlogik.
- `GET /api/system/initialdaten/status` meldet, ob ein Snapshot verfügbar ist, ob Stammdaten oder Nutzerdaten vorhanden sind und ob ein Initialimport empfohlen wird. Für die Empfehlung zählt nicht irgendeine vorhandene Stammdatentabelle, sondern der fachliche Grundbestand aus Laborparametern, Parametergruppen, Gruppen-Zuordnungen, KSG-Klassifikation, Aliasen und Umrechnungsregeln. Bereits vorhandene Einheiten allein unterdrücken den Erststart-Import deshalb nicht mehr.
- `POST /api/system/initialdaten/anwenden` lädt die Vorgaben. Standardmäßig werden bestehende Datensätze nicht überschrieben; mit `aktualisieren=true` können bestehende Grunddaten anhand des Snapshots aktualisiert werden.

## Oberfläche
- Beim App-Start prüft `InitialdatenStartupDialog`, ob ein Snapshot verfügbar ist und der fachliche Grundbestand fehlt.
- Wenn der Initialimport empfohlen wird, erscheint ein Dialog `Grunddaten für diese Installation laden` mit kurzer Beschreibung des enthaltenen und ausgeschlossenen Datenumfangs.
- Der Dialog kann die mitgelieferten Grunddaten direkt laden oder bewusst ohne Grunddaten fortgesetzt werden. Nach erfolgreichem Laden zeigt er als nächsten Schritt den Importweg für Laborberichte und kann direkt zum Importbereich führen. Der Hilfetext beschreibt den Nutzen präzise über Laborparameter, Parametergruppen, Aliase und vor allem Umrechnungsregeln statt pauschal über Einheitenerkennung.
- In `Einstellungen > Initialdaten` gibt es dieselbe Ladefunktion dauerhaft. Wenn bereits Stammdaten vorhanden sind, kann dort zusätzlich eine Aktualisierung anhand des Snapshots gestartet werden.
- In `Einstellungen > Optionale Datenpakete` werden nachladbare fachliche Pakete wie Zielwertpakete verwaltet. Dort liegt die Paketliste mit Vorschau, Optionen zum Anlegen fehlender Parameter oder Einheiten sowie Aktionen zum Einspielen und Deaktivieren. Beispiele sind quellengebundene Orfanos-Boeckel-KSG-Optimalbereiche und der präventivmedizinische Lithium-Vollblutbereich aus der biovis-/OM-&-Ernährung-Quelle.
- Die Parameterpflege darf aus dem Zielbereich-Kontext auf `Einstellungen > Optionale Datenpakete` verweisen, bleibt aber nicht der Hauptort für Paketinstallation.

## Aktualisierung des Snapshots
Wenn fachliche Grunddaten geändert werden, soll der Snapshot neu erzeugt werden. Dazu wird der aktuelle, fachlich geprüfte Datenbankstand exportiert. Der Snapshot ist dadurch versionierbar und kann mit Tests gegen eine frische Datenbank geprüft werden.

## Offene Produktpunkte
- Eine Option zum bewussten Entfernen oder Ausblenden parameterbezogener Markdown-Wissensseiten ist noch nicht umgesetzt.
- Für aktualisierende Importe kann die UI später noch eine stärkere Bestätigung verlangen, weil vorhandene Stammdaten bei `aktualisieren=true` auf den Snapshotstand gebracht werden können.
