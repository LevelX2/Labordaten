---
typ: ist-stand
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Automatische interne Parameterschluessel.md
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/normalization.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/backend/tests/test_parameter_key_generation.py
tags:
  - parameter
  - stammdaten
  - schluessel
  - ist-stand
---

# Ist-Stand Automatische interne Parameterschlüssel

## Kurzfassung
Seit dem 2026-04-21 werden interne Schlüssel für neue Parameter in der Stammdatenpflege automatisch aus dem Anzeigenamen erzeugt. Die manuelle Eingabe ist in der Parameteroberfläche dafür nicht mehr nötig.

## Fachliche Bedeutung
- Der Anzeigename ist die fachlich relevante Eingabe.
- Der interne Schlüssel bleibt ein technischer, stabiler Bezeichner.
- Die Regel entspricht der gewünschten Stammdatenpflege: technische Identität wird konsistent erzeugt statt manuell frei getippt.

## Technischer Stand
- Das Frontend zeigt beim Anlegen neuer Parameter nur noch fachliche Felder wie Anzeigename, Einheit, Werttyp und Beschreibung.
- Das Backend akzeptiert beim Anlegen weiterhin ein optionales Feld `interner_schluessel`, verwendet für neue Parameter aber immer eine automatisch erzeugte Ableitung aus dem Anzeigenamen.
- Die Ableitung transliteriert deutsche Umlaute technisch als `ae`, `oe`, `ue` und trennt Bestandteile mit Unterstrichen.
- Wenn derselbe Anzeigename mehrfach angelegt wird, ergänzt das Backend einen numerischen Suffix wie `_2`, `_3` und so weiter.

## Beispiele
- `Vitamin D3 (25-OH)` wird zu `vitamin_d3_25_oh`.
- `Glukose nüchtern` wird zu `glukose_nuechtern`.
- Ein weiterer gleichnamiger Parameter würde zu `glukose_nuechtern_2`.

## Grenzen und Einordnung
- Die Automatik löst nur die technische Schlüsselvergabe für neue Parameter.
- Bestehende Parameter behalten ihre vorhandenen internen Schlüssel.
- Für fachlich doppelte oder umzubenennende Parameter bleiben Aliaspflege, Umbenennung und Zusammenführung die maßgeblichen Werkzeuge.
