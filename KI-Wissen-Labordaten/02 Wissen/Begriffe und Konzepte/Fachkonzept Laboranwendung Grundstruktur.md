---
typ: konzept
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-20 Erste Konzeptvorgabe Laboranwendung.md
tags:
  - fachkonzept
  - datenmodell
  - auswertung
  - planung
  - lokalbetrieb
---

# Fachkonzept Laboranwendung Grundstruktur

## Kurzfassung
Die erste Konzeptvorgabe beschreibt eine lokal betriebene Laboranwendung mit Weboberfläche für mehrere Personen. Der fachliche Kern ist bereits klar getrennt in Personenstammdaten, historisierte Basisdaten, Parameterstammdaten, Befunde, Messwerte, Referenzlogik, Zielbereiche, Planung, Wissensverknüpfung, Dokumentenhaltung, Importe und Berichte.

## Kernaussagen
- Die Anwendung ist lokal, offlinefähig und bewusst keine klassische Internet-Webapp.
- Dokumente bleiben als Dateien im Dateisystem; die Datenbank referenziert diese nur.
- Mehrpersonenfähigkeit ist Pflicht, zunächst für den privaten oder familiären Einsatz.
- Personenstammdaten und veränderliche Basisdaten wie Gewicht oder Größe werden getrennt modelliert.
- Qualitative Messwerte in Text- oder Kategoriform sollen zusätzlich zu numerischen Werten unterstützt werden, etwa `positiv`, `negativ`, `unauffällig`, `auffällig`, `+`, `++`, `+++` oder kurze fachliche Freitexte.
- Laborparameter erhalten eine stabile interne Identität, damit unterschiedliche Schreibweisen, Labore und Einheiten zusammengeführt werden können.
- `Labor` wird als eigenes Stammdatenobjekt geführt, zunächst mit Name, Adresse und Bemerkung.
- Befund und Messwert sind getrennte Fachobjekte.
- Kommentare und Wissensinformationen werden auf drei Ebenen getrennt: Befund, Messwert und allgemeiner Parameterkontext.
- Laborreferenzen der konkreten Messung und eigene Zielbereiche sind getrennte Konzepte.
- Zielbereiche sollen allgemein definierbar sein und bei Bedarf personenbezogen überschrieben werden können.
- Einheitenumrechnung ist parameterbezogen und muss nachvollziehbar bleiben; unsichere Normalisierungen dürfen nicht erzwungen werden.
- Parametergruppen sind viele-zu-viele organisiert und sollen für Filter, Berichte, Diagramme, Planung und Erfassung nutzbar sein.
- Wissensseiten zu Parametern und Gruppen sind ausgelagert, bevorzugt als Markdown- oder Obsidian-Dateien mit optionalen Metadaten.
- Wissensseiten müssen in V1 mindestens angezeigt werden; Bearbeitung kann später ergänzt werden.
- Auswertungen umfassen Zeitverläufe, Mehrfachdiagramme, Referenzdarstellung und statistische Übersichten.
- Planung wird in zyklische Kontrolle und einmalige Vormerkungen getrennt.
- Importe umfassen manuelle Erfassung, CSV, Excel sowie später KI-gestützte PDF-Workflows mit verpflichtender Prüfansicht.
- Für externe Helfer oder Codex-nahe Workflows ist eine genormte Importschnittstelle sinnvoller als direkter Datenbankzugriff.
- Berichte sollen sachliche PDF-Ausgaben für Arzttermine, Verlaufssichten, Gruppen und Planung ermöglichen.
- Für V1 sind ein Listenbericht für Arzttermine und ein Verlaufsbericht mit Zeitachse besonders wichtig.
- Im Arztbericht sollen relevante Felder standardmäßig enthalten sein und bei Bedarf abwählbar sein.
- Für die lokale Datenbasis ist eine einfache, robuste Single-User-Sperre vorgesehen.

## Einordnung für das Projekt
- Dies ist die erste belastbare fachliche Rohquelle für die eigentliche Laboranwendung.
- Das Konzept liefert bereits ein tragfähiges fachliches Zielbild und eine sinnvolle Priorisierung in drei Stufen.
- Besonders stark ist die fachliche Trennung von Stammdaten, Messdaten, Referenzlogik, Wissenslogik, Planung und Dokumentenhaltung.
- Die technische Architektur ist noch offen; sie muss aus diesem Fachmodell abgeleitet werden.

## Vorläufige Architekturfolgen
- Ein relationales lokales Datenmodell ist naheliegend, weil viele Beziehungen, Historisierung und prüfbare Konsistenz gefordert sind.
- Das Backend sollte lokale Geschäftslogik, Importprüfung, Berichtserzeugung und Sperrverwaltung bündeln.
- Die Oberfläche braucht getrennte Arbeitsbereiche für Stammdatenpflege, Erfassung, Prüfung, Auswertung, Planung und Administration.
- Der Importbereich benötigt einen expliziten Prüf- und Freigabeschritt statt direkter Übernahme.
- Wissensseiten und PDF-Dokumente sollten als externe Dateipfade mit validierbarer Verknüpfung geführt werden.

## Offene Punkte
- Mehrere Fachbereiche sind gut beschrieben, aber für die spätere Umsetzung noch nicht ausreichend präzisiert.
- Besonders offen sind Datenbank- und Packaging-Entscheidung, genaue Validierungsregeln, qualitative Verlaufsdarstellung, Berichtsdetails sowie Backup- beziehungsweise Wiederherstellungslogik.
