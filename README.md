# Labordaten

Version: `0.7.0`

Labordaten ist eine lokale Webanwendung für persönliche und fachlich nachvollziehbare Laborwerte. Die Anwendung läuft auf Deinem Windows-PC, öffnet die Oberfläche im normalen Browser und speichert Datenbank, Dokumente, Einstellungen und Laborwissen lokal.

Der zentrale Nutzen: weniger Abtippen, mehr Kontrolle. Laborberichte können mit Hilfe eines externen KI-Chats in strukturierte Daten umgewandelt, anschließend in Labordaten geprüft und bewusst in den eigenen Datenbestand übernommen werden.

## Aktueller Projektstand

Release `0.7.0` ist nicht mehr nur ein Entwicklungsstand aus Backend- und Frontend-Prozessen. Für die normale Nutzung gibt es einen Windows-Installer. Nach der Installation startest Du Labordaten über die Verknüpfung oder direkt über `Labordaten.exe`; Python, Node.js, `npm`, Vite, virtuelle Umgebungen, manuelle Migrationen und einzelne Startbefehle sind dafür nicht notwendig.

Der installierte Stand bündelt:

- die Browser-Oberfläche als Produktionsbuild
- das FastAPI-Backend als lokale Windows-Anwendung
- automatische Datenbankmigrationen beim Start
- einen stabilen lokalen Datenordner unter `%LOCALAPPDATA%\Labordaten`
- mitgeliefertes Laborwissen und ein Grunddatenpaket für leere Installationen
- eine Installer-Auswahl für Grunddaten, optionale Zielwertpakete und kurze Import-Hilfe
- Startmenü- und optional Desktop-Verknüpfung
- eine Deinstallation, die lokale Nutzdaten nicht ungefragt löscht

Die manuelle Steuerung mit getrenntem Backend- und Frontend-Start ist nur noch für Entwicklung, Tests und Release-Bau relevant.

## Installation und Nutzung

### Windows-Installer

Für Release `0.7.0` gibt es einen Windows-Installer. Im aktuellen Repository-Build liegt er unter:

```text
build/release/installer/Labordaten-Setup-0.7.0.exe
```

Der Installer kopiert die Programmdateien in den gewählten Installationsordner, legt auf Wunsch eine Desktop-Verknüpfung an und kann Labordaten direkt nach Abschluss starten.

Der Installer ist derzeit nicht code-signiert. Windows kann deshalb eine Warnung zur unbekannten Quelle anzeigen.

Beim ersten Start:

1. startet Labordaten einen lokalen Server auf Deinem Computer
2. öffnet sich die Oberfläche automatisch im Browser
3. laufen ausstehende Datenbankmigrationen automatisch
4. werden ausgewählte Startdaten verarbeitet
5. erscheint bei Bedarf ein kurzer Einstieg zum Import von Laborberichten

Du musst im Normalfall keine lokale Adresse eintippen. Wenn Du sie doch brauchst: Der installierte Launcher verwendet bevorzugt `http://127.0.0.1:8765` und weicht auf einen freien lokalen Port aus, falls dieser belegt ist.

### Lokale Daten

Labordaten trennt Programmdateien und Nutzdaten.

- Datenbank: `%LOCALAPPDATA%\Labordaten\labordaten.db`
- Dokumente: `%LOCALAPPDATA%\Labordaten\documents`
- Laborwissen, Einstellungen und Backups: ebenfalls unter `%LOCALAPPDATA%\Labordaten`

Bei Updates sollen Programmdateien ersetzt werden, ohne Deine lokale Datenbank zu überschreiben. Bei der Deinstallation fragt Labordaten, ob der lokale Datenordner behalten oder bewusst gelöscht werden soll. Die sichere Voreinstellung ist das Behalten der Daten.

### Datenschutz und KI-Import

Die Anwendung selbst sendet keine Gesundheitsdaten ins Internet. Der KI-Chat-Import ist bewusst als externer, vom Nutzer gesteuerter Weg gebaut: Labordaten erzeugt einen Prompt, Du gibst Prompt und Laborbericht in einen externen KI-Chat, und das strukturierte Ergebnis wird anschließend wieder lokal in Labordaten geprüft.

