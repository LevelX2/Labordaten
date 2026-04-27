---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-27
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Alias-Vorschlaege und Berichtseinheiten.md
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/backend/src/labordaten_backend/modules/berichte/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/berichte/service.py
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/features/berichte/BerichtePage.tsx
  - ../../../apps/backend/tests/test_parameter_alias_suggestions.py
  - ../../../apps/backend/tests/test_parameter_alias_import_mapping.py
  - ../../../apps/backend/tests/test_report_display_units.py
tags:
  - alias
  - berichte
  - einheiten
  - ist-stand
---

# Ist-Stand Alias-Vorschläge und Berichtseinheiten

## Kurzfassung
Seit dem 2026-04-21 enthält der Workspace eine UI-gestützte Vorschlagsliste für Parameter-Aliase sowie eine steuerbare Darstellungseinheit für Berichte. Beide Funktionen bauen auf bereits bestätigten Daten auf und erzwingen keine stillen Annahmen.

## Alias-Vorschläge
- Die Parameterseite kann jetzt eine Vorschlagsliste für Aliase laden.
- Vorschläge entstehen nicht aus freiem Fuzzy-Matching, sondern aus bereits gespeicherten `Messwerten`, deren `original_parametername` mehrfach einem kanonischen Parameter zugeordnet wurde.
- Ein Vorschlag wird nur gezeigt, wenn der normalisierte Originalname noch weder Anzeigename noch interner Schlüssel noch bereits gepflegter Alias dieses Parameters ist.
- Die Bestätigung erfolgt direkt in der Oberfläche und legt denselben Alias-Datensatz an, den auch die manuelle Aliaspflege verwendet.
- Dadurch wird vor allem der bereits bestätigte Importpfad nachträglich verfestigt, statt ungesicherte neue Zuordnungen zu erzeugen.
- Seit dem 2026-04-27 sind Parameter-Aliase nicht mehr global allein durch den Aliasnamen eindeutig. Derselbe normalisierte Aliasname darf bei unterschiedlichen Parametern vorkommen, wenn deren führende Einheiten unterschiedlich sind, zum Beispiel ein Fettsäurewert in `mg/l` und ein Erythrozytenmembranwert in `%`.
- Innerhalb desselben Parameters bleibt derselbe Alias weiterhin eindeutig. Bei gleichem Aliasnamen und gleicher oder unklarer Einheit wird eine zusätzliche Alias-Anlage blockiert, damit das automatische Matching nicht mehrdeutig wird.
- Das Import-Matching nutzt bei Alias-Treffern die Einheit des importierten Messwerts zur Disambiguierung. Wenn mehrere Parameter denselben Aliasnamen tragen, wird nur dann automatisch gemappt, wenn genau ein Treffer zur Import-Einheit passt; sonst bleibt die Zuordnung prüfbedürftig.

## Berichtseinheiten
- Arztbericht und Verlaufsbericht akzeptieren jetzt zusätzlich eine parameterbezogene Einheitenauswahl.
- Die Berichtsseite zeigt diese Auswahl nur für Parameter an, bei denen in der aktuellen Auswahl mehrere Originaleinheiten vorkommen oder eine alternative gemeinsame Zieldarstellung möglich ist.
- Eine Zieldarstellung ist nur dann zulässig, wenn alle betroffenen numerischen Werte des Parameters diese Einheit sauber unterstützen.
- Technisch wird dafür je Messwert zwischen Originaldarstellung und bereits vorhandener normierter Darstellung gewählt:
  - `wert_num` plus `einheit_original`
  - `wert_normiert_num` plus `einheit_normiert`
- Dadurch werden keine neuen allgemeinen Umrechnungsregeln erfunden; genutzt wird nur, was im Datenbestand bereits belastbar vorliegt.

## Bewusste Grenzen
- Die neue Berichtseinheitenlogik ist keine freie Umrechnungsmaschine für beliebige Einheitenpaare.
- Wenn für einen Parameter keine gemeinsame Zieleinheit aus allen ausgewählten numerischen Werten gebildet werden kann, wird diese Einheit nicht angeboten und backendseitig abgewiesen.
- Referenzbereiche bleiben fachlich am Original orientiert. Wenn der Wert in einer anderen Einheit dargestellt wird als die Laborreferenz, wird dies im Bericht als `Originalreferenz` gekennzeichnet.

## Praktische Bedeutung
- Wiederkehrende Schreibvarianten aus echten Laborbefunden können jetzt systematisch in Aliase überführt werden, ohne jede Variante manuell neu suchen zu müssen.
- Familien- oder Verlaufsberichte mit gemischten numerischen Einheiten lassen sich kontrollierter lesen, sofern der Datenbestand bereits eine konsistente normierte Darstellung enthält.
- Die Funktion stärkt damit sowohl Importkomfort als auch fachliche Lesbarkeit, ohne die Nachvollziehbarkeit der Originaldaten aufzugeben.
