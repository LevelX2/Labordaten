---
typ: offene-punkte
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-20 Erste Konzeptvorgabe Laboranwendung.md
tags:
  - offene-punkte
  - fachkonzept
  - architektur
---

# Erste Konzeptvorgabe Klärungsbedarf

## Kurzfassung
Die erste Konzeptvorgabe ist fachlich stark, deckt aber noch nicht alle Umsetzungsdetails ab. Vor dem Architekturstart sollten insbesondere Fachkanten, Validierungsregeln, Betriebsgrenzen und technische Leitentscheidungen geklärt werden.

## Offene Punkte nach Themenfeld

### Fachmodell und Datenlogik
- Sollen Referenzbereiche nur einfache Unter- und Obergrenzen haben oder schon in der ersten Fassung Geschlecht, Alter, Labor, Methode oder Zustände wie nüchtern berücksichtigen?
- Wie sollen qualitative Textwerte in Diagrammen, Filtern und Berichten konkret dargestellt werden?
- Wie werden doppelte Befunde oder versehentlich doppelt importierte Messungen erkannt?

### Personen- und Kontextbezug
- Ist Geschlecht als freie Eingabe, als definierte Liste oder als medizinisch relevante Referenzkategorie zu führen?
- Sollen Laborwerte immer genau einer Person zugeordnet sein oder sind spätere Haushalts- oder Rollenfunktionen denkbar?
- Müssen Hinweise wie Nüchternstatus, Medikation oder Infekt nur als Freitext vorliegen oder teilweise strukturiert filterbar sein?

### Parameter und Normalisierung
- Wie stabil und menschenlesbar sollen interne Parameterschlüssel sein?
- Wer pflegt Synonyme, Umrechnungsregeln und Standardeinheiten, und wie werden diese Änderungen versioniert?
- Soll der normierte Wert dauerhaft gespeichert oder bevorzugt zur Laufzeit aus Originalwert plus Regel abgeleitet werden?

### Planung und Fälligkeit
- Was gilt als `relevante letzte Messung`, wenn mehrere Befunde am selben Tag oder mehrere Messungen zu einem Parameter vorliegen?
- Wie soll Fälligkeit gerechnet werden, wenn eine Messung außerhalb des regulären Intervalls bewusst vorgezogen oder nachgeholt wurde?
- Sollen Vormerkungen genau an einen nächsten Termin gebunden sein oder allgemein offen bleiben, bis eine passende Messung erkannt wurde?

### Import und Prüfworkflow
- Wie erfolgt die Zuordnung importierter Daten zu bestehenden Personen und Parametern: automatisch mit Vorschlag, halbautomatisch oder nur manuell bestätigt?
- Sollen Importquellen aus CSV, Excel oder Text standardmäßig nur optional als Rohquelle archiviert werden, während Original-Laborberichte bevorzugt erhalten bleiben?
- Welche Mindestvalidierungen sind vor der Freigabe Pflicht, zum Beispiel Person vorhanden, Datum plausibel, Einheit bekannt oder Parameter-Mapping bestätigt?

### Dokumente und Wissensbasis
- Werden PDF-Dateien nur referenziert oder soll die Anwendung auch definierte Ablagestrukturen und Dateibenennungen unterstützen?
- Wie streng sollen Frontmatter-Felder der Markdown-Wissensseiten gegen Parameterstammdaten abgeglichen werden?
- Wie soll eine genormte Schnittstelle für externe Importer oder Codex-nahe Workflows aussehen, damit kein direkter Datenbankzugriff nötig ist?

### Betrieb und Sicherheit
- Wie soll Backup und Wiederherstellung im lokalen Betrieb gedacht werden, insbesondere bei OneDrive-Synchronisation?
- Wie lange darf eine Sperre als gültig gelten und nach welchen Regeln darf sie zurückgesetzt werden?

### Berichte und Oberfläche
- Welche Mindestinhalte sollen der Arztbericht und der Verlaufsbericht in V1 exakt enthalten?
- Soll die Oberfläche eher tabellenorientiert, formularorientiert oder arbeitsbereichsorientiert aufgebaut sein?
- Welche Filter- und Suchfunktionen sind für den Alltagsnutzer unverzichtbar?

## Einordnung für das Projekt
- Diese offenen Punkte blockieren nicht die Fachkonzeption insgesamt, beeinflussen aber das Datenmodell und die spätere Architektur deutlich.
- Vor allem qualitative Verlaufsdarstellung, Importvalidierung, Berichtsdetails, externe Importschnittstelle und technischer Betriebsrahmen sollten vor der Implementierung gezielt entschieden werden.
