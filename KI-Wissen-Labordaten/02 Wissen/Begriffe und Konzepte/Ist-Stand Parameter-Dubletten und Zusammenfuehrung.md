---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-24
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Parameter-Dubletten und Zusammenfuehrung.md
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/normalization.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/backend/tests/test_parameter_duplicate_merge.py
tags:
  - parameter
  - dubletten
  - alias
  - stammdaten
  - ist-stand
---

# Ist-Stand Parameter-Dubletten und Zusammenführung

## Kurzfassung
Seit dem 2026-04-21 kann die Parameteroberfläche wahrscheinliche Dubletten vorhandener Parameter vorschlagen und nach Bestätigung zusammenführen. Die Zusammenführung hängt bestehende Verwendungen auf einen Zielparameter um und übernimmt nicht mehr verwendete Namen nach Möglichkeit als Alias. Seit dem 2026-04-24 lässt sich die Prüfschärfe der Dublettenvorschläge in der Oberfläche zusätzlich zwischen `Sicher`, `Ausgewogen` und `Großzügig` umschalten.

## Vorschlagslogik
- Die Dublettenprüfung arbeitet auf vorhandenen aktiven Parametern, nicht auf Importentwürfen.
- Vorschläge berücksichtigen vor allem:
  - gleiche oder sehr ähnliche Namen nach Normalisierung
  - stark überlappende Namensbestandteile
  - gleichen Standard-Werttyp
- Die Oberfläche bietet dafür drei Prüfschärfen:
  - `Sicher`: zeigt nur besonders belastbare Vorschläge mit klarer Namens- oder Kontextnähe
  - `Ausgewogen`: ist der Standard und entspricht der bisherigen mittleren Dublettenprüfung
  - `Großzügig`: zeigt zusätzlich weichere Namensvarianten, etwa enthaltene Zusatzbegriffe wie `im Serum`, sofern kein klarer Kontextkonflikt vorliegt
- Zusätzlich werden Referenzkontexte als starker Kontextfaktor verwendet:
  - Stimmen aktive Zielbereiche exakt überein, kann das auch bei enthaltenen Zusatzbegriffen wie `im Serum` einen Vorschlag auslösen.
  - Wenn keine Zielbereiche gepflegt sind, können identische Messwert-Referenzbereiche aus vorhandenen Messwerten denselben Effekt auslösen.
  - Weichen diese Referenzkontexte bei nur weichen Namens-Treffern klar ab, wird der Vorschlag unterdrückt.
- Anwender können einzelne vorgeschlagene Parameterpaare bewusst als `Kein Dublett` markieren.
  - Solche Paare werden dauerhaft aus den Dublettenvorschlägen herausgefiltert.
  - Die Unterdrückung bleibt im Dubletten-Bereich des ausgewählten Parameters sichtbar und kann dort wieder aufgehoben werden.
- Unterschiedliche Standardeinheiten schließen einen Vorschlag nicht zwingend aus, werden aber sichtbar als Warnhinweis ausgegeben.
- Pro Vorschlag wird ein bevorzugter Zielparameter bestimmt. Maßgeblich sind dabei vor allem vorhandene Messwerte, Gruppen, Zielbereiche, Planungen und weitere Stammdatenvollständigkeit.

## Zusammenführung
- Der Anwender bestätigt einen Vorschlag in der Oberfläche und legt den gemeinsamen Namen fest.
- Technisch bleibt genau ein Zielparameter bestehen.
- Der Quellparameter wird danach entfernt.
- Vor dem Entfernen werden Verwendungen des Quellparameters auf den Zielparameter umgehängt:
  - `Messwert`
  - `Zielbereich`
  - `PlanungZyklisch`
  - `PlanungEinmalig`
  - `GruppenParameter`
- Doppelte Gruppenzuordnungen werden dabei bereinigt, statt doppelt erhalten zu bleiben.

## Alias-Rückfall
- Nicht mehr verwendete Anzeigenamen werden nach Möglichkeit als Alias auf den Zielparameter übernommen.
- Bereits vorhandene Aliase des Quellparameters werden ebenfalls auf den Zielparameter überführt, sofern sie nicht mit anderen Parametern kollidieren.
- Wenn der neue gemeinsame Name nach Normalisierung ohnehin denselben Import-Match liefert wie ein alter Name, ist kein zusätzlicher Alias nötig.
- Dadurch bleiben spätere Importe robust: Frühere Labor-Schreibweisen können weiterhin auf den nun zusammengeführten Zielparameter gemappt werden.

## Bewusste Grenzen
- Die Funktion löst nur die Parameter-Stammdatendublette, nicht automatisch jede mögliche fachliche Dublette in Zielbereichen oder Planungen.
- Ein `Labor` kann in der aktuellen Parameter-Dublettensuche nicht als Kriterium genutzt werden, weil der Parameterstammsatz selbst keine Laborbindung trägt.
- Ältere interne Schlüssel ohne trennende Tokens sollen weichere Namenserkennungen nicht blockieren; dafür wird der Containment-Fall auf Basis der Anzeigenamen bewertet.
- Auch die großzügige Prüfschärfe macht aus dem Ergebnis keine automatische Wahrheit, sondern nur eine breitere manuelle Prüfliste. Die eigentliche Zusammenführung bleibt weiterhin ein bewusster Bestätigungsschritt.
- Unterschiedliche Standardeinheiten werden bewusst nicht stillschweigend geglättet; sie bleiben als Hinweis sichtbar und sind Teil der Anwenderentscheidung.
- Der gemeinsame Name darf nicht mit Namen, Schlüsseln oder Aliasen anderer Parameter kollidieren.

## Praktische Bedeutung
- Aus historisch doppelt gepflegten Parametern kann wieder ein kanonischer Parameter gebildet werden.
- Bereits erfasste Messwerte, Gruppen- und Planungsbezüge bleiben dabei erhalten.
- Die Zusammenführung ergänzt die bereits vorhandene Alias-Verwaltung sinnvoll: Erst wird der Stammdatensatz vereinheitlicht, danach werden alte Namen als Import-Rückfall abgesichert.
- Die sichtbare Messwert-Anzahl im Parameter-Detail hilft zusätzlich bei der Entscheidung, wie relevant ein Parameter bereits im Bestand verankert ist.
- Die wählbare Prüfschärfe hilft dabei, je nach Aufräumphase zwischen konservativer Sichtung und bewusst breiterem Dubletten-Screening zu wechseln, ohne dass dafür die Zusammenführungslogik selbst umgebaut werden muss.
