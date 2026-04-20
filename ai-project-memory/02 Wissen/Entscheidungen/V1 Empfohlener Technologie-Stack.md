---
typ: entscheidung
status: vorlaeufig
letzte_aktualisierung: 2026-04-20
quellen:
  - ../Begriffe und Konzepte/V1 Technisches Schema.md
  - ../Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
  - ../Begriffe und Konzepte/Planung Erstarchitektur und Umsetzungsphasen.md
tags:
  - entscheidung
  - technik
  - stack
  - v1
---

# V1 Empfohlener Technologie-Stack

## Kurzfassung
Für V1 ist ein lokales Websystem mit Python-Backend, SQLite-Datenbank und React-Frontend die pragmatischste Wahl. Diese Kombination passt gut zu lokaler Datenhaltung, Importlogik, PDF-Berichten, CSV- und Excel-Verarbeitung sowie späteren KI-Importen.

## Empfohlener Stack
- Backend: Python 3 mit FastAPI
- Datenzugriff: SQLAlchemy mit Alembic-Migrationen
- Datenbank: SQLite
- Validierung und API-Modelle: Pydantic
- Frontend: React mit TypeScript und Vite
- Datenabruf im Frontend: TanStack Query
- Routing im Frontend: React Router oder TanStack Router
- UI-Grundlage: schlanke komponentenbasierte Oberfläche ohne komplexes UI-Framework als Pflicht
- Diagramme: eine React-kompatible Chart-Bibliothek mit Zeitachsen-Unterstützung
- PDF-Berichte: serverseitige Generierung im Backend

## Warum dieser Stack zu V1 passt
- Python ist stark für CSV, Excel, PDF, Validierung, Importprüfung und spätere KI-nahe Workflows.
- FastAPI ist für lokale JSON-APIs schnell und sauber strukturierbar.
- SQLite passt gut zum Single-User-Modell und zur lokalen Datenbasis.
- React mit TypeScript ist gut geeignet für datenintensive Arbeitsoberflächen mit Listen, Filtern, Formularen und Prüfansichten.
- Die spätere Desktop-Paketierung bleibt offen, ohne dass V1 darauf festgelegt werden muss.

## Bewusst nicht priorisiert in V1
- sofortige Desktop-Containerisierung als Pflicht
- verteilte Datenbank
- serverseitiges Multi-User-Rollenmodell
- direkte Datenbankschreibzugriffe externer Helfer

## Technische Leitlinien
- Das Backend enthält Fachlogik, Importprüfung, Berichtserzeugung und Sperrverwaltung.
- Das Frontend bleibt primär für Anzeige, Eingabe, Prüfung und Filterlogik zuständig.
- Externe Helfer wie Codex liefern strukturierte Importdaten an eine definierte Schnittstelle statt direkt in die Datenbank zu schreiben.
- Die Datenbank wird ausschließlich über Backend-Module beschrieben.

## Offene Restpunkte
- Ob Frontend und Backend in einem Monorepo oder in getrennten Top-Level-Ordnern liegen, ist eher Organisationsfrage als Architekturfrage.
- Die konkrete Chart- und PDF-Bibliothek kann erst beim Umsetzungsstart anhand von Beispielen festgelegt werden.
