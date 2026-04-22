# Labordaten

Dieses Repository enthält die fachliche Wissensbasis und das technische Grundgerüst für eine lokal betriebene Laboranwendung mit Weboberfläche.

Für lokale Arbeit unter Windows ist PowerShell 7 (`pwsh`) der bevorzugte Standard, damit UTF-8-Dateien aus Repository und Wissensbasis konsistent gelesen und geschrieben werden.

## Struktur

- `KI-Wissen-Labordaten/`: projektbezogene Wissensbasis
- `apps/backend/`: lokales FastAPI-Backend
- `apps/frontend/`: React-Frontend mit Vite
- `packages/contracts/`: gemeinsame Import- und API-Verträge
- `docs/`: ergänzende Projektdokumente außerhalb der Wissensbasis

## Entwicklungsstand

Das Projekt ist jetzt in zwei Ebenen aufgeteilt:

- fachlich: Konzept, Ziel-Datenmodell, technisches Schema, Screenplan
- technisch: Scaffold für Backend, Frontend, Verträge, erste Migrationen und erste echte Fachdurchstiche

## Lokaler Start

### Beide Prozesse mit einem Aufruf starten

```pwsh
pwsh -File .\scripts\start-dev.ps1
```

Optional mit Migrationen vor dem Backend-Start:

```pwsh
pwsh -File .\scripts\start-dev.ps1 -RunMigrations
```

Optional zusätzlich mit automatischem Öffnen des Frontends im Browser:

```pwsh
pwsh -File .\scripts\start-dev.ps1 -OpenFrontend
```

### Backend

```pwsh
pwsh
cd apps/backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend

```pwsh
pwsh
cd apps/frontend
npm install
npm run dev
```

## Hinweise

- Die Datenbank ist für V1 lokal und standardmäßig SQLite-basiert.
- Dateien wie PDFs und Markdown-Wissensseiten bleiben im Dateisystem.
- Arztbericht und Verlaufsbericht können bereits lokal als PDF erzeugt werden.
- Der Bereich `Auswertung` zeigt bereits echte Zeitreihen und Diagramme auf Basis vorhandener Messwerte.
- Fachentscheidungen und Architekturableitungen werden wiki-first in `KI-Wissen-Labordaten/` gepflegt.
