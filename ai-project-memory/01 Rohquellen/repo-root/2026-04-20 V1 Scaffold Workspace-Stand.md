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

## Hinweis
Dies ist keine vollständige Dateikopie, sondern eine Rohquellen-Referenz auf den aktuellen Workspace-Stand nach dem technischen Projektgerüst und den ersten verifizierten Durchstichen.
