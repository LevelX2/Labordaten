---
typ: planung
status: entwurf
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-20 Erste Konzeptvorgabe Laboranwendung.md
  - Fachkonzept Laboranwendung Grundstruktur.md
  - ../Risiken und offene Punkte/Erste Konzeptvorgabe Klaerungsbedarf.md
tags:
  - planung
  - architektur
  - roadmap
---

# Planung Erstarchitektur und Umsetzungsphasen

## Kurzfassung
Für die erste Umsetzung bietet sich eine lokal installierbare Anwendung mit lokalem Backend, relationaler Datenbank, Dateisystem-Anbindung für Dokumente und einer sachlichen Weboberfläche an. Die Architektur sollte früh so aufgeteilt werden, dass Stammdaten, Messdaten, Referenzlogik, Planung, Wissensverknüpfung, Importprüfung und Berichte eigenständige Domänen bleiben.

## Empfohlene Zielarchitektur

### Produktform
- Lokales Backend mit lokaler Weboberfläche.
- Eine Datenbasis pro Nutzerinstallation.
- Offlinefähig; Internet nur für optionale KI-Funktionen.
- V1 darf zunächst als lokal startbare Browser-Anwendung umgesetzt werden, mit späterer Paketierungsmöglichkeit.

### Datenhaltung
- Relationale lokale Datenbank für fachliche Kernobjekte und Beziehungen.
- Dateisystem für PDF-Dokumente und Markdown-Wissensseiten.
- In der Datenbank nur referenzierte Dokument- und Wissenspfade sowie Metadaten.
- Einfache, robuste Single-User-Sperre auf Ebene der Datenbasis.
- Original-Laborberichte sollen bevorzugt als Dokumentquelle erhalten bleiben; andere Importquellen können optional archiviert werden.

### Fachliche Schichten
- Stammdaten: Personen, Basisdatenverlauf, Parameter, Synonyme, Gruppen, Wissenslinks.
- Messdaten: Befunde, Dokumente, Messwerte, konkrete Laborreferenzen, Importherkunft.
- Planungsdaten: zyklische Planung, Einmalvormerkungen, Fälligkeitsberechnung.
- Wissensintegration: Referenzen auf Markdown-Seiten und optional Frontmatter-Auswertung.
- Auswertung und Berichte: Diagramme, Kennzahlen, PDF-Berichte.
- System und Betrieb: Einstellungen, Sperrlogik, Pfadverwaltung, Sicherungsunterstützung.

### Importarchitektur
- Rohimport und fachliche Übernahme strikt trennen.
- Importvorgang als eigenes Objekt mit Quelle, Status, Rohpayload und Prüfergebnis.
- Vor finaler Übernahme immer eine Prüfansicht mit Mapping, Validierung und Unsicherheitsmarkierungen.
- Spätere KI-Importe auf dasselbe Prüf- und Freigabemodell aufsetzen.
- Für Codex oder andere externe Helfer soll eine genormte Import-Schnittstelle vorgesehen werden, statt direkter Datenbankschreibzugriffe.
- Potenzielle Dubletten sollen erkannt und als Warnung mit bewusster Übernahmemöglichkeit angezeigt werden.

## Empfohlene Fachobjekte für die erste Modellierung
- `Person`
- `PersonBasisdatenEintrag`
- `Labor`
- `Laborparameter`
- `ParameterSynonym`
- `ParameterUmrechnungsregel`
- `ParameterBeziehung`
- `ParameterGruppe`
- `GruppenParameter`
- `WissensseitenLink`
- `Befund`
- `Dokument`
- `Messwert`
- `MesswertReferenz`
- `Zielbereich`
- `ZielbereichUeberschreibungPerson`
- `PlanungZyklisch`
- `PlanungEinmalig`
- `Importvorgang`
- `ImportPruefpunkt`
- `Berichtsvorlage`
- `Einstellung`

## Wichtigste Architekturprinzipien
- Originaldaten bleiben erhalten; Normalisierung und Ableitungen dürfen die Rohinformation nie verdrängen.
- Fachliche Trennung vor UI-Bequemlichkeit: Befund, Messwert, Referenz, Zielbereich, Wissen und Planung bleiben eigenständige Konzepte.
- Änderungsnachvollziehbarkeit früh mitdenken, mindestens für Importe, Mapping und kritische Stammdaten.
- Optionale Funktionen wie KI, Obsidian oder normierte Vergleichsansichten dürfen Kernprozesse nicht verkomplizieren.
- V1 soll auf realen Daten stabil arbeiten, nicht nur auf Demo-Flows.
- Externe Automatisierung oder KI-gestützte Helfer kommunizieren über definierte Import- oder Dateischnittstellen, nicht direkt über Datenbankzugriffe.

