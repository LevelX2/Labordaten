---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../00 Uebersichten/Aktueller Projektstatus.md
  - Planung Erstarchitektur und Umsetzungsphasen.md
  - V1 Projektstruktur, Module und Schnittstellen.md
  - ../Entscheidungen/V1 Empfohlener Technologie-Stack.md
  - ../../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand.md
  - ../../../README.md
  - ../../../apps/backend/src/labordaten_backend/main.py
  - ../../../apps/backend/src/labordaten_backend/api/router.py
  - ../../../apps/backend/src/labordaten_backend/core/config.py
  - ../../../apps/backend/src/labordaten_backend/core/db/session.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/berichte/service.py
  - ../../../apps/frontend/package.json
  - ../../../apps/frontend/src/app/App.tsx
  - ../../../apps/frontend/src/app/router.tsx
  - ../../../apps/frontend/src/shared/api/client.ts
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
tags:
  - architektur
  - systembild
  - pakete
  - uebersicht
---

# Systembild und Paketübersicht der Anwendung

## Kurzfassung
Die Anwendung ist aktuell bereits ein lokales Websystem mit React-Frontend, FastAPI-Backend, SQLite-Datenbank, PDF-Erzeugung im Backend und einem separaten Vertragsbereich für strukturierte Importe. Das geplante Zielbild geht darüber hinaus und ergänzt noch fehlende Fachmodule wie Gruppen, Wissensbasis und Einstellungen als eigenständige, sauber angeschlossene Bereiche.

## Einordnung
- Das folgende Ist-Bild beschreibt den aktuellen Workspace-Stand vom 2026-04-21.
- Das Zielbild beschreibt die dokumentierte V1-Architektur aus der Wissensbasis, nicht durchgehend bereits umgesetzten Code.
- Die Wissensbasis `ai-project-memory/` ist projektseitig zentral, ist aber aktuell noch nicht als voll angebundene Laufzeitkomponente der Anwendung umgesetzt.

## Diagramm 1: Systemkomponenten und Zusammenspiel

```mermaid
flowchart TB
  subgraph IST["A. Systembild heute"]
    direction TB
    Nutzer["Nutzer im Browser"]
    Frontend["Frontend<br/>React, Vite, Router,<br/>Query, Diagramme"]
    Backend["Backend<br/>FastAPI,<br/>Routen und Fachmodule"]
    DB["SQLite<br/>labordaten.db"]
    PDF["PDF-Erzeugung<br/>ReportLab"]
    Contracts["Verträge<br/>import-v1.schema.json"]

    Nutzer --> Frontend
    Frontend <-->|"JSON über /api"| Backend
    Backend --> DB
    Backend --> PDF
    Backend -. "Importstruktur" .-> Contracts
  end

  subgraph SOLL["B. Zielbild laut Wissensbasis"]
    direction TB
    Nutzer2["Nutzer im lokalen Browser"]
    Frontend2["Frontend<br/>Arbeitsbereiche, Formulare,<br/>Filter, Prüfungen, Diagramme"]
    Backend2["Backend<br/>API, Fachlogik,<br/>Importprüfung, Berichte,<br/>Sperrlogik, Konfiguration"]
    DB2["Lokale relationale<br/>Datenbank"]
    Files2["Dateisystem<br/>PDF-Dokumente und<br/>Markdown-Wissensseiten"]
    Contracts2["Versionierte Verträge<br/>API und Import"]
    Ext2["Externe Helfer<br/>Codex oder KI-Importe"]

    Nutzer2 --> Frontend2
    Frontend2 <-->|"REST-nahe JSON-API"| Backend2
    Backend2 --> DB2
    Backend2 --> Files2
    Backend2 <--> Contracts2
    Ext2 --> Contracts2
    Ext2 -->|"strukturierte Importdaten"| Backend2
  end
```

## Diagramm 2: Programmpakete und Abhängigkeiten

