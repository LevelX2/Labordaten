---
typ: uebersicht
status: aktiv
letzte_aktualisierung: 2026-04-26
quellen:
  - ../../00 Projektstart.md
  - ../../03 Betrieb/Log.md
  - ../Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen.md
  - ../Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung.md
  - ../Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln.md
  - ../Begriffe und Konzepte/Ist-Stand Alias-Vorschlaege und Berichtseinheiten.md
  - ../Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Fachlicher Labordaten-Wissenspool.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Zeitraum-Faelligkeiten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung PDF-Merkzettel anstehende Messungen.md
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
- Planung mit zyklischen Kontrollen, Einmalvormerkungen, Fälligkeitsberechnung, konsolidierter Vorschlagsliste, Zeitraumansicht für kommende Fälligkeiten und PDF-Merkzettel für anstehende Messungen ist umgesetzt.
- Die Planungsanlage kann Parameter über eine suchbare Mehrfachauswahl auswählen und Gruppen als Eingabehilfe übernehmen; gespeichert bleiben einzelne Planungen pro Parameter.
- Gruppen sind als echter Stammdatenbereich mit Parameterzuordnung, Many-to-Many-Struktur und bereichsübergreifender Filterlogik umgesetzt.
- Berichte und Auswertung sind als echte Arbeitsbereiche vorhanden, einschließlich PDF-Erzeugung, Diagrammen, Referenzlinien und gruppenbezogenen Filtern.
- Zentrale Einheitenstammdaten, Einheiten-Aliase und parameterbezogene Umrechnungsregeln sind im Workspace vorhanden.
- Der Import unterstützt strukturierte JSON-Entwürfe sowie CSV- und Excel-Dateien mit Metadaten, Dokumentverknüpfung und bewusster Übernahme.
- Der Import bietet einen geführten Prompt-Weg für externe KI-Chats: Prompt erzeugen, Dokument extern analysieren lassen, JSON einfügen und anschließend Befund, Messwerte, Warnungen, Übernahme und Gruppenentscheidungen prüfen.
- Die Importoberfläche trennt neue Importwege (`KI-Chat`, `CSV/Excel`, `JSON`) sichtbar von der Weiterbearbeitung (`Import prüfen`, `Historie`) und zeigt offene Importe mit Badge und Prüflink an.
- Der Import kann bestehende Parameter über Anzeigename, Schlüssel oder Alias zuordnen, beim bestätigten Mapping neue Aliase aus Berichtsschreibweisen anlegen und fehlende Parameter bei bewusster Auswahl aus der Messwertklärung neu anlegen.
- KI-JSON-Importe können für unbekannte Parameter optionale `parameterVorschlaege` mit Kurzbeschreibung, Einheit, Werttyp und Alias-Hinweisen mitbringen; diese werden in der Prüfansicht angezeigt und erst bei bewusst bestätigter Neuanlage als Stammdaten übernommen.
- Die Befundansicht bietet jetzt neben der Freitextsuche auch strukturierte Filter nach Person, Labor, Zeitraum, Dokumentstatus, Quelle und Dublettenwarnung.
- In der Befundansicht kann aus jedem zugeordneten Messwert direkt die Auswertung für dieselbe Person und denselben Parameter geöffnet werden; der Verlauf wird dabei ohne Datumsbegrenzung automatisch geladen.
- Referenzoperatoren wie `<`, `>`, `<=` und `>=` werden strukturiert geführt.
- Berichtsblöcke können im Import als Gruppenvorschläge vorbereitet und nach der Übernahme auf neue oder bestehende Gruppen angewendet werden.
- Neue Parameter erhalten ihren internen Schlüssel automatisch aus dem Anzeigenamen; Dublettenprüfung, Zusammenführung und Alias-Vorschläge sind in der Parameterpflege vorhanden.
- Die in der Anwendung sichtbare Wissensbasis ist als fachlicher Labordaten-Informationspool von der projektbezogenen KI-Wissensbasis getrennt; der Standardordner ist `Labordaten-Wissen/`.
- Der fachliche Informationspool ist als Markdown-Arbeitsbereich in der Anwendung eingebunden: Seiten können aus dem konfigurierten Wissensordner gelesen, als formatierter Text angezeigt, intern per Wiki- oder Markdown-Link angesprungen und mit geführter Pfaderzeugung manuell neu angelegt werden.
- Wissensseiten können aus der Oberfläche gelöscht werden, sofern sie keine Rohquellen sind und nicht noch mit einem Parameter verknüpft sind.
- Parameter können mit einer Wissensseite verknüpft werden; bei neuer Parameteranlage über die API wird automatisch eine Fachwissensseite mit dem Beschreibungstext als Ausgangsinhalt angelegt und verknüpft.
- Eine zentrale Löschprüfung mit getrennter Ausführung ist im Backend für `person`, `befund`, `messwert`, `importvorgang`, `einheit`, `labor`, `laborparameter`, `parameter_gruppe`, `zielbereich`, `parameter_umrechnungsregel`, `planung_zyklisch` und `planung_einmalig` vorhanden.
- Die Oberfläche bindet diese Löschprüfung inzwischen auch im Planungsbereich an, sodass zyklische Planungen und Einmalvormerkungen sichtbar geprüft und gelöscht werden können.

## Teilweise umgesetzt
- Der Import produktivisiert bereits einen assistierten Laborbericht-Workflow über JSON, CSV, Excel und externen KI-Chat-Prompt, setzt für gescannte PDFs aber weiterhin eine externe Extraktion oder manuelle Aufbereitung voraus.
- Die Berichts- und Auswertungslogik nutzt bereits normierte Werte und Anzeigeeinheiten in passenden Fällen, ist aber noch nicht in allen fachlichen Darstellungen gleich tief ausgebaut.
- Die Wissensverknüpfung ist für Parameter umgesetzt, aber noch nicht tief in Gruppen-, Import- und Berichtsdarstellungen integriert.
- Die zentrale Löschlogik deckt viele Kernobjekte ab, ist aber noch nicht auf Dokumente, Wissensseiten und einige Betriebsobjekte ausgedehnt.

## Offen
- Direkter PDF-Upload mit OCR- oder Parser-Stufe in die Importprüfung.
- Angebundene KI-Schnittstelle, die Dokumente innerhalb der Anwendung automatisch analysiert.
- Vorschlags-Workflow für handschriftliche persönliche Referenzen.
- Mehrstufige Übernahme von `Vorwerten` aus Berichten.
- Weitere fachliche Verfeinerung von Berichten, insbesondere bei Gruppensemantik, Zielbereichsauswertung und präziseren Kurztexten.
- Weitere Vertiefung der Wissensverknüpfung in fachliche Arbeitsbereiche.
- Ausweitung der zentralen Löschlogik auf `dokument`, `wissensseite`, `einstellung` und `datenbasis_sperre`.

## Wichtige Grenzen
- Der aktuelle Importfluss ist stark, aber noch kein Vollautomat für gescannte Laborberichte.
- Fachgleiches Mapping und Alias-Anlage müssen weiterhin bewusst getrennt von Einheitenumrechnung und fachlicher Transformation behandelt werden.
- KI-generierte Parameterbeschreibungen sind nur Vorschläge und müssen fachlich geprüft werden, bevor aus ihnen neue Stammdaten entstehen.
- Historische oder fremde Dokumentbestände können widersprüchliche Stammdaten, technische Problemdateien oder nicht importgeeignete Dateiklassen enthalten und brauchen deshalb weiterhin Vorprüfung oder assistierte Klassifikation.
