---
typ: screenplan
status: entwurf
letzte_aktualisierung: 2026-04-21
quellen:
  - V1 Ziel-Datenmodell.md
  - V1 Technisches Schema.md
  - ../Entscheidungen/V1 Vorentscheidungen Produktform und Kernmodell.md
  - ../../../apps/frontend/src/shared/components/StartPage.tsx
tags:
  - screenplan
  - ui
  - v1
  - workflows
---

# V1 Screenplan und Kernworkflows

## Kurzfassung
Die V1-Oberfläche soll arbeitsbereichsorientiert und sachlich aufgebaut sein. Der Nutzer arbeitet typischerweise entlang von Personen, Befunden, Messwerten, Planung, Auswertung, Berichten und Importprüfung. Die Oberfläche muss schnelle Datenerfassung, saubere Prüfung und gute Lesbarkeit vor ästhetischem Komfort priorisieren.

## Warum der Screenplan nach dem technischen Schema kommt
- Listen, Filter und Detailseiten hängen direkt an den Tabellen und Beziehungen.
- Importprüfung braucht klar definierte Prüfobjekte, Warnungen und Übernahmeschritte.
- Berichte und Auswertungen werden erst klar, wenn Zielbereiche, Referenzen und Messwerttypen technisch feststehen.

## Hauptnavigation V1
- `Start`
- `Personen`
- `Befunde`
- `Messwerte`
- `Parameter`
- `Gruppen`
- `Planung`
- `Auswertung`
- `Berichte`
- `Import`
- `Wissensbasis`
- `Einstellungen`

## Grundmuster der Oberfläche
- Linke Hauptnavigation oder obere sachliche Hauptnavigation
- Jede Hauptseite mit Listenbereich, Filterleiste und Detail- oder Bearbeitungsbereich
- Primäre Aktionen gut sichtbar: `Neu`, `Bearbeiten`, `Importieren`, `Bericht erstellen`
- Warnungen und Prüfpunkte klar vom normalen Inhalt getrennt
- PDFs und Wissensseiten als begleitende Panels oder Öffnen-Aktionen

## Start

### Zweck
- Schneller Überblick über offenen Handlungsbedarf
- Arbeitsorientierter Einstieg statt technischer Selbstbeschreibung der Anwendung

### Gestaltungsprinzip
- Die Startseite soll vorrangig zeigen, womit der Nutzer als Nächstes sinnvoll arbeiten kann.
- Prominent gehören deshalb Live-Informationen zum Datenbestand, zu offenen Importprüfungen und zum aktuellen Betriebszustand dorthin.
- Reine Technikangaben wie Frameworks, Datenbank oder Scaffold-Status sind für die Startseite nachrangig und gehören eher in Entwicklungskontext, Dokumentation oder Einstellungen.
- Die Startseite soll in V1 nicht als dekoratives Dashboard verstanden werden, sondern als kurze arbeitsleitende Übersicht mit klaren Anschlussaktionen.

### Inhalte
- Anzahl Personen
- Anzahl Befunde
- Anzahl Messwerte
- Anzahl Parameter
- Offene Importprüfungen
- Kennzeichnung, ob offene Importentwürfe Warnungen oder Fehler enthalten
- Fällige oder bald fällige Planungen
- Aktueller Status der Datenbasis-Sperre oder anderer lokaler Betriebszustände
- Letzte hinzugefügte oder zuletzt relevante Befunde nur dann, wenn sie den nächsten Arbeitsschritt erkennbar unterstützen

### Aktionen
- `Neue Person`
- `Neuer Befund`
- `Import starten`
- `Fälligkeiten anzeigen`
- `Auswertung öffnen`
- `Einstellungen öffnen`, wenn Betriebszustände oder Sperren relevant sind

## Personen

### Personenliste
- Suchfeld
- Filter: aktiv, Geschlecht, Altersbereich
- Spalten: Anzeigename, Geburtsdatum, Geschlecht, letzte Befundaktivität, Anzahl Messwerte

### Personendetail
- Stammdatenkarte
- Hinweise
- Basisdaten-Verlauf
- Zielbereich-Overrides
- Letzte Befunde
- Aktive Planung
- Einmalvormerkungen

### Bearbeitungsdialoge
- Person anlegen oder bearbeiten
- Basisdateneintrag hinzufügen
- Personenspezifischen Zielbereich überschreiben

## Befunde

### Befundliste
- Filter: Person, Labor, Zeitraum, mit Dokument, Importquelle, Dublettenwarnung
- Spalten: Entnahmedatum, Befunddatum, Person, Labor, Dokument, Anzahl Messwerte, Importstatus