## Empfohlene Umsetzungsphasen

### Phase 0: Präzisierung und Leitentscheidungen
- Offene Fachpunkte zu Darstellungslogik qualitativer Werte, Referenzlogik, Fälligkeitslogik, Importvalidierung und externer Importschnittstelle entscheiden.
- Technische Produktform festlegen: Browser plus lokaler Server oder direkt paketierte Desktop-App.
- Datenverzeichnis, Dokumentverzeichnis, Backup-Grundsätze und Sperrverhalten definieren.

### Phase 1: Technisches Grundgerüst
- Projektstruktur, Datenbankmigrationen, Konfigurationsmodell und lokale Pfadverwaltung aufsetzen.
- Sperrmechanismus für die Datenbasis entwerfen und testen.
- Grundnavigation und sachliche UI-Shell anlegen.

### Phase 2: Stammdaten und Kernobjekte
- Personenverwaltung mit historisierten Basisdaten umsetzen.
- Parameterverwaltung mit Synonymen, Gruppen und Wissenslinks umsetzen.
- Laborstammdaten und Dokumentverwaltung einführen.
- Zielbereiche als allgemeine Vorgaben plus personenbezogene Überschreibungen modellieren.

### Phase 3: Befunde, Messwerte und Referenzen
- Befunderfassung und Messwerterfassung mit sauberer Trennung umsetzen.
- Numerische und qualitative Messwerte in einem gemeinsamen, aber klar typisierten Modell abbilden, einschließlich textueller, kategorialer und halbquantitativer Befunde.
- Laborreferenzen pro Messwert abbilden.
- Alters- und geschlechtsabhängige Referenzvarianten fachlich vorsehen, auch wenn die Erfassung in V1 zunächst schlank bleibt.
- Befund- und Messwertbemerkungen getrennt pflegbar machen.
- Erste Validierungen für Einheit, Parameterzuordnung und Pflichtfelder einführen.

### Phase 4: Auswertung, Diagramme und Statistik
- Einzel- und Mehrfachverläufe bereitstellen.
- Filter nach Person, Parameter, Gruppe und Zeitraum umsetzen.
- Grundkennzahlen für Personen, Parameter, Gruppen und Gesamtbestand bereitstellen.

### Phase 5: Planung und Fälligkeitslisten
- Zyklische Planung pro Person und Parameter umsetzen.
- Fälligkeitsberechnung und Vorschlagsliste für den nächsten Termin einführen.
- Danach Einmalvormerkungen ergänzen.

### Phase 6: Berichte und Datenimport
- Arztbericht als Listenformat und Verlaufsbericht mit Zeitachse zuerst umsetzen.
- CSV- und Excel-Import mit Prüfansicht umsetzen.
- Importaudit und Mapping-Wiederverwendung ergänzen.
- Optionale Archivierung von nicht-dokumentären Importquellen ergänzen.
- Berichtsfelder standardmäßig vorbelegen und pro Ausgabe abwählbar machen.

### Phase 7: Erweiterungen aus Prio 2 und 3
- Zielbereiche, Einheitennormalisierung, Wissensmetadaten, normierte Vergleichsansichten und KI-Importe ausbauen.
- Komfortfunktionen, zusätzliche Statistikmodule und verfeinerte Berichte ergänzen.

## Kritische Punkte vor Implementierungsstart
- Qualitative Messwerte sind entschieden, aber ihre Darstellung in Auswertungen und Berichten muss noch genau festgelegt werden.
- Zielbereiche brauchen eine saubere Prioritätsregel zwischen allgemeinem Bereich und personenbezogener Überschreibung.
- Für OneDrive oder ähnliche Synchronisationsordner muss klar sein, welche Betriebsgrenzen akzeptiert werden.
- Ohne frühe Importaudit-Spur wird spätere Fehleranalyse unnötig schwer.
- Die externe Importschnittstelle für Codex-nahe Workflows sollte früh konzipiert werden, damit spätere Automatisierung nicht am Datenmodell vorbeigeht.
