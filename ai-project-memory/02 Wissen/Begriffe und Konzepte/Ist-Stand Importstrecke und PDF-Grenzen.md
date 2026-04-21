---
typ: architektur
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../00 Uebersichten/Aktueller Projektstatus.md
  - ../../../apps/backend/src/labordaten_backend/api/routes/importe.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
  - ../../../apps/backend/src/labordaten_backend/models/befund.py
  - ../../../apps/backend/src/labordaten_backend/models/dokument.py
  - ../../../apps/frontend/src/features/importe/ImportPage.tsx
  - ../../../packages/contracts/import-v1.schema.json
tags:
  - import
  - pdf
  - ist-stand
  - grenzen
---

# Ist-Stand Importstrecke und PDF-Grenzen

## Kurzfassung
Der aktuelle Stand vom 2026-04-21 unterstützt eine echte Importprüfung und bewusste Übernahme für strukturierte JSON-Importe. Ein direkter PDF-Upload mit automatischer Extraktion von Laborwerten ist noch nicht umgesetzt.

## Was aktuell technisch vorhanden ist
- Importentwürfe können im Frontend als JSON eingegeben und an `/api/importe/entwurf` gesendet werden.
- Das Backend prüft das JSON gegen das erwartete Importschema und erzeugt Prüfpunkte, Warnungen und Fehler.
- Vor der Übernahme können Messwerte manuell vorhandenen Parametern zugeordnet werden.
- Bei der Übernahme werden `Befund`, `Messwert` und gegebenenfalls `MesswertReferenz` erzeugt.
- Warnungen wie fehlende Zuordnung, unparsebare Zahlenwerte oder mögliche Dubletten werden sichtbar gemacht.
- Wenn ein JSON-Import bereits einen lokalen `dokumentPfad` enthält, kann daraus jetzt auch für diesen Importweg ein echtes `Dokument` in der lokalen Dokumentablage angelegt und mit `Importvorgang` sowie `Befund` verknüpft werden.
- Referenzen aus dem Import können jetzt neben Text, Grenzen und Einheit auch Kontext wie Altersbereich, Geschlecht und Referenzbemerkung mitführen.

## Was für den Import bereits günstig ist
- Ein Labor muss nicht zwingend vorab existieren, wenn im Import `laborName` angegeben wird; das Backend kann ein passendes Labor finden oder neu anlegen.
- Die Person sollte vor dem Import bereits existieren, weil die Übernahme eine gültige Personenzuordnung benötigt.
- Parameter sollten im Regelfall vorab als Stammdaten vorhanden sein, weil die Importseite aktuell nur die Zuordnung zu bestehenden Parametern erlaubt.
- Das Importschema unterstützt numerische und textuelle Messwerte sowie Referenzangaben.

## Was aktuell noch fehlt
- Kein PDF-Upload-Endpunkt für Laborberichte.
- Keine OCR- oder Parser-Stufe, die aus einem PDF automatisch Import-JSON ableitet.
- Keine direkte Verarbeitung von `csv` oder `excel` als Datei-Upload, obwohl diese Quelltypen im Schema schon vorgesehen sind.
- Keine automatische Neuanlage von Personen oder Parametern innerhalb des Importdialogs.
- Kein echter Ein-Klick-Fluss `PDF hochladen -> Parser -> Importentwurf`; die Dokumentverknüpfung setzt aktuell weiterhin voraus, dass die inhaltliche Extraktion außerhalb des Backends erfolgt.

## Praktische Einordnung
- Denkbar ist bereits ein halbmanueller Workflow: Aus einem Laborbericht wird außerhalb des aktuellen Importdialogs ein JSON im V1-Schema erzeugt, das anschließend in der Anwendung geprüft und übernommen wird.
- Dieser JSON-Weg kann jetzt auch das lokale Originaldokument sauber in die Dokumentablage übernehmen und mit dem resultierenden Befund verknüpfen.
- Noch nicht denkbar als fertiger Produktfluss ist: PDF hochladen, Werte automatisch extrahieren, Mapping direkt vorschlagen und das Originaldokument vollständig mit dem Befund verknüpfen.
- Der Workflow wurde am 2026-04-21 mit einem realen PDF praktisch verifiziert: Ein Bioscientia-Befund für Ludwig Hirth wurde durch externe Analyse in strukturierte Stammdaten- und Import-API-Aufrufe überführt und ohne Warnungen übernommen.
- Der Workflow wurde am 2026-04-21 zusätzlich mit einem zweiten realen PDF praktisch verifiziert: Ein Pur-life-Befund für Ludwig Hirth mit 101 Messwerten wurde strukturiert extrahiert, als Importentwurf angelegt, mit dem Originaldokument verknüpft und ohne Warnungen übernommen.

