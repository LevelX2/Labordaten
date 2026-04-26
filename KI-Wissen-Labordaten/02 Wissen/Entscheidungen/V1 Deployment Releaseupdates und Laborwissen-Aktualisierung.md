---
typ: entscheidung
status: vorlaeufig
letzte_aktualisierung: 2026-04-26
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Deployment Releaseupdates Laborwissen.md
  - ../Entscheidungen/V1 Empfohlener Technologie-Stack.md
  - ../Prozesse/Lokaler Start von Backend und Frontend.md
  - ../Begriffe und Konzepte/Ist-Stand Initialdaten und Stammdaten-Snapshot.md
tags:
  - entscheidung
  - deployment
  - release
  - updates
  - installer
  - laborwissen
  - v1
---

# V1 Deployment Releaseupdates und Laborwissen-Aktualisierung

## Kurzfassung
Für eine anwenderfreundliche Bereitstellung soll die Anwendung mittelfristig als lokale Windows-Anwendung mit Installer ausgeliefert werden. Programmdateien, Nutzerdaten, Dokumente, Einstellungen, Stammdaten-Snapshots und Laborwissen müssen dabei getrennt behandelt werden.

Releaseupdates der Anwendung und Aktualisierungen des fachlichen Laborwissens sind unterschiedliche Update-Spuren. Programmupdates dürfen Code und mitgelieferte Ressourcen ersetzen, aber keine lokale Datenbank, Dokumente oder Nutzeranpassungen überschreiben. Laborwissen soll als eigenes versioniertes Inhaltspaket behandelt werden, das neue und geänderte Markdown-Seiten bewusst anbietet und lokale Änderungen schützt.

## Zielbild der Auslieferung
- Die Anwendung kann heruntergeladen und ohne Entwicklungsumgebung genutzt werden.
- Ein Installer fragt nach dem Installationsziel, legt Startmenü- oder Desktop-Verknüpfungen an und kann die Anwendung nach Abschluss starten.
- Das Frontend läuft im Produktivmodus und nicht über den Vite-Entwicklungsserver.
- Das Backend läuft im Produktivmodus und nicht mit `uvicorn --reload`.
- Der Nutzer muss Python, Node.js, `npm` und Entwicklungsbefehle nicht selbst bedienen.
- Lokale Daten liegen außerhalb des Installationsordners in einem stabilen Datenordner.

## Update-Spuren
### Programmupdate
Programmupdates betreffen Backend, Frontend, Launcher, Installer, statische Ressourcen und Migrationscode. Sie sollen Programmdateien ersetzen und danach beim nächsten Start kontrolliert Datenbankmigrationen ausführen.

### Stammdatenupdate
Stammdatenupdates betreffen Parameter, Aliase, Gruppen, Einheiten, Umrechnungsregeln, Zielbereiche, KSG-Klassifikation und Wissensseiten-Verknüpfungen. Sie passen zum vorhandenen Initialdaten-Snapshot, dürfen aber nicht mit Nutzerdaten wie Personen, Befunden, Messwerten, Dokumenten, Planungen oder Importhistorie vermischt werden.

### Laborwissen-Update
Laborwissen-Updates betreffen Markdown-Seiten, Anwendungshilfe, Quellenhinweise und fachliche Erläuterungen im Ordner `Labordaten-Wissen/`. Sie sollen nicht stillschweigend lokale Nutzeränderungen überschreiben.

## Empfohlene Ausbaustufen
### Phase 1: Klassischer Installer mit manuellen Updates
Für den ersten anwenderfreundlichen Stand ist ein Windows-Installer der pragmatische Zielpfad. Geeignete Kandidaten sind Inno Setup oder NSIS. Jede neue Version wird als neues Setup ausgeliefert, erkennt eine bestehende Installation und aktualisiert die Programmdateien.

Diese Phase ist bewusst einfacher als ein vollautomatischer Updater. Sie reicht für frühe Anwender, reduziert technische Risiken und erzwingt trotzdem die notwendige Trennung von Programm- und Nutzerdaten.

### Phase 2: In-App-Hinweis auf neue Versionen
Die Anwendung kann später beim Start oder in den Einstellungen eine kleine Release-Metadatei prüfen und anzeigen, ob eine neue Version verfügbar ist. Der Nutzer lädt das Update bewusst herunter und startet den Installer selbst.

Diese Variante ist transparenter als stilles Auto-Update und passt zu einer fachlichen Anwendung, bei der Updates nicht mitten in einem Arbeitsfluss eingreifen sollen.

### Phase 3: Automatischer Updater
Ein automatischer Updater ist möglich, sollte aber erst nach Klärung von Signierung, Updatequelle, Rollback, Prozesssteuerung, Berechtigungen und Teststrategie eingeführt werden. Mögliche Kandidaten sind Velopack, Tauri Updater oder electron-updater, abhängig davon, ob die Anwendung klassisch gestartet, mit Tauri verpackt oder mit Electron eingebettet wird.

