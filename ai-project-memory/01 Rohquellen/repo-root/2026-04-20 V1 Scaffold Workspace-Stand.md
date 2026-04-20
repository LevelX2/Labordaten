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
- Erstes Importvertragsschema unter `packages/contracts/import-v1.schema.json`
- Aktualisierte Root-Dokumentation für lokalen Start

## Bereits verifizierte Punkte
- Python-Quellcode im Backend kompiliert
- Frontend-Produktionsbuild läuft durch
- Alembic-Migration lässt sich gegen SQLite ausführen
- API-Rauchtest für `Person -> Parameter -> Befund -> Messwert -> Liste` war erfolgreich
- API-Rauchtest für `MesswertReferenz` und `Zielbereich` war erfolgreich

## Hinweis
Dies ist keine vollständige Dateikopie, sondern eine Rohquellen-Referenz auf den aktuellen Workspace-Stand nach dem ersten technischen Projektgerüst.
