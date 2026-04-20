# V1 Scaffold Workspace-Stand

## Quelle
- Art: Workspace-Stand nach technischem Scaffolding
- Datum: 2026-04-20
- Status: Rohquellen-Referenz

## Erfasste Bereiche
- `README.md`
- `apps/backend/`
- `apps/frontend/`
- `packages/contracts/`
- `data-example/`

## Kernelemente des Workspace-Stands
- Backend-Grundgerüst mit FastAPI, SQLAlchemy, Alembic und ersten Fachmodulen
- Erste relationale Migration für Kernobjekte wie Person, Labor, Laborparameter, Befund und Messwert
- Frontend-Grundgerüst mit React, Vite, Routing und sachlicher V1-Navigations-Shell
- Erste echte Durchstich-UI für Personen, Parameter, Befunde und Messwerte mit API-Anbindung
- Erweiterung des Durchstichs um Laborreferenzen auf Messwert-Ebene und allgemeine Zielbereiche auf Parameter-Ebene
- Personenspezifische Zielbereichs-Overrides als Aufbau auf allgemeinen Zielbereichen
- Planung als echter Durchstich mit zyklischen Kontrollen, Einmalvormerkungen, Fälligkeitslogik und Vorschlagsliste
- Importprüfung als echter Durchstich mit JSON-Entwurf, Prüfpunkten, Parameter-Mapping und bewusster Übernahme
- Erste Berichtsansichten als echter Durchstich mit Arztbericht-Vorschau und Verlaufsbericht-Vorschau
- Berichtsausgabe als echter lokaler PDF-Export für Arztbericht und Verlaufsbericht
- Auswertung als echter Arbeitsbereich mit Zeitreihen, Kennzahlen, Referenzlinien, Zielbereichen und qualitativen Ereignissen
- Gruppen als echter Stammdatenbereich mit Parameterzuordnung, Sortierung und eigener Verwaltungsoberfläche
- Bereichsübergreifende Filter nach Personen, Gruppen, Laboren und Zeitraum für Messwertlisten, Berichte und Auswertung
- Personenübergreifende Familienansichten in Berichtsvorschau, Verlaufsbericht und Auswertungsdiagrammen
- Erstes Importvertragsschema unter `packages/contracts/import-v1.schema.json`
- Aktualisierte Root-Dokumentation für lokalen Start

## Bereits verifizierte Punkte
- Python-Quellcode im Backend kompiliert
- Frontend-Produktionsbuild läuft durch
- Alembic-Migration lässt sich gegen SQLite ausführen
- API-Rauchtest für `Person -> Parameter -> Befund -> Messwert -> Liste` war erfolgreich
- API-Rauchtest für `MesswertReferenz` und `Zielbereich` war erfolgreich
- API-Rauchtest für `ZielbereichOverride` pro Person war erfolgreich
- API-Rauchtest für `PlanungZyklisch`, `PlanungEinmalig` und `Fälligkeiten` war erfolgreich
- API-Rauchtest für `Importentwurf -> Prüfpunkte -> Mapping -> Übernahme` war erfolgreich
- API-Rauchtest für `Arztbericht-Vorschau` und `Verlaufsbericht-Vorschau` war erfolgreich
- API-Rauchtest für `Arztbericht-PDF` und `Verlaufsbericht-PDF` war erfolgreich
- API-Rauchtest für `Auswertung Gesamtzahlen` und `Auswertung Verlauf` war erfolgreich
- Frontend-Build mit echter Diagrammbibliothek für den Auswertungsbereich läuft durch
- Alembic-Migration lässt sich auch mit der neuen Gruppenmigration bis `20260421_0005` ausführen
- API-Rauchtest für `Gruppen`, `GruppenParameter`, gruppengefilterte Messwertlisten, gruppengefilterte Berichtsvorschau, Verlaufs-PDF und personenübergreifende Auswertung war erfolgreich

## Hinweis
Dies ist keine vollständige Dateikopie, sondern eine Rohquellen-Referenz auf den aktuellen Workspace-Stand nach dem technischen Projektgerüst und den ersten verifizierten Durchstichen.