## Einblicke

Die folgenden Screenshots zeigen synthetische Demo-Daten ohne persönliche Informationen.

### Startübersicht

![Startübersicht mit Demo-Daten](docs/screenshots/readme-start-dashboard.png)

### KI-Chat-gestützter Import

![KI-Prompt für den Import von Laborberichten](docs/screenshots/readme-ki-import.png)

### Verlaufsdiagramme

![Auswertung mit Verlaufsdiagramm, Referenzlinien und Zielbereich](docs/screenshots/readme-auswertung-charts.png)

## Was die Anwendung kann

### Stammdaten und Laborbestand

- Pflege von Personen, Laboren, Befunden, Messwerten und Laborparametern.
- Personen können auch ohne Geburtsdatum angelegt werden; altersabhängige Auswertungen sind dann fachlich eingeschränkt.
- Nachträgliche Bearbeitung zentraler Stammdaten, ohne technische IDs oder historische Messdaten umzuhängen.
- Parametergruppen mit Many-to-Many-Zuordnung und bereichsübergreifender Filterlogik.
- Referenzbereiche, Zielbereiche, strukturierte Grenzoperatoren und personenspezifische Zielbereichs-Overrides.
- Zentrale Einheitenstammdaten, Einheiten-Aliase, führende Normeinheiten und parameterbezogene Umrechnungsregeln.
- Automatische interne Parameterschlüssel, Alias-Vorschläge, Dublettenprüfung und bestätigte Parameter-Zusammenführung.
- Optionale Datenpakete für fachliche Zielwertsammlungen, die bewusst eingespielt und später geschlossen deaktiviert werden können.

### KI-Chat-gestützter Import und Dokumente

- Import ohne Abtippen: Prompt erzeugen, Laborbericht in einem externen KI-Chat analysieren lassen, JSON-Ergebnis einfügen, prüfen und übernehmen.
- Unterstützung für strukturierte JSON-Daten, KI-JSON, CSV- und Excel-Dateien.
- Prüfansicht mit Mapping, Warnungen, Fehlern, Dokumentverknüpfung, Gruppenentscheidungen und bewusster Übernahme.
- Importhistorie mit offenen Importentwürfen, Prüflinks und Statusinformationen.
- Alias-Anlage aus Berichtsschreibweisen beim bestätigten Mapping.
- Optionale Parameter-Vorschläge aus KI-JSON mit Kurzbeschreibung, Einheit, Werttyp und Alias-Hinweisen.
- Robustere Importregeln für fremdsprachige Laborberichte und Einheiten mit Fußnotenmarkern.

### Planung, Auswertung und Berichte

- Planung zyklischer Kontrollen und einmaliger Vormerkungen.
- Suchbare Mehrfachauswahl für Parameter sowie Gruppen als Eingabehilfe bei der Planungsanlage.
- Fälligkeitsberechnung, Zeitraumansicht für kommende Messungen und PDF-Merkzettel für anstehende Messungen.
- Auswertungsbereich mit Verlaufsdiagrammen, Fokusansicht, Referenzlinien, Zielbereichen und gruppenbezogenen Filtern.
- Berichtsbereich mit Vorschauen und PDF-Erzeugung für Arztberichte und Verlaufsberichte.
- Sortieroptionen und optionale Voranstellung referenzauffälliger Werte in Berichten.
- Direkter Sprung aus einem Befund-Messwert in die passende Auswertung für Person und Parameter.

### Laborwissen und Betrieb