```mermaid
flowchart TD
  subgraph IST2["A. Paketbild heute"]
    direction TB
    FEApp["apps/frontend/src/app<br/>App, Router, Layout"]
    FEFeat["frontend/features<br/>personen, befunde, messwerte,<br/>parameter, planung, importe,<br/>berichte, auswertung"]
    FEShared["frontend/shared<br/>api, Typen,<br/>Basis-Komponenten"]
    BEApi["backend/api<br/>router, deps, routes"]
    BEMod["backend/modules<br/>personen, labore, parameter,<br/>befunde, messwerte, referenzen,<br/>zielbereiche, planung,<br/>importe, berichte, auswertung"]
    BEModels["apps/backend/src/labordaten_backend/models<br/>SQLAlchemy-Modelle"]
    BECore["backend/core<br/>config, db"]
    BEMig["apps/backend/migrations<br/>Alembic"]
    ContractsNow["packages/contracts<br/>Importschema"]

    FEApp --> FEFeat
    FEFeat --> FEShared
    FEShared --> BEApi
    BEApi --> BEMod
    BEMod --> BEModels
    BEMod --> BECore
    BEMig --> BEModels
    BEMod -. "Importstruktur" .-> ContractsNow
  end

  subgraph SOLL2["B. Paketbild geplant"]
    direction TB
    FEApp2["frontend/app<br/>Routen, Layout, Provider"]
    FEFeat2["frontend/features<br/>personen, labore, parameter, gruppen,<br/>befunde, messwerte, planung, auswertung,<br/>berichte, importe, wissensbasis, einstellungen"]
    FEShared2["frontend/shared<br/>components, forms, tables,<br/>filters, charts, api, utils, types"]
    BEApi2["backend/api<br/>routes, deps, schemas"]
    BEMod2["backend/modules<br/>personen, labore, parameter, gruppen,<br/>befunde, messwerte, referenzen, zielbereiche,<br/>planung, importe, berichte, wissensbasis, einstellungen"]
    BEServices2["backend/services<br/>reporting, imports, normalization, planning"]
    BERepo2["backend/repositories"]
    BEModels2["backend/models"]
    BECore2["backend/core<br/>config, db, locking, logging"]
    Contracts2["packages/contracts<br/>versionierte DTOs und Schemas"]

    FEApp2 --> FEFeat2
    FEFeat2 --> FEShared2
    FEShared2 --> BEApi2
    BEApi2 --> BEMod2
    BEMod2 --> BEServices2
    BEMod2 --> BERepo2
    BERepo2 --> BEModels2
    BEServices2 --> BEModels2
    BEMod2 --> BECore2
    FEFeat2 <--> Contracts2
    BEMod2 <--> Contracts2
  end
```

## Diagramm 3: Vereinfachte Managementsicht

```mermaid
flowchart LR
  Nutzer["Nutzer"]
  Oberflaeche["Arbeitsoberfläche"]
  Backend["Anwendungslogik"]
  Daten["Labordatenbank"]
  Dokumente["Dokumente und PDF-Berichte"]
  Import["Import und Prüfstrecke"]
  Wissen["Wissensbasis"]
  Extern["Optionale externe Helfer"]

  Nutzer --> Oberflaeche
  Oberflaeche --> Backend
  Backend --> Daten
  Backend --> Dokumente
  Import --> Backend
  Wissen --> Oberflaeche
  Wissen -. "geplant stärker angebunden" .-> Backend
  Extern --> Import
```

## Lesart der Managementsicht
- Der Nutzer arbeitet nur mit der Oberfläche; dort werden Pflege, Suche, Auswertung, Planung und Berichte zusammengeführt.
- Die eigentliche Fachlogik sitzt im Backend und schützt die Datenbank vor direktem Zugriff.
- Importe laufen nicht direkt in die Datenbank, sondern immer erst durch eine Prüf- und Freigabestrecke.
- Dokumente und PDF-Berichte sind ein eigener Ergebnis- und Ablagebereich neben der Datenbank.
- Die Wissensbasis ist fachlich schon zentral, technisch aber aktuell erst teilweise an die Anwendung angebunden.
- Externe Helfer oder KI-nahe Werkzeuge sind optional und sollen nur über definierte Importwege andocken.

## Wichtige Unterschiede zwischen Ist und Zielbild
- Im Backend sind `gruppen`, `wissensbasis` und `einstellungen` als eigene Laufzeitmodule noch nicht sichtbar umgesetzt.
- Im Frontend existieren für `gruppen`, `wissensbasis` und `einstellungen` aktuell nur Platzhalterseiten, keine voll angebundenen Fachbereiche.
- Das Paket `packages/contracts` enthält derzeit im Wesentlichen das Importschema; die breitere Rolle als gemeinsamer Vertragsbereich ist geplant, aber noch nicht voll ausgebaut.
- Backend-Querschnittsbereiche wie `locking`, `logging`, `repositories` und dedizierte `services/` sind im Zielbild beschrieben, im aktuellen Workspace aber nur teilweise oder noch nicht als separate Struktur ausgebildet.
