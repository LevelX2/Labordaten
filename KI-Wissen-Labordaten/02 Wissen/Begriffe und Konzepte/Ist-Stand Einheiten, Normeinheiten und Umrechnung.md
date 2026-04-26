---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-26
quellen:
  - ../../../apps/backend/src/labordaten_backend/models/einheit.py
  - ../../../apps/backend/src/labordaten_backend/models/einheit_alias.py
  - ../../../apps/backend/src/labordaten_backend/models/parameter_umrechnungsregel.py
  - ../../../apps/backend/src/labordaten_backend/modules/einheiten/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/conversions.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/shared/components/EinheitenPflegeCard.tsx
  - ../../../apps/backend/tests/test_units.py
  - ../../../apps/backend/tests/test_parameter_conversion_rules.py
  - ../../../apps/backend/tests/test_parameter_standard_unit.py
tags:
  - einheiten
  - alias
  - normeinheit
  - umrechnung
  - ist-stand
---

# Ist-Stand Einheiten, Normeinheiten und Umrechnung

## Kurzfassung
Seit dem 2026-04-21/2026-04-22 behandelt der Workspace Einheiten nicht mehr als freien Begleittext, sondern als eigene fachliche Struktur mit drei getrennten Ebenen:
- kanonische Einheiten
- Einheiten-Aliase für alternative Schreibweisen
- parameterbezogene Umrechnungsregeln

Zusätzlich kann pro numerischem Laborparameter eine führende Normeinheit festgelegt werden, auf die vorhandene Werte für Vergleiche und Auswertungen bevorzugt normiert werden.

## Begriffsabgrenzung
### Einheit
- Eine Einheit ist ein kanonisches Kürzel wie `mg/l`, `mmol/l` oder `Tsd./µl`.
- Diese Kürzel werden als Stammdaten gepflegt und in fachlichen Formularen ausgewählt.
- Freitext für Einheiten ist in den relevanten Pflegepfaden nicht mehr das Zielmodell.

### Einheiten-Alias
- Ein Alias beschreibt dieselbe Einheit in anderer Schreibweise.
- Beispiele sind Groß-/Kleinschreibung, alternative Unicode-Schreibweisen oder fachlich gleichbedeutende Notationen.
- Alias-Auflösung soll Schreibvarianten vereinheitlichen, aber keine eigentliche Umrechnung ersetzen.

### Umrechnungsregel
- Eine Umrechnungsregel beschreibt die fachliche Transformation von einer Einheit in eine andere.
- Diese Regeln werden parameterbezogen gepflegt und nicht global nur an die Einheit gehängt.
- Die Zielrichtung ist gerichtet: `von_einheit -> nach_einheit`.

### Führende Normeinheit
- Die führende Normeinheit ist die bevorzugte interne Vergleichseinheit eines numerischen Parameters.
- Sie wird am Parameter gepflegt und entspricht technisch der `standard_einheit`.
- Sie steuert, in welche Einheit vorhandene Messwerte nach Möglichkeit normiert werden.

## Aktueller Workspace-Stand
### Zentrale Einheitenpflege
- Einheiten werden zentral gepflegt.
- Die manuelle Pflege liegt im Frontend unter `Einstellungen`.
- Fehlende Einheiten können im Import übernommen und dabei in die Stammdaten ergänzt werden.
- Die Einstellungsseite zeigt die Einheitenpflege als Arbeitsbereich: links Bestand, Suche und Neuanlage; rechts die aktuell ausgewählte Einheit mit Alias-Pflege und optionaler Lösch- oder Deaktivierungsprüfung.

### Alias-Logik für Einheiten
- Vor der Neuanlage einer Einheit wird geprüft, ob bereits eine kanonische Einheit oder ein Alias dazu existiert.
- Reine Schreibvarianten sollen dadurch nicht als eigene Einheiten enden.
- Die Alias-Pflege ist Teil der Einheitenverwaltung und erfolgt in der UI im Kontext der ausgewählten kanonischen Einheit, damit keine separate Zieleinheit im Alias-Formular gesucht werden muss.

### Parameterbezogene Umrechnungsregeln
- Umrechnungen werden als eigene Regeln pro `Laborparameter` gepflegt.
- Unterstützt werden aktuell Faktor-, Faktor-plus-Offset- und Formelregeln.
- Regeln werden auf der Parameterseite gepflegt.

### Materialisierte Normierung
- Jeder Messwert behält seinen Originalwert in `wert_num` und seine Originaleinheit in `einheit_original`.
- Zusätzlich kann ein normierter Vergleichswert in `wert_normiert_num` mit `einheit_normiert` gespeichert werden.
- Die verwendete Regel wird über `umrechnungsregel_id` referenziert.

### Führende Normeinheit in der UI
- Auf der Parameterseite gibt es eine eigene Aktion `Normeinheit`.
- Dort kann die führende Normeinheit eines Parameters ausdrücklich gesetzt oder geleert werden.
- Die Entscheidung ist damit sichtbar und nicht nur indirekt über Umrechnungsregeln impliziert.

## Fachliche Leitregel im Projekt
- Pro numerischem Laborparameter gibt es höchstens eine führende Normeinheit für interne Vergleiche.
- Originalwerte bleiben immer erhalten.
- Normierte Werte dienen Vergleich, Berichtsdarstellung und Verlaufsauswertung.
- Berichte und gemeinsame Darstellungen sollen Werte nur dann zusammenführen, wenn für die betroffenen Daten eine saubere gemeinsame Zielausprägung verfügbar ist.

## Verhalten bei Änderung der führenden Normeinheit
- Wenn die führende Normeinheit eines Parameters geändert wird, werden die normierten Vergleichswerte dieses Parameters neu berechnet.
- Dadurch bleibt die materialisierte Normierung konsistent mit der aktuellen Fachentscheidung.
- Die Originalwerte bleiben von dieser Neuberechnung unberührt.

## Bewusste Grenzen
- Die aktuelle Logik ist keine freie globale Umrechnungsmaschine für beliebige Einheitenpaare.
- Wenn für einen Messwert mehrere mögliche Zielrichtungen existieren und keine führende Normeinheit greift, soll nicht still geraten werden.
- Offensichtlich belastbare Seed-Regeln sind sinnvoll, aber nicht jede mögliche stoffabhängige Umrechnung sollte ohne fachliche Bestätigung vorbelegt werden.

## Abgrenzung zum allgemeinen Regelwissen
- Die projektübergreifenden Regeln zu Lesefeldern, Originaldaten, Ableitungslogik und Regelkonsistenz stehen in [[../../03 Betrieb/Generische Entwicklungsvorgaben]].
- Diese Seite beschreibt dagegen den konkreten fachlichen Zuschnitt des aktuellen Projekts `Labordaten` für Einheiten, Normeinheiten und Umrechnung.
