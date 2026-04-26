# Labordaten

Dieses Repository enthält die projektbezogene Wissensbasis und die lokale V1-Anwendung für die Pflege, Prüfung, Auswertung und Berichterstellung von Labordaten.

Für lokale Arbeit unter Windows ist PowerShell 7 (`pwsh`) der bevorzugte Standard, damit UTF-8-Dateien aus Repository und Wissensbasis konsistent gelesen und geschrieben werden.

## Überblick

Die Anwendung ist als lokales Websystem aufgebaut:

- `apps/backend/`: FastAPI-Backend mit SQLAlchemy, Alembic, Importlogik und PDF-Erzeugung
- `apps/frontend/`: React-Frontend mit Vite für die fachlichen Arbeitsbereiche
- `packages/contracts/`: gemeinsame Import- und API-Verträge
- `KI-Wissen-Labordaten/`: projektbezogene Wissensbasis für wiki-first Arbeit
- `scripts/`: lokale Start- und Hilfsskripte
- `docs/`: ergänzende Projektdokumente außerhalb der Wissensbasis

## Aktueller Stand

Das Repository ist kein reines Scaffold mehr. Im aktuellen Workspace sind bereits echte Arbeitsbereiche und API-Durchstiche vorhanden, unter anderem für:

- Personen, Befunde, Messwerte und Parameter
- Gruppen, Referenzlogik und Zielbereiche
- Planung, Auswertung und Berichte mit PDF-Erzeugung
- Importprüfung mit KI-Prompt, KI-/JSON-Einfügen, Prüfansicht und Historie
- Wissensbasis und Einstellungen als eigene Bereiche in der Anwendung

Noch offen sind insbesondere direkter PDF-Import mit OCR oder Parser-Stufe sowie eine angebundene KI-Schnittstelle innerhalb der Anwendung.

## Voraussetzungen

- Python `3.11+`
- Node.js mit `npm`
- unter Windows möglichst `pwsh`

## Lokaler Start

### Einmalige Einrichtung

Backend:

```pwsh
pwsh
cd .\apps\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
```

Frontend:

```pwsh
pwsh
cd .\apps\frontend
npm install
```

### Beide Prozesse mit einem Aufruf starten

```pwsh
pwsh -File .\scripts\start-dev.ps1
```

Optional mit Migrationen vor dem Backend-Start:

```pwsh
pwsh -File .\scripts\start-dev.ps1 -RunMigrations
```

Optional mit automatischem Öffnen des Frontends im Browser:

```pwsh
pwsh -File .\scripts\start-dev.ps1 -OpenFrontend
```

Das Skript startet Backend und Frontend in getrennten Shell-Fenstern. Für das Backend verwendet es direkt `apps/backend/.venv/Scripts/python.exe`.

### Manuell starten

Backend:

```pwsh
pwsh
cd .\apps\backend
.venv\Scripts\Activate.ps1
uvicorn labordaten_backend.main:app --reload --app-dir src
```

Frontend:

```pwsh
pwsh
cd .\apps\frontend
npm run dev
```

### Standard-URLs

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- API-Dokumentation: `http://127.0.0.1:8000/api/docs`

## Verifikation

Backend-Tests:

```pwsh
cd .\apps\backend
.\.venv\Scripts\python.exe -m pytest
```

Frontend-Tests:

```pwsh
cd .\apps\frontend
npm test
```

Frontend-Produktionsbuild:

```pwsh
cd .\apps\frontend
npm run build
```

## Betriebsnotizen

- Die Datenbank ist lokal und standardmäßig SQLite-basiert.
- Backend-Defaults wie `labordaten.db`, `documents/` und `labordaten.runtime.json` sind relativ zum Startordner des Backends.
- Der kanonische lokale Betrieb startet das Backend deshalb aus `apps/backend`, damit Datenbank, Dokumentablage und Laufzeitdateien konsistent bleiben.
- Die Anwendung ist für lokalen Einzelbetrieb ausgelegt und enthält dafür eine Sperrlogik.

## Wissensbasis

Projektfragen und fachliche Entscheidungen werden wiki-first über `KI-Wissen-Labordaten/` bearbeitet. Relevante Einstiegsseiten sind:

- `KI-Wissen-Labordaten/00 Projektstart.md`
- `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Index.md`
- `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md`
- `KI-Wissen-Labordaten/02 Wissen/Prozesse/Lokaler Start von Backend und Frontend.md`
