# Labordaten

Dieses Repository enthält die fachliche Wissensbasis und das technische Grundgerüst für eine lokal betriebene Laboranwendung mit Weboberfläche.

## Struktur

- `ai-project-memory/`: projektbezogene Wissensbasis
- `apps/backend/`: lokales FastAPI-Backend
- `apps/frontend/`: React-Frontend mit Vite
- `packages/contracts/`: gemeinsame Import- und API-Verträge
- `docs/`: ergänzende Projektdokumente außerhalb der Wissensbasis

## Entwicklungsstand

Das Projekt ist jetzt in zwei Ebenen aufgeteilt:

- fachlich: Konzept, Ziel-Datenmodell, technisches Schema, Screenplan
- technisch: Scaffold für Backend, Frontend, Verträge und erste Migration

## Lokaler Start

### Backend

```powershell
cd apps/backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend

```powershell
cd apps/frontend
npm install
npm run dev
```

## Hinweise

- Die Datenbank ist für V1 lokal und standardmäßig SQLite-basiert.
- Dateien wie PDFs und Markdown-Wissensseiten bleiben im Dateisystem.
- Fachentscheidungen und Architekturableitungen werden wiki-first in `ai-project-memory/` gepflegt.