## Datenpfade und Schutzregeln
- Programmdateien liegen im Installationsordner und dürfen bei Updates ersetzt werden.
- Datenbank, Dokumente, Laufzeiteinstellungen und Laborwissen liegen in einem stabilen Datenordner, zum Beispiel unter `%LOCALAPPDATA%\Labordaten` oder in einem bewusst gewählten Nutzerordner.
- Datenbankmigrationen laufen kontrolliert beim Start oder als separater Update-Schritt.
- Vor risikoreichen Migrationen oder Wissensupdates soll eine Sicherung angelegt werden.
- Ein fehlgeschlagenes Update darf Nutzerdaten nicht beschädigen und muss eine klare Fehlermeldung erzeugen.
- Der Installationsordner darf nicht als dauerhafter Speicherort für Nutzerdaten vorausgesetzt werden.

## Strategie für Laborwissen
Laborwissen soll als versioniertes Inhaltspaket ausgeliefert werden. Ein Paket kann neue Seiten, geänderte Seiten, Anwendungshilfe, Quellenhinweise und Metadaten enthalten. Ein Manifest sollte mindestens Paketname, Version, Datum, kompatible App-Version und enthaltene Bereiche beschreiben.

Die Anwendung soll perspektivisch unter `Einstellungen > Laborwissen` anzeigen können:
- installierte Laborwissen-Version
- verfügbare neue Version
- Änderungsübersicht
- neue Seiten
- geänderte Seiten
- lokale Konflikte
- Sicherung vor Übernahme

## Konfliktregeln für Laborwissen
- Unveränderte systemgelieferte Seiten dürfen nach Bestätigung aktualisiert werden.
- Lokal geänderte Seiten dürfen nicht stillschweigend überschrieben werden.
- Nutzerseiten dürfen von Inhaltspaketen nicht verändert werden.
- Bewusst gelöschte Seiten sollen nicht ungefragt wiederhergestellt werden.
- Konflikte sollen als Vergleich, Vorschlagsdatei oder manuell zu prüfender Updatefall sichtbar gemacht werden.
- Medizinisch oder fachlich relevante Aussagen aus neuen Quellen dürfen nicht unmarkiert und ungeprüft als gesichertes Wissen erscheinen.

## Was möglich ist
- Neue Laborwissen-Seiten ausliefern.
- Bestehende systemgelieferte Seiten aktualisieren.
- Anwendungshilfe aktualisieren.
- Quellenhinweise ergänzen.
- Parameter-Wissenslinks mit Stammdatenupdates aktualisieren.
- Ein Updatepaket vor Übernahme prüfen und sichern.
- Konflikte zwischen Paketstand und lokalem Stand sichtbar machen.

## Was bewusst nicht automatisch gelöst werden soll
- Lokale Fachtexte automatisch perfekt mit neuen Pakettexten zusammenführen.
- Fachlich sensible Aussagen still aus Webquellen aktualisieren.
- Zielbereiche, Interpretationen oder KSG-Einordnungen ohne bewusste Bestätigung ändern.
- Nutzeranpassungen, gelöschte Seiten oder eigene Wissensseiten ungefragt überschreiben.
- Den fachlichen Prüfbedarf neuer Laborwissen-Inhalte durch Technik ersetzen.

## Werkzeugkandidaten
- Inno Setup: pragmatischer Kandidat für klassische Windows-Setups.
- NSIS: flexibler Kandidat für klassische Windows-Setups.
- PyInstaller: Kandidat zum Bündeln des Python-Backends oder eines lokalen Startprogramms.
- Tauri: Kandidat für eine spätere schlanke Desktop-Hülle mit WebView und Sidecar-Prozess.
- Electron: Kandidat für eine Desktop-Hülle, aber mit höherem Laufzeitgewicht.
- Velopack, Tauri Updater oder electron-updater: spätere Kandidaten für automatische Updates.

Die konkrete Werkzeugauswahl soll erst vor der Umsetzung anhand aktueller Dokumentation, gewünschter Updatefähigkeit, Signierungsbedarf und Zielplattform entschieden werden.

## Offene Entscheidungen
- Ob die erste Weitergabe als portable ZIP-Testversion oder direkt als Setup-Installer erfolgen soll.
- Ob Nutzer den Datenordner bei der Installation wählen dürfen oder ob zunächst ein fester Standardpfad verwendet wird.
- Ob das Frontend vom FastAPI-Backend statisch ausgeliefert oder in einer Desktop-Hülle eingebettet wird.
- Wie Laborwissen-Pakete technisch signiert oder anderweitig auf Integrität geprüft werden.
- Welche Mindeststrategie für Backups vor Datenbank- und Laborwissen-Updates gelten soll.
