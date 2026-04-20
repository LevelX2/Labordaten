---
typ: architektur
status: entwurf
letzte_aktualisierung: 2026-04-20
quellen:
  - ../Entscheidungen/V1 Empfohlener Technologie-Stack.md
  - V1 Technisches Schema.md
  - V1 Screenplan und Kernworkflows.md
  - V1 Ziel-Datenmodell.md
tags:
  - architektur
  - module
  - api
  - frontend
  - backend
---

# V1 Projektstruktur, Module und Schnittstellen

## Kurzfassung
Die V1-Projektstruktur sollte Backend, Frontend, Datenmigrationen, Berichtslogik und optionale Importartefakte klar trennen. Fachlich bildet sie dieselben Domänen ab wie das Datenmodell: Stammdaten, Befunde und Messwerte, Planung, Importprüfung, Auswertung, Berichte, Wissensverknüpfung und Systembetrieb.

## Empfohlene Top-Level-Struktur
```text
Labordaten/
  ai-project-memory/
  apps/
    backend/
    frontend/
  packages/
    contracts/
  docs/
  scripts/
  data-example/
```

## Bedeutung der Hauptordner

### `apps/backend/`
- lokale API
- Fachlogik
- Datenbankzugriff
- Importprüfung
- Berichtserzeugung
- Sperrlogik

### `apps/frontend/`
- React-Weboberfläche
- Routen, Seiten, Formulare, Filter, Diagramme
- Importprüfansichten
- Berichts- und Auswertungsoberflächen

### `packages/contracts/`
- versionierte API- und Importverträge
- JSON-Schema für Importpayloads
- gemeinsam dokumentierte DTOs oder OpenAPI-Hilfsartefakte

### `scripts/`
- Entwicklungsstart
- Datenbankmigrationen
- Test- und Hilfsskripte
- optionale Generatoren für Beispielimporte

### `data-example/`
- Beispiel-JSON
- Beispiel-CSV
- Test-PDF-Metadaten oder Testquellen ohne echte Gesundheitsdaten

## Empfohlene Backend-Struktur
```text
apps/backend/
  src/
    api/
      routes/
      deps/
      schemas/
    core/
      config/
      db/
      locking/
      logging/
    modules/
      personen/
      labore/
      parameter/
      gruppen/
      befunde/
      messwerte/
      referenzen/
      zielbereiche/
      planung/
      importe/
      berichte/
      wissensbasis/
      einstellungen/
    services/
      reporting/
      imports/
      normalization/
      planning/
    repositories/
    models/
    migrations/
    main.py
  tests/
```

## Modulzuschnitt Backend

### `personen`
- Person anlegen, ändern, deaktivieren
- Basisdatenverlauf verwalten
- Personenbezogene Zielbereich-Overrides
- Personenbezogene Übersichtsdaten

### `labore`
- Labor-Stammdaten
- Suche nach Namen
- Dublettennahe Anlagewarnungen

### `parameter`
- Parameter-Stammdaten
- Synonyme
- Umrechnungsregeln
- Verwandte Parameter
- Wissensseitenverknüpfung

### `gruppen`
- Gruppenstammdaten
- Parameterzuordnung
- Sortierung innerhalb der Gruppe

### `befunde`
- Befundkopf
- Dokumentverknüpfung
- Befundbemerkungen
- Dublettenwarnlogik auf Befundebene

### `messwerte`
- numerische und qualitative Messwerte
- Rohwertspeicherung
- Wertoperatoren
- Normierung und Einheitenumrechnung
- Messwertbemerkungen

### `referenzen`
- Laborreferenzen pro Messung
- Referenztext
- strukturierte Referenzvarianten

### `zielbereiche`
- allgemeine Zielbereiche
- personenspezifische Überschreibungen
- effektiver Zielbereich für Auswertung und Bericht

### `planung`
- zyklische Planung
- Einmalvormerkungen
- Fälligkeiten
- Vorschlagsliste nächster Termin

### `importe`
- Importvorgang
- Prüfpunkte
- Parameter-Mapping
- Dublettenwarnungen
- Übernahme freigegebener Daten

### `berichte`
- Arztbericht Liste
- Verlaufsbericht Zeitachse
- Konfigurierbare Berichtsfelder

