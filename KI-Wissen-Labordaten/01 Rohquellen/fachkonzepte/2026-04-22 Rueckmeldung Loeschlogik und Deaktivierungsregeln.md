# Rückmeldung Löschlogik und Deaktivierungsregeln

## Grundlogik

Direkt löschen:

- für Blätter oder kleine Hilfsobjekte ohne schützenswerte Historie

Mit Abfrage und Kaskade löschen:

- wenn das Objekt fachlich Eigentümer klar abhängiger Kinddaten ist

Blockiert oder nur deaktivieren:

- wenn das Objekt historischer Anker, Provenienz oder zentraler Stammdatenträger ist

## Direkt löschen

- `laborparameter_alias`
- `einheit_alias`
- `gruppen_parameter`
- `messwert_referenz`
- `zielbereich_person_override`
- `planung_zyklisch`
- `planung_einmalig`
- künftig auch `person_basisdaten_eintrag`
- `import_pruefpunkt` eher nicht einzeln in der UI, aber technisch kaskadierbar über den Importvorgang

## Mit Abfrage und Kaskade löschen

### `befund`

- Dann mit löschen: `messwert`, darunter `messwert_referenz`
- Zusätzlich: Verweise aus Planungen auf gelöschte Messwerte auf `null` setzen oder neu berechnen
- Dokumentdatei selbst nicht automatisch löschen, sondern als eigene Zusatzfrage behandeln

### `zielbereich`

- Dann mit löschen: `zielbereich_person_override`

### `parameter_gruppe`

- Dann mit löschen: `gruppen_parameter`

### `importvorgang`

- aber nur solange noch keine übernommenen Befunde oder Messwerte daran hängen
- Dann mit löschen: `import_pruefpunkt`

### `einheit`

- aber nur wenn sie fachlich noch nirgends verwendet wird
- Dann mit löschen: `einheit_alias`

## Blockiert oder nur deaktivieren

### `person`

- Sobald Befunde, Messwerte, Planungen oder personenspezifische Zielbereiche existieren, würde ich normales Löschen blockieren und stattdessen `aktiv = false` bevorzugen
- Eine vollständige Kaskadenlöschung nur als bewusste Expertenaktion
- Wenn keine abhängigen Daten vorhanden sind, soll die Person löschbar sein

### `laborparameter`

- Sobald Messwerte oder Planungen daran hängen, nicht löschen, sondern deaktivieren oder zusammenführen
- Wenn noch unbenutzt, kann Löschen mit Kaskade für Alias, Umrechnungsregeln, `gruppen_parameter`, Zielbereiche erlaubt werden

### `labor`

- Sobald Befunde daran hängen, nicht löschen, sondern deaktivieren

### `dokument`

- Sobald es an `befund` oder `importvorgang` hängt, normales Löschen blockieren
- Datenbankeintrag und Datei auf Platte immer getrennt behandeln

### `importvorgang`

- Wenn daraus bereits Befunde oder Messwerte übernommen wurden, nicht löschen, weil sonst Herkunft verloren geht

### `parameter_umrechnungsregel`

- Wenn bereits normierte Messwerte auf diese Regel zurückverweisen, nicht löschen, sondern deaktivieren

### `einheit`

- Wenn sie als Standardeinheit, Zielbereichseinheit oder Umrechnungsbasis benutzt wird, nicht löschen, sondern deaktivieren oder ersetzen

### `wissensseite`

- Eher kein normales Löschen aus der Fach-UI, weil das mehr ein synchronisierter Metadatensatz ist

### `einstellung` und `datenbasis_sperre`

- Keine normale Löschlogik; hier eher zurücksetzen, aufheben oder gezielte Admin-Aktion

## Ergänzende Festlegungen aus dem selben Dialog

- Wenn durch das Löschen eines `messwert` ein `befund` leer wird, soll der leere Befund standardmäßig mitgelöscht werden.
- Bei `person` darf eine komplett unbenutzte Person gelöscht werden; `person_basisdaten_eintrag` gilt künftig als kaskadierbares Pflegekind.
- Für `planung` sollen Verweise auf gelöschte Messwerte nicht nur auf `null` gesetzt, sondern in einem definierten Reparaturablauf neu bewertet werden.
- Für `einheit` und ähnliche Stammdaten soll die Nutzungsprüfung streng sein und bekannte fachliche Verwendungen auch dann berücksichtigen, wenn sie nicht als Fremdschlüssel modelliert sind.
- Dokumentdateien sollen beim Entfernen eines unreferenzierten Dokumentdatensatzes standardmäßig nicht still gelöscht werden; als sicherer Default wurde eine spätere Umbenennung mit Präfix `Unreferenziert_` als sinnvolle Richtung genannt.
