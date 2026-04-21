---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../../README.md
  - ../../../scripts/start-dev.ps1
  - ../../../apps/backend/pyproject.toml
  - ../../../apps/backend/src/labordaten_backend/core/config.py
  - ../../../apps/frontend/package.json
  - ../../../apps/frontend/vite.config.ts
tags:
  - betrieb
  - start
  - backend
  - frontend
---

# Lokaler Start von Backend und Frontend

## Kurzfassung
Für den lokalen Betrieb wird zuerst das Backend in `apps/backend` und danach das Frontend in `apps/frontend` gestartet. Das Frontend läuft standardmäßig unter `http://localhost:5173` und leitet `/api` per Vite-Proxy an das Backend unter `http://127.0.0.1:8000` weiter.

## Erstinstallation auf einer neuen Umgebung

### Backend einmalig einrichten
```powershell
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend einmalig einrichten
```powershell
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\frontend
npm install
npm run dev
```

## Täglicher Start

### Beide Prozesse mit einem Aufruf starten
```powershell
cd C:\Users\Lui\OneDrive\Documents\Labordaten
.\scripts\start-dev.ps1
```

Optional mit Migrationen vor dem Backend-Start:
```powershell
.\scripts\start-dev.ps1 -RunMigrations
```

Optional mit automatischem Öffnen des Frontends im Browser:
```powershell
.\scripts\start-dev.ps1 -OpenFrontend
```

Das Skript öffnet zwei neue PowerShell-Fenster, startet darin Backend und Frontend getrennt und nutzt für das Backend direkt den Python-Interpreter aus `apps/backend/.venv`. Mit `-OpenFrontend` wartet es kurz, prüft die lokale Frontend-URL und öffnet anschließend `http://localhost:5173` im Standardbrowser.

### Desktop-Verknüpfung
Auf dem Desktop kann eine Verknüpfung `Labordaten starten.lnk` liegen, die genau diesen Modus startet. Sie ruft `scripts/start-dev.ps1 -OpenFrontend` auf, startet damit beide Entwicklungsprozesse und öffnet danach das Frontend im Browser.

### Backend
```powershell
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\backend
.venv\Scripts\Activate.ps1
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend
```powershell
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\frontend
npm run dev
```

## Erreichbarkeit nach dem Start
- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- API-Dokumentation: `http://127.0.0.1:8000/api/docs`

## Praktische Hinweise
- Das Backend sollte zuerst laufen, weil das Frontend API-Anfragen an `/api` an das Backend auf Port `8000` weiterleitet.
- `alembic upgrade head` ist vor allem dann nötig, wenn neue Migrationen aus dem Repository hinzugekommen sind.
- `pip install -e .[dev]` oder `npm install` müssen im Alltag nur erneut ausgeführt werden, wenn sich Abhängigkeiten geändert haben.
- Das Backend arbeitet mit lokaler Sperrlogik für Einzelnutzung. Eine zweite laufende Instanz kann deshalb zu Konfliktmeldungen führen.
