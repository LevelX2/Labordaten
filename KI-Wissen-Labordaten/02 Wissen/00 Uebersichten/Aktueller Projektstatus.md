---
typ: uebersicht
status: aktiv
letzte_aktualisierung: 2026-04-22
quellen:
  - ../../00 Projektstart.md
  - ../../03 Betrieb/Log.md
  - ../Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen.md
  - ../Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung.md
  - ../Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln.md
  - ../Begriffe und Konzepte/Ist-Stand Alias-Vorschlaege und Berichtseinheiten.md
  - ../Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung.md
tags:
  - status
---

# Aktueller Projektstatus

## Einordnung
Diese Seite beschreibt den aktuellen Projektstand als Snapshot. Zeitliche Abfolgen, einzelne Umsetzungsschritte und Verifikationen werden im [[../../03 Betrieb/Log]] geführt.

## Umgesetzt
- Das lokale V1-Grundgerüst mit Backend, Frontend, Vertragsdateien, Migrationen und projektbezogener Wissensbasis ist vorhanden.
- Personen, Parameter, Befunde und Messwerte funktionieren als echte API- und UI-Durchstiche.
- Referenzen, Zielbereiche und personenspezifische Zielbereichs-Overrides sind umgesetzt.
- Planung mit zyklischen Kontrollen, Einmalvormerkungen, Fälligkeitsberechnung und konsolidierter Vorschlagsliste ist umgesetzt.
- Gruppen sind als echter Stammdatenbereich mit Parameterzuordnung, Many-to-Many-Struktur und bereichsübergreifender Filterlogik umgesetzt.
- Berichte und Auswertung sind als echte Arbeitsbereiche vorhanden, einschließlich PDF-Erzeugung, Diagrammen, Referenzlinien und gruppenbezogenen Filtern.
- Zentrale Einheitenstammdaten, Einheiten-Aliase und parameterbezogene Umrechnungsregeln sind im Workspace vorhanden.
- Der Import unterstützt strukturierte JSON-Entwürfe sowie CSV- und Excel-Dateien mit Metadaten, Dokumentverknüpfung und bewusster Übernahme.
- Der Import kann bestehende Parameter über Anzeigename, Schlüssel oder Alias zuordnen und beim bestätigten Mapping neue Aliase aus Berichtsschreibweisen anlegen.
- Referenzoperatoren wie `<`, `>`, `<=` und `>=` werden strukturiert geführt.
- Berichtsblöcke können im Import als Gruppenvorschläge vorbereitet und nach der Übernahme auf neue oder bestehende Gruppen angewendet werden.
- Neue Parameter erhalten ihren internen Schlüssel automatisch aus dem Anzeigenamen; Dublettenprüfung, Zusammenführung und Alias-Vorschläge sind in der Parameterpflege vorhanden.
- Die Wissensbasis ist als lesender Arbeitsbereich in der Anwendung eingebunden.
- Eine zentrale Löschprüfung mit getrennter Ausführung ist im Backend für `person`, `befund`, `messwert`, `importvorgang`, `einheit`, `labor`, `laborparameter`, `parameter_gruppe`, `zielbereich` und `parameter_umrechnungsregel` vorhanden.

## Teilweise umgesetzt
- Der Import produktivisiert bereits einen assistierten Laborbericht-Workflow, setzt für gescannte PDFs aber weiterhin eine externe Extraktion oder manuelle Aufbereitung voraus.
- Die Berichts- und Auswertungslogik nutzt bereits normierte Werte und Anzeigeeinheiten in passenden Fällen, ist aber noch nicht in allen fachlichen Darstellungen gleich tief ausgebaut.
- Die Wissensverknüpfung ist als eigener Arbeitsbereich vorhanden, aber noch nicht tief in Parameter-, Gruppen- und Importansichten integriert.
- Die zentrale Löschlogik deckt viele Kernobjekte ab, ist aber noch nicht auf Dokumente, Wissensseiten und einige Betriebsobjekte ausgedehnt.

## Offen
- Direkter PDF-Upload mit OCR- oder Parser-Stufe in die Importprüfung.
- Vorschlags-Workflow für handschriftliche persönliche Referenzen.
- Mehrstufige Übernahme von `Vorwerten` aus Berichten.
- Weitere fachliche Verfeinerung von Berichten, insbesondere bei Gruppensemantik, Zielbereichsauswertung und präziseren Kurztexten.
- Weitere Vertiefung der Wissensverknüpfung in fachliche Arbeitsbereiche.
- Ausweitung der zentralen Löschlogik auf `dokument`, `wissensseite`, `einstellung` und `datenbasis_sperre` sowie die spätere Anbindung an die Oberfläche.

## Wichtige Grenzen
- Der aktuelle Importfluss ist stark, aber noch kein Vollautomat für gescannte Laborberichte.
- Fachgleiches Mapping und Alias-Anlage müssen weiterhin bewusst getrennt von Einheitenumrechnung und fachlicher Transformation behandelt werden.
- Historische oder fremde Dokumentbestände können widersprüchliche Stammdaten, technische Problemdateien oder nicht importgeeignete Dateiklassen enthalten und brauchen deshalb weiterhin Vorprüfung oder assistierte Klassifikation.
