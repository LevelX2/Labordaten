---
typ: konzept
status: aktiv
letzte_aktualisierung: 2026-04-22
quellen:
  - Fachkonzept Laboranwendung Grundstruktur.md
  - Planung Erstarchitektur und Umsetzungsphasen.md
  - V1 Screenplan und Kernworkflows.md
  - ../../../README.md
  - ../../../apps/frontend/index.html
  - ../../../apps/frontend/src/app/layout/AppLayout.tsx
  - ../../../apps/frontend/src/styles.css
  - ../../../apps/frontend/src/shared/components/SelectionChecklist.tsx
  - ../../../apps/frontend/src/features/messwerte/MesswertePage.tsx
  - ../../../apps/frontend/src/features/berichte/BerichtePage.tsx
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
tags:
  - ui
  - mobil
  - tablet
  - smartphone
  - bedienbarkeit
---

# Geräteprofile und mobile Bedienbarkeit

## Kurzfassung
Die Anwendung ist im aktuellen Stand eine lokale Browser-Anwendung mit Weboberfläche und damit grundsätzlich auch auf Tablet-Geräten nutzbar. Für Smartphones ist sie technisch aufrufbar, aber noch nicht als echte Mobiloberfläche ausgearbeitet. Der aktuelle Stand ist daher am treffendsten als `desktop-first`, `tablet-tauglich mit Einschränkungen` und `auf dem Smartphone nur eingeschränkt komfortabel` zu beschreiben.

## Gesicherter Stand aus Konzept und Workspace
- Das Projekt ist als lokal betriebene Weboberfläche mit lokalem Backend beschrieben, nicht als native Mobil-App.
- Das Frontend enthält einen normalen Browser-Viewport und ist damit grundsätzlich auch auf kleineren Displays aufrufbar.
- Auf Desktop kann die linke Hauptnavigation in einen schmalen Rail-Zustand eingeklappt werden; der gewählte Zustand wird lokal im Browser gemerkt.
- Die Shell reagiert auf kleinere Breiten: unterhalb von 960 Pixeln wird die zweispaltige Struktur auf eine einspaltige Ansicht umgestellt und die Seitenleiste wandert nach oben.
- Mehrere Inhaltsbereiche sind bereits fluid aufgebaut, etwa Kartenraster, Formblöcke und Berichtszusammenfassungen.
- Tabellenbereiche sind horizontal scrollbar statt für kleine Displays in eigene Mobilkarten umgebaut.
- Diagramme sind technisch responsiv eingebunden und passen sich der verfügbaren Breite an.

## Praktische Eignung nach Gerätetyp

### Desktop oder Notebook
- Primäres Zielgerät des aktuellen UI-Zuschnitts.
- Besonders passend für tabellenlastige Pflege, kombinierte Filter, Importprüfung und paralleles Lesen von Listen plus Detailbereichen.
- Die einklappbare linke Navigation verbessert auf größeren Arbeitsflächen zusätzlich den nutzbaren Raum für den Hauptbereich, ohne dass die Hauptnavigation komplett ausgeblendet werden muss.

### Tablet
- Grundsätzlich gut nutzbar, vor allem im Querformat.
- Geeignet für Nachschlagen, Filtern, Berichtsvorschau, Auswertung und viele Eingaben.
- Im Hochformat oder bei komplexen Seiten entstehen aber schnell lange Scrollstrecken und horizontales Verschieben in Tabellen.

### Smartphone
- Technisch erreichbar, aber nur eingeschränkt alltagstauglich.
- Sinnvoll vor allem für lesende oder kurze Aufgaben: Werte nachsehen, Berichte öffnen, einzelne Filter setzen, kurze Kontrollblicke.
- Für umfangreiche Datenerfassung, Importprüfung, Parameterpflege, Mehrfachauswahl und detaillierte Tabellenarbeit ist der aktuelle Stand zu dicht und zu breit.

## Gründe für die Einschränkungen auf kleinen Geräten
- Die Hauptnavigation bleibt auf kleineren Breiten auch weiterhin eine vollständige Linkliste und wird nicht in ein kompakteres Mobilmuster wie Menü-Drawer oder Akkordeon überführt; der neue Schmalmodus ist bewusst eine Desktop-Optimierung und kein Mobilersatz.
- Zentrale Arbeitsbereiche sind stark formular-, filter- und tabellenorientiert.
- Seiten wie `Messwerte`, `Berichte` und `Auswertung` arbeiten mit breiten Datentabellen mit sechs bis acht Spalten.
- Große Mehrfachauswahlen werden als Checkbox-Raster dargestellt. Das ist für Desktop und Tablet brauchbar, auf Smartphones aber schnell lang und fingerintensiv.
- Es gibt bislang keine explizit dokumentierte Touch-Optimierung, keine native App-Hülle und keine PWA-Funktionen wie installierbare Mobiloberfläche oder mobilspezifische Offline-Verteilung.

## Was bereits positiv für mobile Nutzung wirkt
- Die Browserbasis vermeidet eine harte Gerätebindung.
- Die responsive Grundanpassung der Shell verhindert, dass die Desktop-Navigation auf schmalen Breiten unverändert stehen bleibt.
- Diagramme skalieren mit der verfügbaren Breite.
- PDF-Berichte sind konzeptionell ausdrücklich auch für mobile Mitnahme und mobile Verfügbarkeit gedacht.

## Einordnung für V1
- Für V1 ist Tablet-Nutzung realistisch, wenn der Schwerpunkt auf Lesen, Filtern, Berichtsvorschau und leichter Pflege liegt.
- Smartphone-Nutzung sollte derzeit eher als Zusatzfall betrachtet werden, nicht als gleichwertiges Primärziel.
- Wenn echte mobile Alltagsnutzung wichtig wird, wären vor allem kompaktere Navigationsmuster, tabellenarme Mobilansichten, reduzierte Filteroberflächen und stärkere Touch-Optimierung die nächsten sinnvollen Schritte.

## Abgrenzung zwischen Dokumentation und aktueller Prüfung
- Die konzeptionellen Projektseiten beschreiben die Anwendung als lokale Weboberfläche, aber definieren noch kein explizites Mobile-first-Ziel.
- Die Einschätzung zur Tablet- und Smartphone-Tauglichkeit beruht deshalb zusätzlich auf einer Prüfung des aktuellen Frontend-Codes im Workspace.
