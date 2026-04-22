---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung PDF-Seitenumbrueche.md
  - ../../../apps/backend/src/labordaten_backend/modules/berichte/service.py
  - ../../../apps/backend/tests/test_report_pdf_layout.py
tags:
  - berichte
  - pdf
  - layout
  - pagination
  - ist-stand
---

# Ist-Stand PDF-Seitenumbrüche in Berichten

## Kurzfassung
Seit dem 2026-04-21 behandelt der Workspace die Seitenumbrüche im PDF-Verlaufsbericht nicht mehr nur implizit durch die Standardlogik von ReportLab. Wertebereiche werden jetzt als zusammenhängende Blöcke aufgebaut, damit ein neuer Abschnitt bei zu wenig Restplatz bevorzugt auf einer neuen Seite beginnt.

## Aktuelles Verhalten
- Ein numerischer Wertebereich wird als Block aus Abschnittsüberschrift, optionaler Personenüberschrift, Diagramm und Tabelle aufgebaut.
- Bevor ein solcher Block gerendert wird, schätzt die Berichtslogik seine Höhe gegen den verfügbaren Seitenrahmen ab.
- Wenn ein kompakter Block noch vollständig auf die aktuelle Seite passt, bleibt er zusammen.
- Wenn der Restplatz nicht mehr reicht, beginnt der Block auf einer neuen Seite.

## Verhalten bei großen Bereichen
- Sehr große Bereiche, die selbst auf einer frischen Seite nicht vollständig Platz haben, werden ebenfalls auf einer neuen Seite begonnen.
- Innerhalb solcher großen Bereiche dürfen lange Tabellen über die Folgeseiten weiterlaufen.
- Dafür wird im aktuellen Stand `LongTable` mit wiederholter Kopfzeile genutzt, damit mehrseitige Tabellen lesbar bleiben.

## Bedeutung für die untere Tabelle
- Die qualitative oder textuelle Tabelle am Ende eines Parameterbereichs folgt derselben Blocklogik.
- Wenn sie kurz ist, bleibt sie möglichst zusammen.
- Wenn sie lang wird, darf sie über mehrere Seiten fortgesetzt werden, ohne den Tabellenkopf zu verlieren.

## Bewusste Grenze
- Die aktuelle Lösung priorisiert saubere Abschnittsstarts und stabile Fortsetzung langer Tabellen.
- Noch offen bleibt ein späterer Feinschliff, falls einzelne Wertebereiche mit sehr vielen Messpunkten zusätzlich eine kompaktere Diagrammhöhe, Seitenwiederholungen der Abschnittsüberschrift oder eine separate Anhangslogik brauchen.