### Befunddetail
- Kopfbereich mit Person, Labor, Daten, Dokumentlink
- Befundbemerkung
- Messwerttabelle des Befunds
- Laborreferenzen je Messwert
- Importbezug und Warnungen

### Aktionen
- `Neuer Befund`
- `Messwert hinzufügen`
- `PDF öffnen`
- `Als möglicher Dublett prüfen`

## Messwerte

### Messwertliste
- Starke Filterbarkeit, da dies die wichtigste Fachliste wird
- Filter: Person, Parameter, Gruppe, Labor, Zeitraum, numerisch oder textlich, mit Unsicherheitsflag, mit Referenzabweichung
- Spalten: Datum, Person, Parameter, Rohwert, normierter Wert, Einheit, Labor, Befund, Warnungen

### Messwertdetail
- Verknüpfung zu Person und Befund
- Originalparametername
- Rohwert und strukturierter Wert
- Messwertbemerkung kurz und lang
- Laborreferenz
- Zielbereich effektiv
- Import- und Prüfhinweise
- Direkt aus Listen und Berichtsansichten erreichbar, nicht nur über versteckte Zusatzformulare

### Besonderheit qualitative Werte
- Eigene Filteroption `nur qualitative Werte`
- In Verlaufsansichten nicht als Linie erzwingen
- V1-Empfehlung: als Ereignisliste oder Textzeile im Verlauf anzeigen

## Parameter

### Parameterliste
- Suche
- Filter: aktiv, Werttyp, mit Zielbereich, mit Wissensseite, mit Umrechnungsregel
- Spalten: Anzeigename, interner Schlüssel, Standardeinheit, Werttyp, Gruppenanzahl

### Parameterdetail
- Stammdaten
- Synonyme
- Umrechnungsregeln
- Verwandte Parameter
- Allgemeine Zielbereiche
- Gruppenmitgliedschaften
- Wissensseitenlink

### Aktionen
- `Parameter anlegen`
- `Synonym hinzufügen`
- `Umrechnungsregel hinzufügen`
- `Zielbereich anlegen`

## Gruppen

### Gruppenliste
- Name, Beschreibung, Parameteranzahl, Wissensseite

### Gruppendetail
- Stammdaten
- Parameterliste mit Sortierung
- Aktionen für Berichte, Auswertung und Planung

## Planung

### Planung gesamt
- Tabs oder Unterbereiche:
  - `Zyklisch`
  - `Einmalig`
  - `Fälligkeiten`
  - `Nächster Termin`

### Zyklische Planung
- Filter: Person, Gruppe, Parameter, Status, fällig oder bald fällig
- Spalten: Person, Parameter, Intervall, letzte Messung, nächste Fälligkeit, Priorität, Status

### Einmalige Vormerkungen
- Spalten: Person, Parameter, Status, Zieltermin, Bemerkung

### Fälligkeitsansicht
- Konsolidierte Vorschlagsliste für nächsten Termin
- Zusammenführung aus zyklischen Planungen und offenen Vormerkungen

### Aktionen
- `Planung anlegen`
- `Vormerkung anlegen`
- `Als erledigt markieren`
- `Planungsbericht erstellen`

## Auswertung

### Grundaufbau
- Auswahlbereich links oder oben
- Diagramm- und Tabellenbereich zentral
- Detailpanel für Referenzen und Kontext

### Filter
- Person Pflicht
- Parameter oder Gruppe
- Zeitraum
- Anzeigeart: absolut, normiert, nur numerisch, numerisch plus qualitative Ereignisse
- Referenzanzeige: Labor, Zielbereich, beides, keines

### Ansichten
- Einzelparameter-Verlauf
- Mehrparameter-Verlauf
- Tabellenübersicht mit Kennzahlen
- Qualitative Ereignisliste unter oder neben dem Diagramm

### Kennzahlen
- letzte Messung
- Minimum und Maximum
- Anzahl Messungen
- Zeitraum vorhandener Daten
- einfache Trendanzeige

## Berichte

### Berichtsauswahl
- `Arztbericht Liste`
- `Verlaufsbericht Zeitachse`
- später erweiterbar

### Arztbericht Liste
- Filter: Person, Gruppe, Parameter, Zeitraum, Labor
- Mehrfachauswahl kompakt statt breitflächiger Checkbox-Zeilen, inklusive `Alle auswählen` und `Alle abwählen`
- Standardmäßig aktiv:
  - Parameter
  - Datum
  - Wert
  - Einheit
  - Referenzbereich
  - Labor
  - Befundbemerkung
  - Messwertbemerkung
