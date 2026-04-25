---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-23
quellen:
  - ../../../README.md
  - ../../../scripts/start-dev.ps1
  - ../../../.vscode/launch.json
  - ../../../.vscode/tasks.json
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
Für den lokalen Betrieb wird zuerst das Backend in `apps/backend` und danach das Frontend in `apps/frontend` gestartet. Das Frontend läuft standardmäßig unter `http://localhost:5173` und leitet `/api` per Vite-Proxy an das Backend unter `http://127.0.0.1:8000` weiter. Unter Windows ist PowerShell 7 (`pwsh`) der bevorzugte Standard, weil die UTF-8-Dateien des Repositories damit konsistent gelesen und gestartet werden.

## Entwicklungsmodus im Alltag
- Der lokale Standardbetrieb dieses Projekts ist Entwicklungsbetrieb, nicht ein separater Test- oder Produktionsmodus.
- Das Backend wird lokal mit `uvicorn ... --reload` gestartet und lädt Python-Code bei Änderungen neu.
- Das Frontend wird lokal mit `npm run dev` über Vite gestartet und arbeitet mit Dev-Server und Hot-Reload.
- Für normale Entwicklungsarbeit ist deshalb zunächst davon auszugehen, dass Änderungen ohne manuellen Neuaufbau wirksam werden.

## Erstinstallation auf einer neuen Umgebung

### Backend einmalig einrichten
```pwsh
pwsh
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend einmalig einrichten
```pwsh
pwsh
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\frontend
npm install
npm run dev
```

## Täglicher Start

### Beide Prozesse mit einem Aufruf starten
```pwsh
pwsh -File C:\Users\Lui\OneDrive\Documents\Labordaten\scripts\start-dev.ps1
```

Optional mit Migrationen vor dem Backend-Start:
```pwsh
pwsh -File C:\Users\Lui\OneDrive\Documents\Labordaten\scripts\start-dev.ps1 -RunMigrations
```

Optional mit automatischem Öffnen des Frontends im Browser:
```pwsh
pwsh -File C:\Users\Lui\OneDrive\Documents\Labordaten\scripts\start-dev.ps1 -OpenFrontend
```

Das Skript öffnet bevorzugt zwei neue PowerShell-7-Fenster, startet darin Backend und Frontend getrennt und nutzt für das Backend direkt den Python-Interpreter aus `apps/backend/.venv`. Falls `pwsh` lokal noch nicht vorhanden ist, fällt es aus Kompatibilitätsgründen auf Windows PowerShell 5.1 zurück. Mit `-OpenFrontend` wartet es kurz, prüft die lokale Frontend-URL und öffnet anschließend `http://localhost:5173` im Standardbrowser.

### Desktop-Verknüpfung
Auf dem Desktop kann eine Verknüpfung `Labordaten starten.lnk` liegen, die genau diesen Modus startet. Sie ruft `scripts/start-dev.ps1 -OpenFrontend` auf, startet damit beide Entwicklungsprozesse und öffnet danach das Frontend im Browser.

### Run-Aktion im Workspace
Im Workspace gibt es zusätzlich eine Run-Aktion `Labordaten starten`, die denselben Startweg verwendet. Sie ruft über `.vscode/launch.json` ebenfalls `scripts/start-dev.ps1 -OpenFrontend` auf und ist damit der direkte Einstieg aus dem Run-Bereich der Entwicklungsumgebung.

Zusätzlich liegt unter `.vscode/tasks.json` eine gleichnamige Task `Labordaten starten`, falls der Start lieber über die Task-Ausführung statt über die Run-Aktion ausgelöst werden soll.

### Backend
```pwsh
pwsh
cd C:\Users\Lui\OneDrive\Documents\Labordaten\apps\backend
.venv\Scripts\Activate.ps1
uvicorn labordaten_backend.main:app --reload --app-dir src
```

### Frontend
```pwsh
pwsh
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
- Relative Backend-Defaults wie `./labordaten.runtime.json`, `./documents` und `./labordaten.db` sind an den tatsächlichen Startordner gebunden.
- Der kanonische lokale Betriebsmodus dieses Projekts startet das Backend deshalb aus `apps/backend`; nur so bleiben Datenbank, Laufzeit-Einstellungen, Sperrdatei und Dokumentablage konsistent an einem Ort.
- Ein Start aus dem Repository-Wurzelverzeichnis kann sonst unbeabsichtigt eine zweite lokale Laufzeitinsel mit eigener `labordaten.runtime.json`, eigener Dokumentablage und abweichenden Dateireferenzen erzeugen.
- Im Workspace sollte unter Windows nach Möglichkeit ein Terminal mit `pwsh` als Standardprofil verwendet werden, damit Umlaute und andere UTF-8-Inhalte aus Markdown-, Skript- und Konfigurationsdateien konsistent erscheinen.