### `wissensbasis`
- Markdown-Seiten lesen
- Frontmatter optional auswerten
- Verknüpfte Wissensseiten öffnen oder auflisten

### `einstellungen`
- Datenpfade
- Dokumentenpfade
- Wissensordner
- Anzeige- und Berichtsvorgaben
- spätere KI-Konfiguration

## Empfohlene API-Struktur

### API-Prinzipien
- REST-nahe JSON-API für V1
- Fachliche Endpunkte statt generischer CRUD-Masse
- Listenendpunkte mit Filterparametern
- Detailendpunkte mit konsolidierten Zusatzinformationen, wenn das UI sie typischerweise gemeinsam braucht

### Kernendpunkte nach Bereich

#### Personen
- `GET /api/personen`
- `POST /api/personen`
- `GET /api/personen/{personId}`
- `PATCH /api/personen/{personId}`
- `GET /api/personen/{personId}/basisdaten`
- `POST /api/personen/{personId}/basisdaten`
- `GET /api/personen/{personId}/planung`
- `GET /api/personen/{personId}/befunde`
- `GET /api/personen/{personId}/messwerte`

#### Labore
- `GET /api/labore`
- `POST /api/labore`
- `GET /api/labore/{laborId}`
- `PATCH /api/labore/{laborId}`

#### Parameter
- `GET /api/parameter`
- `POST /api/parameter`
- `GET /api/parameter/{parameterId}`
- `PATCH /api/parameter/{parameterId}`
- `GET /api/parameter/{parameterId}/synonyme`
- `POST /api/parameter/{parameterId}/synonyme`
- `GET /api/parameter/{parameterId}/umrechnungen`
- `POST /api/parameter/{parameterId}/umrechnungen`
- `GET /api/parameter/{parameterId}/zielbereiche`
- `POST /api/parameter/{parameterId}/zielbereiche`

#### Gruppen
- `GET /api/gruppen`
- `POST /api/gruppen`
- `GET /api/gruppen/{gruppenId}`
- `PATCH /api/gruppen/{gruppenId}`
- `GET /api/gruppen/{gruppenId}/parameter`
- `PUT /api/gruppen/{gruppenId}/parameter`

#### Befunde
- `GET /api/befunde`
- `POST /api/befunde`
- `GET /api/befunde/{befundId}`
- `PATCH /api/befunde/{befundId}`
- `POST /api/befunde/{befundId}/dokument`
- `GET /api/befunde/{befundId}/messwerte`
- `POST /api/befunde/{befundId}/messwerte`

#### Messwerte
- `GET /api/messwerte`
- `GET /api/messwerte/{messwertId}`
- `PATCH /api/messwerte/{messwertId}`
- `POST /api/messwerte/{messwertId}/referenzen`
- `GET /api/messwerte/{messwertId}/referenzen`

#### Planung
- `GET /api/planung/zyklisch`
- `POST /api/planung/zyklisch`
- `PATCH /api/planung/zyklisch/{planungId}`
- `GET /api/planung/einmalig`
- `POST /api/planung/einmalig`
- `PATCH /api/planung/einmalig/{vormerkungId}`
- `GET /api/planung/faelligkeiten`
- `GET /api/planung/naechster-termin`

#### Import
- `POST /api/importe`
- `GET /api/importe`
- `GET /api/importe/{importId}`
- `GET /api/importe/{importId}/pruefpunkte`
- `POST /api/importe/{importId}/parameter-mapping`
- `POST /api/importe/{importId}/bestaetigen`
- `POST /api/importe/{importId}/uebernehmen`
- `POST /api/importe/{importId}/verwerfen`

#### Auswertung
- `GET /api/auswertung/verlauf`
- `GET /api/auswertung/statistik`
- `GET /api/auswertung/letzte-werte`

#### Berichte
- `POST /api/berichte/arztbericht`
- `POST /api/berichte/verlauf`
- `GET /api/berichte/vorlagen`
- `POST /api/berichte/vorlagen`

#### Wissensbasis
- `GET /api/wissensbasis/seiten`
- `GET /api/wissensbasis/seiten/{seitenId}`
- `POST /api/wissensbasis/seiten/{seitenId}/oeffnen`

#### Einstellungen und System
- `GET /api/einstellungen`
- `PATCH /api/einstellungen`
- `GET /api/system/sperre`
- `POST /api/system/sperre/freigeben`
- `GET /api/system/health`