- Felder einzeln abwählbar
- Vorschau enthält zusätzlich Kennzahlen wie Anzahl enthaltener Werte und Anzahl referenzauffälliger Werte
- Vorschau enthält eine kurze Charakterisierung des Berichtsinhalts, bevorzugt aus Gruppen oder Schwerpunkten abgeleitet
- Ausgabe als sachlicher PDF-Bericht

### Verlaufsbericht Zeitachse
- Numerische Parameter als Linien oder Punkte
- Optionale Referenzbänder
- Qualitative Werte in V1 als begleitende Textliste oder Ereignisbereich

## Import

### Import-Eingang
- Auswahl: CSV, Excel, JSON, manuelle Eingabe, später KI
- Personzuordnung optional vorschlagen
- Option, Rohquelle als Dokument zu archivieren
- Importbemerkung sinnvoll vorbelegen, aber vor dem Anlegen des Entwurfs frei editierbar halten

### Import-Prüfansicht
- Kopf mit Quelle, Status, möglicher Person, möglichem Befund
- Prüfpunkte gruppiert nach Fehler, Warnung, Bestätigung nötig
- Mapping-Tabelle für Parameter
- Vorschau der Messwerte
- Kennzeichnung potenzieller Dubletten

### Freigabe
- `Übernehmen`
- `Teilweise übernehmen`
- `Verwerfen`
- Bei Dublettenwarnungen bewusste Bestätigung erforderlich

## Wissensbasis

### V1-Funktion
- Liste verknüpfter Wissensseiten
- Anzeige ausgewählter Markdown-Seiten
- Öffnen im Dateisystem oder externen Editor

### Filter
- Bezugstyp Parameter oder Gruppe
- Nur verknüpfte oder alle bekannten Seiten

## Einstellungen

### Bereiche
- Datenpfad
- Dokumentenpfad
- Wissensordner
- Standardanzeigeeinheiten
- Importoptionen
- Berichtspräferenzen
- spätere KI-Einstellungen

### Systembereich
- aktive Datenbasis-Sperre anzeigen
- Sperre kontrolliert zurücksetzen

## Wichtigste Kernworkflows

### Workflow 1: Person und Stammdaten anlegen
1. Person anlegen
2. optionale Basisdaten wie Gewicht oder Größe ergänzen
3. bei Bedarf personenspezifische Zielbereiche setzen

### Workflow 2: Befund manuell erfassen
1. Person wählen
2. Befundkopf mit Labor, Entnahme- und Befunddatum anlegen
3. Dokument optional verknüpfen
4. Messwerte hinzufügen
5. Referenztexte und Bemerkungen ergänzen

### Workflow 3: Import prüfen und übernehmen
1. Quelle auswählen
2. Importvorschau erzeugen
3. Personen- und Parameterzuordnung prüfen
4. Warnungen und mögliche Dubletten bestätigen
5. Befund und Messwerte übernehmen

### Workflow 4: Verlauf auswerten
1. Person wählen
2. Parameter oder Gruppe wählen
3. Zeitraum und Referenzanzeige setzen
4. Diagramm und Kennzahlen prüfen
5. optional Bericht erzeugen

### Workflow 5: Planung pflegen
1. zyklischen Plan oder Einmalvormerkung anlegen
2. Fälligkeiten prüfen
3. Vorschlagsliste für nächsten Termin erzeugen
4. nach neuem Befund Erledigung oder neue Fälligkeit ableiten

## Was in V1 bewusst noch nicht maximal ausgebaut werden muss
- eingebauter Markdown-Editor
- komplexe Dashboards mit vielen frei speicherbaren Ansichten
- medizinische Interpretation oder Diagnosehinweise
- fortgeschrittene Mehrfach-Nutzer- oder Rollenverwaltung

## Offene UI-Restpunkte
- Genaue Darstellung qualitativer Werte im Verlaufsbericht final festziehen
- Ob Personen- und Befunddetails als Seiten oder Split-View umgesetzt werden
- Wie viele Berichtsvorlagen in V1 fest mitgeliefert werden

## Einordnung für die weitere Umsetzung
- Der Screenplan bildet die Hauptarbeitswege der Anwendung bereits realistisch ab.
- Der nächste sinnvolle Schritt wäre daraus eine konkrete technische Projektstruktur abzuleiten, etwa Backend-Module, API-Endpunkte und Frontend-Routen.
