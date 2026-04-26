---
typ: analyse
status: aktiv
letzte_aktualisierung: 2026-04-26
quellen:
  - V1 Ziel-Datenmodell.md
  - V1 Technisches Schema.md
  - V1 Screenplan und Kernworkflows.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Personen Blutgruppe Rhesus Auswahlwerte.md
  - ../../../apps/backend/src/labordaten_backend/api/routes/personen.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/labore.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/gruppen.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/einheiten.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/zielbereiche.py
  - ../../../apps/frontend/src/features/personen/PersonenPage.tsx
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/features/gruppen/GruppenPage.tsx
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
tags:
  - stammdaten
  - bearbeitung
  - ui
  - api
  - ist-stand
---

# Ist-Stand Stammdaten-Bearbeitbarkeit

## Kurzfassung
Die Anwendung soll Stammdaten nachträglich bearbeiten können, ohne technische Identitäten, historische Rohdaten oder Import-Provenienz zu verwischen. Nach der Prüfung am 2026-04-26 sind Personen, Labore, Gruppen und allgemeine Zielbereiche als fachliche Stammdaten bearbeitbar. Parameter sind teilweise bearbeitbar: sichtbarer Name, Normeinheit, primäre KSG-Klasse und Wissensseite sind pflegbar, technische Schlüssel bleiben bewusst stabil.

## Leitlinie
- Technische IDs bleiben nicht editierbar.
- Automatisch erzeugte interne Schlüssel bleiben stabil, solange keine ausdrückliche fachliche Entscheidung für Schlüsseländerungen vorliegt.
- Rohwerte, Originalparametername, Originaleinheit, Originalreferenzen und Import-Rohdaten bleiben nicht stillschweigend bearbeitbar.
- Fachliche Stammdatenfelder dürfen bearbeitet werden, wenn bestehende Verknüpfungen dadurch erhalten bleiben und die Änderung nachvollziehbarer ist als Löschen und Neuanlage.
- Materialisierte Ableitungen müssen nach Regel- oder Normeinheitsänderungen konsistent neu berechnet werden.

## Befundliste