## Empfohlene Frontend-Struktur
```text
apps/frontend/
  src/
    app/
      routes/
      layout/
      providers/
    features/
      personen/
      labore/
      parameter/
      gruppen/
      befunde/
      messwerte/
      planung/
      auswertung/
      berichte/
      importe/
      wissensbasis/
      einstellungen/
    shared/
      components/
      forms/
      tables/
      filters/
      charts/
      api/
      utils/
      types/
    main.tsx
```

## Frontend-Routen V1
- `/`
- `/personen`
- `/personen/:personId`
- `/befunde`
- `/befunde/:befundId`
- `/messwerte`
- `/messwerte/:messwertId`
- `/parameter`
- `/parameter/:parameterId`
- `/gruppen`
- `/gruppen/:gruppenId`
- `/planung`
- `/planung/zyklisch`
- `/planung/einmalig`
- `/planung/faelligkeiten`
- `/auswertung`
- `/berichte`
- `/import`
- `/import/:importId`
- `/wissensbasis`
- `/einstellungen`

## Seiten und zugehörige API-Nutzung

### `/personen`
- Personenliste
- nutzt `GET /api/personen`

### `/personen/:personId`
- Personendetail, Basisdaten, Planung, letzte Befunde
- nutzt mehrere bereichsspezifische Detailendpunkte

### `/befunde`
- Befundliste mit Filtern
- nutzt `GET /api/befunde`

### `/befunde/:befundId`
- Befundkopf, Dokument, Messwertliste, Referenzen
- nutzt `GET /api/befunde/{befundId}` und `GET /api/befunde/{befundId}/messwerte`

### `/messwerte`
- zentrale Messwertsuche
- nutzt `GET /api/messwerte`

### `/auswertung`
- Diagramme, Kennzahlen, Filter
- nutzt `GET /api/auswertung/verlauf` und `GET /api/auswertung/statistik`

### `/berichte`
- Berichtstyp wählen, Felder toggeln, PDF erzeugen
- nutzt Berichtsendpunkte

### `/import`
- Importquelle auswählen, Historie sehen
- nutzt `GET /api/importe` und `POST /api/importe`

### `/import/:importId`
- Prüfansicht, Mapping, Warnungen, Übernahme
- nutzt Importdetail-, Prüfpunkt- und Übernahme-Endpunkte

## Zentrale Frontend-Komponenten
- Filterleiste für Personen, Parameter, Gruppen, Zeitraum
- Tabellenkomponente mit serverseitigem Filtern
- Form-Dialoge für Stammdaten
- Messwerteditor mit Umschaltung numerisch oder text
- Referenzeditor
- Import-Prüfpunktliste
- Berichtsfeld-Auswahl
- Verlaufsdiagramm mit separater qualitativer Ereignisanzeige

## API- und UI-Kontrakte, die früh festgelegt werden sollten
- Filterparameter für Listenendpunkte
- Datumsformate
- Standardformat für numerische und qualitative Messwerte
- Import-JSON-Schema für externe Helfer
- Berichtskonfiguration als JSON-Struktur

## Empfohlene Reihenfolge für die Umsetzung der Projektstruktur
1. Backend-Grundgerüst mit Konfiguration, DB, Migrationen, Health und Sperrlogik
2. Personen, Labore, Parameter, Gruppen
3. Befunde, Messwerte, Referenzen
4. Importvorgang und Prüfansicht-API
5. Planung und Fälligkeiten
6. Auswertung und Berichte
7. Wissensbasis und Komfortfunktionen

## Offene Restpunkte
- Ob Listenserverung paginiert oder zunächst vollständig lokal gefiltert wird
- Ob Berichtserzeugung synchron oder als kurzer Hintergrundjob läuft
- Wie viel Detail ein einzelner API-Detailendpunkt aggregieren soll

## Einordnung für die weitere Umsetzung
- Diese Struktur reicht aus, um jetzt ein echtes Projektgerüst anzulegen.
- Der unmittelbar nächste praktische Schritt wäre die Ableitung einer ersten Implementierungs-Roadmap mit Arbeitspaketen oder direkt das Anlegen des Repositories mit Grundordnern, Basiskonfiguration und ersten Migrationsdateien.