## Beobachtung zu abweichenden Parameternamen
- Reale Laborberichte verwenden für fachlich gleiche Werte oft unterschiedliche Schreibweisen oder Zusatzbezeichner.
- Im Pur-life-Testfall trat dieses Problem konkret bei `Vitamin D3 (25-OH) LCMS` auf, das fachlich dem bereits vorhandenen Parameter `Vitamin D3 (25-OH)` entspricht.
- Der Import war bereits erfolgreich möglich, indem der Messwert kanonisch auf den vorhandenen Parameter gemappt wurde, während der Originalname des Berichts in `original_parametername` erhalten blieb.
- Dieses Muster ist fachlich sinnvoll, weil Verlauf, Zielbereiche und Auswertungen an einem kanonischen Parameter zusammenlaufen können, ohne den Originalwortlaut des Labors zu verlieren.

## Sinnvolle nächste Ausbaustufe für das Namens-Mapping
- Eine formalisierte Aliasverwaltung für Laborparameter ist seit dem 2026-04-21 im Workspace vorhanden.
- Parameter können nun eigene Alternativnamen pflegen, die normalisiert gespeichert werden und im Import automatisch berücksichtigt werden.
- Der Importabgleich arbeitet jetzt in dieser Reihenfolge:
  - explizite Zuordnung aus dem Importpayload
  - manuelle Zuordnung aus dem Importdialog
  - Match über internen Schlüssel
  - Match über normalisierten Anzeigenamen
  - Match über gepflegte Parameter-Aliase
- Bei eindeutiger Übereinstimmung wird der Messwert bereits im Importentwurf automatisch dem kanonischen Parameter zugeordnet.
- Bei Mehrdeutigkeit bleibt die Zuordnung offen und wird als Warnung sichtbar gemacht.
- Dabei bleibt der kanonische Parameter die Auswertungs- und Stammdatenebene, während der originale Laborname weiterhin je Messwert gespeichert wird.
- Der neue Ablauf wurde am 2026-04-21 auch praktisch verifiziert: Für `Vitamin D3 (25-OH) LCMS` wurde ein Alias auf den kanonischen Parameter `Vitamin D3 (25-OH)` angelegt, und ein nachfolgender Importentwurf wurde automatisch über diesen Alias zugeordnet.

## Einordnung für einen Codex-orchestrierten Workflow
- Die Grundvorstellung ist architektonisch passend: Ein externer Helfer wie Codex soll fehlende Stammdaten nicht direkt in die Datenbank schreiben, sondern über definierte API-Schnittstellen anlegen und danach den strukturierten Import anstoßen.
- Für `Person`, `Labor` und `Parameter` existieren bereits echte Anlage-Endpunkte im Backend.
- `Labor` kann heute teilweise schon implizit über den Import entstehen, wenn `laborName` im Importpayload gesetzt ist.
- `Person` kann nur dann sinnvoll automatisch angelegt werden, wenn aus dem Dokument genug belastbare Pflichtdaten vorliegen; aktuell ist insbesondere `geburtsdatum` im API-Modell verpflichtend.
- `Parameter` können technisch angelegt werden, benötigen aber mehr als nur den sichtbaren Namen: mindestens `interner_schluessel`, `anzeigename` und fachlich sinnvoll den Standard-Werttyp und die Einheit.
- Daraus folgt: Ein Codex-Workflow ist heute grundsätzlich denkbar, aber noch nicht als sicherer Vollautomat. Er funktioniert eher als assistierter Agentenfluss mit Prüf- und Bestätigungsschritten.

## Hauptgrenzen für diesen Agentenfluss
- Kein direkter PDF-Upload mit Extraktionspipeline.
- Keine eingebaute Logik, die für neue Personen aus unvollständigen Dokumentdaten sichere Stammdatensätze ableitet.
- Keine dedizierte Konflikt- oder Dublettenentscheidung für neu anzulegende Personen, Labore und Parameter vor der Anlage.
- Keine formalisierte Richtlinie für die Bildung von `interner_schluessel` bei neuen Parametern.
- Beim getesteten Import wurde ein Dateipfad mit Emoji im JSON-Kontext nicht sauber codiert zurückgegeben. Für `dokumentPfad` über Unicode-reiche Pfade sollte die Zeichenkodierung gesondert geprüft werden.

## Konsequenz für die weitere Umsetzung
- Der nächste sinnvolle Ausbauschritt wäre eine vorgelagerte Dokument- und Extraktionsstrecke:
  - PDF auswählen oder ablegen
  - optional OCR oder strukturierte Extraktion
  - Erzeugung eines Import-JSON nach `import-v1.schema.json`
  - Übergabe in die bestehende Prüf- und Freigabestrecke