| Entität | Attribut | Aktueller Stand | Empfohlene Änderung | Begründung | Risiko/Abgrenzung |
|---|---|---|---|---|---|
| Person | `anzeigename`, `vollname`, `geburtsdatum`, `geschlecht_code`, `blutgruppe`, `rhesusfaktor`, `hinweise_allgemein` | Per `PATCH /api/personen/{person_id}` und Werkzeug `Bearbeiten` auf der Personenseite pflegbar. `geschlecht_code`, `blutgruppe` und `rhesusfaktor` werden als feste Auswahlwerte geführt. | Umgesetzt. | Personenstammdaten ändern sich oder werden nachträglich präzisiert; Befunde und Messwerte sollen an derselben Person hängen bleiben. Blutgruppe und Rhesusfaktor sind bekannte Stammdatenwerte und sollen deshalb nicht als Freitext auseinanderlaufen. | `id`, Zeitstempel und Abhängigkeiten bleiben unverändert; Deaktivierung läuft weiter über Löschprüfung. |
| Labor | `name`, `adresse`, `bemerkung` | Per `PATCH /api/labore/{labor_id}` und Einstellungsbereich `Labore` pflegbar. | Umgesetzt. | Laboradressen, Firmierungen und Hinweise können sich ändern, ohne Befundhistorie umzuhängen. | Labor-ID bleibt stabil; verwendete Labore werden nicht hart gelöscht, sondern über Löschprüfung/deaktivieren behandelt. |
| Laborparameter | `anzeigename` | Über `Parameter umbenennen` pflegbar; alter Name kann als Alias erhalten bleiben. | Beibehalten. | Sichtbare Namen können korrigiert werden, ohne Messwerte oder Zielbereiche zu verlieren. | `interner_schluessel` bleibt stabil und wird nicht direkt bearbeitet. |
| Laborparameter | `beschreibung`, `sortierschluessel`, `wert_typ_standard` | Beschreibung und Sortierschlüssel sind aktuell nur bei Anlage setzbar; Werttyp ist technisch bei Anlage festgelegt. | Offen prüfen. Beschreibung und Sortierschlüssel sind fachlich bearbeitbar; Werttyp sollte höchstens ohne vorhandene Messwerte oder mit gesonderter Migration geändert werden. | Beschreibungen werden iterativ besser; der Werttyp wirkt dagegen auf Messwertvalidierung und Darstellung. | Werttypänderungen können vorhandene Messwerte inkonsistent machen und sind deshalb kein risikoarmer Schnellpfad. |
| Laborparameter | `standard_einheit` | Als führende Normeinheit per eigenem Werkzeug pflegbar. | Beibehalten. | Die Normeinheit ist eine fachliche Vergleichsentscheidung. | Änderung löst Neuberechnung normierter Messwerte aus; Originaleinheiten bleiben erhalten. |
| Laborparameter | `primaere_klassifikation` | Per KSG-Werkzeug pflegbar. | Beibehalten. | Die KSG-Hauptrolle kann nach fachlicher Prüfung nachgezogen werden. | Bewertet den Parameter, nicht einzelne Messwerte. |
| Parameter-Alias | `alias_text`, `bemerkung` | Aliase können angelegt und aus Vorschlägen übernommen werden; direkte Bearbeitung bestehender Aliase fehlt. | Als offene Lücke markieren. | Tippfehler oder bessere Bemerkungen sind fachlich plausibel. | Änderung des Aliastextes betrifft Import-Mapping; Konfliktprüfung muss wie bei Neuanlage greifen. |
| Parametergruppe | `name`, `beschreibung` | Per `PATCH /api/gruppen/{gruppe_id}` und Gruppenwerkzeug bearbeitbar. | Beibehalten. | Gruppen sind Auswahlbündel und können fachlich umbenannt oder beschrieben werden. | Gruppen-ID und Zuordnungen bleiben stabil; eigener Gruppensortierschlüssel wurde bewusst entfernt. |
| Gruppen-Parameter-Zuordnung | `sortierung`, `bemerkung` | Zuordnungen können über die Gruppen-Parameterliste ersetzt werden. | Beibehalten. | Die Reihenfolge innerhalb einer Gruppe ist eine fachliche Listenpflege. | Gruppenmitgliedschaften sind keine historischen Messdaten. |
| Einheit | `kuerzel` | Kanonische Einheit kann angelegt, gesucht, gelöscht/deaktiviert werden; Kürzel ist nicht direkt bearbeitbar. | Bewusst nicht direkt bearbeiten. | Einheitenkürzel werden denormalisiert in mehreren fachlichen Feldern verwendet. | Korrekturen sollen über Alias, Neuanlage, Umstellung der Nutzungen oder eigene Migrationslogik erfolgen. |
| Einheiten-Alias | `alias_text`, `bemerkung` | Aliase können angelegt werden; direkte Bearbeitung fehlt. | Als offene Lücke markieren. | Alias-Bemerkungen und Schreibweisen können korrigiert werden. | Aliastext muss global konfliktfrei bleiben; Änderung darf keine eigentliche Umrechnung ersetzen. |
| Allgemeiner Zielbereich | `zielbereich_typ`, Grenzen, Einheit, Solltext, Geschlechtskontext, Alterskontext, Bemerkung | Per `PATCH /api/zielbereiche/{zielbereich_id}` und Bearbeiten-Aktion in der Parameterseite pflegbar. | Umgesetzt. | Zielbereiche sind fachliche Vorgaben und werden nachträglich präzisiert. | `laborparameter_id`, `id` und `wert_typ` bleiben stabil; Werttypwechsel wäre bei Overrides und Auswertung riskanter. |
| Personenspezifischer Zielbereich | eigene Grenzen, Einheit, Solltext, Bemerkung | Überschreibungen können angelegt werden; direkte Bearbeitung fehlt. | Offen prüfen. | Persönliche Zielwerte können fachlich nachjustiert werden. | Änderung betrifft individuelle Auswertung; Lösch-/Deaktivierungspfad für Overrides ist separat zu klären. |
| Parameter-Umrechnungsregel | Einheiten, Regeltyp, Faktor, Offset, Formel, Rundung, Quelle, Bemerkung | Regeln können angelegt und per Löschprüfung gelöscht/deaktiviert werden; direkte Bearbeitung fehlt. | Offen prüfen, aber mit Neuberechnungspflicht. | Fachliche Umrechnungsregeln können korrigiert werden. | Änderung muss bestehende normierte Messwerte konsistent neu berechnen und bei historisch verwendeten Regeln nachvollziehbar bleiben. |
| Parameter-Klassifikation Zusatzrolle | Kontext und Begründung | Zusatzrollen können angelegt und entfernt werden; direkte Bearbeitung fehlt. | Als kleine Lücke markieren. | Kontext und Begründung können nach fachlicher Prüfung präzisiert werden. | Klassifikationscode selbst ist ein fester Wert; Löschen/Neuanlage ist aktuell möglich. |
| Befund, Messwert, Messwertreferenz | Roh-/Originaldaten und Messdatenfelder | Anlage und Löschung sind möglich; Bearbeitung historischer Originaldaten ist nicht als Stammdatenpflege umgesetzt. | Nicht im Stammdaten-Schnellpfad bearbeiten. | Diese Objekte sind fachliche Historie und Provenienzträger, keine normalen Katalogdaten. | Korrektur historischer Daten braucht eigenen Audit- oder Korrekturworkflow, damit Nachvollziehbarkeit erhalten bleibt. |
| Importvorgang und Import-Prüfpunkte | Rohpayload, Status, Prüfpunkte | Importprüfung und Übernahme sind eigene Workflows; Rohdaten werden nicht nachträglich als Stammdaten editiert. | Beibehalten. | Importobjekte dokumentieren Herkunft und Prüfstand. | Änderungen an übernommenen Fachobjekten müssen von Import-Provenienz getrennt bleiben. |

## Umgesetzte Änderung vom 2026-04-26
- Personenstammdaten sind nachträglich bearbeitbar.
- Blutgruppe und Rhesusfaktor in Personenstammdaten sind feste optionale Auswahlwerte statt Freitextfelder.
- Laborstammdaten sind unter `Einstellungen > Labore` nachträglich bearbeitbar.
- Allgemeine Zielbereiche sind in der Parameterseite aus der Zielbereichstabelle heraus nachträglich bearbeitbar.
- Neue Backend-Tests sichern die drei API-Pfade ab.

## Offene Punkte
- Direkte Bearbeitung von Parameterbeschreibung und Sortierschlüssel.
- Direkte Bearbeitung von Parameter- und Einheiten-Aliasen mit Konfliktprüfung.
- Direkte Bearbeitung personenspezifischer Zielbereichs-Overrides.
- Direkte Bearbeitung von Umrechnungsregeln inklusive Neuberechnung und klarer Abgrenzung zu historisch verwendeten Regeln.
- Direkte Bearbeitung von KSG-Zusatzrollen-Kontext und Begründung.