- Separater fachlicher Markdown-Wissenspool unter `Labordaten-Wissen/`, getrennt von der KI-Projektwissensbasis.
- Lesen, Anzeigen, Verlinken, Neuanlegen und kontrolliertes Löschen von Wissensseiten über die Oberfläche.
- Verknüpfung von Parametern mit Fachwissensseiten; neue Parameter können automatisch eine Ausgangsseite erhalten.
- Anwendungshilfe im Fachwissenspool für die Hauptbereiche der Anwendung.
- Einstellungen für lokale Daten-, Dokument- und Wissenspfade.
- Lokale SQLite-Datenbasis mit Einzelbenutzer-Sperrlogik.
- Zentrale Löschprüfung mit getrennter Ausführung für viele Kernobjekte, unter anderem Personen, Befunde, Messwerte, Importvorgänge, Einheiten, Labore, Parameter, Gruppen, Zielbereiche und Planungen.

### Noch nicht enthalten

- Direkter PDF-Upload mit integrierter OCR- oder Parser-Stufe.
- Direkt angebundene KI-Schnittstelle, die Dokumente innerhalb der Anwendung automatisch analysiert.
- Vollautomatische Übernahme gescannter Laborberichte ohne externe Extraktion oder manuelle Prüfung.
- Vollständig ausgebaute Wissensverknüpfung in allen Gruppen-, Import- und Berichtsdarstellungen.

## Technischer Aufbau

Die Anwendung ist als lokales Websystem aufgebaut:

- `apps/backend/`: FastAPI-Backend mit SQLAlchemy, Alembic, Importlogik, Sperrlogik, Launcher und PDF-Erzeugung
- `apps/frontend/`: React-Frontend mit Vite für die fachlichen Arbeitsbereiche
- `packages/contracts/`: gemeinsame Import- und API-Verträge
- `Labordaten-Wissen/`: mitgelieferter fachlicher Markdown-Wissenspool für die Anwendung
- `KI-Wissen-Labordaten/`: projektbezogene Wissensbasis für wiki-first Arbeit
- `packaging/`: Installer-Definitionen und Release-Hinweise
- `scripts/`: lokale Start-, Build- und Hilfsskripte
- `docs/`: ergänzende Projektdokumente außerhalb der Wissensbasis

Im installierten Release liefert das Backend die gebaute Oberfläche direkt mit aus. Der Vite-Entwicklungsserver wird dort nicht verwendet.

## Entwicklung am Repository

Dieser Abschnitt ist für Entwicklung und Pflege des Projekts. Für die normale Nutzung des installierten Release `0.7.0` ist er nicht erforderlich.

### Voraussetzungen

- Python `3.11+`
- Node.js mit `npm`
- unter Windows möglichst PowerShell 7 (`pwsh`)

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

### Entwicklungsstart

Beide Entwicklungsprozesse mit einem Aufruf starten:

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

### Manuell im Entwicklungsmodus starten

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

Entwicklungs-URLs:

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

## Release bauen

Eine portable Release-Ausgabe kann gebaut werden mit:

```pwsh
pwsh -File .\scripts\build-release.ps1
```

Das erzeugt `build/release/Labordaten/`. Die enthaltene `Labordaten.exe` startet das Backend im Produktionsmodus, führt Datenbankmigrationen aus, nutzt `%LOCALAPPDATA%\Labordaten` als stabilen Datenordner und öffnet die Anwendung im Browser.

Eine portable ZIP entsteht nur bei ausdrücklicher Auswahl:

```pwsh
pwsh -File .\scripts\build-release.ps1 -BuildPortableZip
```

Wenn Inno Setup mit `ISCC.exe` installiert ist, kann zusätzlich der Windows-Installer gebaut werden:

```pwsh
pwsh -File .\scripts\build-release.ps1 -BuildInstaller
```

Für Version `0.7.0` ist das relevante Installer-Artefakt:

```text
build/release/installer/Labordaten-Setup-0.7.0.exe
```

## Wissensbasis

Projektfragen und fachliche Entscheidungen werden wiki-first über `KI-Wissen-Labordaten/` bearbeitet. Relevante Einstiegsseiten sind:

- `KI-Wissen-Labordaten/00 Projektstart.md`
- `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Index.md`
- `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md`
- `KI-Wissen-Labordaten/02 Wissen/Prozesse/Lokaler Start von Backend und Frontend.md`
