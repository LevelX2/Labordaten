---
typ: entscheidung
status: vorlaeufig
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-20 Erste Konzeptvorgabe Laboranwendung.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-20 Konzeptklaerungen V1 aus Rueckfragen.md
tags:
  - entscheidung
  - v1
  - architektur
  - datenmodell
---

# V1 Vorentscheidungen Produktform und Kernmodell

## Kurzfassung
Für V1 wird eine lokal laufende Browser-Anwendung akzeptiert. Das Fachmodell muss neben numerischen Werten auch qualitative Textwerte unterstützen. `Labor` wird als eigenes Stammdatenobjekt geführt. Zielbereiche werden allgemein definierbar und bei Bedarf personenbezogen überschreibbar. Eine formale Änderungshistorie ist für V1 nicht erforderlich.

## Getroffene Vorentscheidungen
- V1 darf als lokal im Browser laufende Anwendung starten.
- Messwerte müssen sowohl numerische als auch qualitative textuelle Befunde unterstützen.
- Unter qualitativen Werten sind insbesondere textuelle oder kategoriale Laborbefunde wie `positiv`, `negativ`, `unauffällig`, `auffällig`, `+`, `++`, `+++` oder kurze fachliche Freitexte zu verstehen.
- `Labor` ist ein eigenes Stammdatenobjekt mit zunächst kleinem Umfang: Name, Adresse, Bemerkung.
- Zielbereiche werden in zwei Ebenen gedacht:
  - allgemeiner Zielbereich pro Parameter
  - optionale personenbezogene Überschreibung
- Eine Änderungshistorie für manuelle Korrekturen ist in V1 nicht verpflichtend.
- Zusätzliche App-PIN oder Verschlüsselung ist in V1 nicht erforderlich.
- OneDrive ist nur als Sicherung oder Synchronisationsumgebung gedacht; es darf immer nur eine aktive Nutzung derselben Datenbasis geben.
- Zwei Berichtstypen sind für V1 besonders wichtig:
  - gut lesbarer Listenbericht für Arzttermine
  - Verlaufsbericht mit Zeitachse
- Wissensseiten müssen in V1 zunächst nur angezeigt werden; Bearbeitung in der Anwendung ist noch nicht erforderlich.
- Import-Dubletten sollen als Warnung behandelt und nach bewusster Bestätigung trotzdem übernehmbar sein.
- Der Arztbericht soll relevante Felder standardmäßig vorbelegen; einzelne Felder sollen bei Bedarf abwählbar sein.
- Referenzbereiche sollen in V1 grundsätzlich auch alters- oder geschlechtsabhängige Varianten abbilden können.

## Folgen für das Datenmodell
- `Messwert` braucht eine Trennung zwischen Werttyp und konkreter Repräsentation, damit numerische und textuelle Werte sauber gespeichert werden können.
- Halbquantitative oder kategoriale Angaben müssen als qualitative Werte speicherbar sein, auch wenn sie in Berichten später zusätzlich klassifiziert werden.
- `Labor` gehört in die Stammdaten und wird nicht nur als Befund-Freitext geführt.
- `Zielbereich` braucht einen Geltungsbereich, mindestens allgemein und personenbezogen.
- Da keine Änderungshistorie gefordert ist, genügt in V1 ein plausibler letzter Stand mit normalen Zeitstempeln und optionalem Importbezug.

## Folgen für die Architektur
- Eine lokal gehostete Webanwendung ist für V1 ausreichend und reduziert die Anfangskomplexität.
- Für externe Werkzeuge wie Codex oder spätere Importhelfer ist eine genormte Import-Schnittstelle sinnvoller als direkter Datenbankzugriff.
- Wissensdokumente müssen in V1 zuverlässig angezeigt und geöffnet werden; eingebettete Bearbeitung kann später kommen.

## Noch offene Anschlussfragen
- Wie genau qualitative Messwerte in Auswertungen und Berichten erscheinen sollen, ist noch zu präzisieren.
