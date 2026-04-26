---
typ: rohquelle
status: ausgewertet
datum: 2026-04-26
quelle: Nutzerfeedback im Chat
tags:
  - deployment
  - release
  - updates
  - laborwissen
  - installer
---

# Rückmeldung Deployment Releaseupdates Laborwissen

## Anlass
Die Anwendung soll später für andere Personen anwenderfreundlich bereitgestellt werden. Gewünscht ist eine Form, bei der die Anwendung heruntergeladen, installiert und anschließend gestartet werden kann. Zusätzlich sollen Releaseupdates und Aktualisierungen des fachlichen Laborwissens von Anfang an mitbedacht werden.

## Kernaussagen
- Eine einfache ZIP-Auslieferung ist grundsätzlich möglich, reicht für eine komfortable Installation aber nur begrenzt aus.
- Für eine anwenderfreundliche Windows-Auslieferung ist ein Installer sinnvoll, der nach dem Zielordner fragt, Verknüpfungen anlegt, die Anwendung starten kann und spätere Updates nicht mit Nutzerdaten vermischt.
- Programmdateien, lokale Datenbank, Dokumente, Einstellungen und Laborwissen müssen klar getrennt werden, damit Updates keine Nutzerdaten überschreiben.
- Releaseupdates der Anwendung und Aktualisierungen fachlicher Inhalte sind unterschiedliche Vorgänge und brauchen getrennte Strategien.
- Für normale Programmupdates kann zunächst ein neuer Setup-Installer reichen, der eine bestehende Installation erkennt und Programmdateien aktualisiert.
- Eine spätere In-App-Versionsprüfung kann auf neue Releases hinweisen und den Download öffnen.
- Automatische Updates sind möglich, sollten aber erst später geprüft werden, wenn Signierung, Rollback, Updatekanal und Prozesssteuerung geklärt sind.
- Laborwissen soll nicht stillschweigend überschrieben werden, weil es fachlich sensibel ist und lokal ergänzt oder verändert werden kann.
- Für Laborwissen ist ein eigenes versioniertes Inhaltspaket mit Manifest, Änderungsübersicht und Konfliktprüfung sinnvoll.

## Genannte Werkzeugkandidaten
- Inno Setup oder NSIS für einen klassischen Windows-Installer.
- PyInstaller für das Bündeln des Python-Backends oder eines lokalen Startprogramms.
- Tauri oder Electron als spätere Desktop-Hülle, falls die Anwendung sich stärker wie eine native Desktop-App anfühlen soll.
- Velopack, Tauri Updater oder electron-updater als spätere Kandidaten für automatische Updates.

## Offene Punkte aus der Rückmeldung
- Ob V1 zunächst als klassischer Installer oder als portable ZIP-Testversion ausgeliefert werden soll.
- Wo der kanonische lokale Datenordner liegen soll und ob Nutzer ihn bei der Installation auswählen dürfen.
- Ob das Frontend im Produktivmodus vom Backend ausgeliefert oder über eine Desktop-Hülle eingebettet werden soll.
- Wie Laborwissen-Seiten versioniert, signiert, gesichert und mit lokalen Nutzeränderungen abgeglichen werden.
- Welche Updatekanäle es geben soll, zum Beispiel stabil, Vorabversion oder manuell importiertes Inhaltspaket.

## Externe Referenzpunkte
Die konkrete Werkzeugauswahl muss vor Umsetzung frisch gegen die jeweils aktuelle Dokumentation geprüft werden. Als erste Referenzpunkte wurden betrachtet:
- Inno Setup FAQ: https://jrsoftware.org/isfaq.php
- Tauri Windows Installer und Updater-Dokumentation: https://tauri.app/distribute/windows-installer/
- Electron Builder und electron-updater: https://www.electron.build/auto-update.html
- PyInstaller-Dokumentation: https://www.pyinstaller.org/en/stable/usage.html
- Velopack: https://velopack.io/
