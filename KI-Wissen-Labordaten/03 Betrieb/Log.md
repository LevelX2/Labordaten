# Log

## Format
- Monatsblock im Format `## YYYY-MM`
- Eintrag im Format `### [YYYY-MM-DD] typ | titel`
- Neue Einträge werden im neuesten passenden Monatsblock direkt oben ergänzt
- Anlass oder Quelle
- Neu angelegte Seiten
- Geänderte Seiten
- Kern der inhaltlichen Anpassung

## 2026-04

### [2026-04-26] update | PDF-Berichtsstandard mit App-Icon vereinheitlicht
- Anlass oder Quelle: Nutzerhinweis, dass links oben vor `Labordaten` das App-Icon erscheinen soll und diese Form zunächst Standard für Berichte sein soll.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung PDF-Berichtsstandard Icon und Seitenzahlen.md
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/core/pdf_branding.py
  - ../../../apps/backend/src/labordaten_backend/modules/berichte/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - PDF-Kopf- und Fußzeilen werden jetzt zentral über ein gemeinsames Branding-Modul gezeichnet.
  - Der Merkzettel `Anstehende Messungen`, der Arztbericht und der Verlaufsbericht erhalten in der Kopfzeile ein kleines App-Icon vor `Labordaten`, rechts die Dokumentart und unten Seitennummern.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_planung_faelligkeiten.py apps/backend/tests/test_report_pdf_layout.py`.

### [2026-04-26] update | Stammdaten-Bearbeitbarkeit geprüft und erste Lücken geschlossen
- Anlass oder Quelle: Nutzerauftrag, alle Stammdatenbereiche auf sinnvolle nachträgliche Bearbeitbarkeit zu prüfen und klare risikoarme Lücken direkt zu schließen.
- Neu angelegte Seiten:
  - ../02 Wissen/Begriffe und Konzepte/Ist-Stand Stammdaten-Bearbeitbarkeit.md
  - ../../../apps/backend/tests/test_masterdata_editing_api.py
  - ../../../apps/frontend/src/shared/components/LaborePflegeCard.tsx
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/personen.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/labore.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/zielbereiche.py
  - ../../../apps/backend/src/labordaten_backend/modules/personen/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/personen/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/labore/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/labore/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/zielbereiche/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/zielbereiche/service.py
  - ../../../apps/frontend/src/features/personen/PersonenPage.tsx
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
  - ../../../apps/frontend/src/shared/api/payloadBuilders.ts
  - ../../../apps/frontend/src/shared/types/api.ts
  - ../02 Wissen/00 Uebersichten/Index.md
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
  - ../03 Betrieb/Generische Entwicklungsvorgaben.md
- Kern der inhaltlichen Anpassung:
  - Personenstammdaten können über `PATCH /api/personen/{person_id}` und ein Bearbeiten-Werkzeug geändert werden.
  - Laborstammdaten können über `PATCH /api/labore/{labor_id}` und den neuen Einstellungsbereich `Labore` geändert werden.
  - Allgemeine Zielbereiche können über `PATCH /api/zielbereiche/{zielbereich_id}` und eine Bearbeiten-Aktion in der Parameterseite geändert werden; Parameterbezug, technische ID und Werttyp bleiben stabil.
  - Die Befundliste hält fest, welche Stammdatenattribute bereits bearbeitbar sind, welche bewusst nicht bearbeitet werden sollen und welche offenen Lücken fachlich noch zu entscheiden sind.
  - Verifiziert mit `python -m pytest tests/test_masterdata_editing_api.py tests/test_gruppen_api.py tests/test_units.py`, `npm test -- --run` und `npm run build`.

### [2026-04-26] update | PDF-Merkzettel mit Branding und Seitenzahlen ergänzt
- Anlass oder Quelle: Nutzerhinweis, dass der Merkzettel als App-Ausgabe erkennbar sein und bei mehreren Seiten Seitennummern enthalten soll.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung PDF-Merkzettel Branding und Seitenzahlen.md
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Der PDF-Merkzettel `Anstehende Messungen` zeichnet auf jeder Seite eine Kopfzeile mit `Labordaten` und `Planungs-Merkzettel`.
  - Die Fußzeile enthält `Labordaten · Anstehende Messungen` sowie die laufende Seitennummer.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_planung_faelligkeiten.py`.

### [2026-04-26] update | Fachlicher Labordaten-Wissenspool von KI-Projektwissen getrennt
- Anlass oder Quelle: Nutzerklärung, dass die Anwendung einen fachlichen Informationspool zu Labordaten anzeigen soll und nicht die projektbezogene KI- und Entwicklungsdokumentation.
- Neu angelegte Seiten:
  - ../../Labordaten-Wissen/README.md
  - ../../Labordaten-Wissen/00 Einstieg/Index.md
  - ../../Labordaten-Wissen/01 Grundlagen/Laborwerte richtig einordnen.md
  - ../../Labordaten-Wissen/01 Grundlagen/Referenzbereiche und Zielbereiche.md
  - ../../Labordaten-Wissen/01 Grundlagen/KSG-Systematik.md
  - ../../Labordaten-Wissen/01 Grundlagen/Krankwerte.md
  - ../../Labordaten-Wissen/01 Grundlagen/Schluesselwerte.md
  - ../../Labordaten-Wissen/01 Grundlagen/Gesundmachwerte.md
  - ../../Labordaten-Wissen/02 Parameter/Allgemein/README.md
  - ../../Labordaten-Wissen/03 Testprofile und Kombinationen/README.md
  - ../../Labordaten-Wissen/04 Teststrategien/README.md
  - ../../Labordaten-Wissen/05 Zielbereiche und Gesundheitswerte/README.md
  - ../../Labordaten-Wissen/90 Quellen und Belege/Quellenuebersicht.md
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Fachlicher Labordaten-Wissenspool.md
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.runtime.json
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/backend/src/labordaten_backend/core/config.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/tests/test_wissensbasis_api.py
  - ../../../apps/frontend/src/app/layout/AppLayout.tsx
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
  - ../../../apps/frontend/src/features/wissensbasis/WissensbasisPage.tsx
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
- Kern der inhaltlichen Anpassung:
  - Der Standard-Wissensordner der Anwendung zeigt nun auf `Labordaten-Wissen/` statt auf `KI-Wissen-Labordaten/`.
  - `Labordaten-Wissen/` wurde als fachlicher Markdown-Pool mit Einstieg, Grundlagen, KSG-Systematik, Parameterseiten, Testprofilen, Teststrategien, Zielbereichen und Quellenübersicht angelegt.
  - Die Navigation benennt den Arbeitsbereich als `Laborwissen`, um ihn von der KI-Projektdokumentation zu unterscheiden.
  - Beim Anlegen eines neuen Parameters über die API wird automatisch eine Fachwissensseite unter `02 Parameter/Allgemein/` erzeugt, mit dem Parameter verknüpft und mit dem Beschreibungstext als Kurzdefinition vorbefüllt.
  - Auch im Import bewusst neu angelegte Parameter erhalten eine solche Fachwissensseite.
  - Verifiziert mit `python -m pytest tests/test_wissensbasis_api.py tests/test_parameter_key_generation.py tests/test_import_group_suggestions.py` im Backend und `npm run build` im Frontend.

### [2026-04-26] update | Vorhandene Planungen nach Typ filterbar gemacht
- Anlass oder Quelle: Nutzerhinweis, dass ein Fälligkeits- oder Statusfilter im Unterpanel `Vorhandene Planungen` fachlich unverständlich ist und die Liste stattdessen einfach nach zyklischen oder einmaligen Planungen gefiltert werden sollte.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Filter nach Planungstyp.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Der Filter `Fälligkeit / Status` in `Vorhandene Planungen` wurde durch `Planungstyp` ersetzt.
  - Die Filteroptionen sind nun `Alle Planungen`, `Zyklisch` und `Einmalig`.
  - Fälligkeit und Status bleiben als sichtbare Informationen am Planungseintrag erhalten, steuern aber nicht mehr die Bestandsliste.

### [2026-04-26] update | Statusfilter vorhandener Planungen präzisiert
- Anlass oder Quelle: Nutzerhinweis, dass die Statusoption `Geplant` im Filter vorhandener Planungen missverständlich ist, weil sowohl zyklische als auch einmalige Einträge geplant sein können.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Statusfilter Geplant missverstaendlich.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Der kombinierte Filter in `Vorhandene Planungen` heißt nun `Fälligkeit / Status`.
  - Der berechnete zyklische Fälligkeitsstatus `geplant` wird in Oberfläche und PDF-Ausgabe als `Noch nicht fällig` angezeigt.

### [2026-04-26] update | Planungstext auf Labortermine verallgemeinert
- Anlass oder Quelle: Nutzerhinweis, dass Planungstexte nicht nur von Blutabnahmen sprechen sollen, weil auch Urin-, Stuhl- und andere Laboruntersuchungen geplant werden können.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Labortermine statt Blutabnahmen.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Der Infotext der Planungsseite spricht nun von `Laborterminen oder Arztterminen` statt von `Blutabnahmen oder Arztterminen`.
  - Der Screenplan hält fest, dass Planungstexte neutral von Laborterminen oder Laboruntersuchungen sprechen sollen, wenn nicht ausdrücklich eine Blutprobe gemeint ist.

### [2026-04-26] update | Gruppenbearbeitung ergänzt
- Anlass oder Quelle: Nutzerfrage, wie Name oder Beschreibung einer bestehenden Gruppe geändert werden können; die Funktion war in der Gruppenseite bisher nicht vorhanden.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckfrage Gruppen Bearbeitung.md
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/gruppen.py
  - ../../../apps/backend/src/labordaten_backend/modules/gruppen/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/gruppen/service.py
  - ../../../apps/backend/tests/test_gruppen_api.py
  - ../../../apps/frontend/src/features/gruppen/GruppenPage.tsx
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Gruppen können jetzt über `PATCH /api/gruppen/{gruppe_id}` umbenannt und in ihrer Beschreibung geändert werden.
  - Die Gruppenseite hat ein Werkzeug `Gruppe bearbeiten`, das Name und Beschreibung der ausgewählten Gruppe speichert.
  - Leere Gruppennamen werden backendseitig abgelehnt.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_gruppen_api.py apps/backend/tests/test_import_group_suggestions.py`, `npm run build` im Frontend und `git diff --check`.

### [2026-04-26] update | Gruppensortierschlüssel entfernt
- Anlass oder Quelle: Nutzerhinweis, dass Gruppen aktuell primär als Auswahlbündel für Parameter dienen und keine eigene relative Sortierreihenfolge brauchen.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Gruppen Sortierschluessel.md
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/models/parameter_gruppe.py
  - ../../../apps/backend/src/labordaten_backend/modules/gruppen/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/migrations/versions/20260426_0014_remove_group_sort_key.py
  - ../../../apps/frontend/src/features/gruppen/GruppenPage.tsx
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/shared/types/api.ts
  - ../../../packages/contracts/import-v1.schema.json
  - ../02 Wissen/Begriffe und Konzepte/V1 Ziel-Datenmodell.md
- Kern der inhaltlichen Anpassung:
  - Der eigene Sortierschlüssel der Gruppenentität wurde aus Modell, API, Importvertrag und Gruppenoberfläche entfernt.
  - Gruppen werden weiter alphabetisch geführt; die optionale Reihenfolge von Parametern innerhalb einer Gruppe bleibt bestehen.
  - Eine neue Migration entfernt die Spalte `parameter_gruppe.sortierschluessel` aus bestehenden Datenbanken.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_import_group_suggestions.py apps/backend/tests/test_import_prompt.py`, `npm run build` im Frontend, `python -m py_compile apps/backend/migrations/versions/20260426_0014_remove_group_sort_key.py` und `git diff --check`.

### [2026-04-26] update | Suche vorhandener Planungen verständlicher gemacht
- Anlass oder Quelle: Nutzerhinweis, dass im Unterpanel `Vorhandene Planungen` die Suche nach Person und Parameter funktioniert, `Status` als Suchbegriff aber unklar bleibt und der Platzhaltertext `oder Hinweis` in der Seitenleiste abgeschnitten wird.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Suche vorhandene Planungen.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Das Suchfeld in `Vorhandene Planungen` ist nun kurz als Suche nach Person oder Parameter beschriftet.
  - Der Status wird als eigener Filter mit deutschen Statusbezeichnungen angeboten, statt über technische Statuscodes im Textsuchfeld erwartet zu werden.
  - Verifiziert mit `npm run build` im Frontend.

### [2026-04-26] update | PDF-Merkzettel für anstehende Messungen ergänzt
- Anlass oder Quelle: Nutzerhinweis, dass die Liste anstehender Messungen als druckbarer Merkzettel beziehungsweise PDF-Download verfügbar sein soll.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung PDF-Merkzettel anstehende Messungen.md
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/planung.py
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../../../apps/backend/tests/test_planung_faelligkeiten.py
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Für die aktuell gefilterten `Anstehenden Messungen` gibt es einen PDF-Endpunkt und eine Download-Aktion im aufgeklappten Planungsüberblick.
  - Der PDF-Merkzettel enthält Termin, Person, Parameter, Planungstyp, Status, Priorität, letzte Messung und Hinweis.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_planung_faelligkeiten.py apps/backend/tests/test_planung_batch_api.py`, `npm run build` im Frontend und `git diff --check`.

### [2026-04-26] update | Einheitenpflege als geführter Arbeitsbereich überarbeitet
- Anlass oder Quelle: Nutzerhinweis, dass die Einheitenansicht in den Einstellungen nicht intuitiv verständlich war und unklar blieb, was dort zu tun ist.
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/frontend/src/shared/components/EinheitenPflegeCard.tsx
  - ../../../apps/frontend/src/features/einstellungen/EinstellungenPage.tsx
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung.md
- Kern der inhaltlichen Anpassung:
  - Die Einheitenpflege ist nun als Arbeitsbereich mit Bestand, Suche und Neuanlage links sowie ausgewählter Einheit rechts aufgebaut.
  - Alias-Schreibweisen werden direkt im Kontext der ausgewählten kanonischen Einheit gepflegt; die doppelte Zieleinheiten-Auswahl im Aliasformular entfällt.
  - Lösch- und Deaktivierungsprüfung ist als nachgelagerte Option zur gewählten Einheit erreichbar statt als separater Auswahlblock.
  - Verifiziert mit `npm run build` im Frontend und Browserprüfung der Einstellungsansicht unter `http://localhost:5173/einstellungen`.

### [2026-04-26] update | Gruppenbemerkung in zyklischer Planung vorbelegt
- Anlass oder Quelle: Nutzerhinweis, dass beim Anlegen einer Planung über eine Gruppe der Gruppenname und der Zyklus als Bemerkung vorbelegt werden können, wenn die Bemerkung noch leer ist.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Gruppenbemerkung.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Beim Übernehmen einer Gruppe in der zyklischen Planung wird eine leere Bemerkung automatisch als Kombination aus Intervall und Gruppenname vorbelegt, zum Beispiel `Alle 6 Monate Eisenwerte kontrollieren.`
  - Manuell eingetragene Bemerkungen werden nicht überschrieben.
  - Verifiziert mit isoliertem TypeScript-Check der Planungsseite, `npm run build` und `git diff --check`.

### [2026-04-26] update | Planungsüberblick Anstehende Messungen verfeinert
- Anlass oder Quelle: Nutzerhinweis, dass der obere Zeitraumfilter in der Planung einklappbar sein, fachlich als anstehende oder geplante Messungen benannt werden, eigene Personenwahl besitzen und runde Schnellwahlknöpfe verwenden soll; zusätzlich sollten lange Parametertexte in Auswahlkacheln sauber umbrechen.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Anstehende Messungen und Textumbruch.md
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Die Planungsseite zeigt den oberen Zeitraumüberblick nun als eingeklappt startenden Block `Anstehende Messungen`.
  - Der Block hat einen eigenen Personenfilter, nutzt Zeitraumfelder erst im aufgeklappten Zustand und zeigt die Schnellwahl für 6 oder 12 Monate als runde Aktionsknöpfe.
  - Die Auswahlkacheln der gemeinsamen `SelectionChecklist` erlauben lange Parameterbezeichnungen und Metadaten innerhalb der Kachel umzubrechen.
  - Verifiziert mit `npm run build` im Frontend und `git diff --check` für die geänderten Frontend-Dateien.

### [2026-04-26] update | Wissensbasis-Seiten lesbar, verlinkbar und mit Parametern verknüpfbar
- Anlass oder Quelle: Nutzerhinweis, dass Markdown-Texte in der Wissensbasis angezeigt, untereinander verlinkt, manuell angelegt und aus Parameterdetails erreichbar sein sollen.
- Neu angelegte Seiten:
  - ../../../apps/backend/tests/test_wissensbasis_api.py
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/parameter.py
  - ../../../apps/backend/src/labordaten_backend/api/routes/wissensbasis.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/parameter/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/wissensbasis/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/wissensbasis/service.py
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../apps/frontend/src/features/wissensbasis/WissensbasisPage.tsx
  - ../../../apps/frontend/src/shared/types/api.ts
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
- Kern der inhaltlichen Anpassung:
  - Wissensseiten können über die API als neue Markdown-Dateien im konfigurierten Wissensordner angelegt werden; Pfade werden auf den Wissensbasis-Ordner begrenzt.
  - Beim manuellen Anlegen schlägt die Oberfläche aus Zielbereich und Titel automatisch einen relativen Markdown-Pfad vor, der bei Bedarf bearbeitet werden kann.
  - Wissensseiten können über API und Oberfläche gelöscht werden; Rohquellen und noch mit Parametern verknüpfte Seiten werden dabei geschützt und in der Oberfläche gar nicht erst mit einer Löschaktion angeboten.
  - Die Wissensbasis-Oberfläche rendert Markdown jetzt als lesbaren Artikel statt als Rohtext.
  - Interne Obsidian-Links wie `[[Seite]]` und Markdown-Links auf andere `.md`-Seiten werden innerhalb der Wissensbasis aufgelöst und öffnen die Zielseite im selben Arbeitsbereich.
  - Parameter können mit einer vorhandenen Wissensseite verknüpft werden; im Parameterdetail gibt es einen direkten Sprung zur verknüpften Seite oder zur passenden Wissensbasis-Suche.
  - Verifiziert mit `python -m pytest tests/test_wissensbasis_api.py tests/test_parameter_key_generation.py` im Backend und `npm run build` im Frontend.

### [2026-04-26] update | Zeitraumansicht für Planungsfälligkeiten ergänzt
- Anlass oder Quelle: Nutzerhinweis, dass in der Planung kommende fällige Werte für frei wählbare Zeiträume wie das nächste halbe Jahr oder die nächsten 12 Monate sichtbar sein sollen.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Zeitraum-Faelligkeiten.md
  - ../../../apps/backend/tests/test_planung_faelligkeiten.py
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/planung.py
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Der Fälligkeiten-Endpunkt akzeptiert jetzt `datum_von` und `datum_bis` und liefert bei gesetztem Zeitraum auch kommende aktive zyklische Fälligkeiten sowie datierte offene Einmalvormerkungen im Bereich.
  - Die Planungsseite zeigt eine eigene Übersicht `Fälligkeiten im Zeitraum` mit Von/Bis-Auswahl sowie Schnellwahl für die nächsten 6 und 12 Monate.
  - Die bestehende konsolidierte Fälligkeitstabelle wird wiederverwendet und bleibt mit dem Personenfilter gekoppelt.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_planung_faelligkeiten.py`, isoliertem TypeScript-Check der Planungsseite und `git diff --check`. Der vollständige Frontend-Build ist aktuell durch die gelöschte Datei `apps/frontend/src/features/wissensbasis/WissensbasisPage.tsx` blockiert.

### [2026-04-26] update | Planungsparameter suchbar und gruppenbasiert auswählbar
- Anlass oder Quelle: Nutzerhinweis, dass die reine Dropdown-Auswahl in der Planung bei mehreren hundert Parametern unpraktisch ist und Gruppen als Eingabehilfe für gleichartig zu planende Parameter sinnvoll wären.
- Neu angelegte Seiten:
  - ../01 Rohquellen/fachkonzepte/2026-04-26 Rueckmeldung Planung Parameter-Suche und Gruppenauswahl.md
  - ../../../apps/backend/tests/test_planung_batch_api.py
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/planung.py
  - ../../../apps/backend/src/labordaten_backend/modules/planung/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/planung/service.py
  - ../../../apps/frontend/src/features/planung/PlanungPage.tsx
  - ../../../apps/frontend/src/styles.css
  - ../02 Wissen/00 Uebersichten/Aktueller Projektstatus.md
  - ../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows.md
- Kern der inhaltlichen Anpassung:
  - Die Planungsformulare verwenden nun eine suchbare Mehrfachauswahl für Parameter statt einer reinen Dropdown-Liste.
  - Die Suche berücksichtigt Anzeigename, internen Schlüssel, Beschreibung, Einheit und Werttyp der Parameter.
  - Gruppen können beim Anlegen zyklischer Planungen und einmaliger Vormerkungen als Eingabehilfe übernommen werden; gespeichert werden weiterhin einzelne Planungen je Parameter.
  - Backendseitig gibt es Batch-Endpunkte für zyklische Planungen und Einmalvormerkungen, damit eine Mehrfachauswahl atomar gespeichert wird.
  - Verifiziert mit `python -m pytest apps/backend/tests/test_planung_batch_api.py` und `npm run build` im Frontend.

### [2026-04-26] update | Personenauswahl im Import-Prüfschritt ergänzt
- Anlass oder Quelle: Nutzerhinweis, dass beim Import eines Skript- oder JSON-Ergebnisses eine Person ausgewählt werden muss, in der Oberfläche aber keine erkennbare Auswahlmöglichkeit vorhanden war und die Übernahme deshalb unten blockiert blieb.
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/modules/importe/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
  - ../../../apps/backend/src/labordaten_backend/modules/loeschlogik/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/loeschlogik/service.py
  - ../../../apps/backend/tests/test_delete_logic_api.py
  - ../../../apps/backend/tests/test_import_person_override.py
  - ../../../apps/backend/tests/test_import_prompt.py
  - ../../../apps/frontend/src/features/importe/ImportPage.tsx
  - ../../../apps/frontend/src/shared/components/LoeschAktionPanel.tsx
  - ../../../apps/frontend/src/shared/types/api.ts
  - ../../../apps/frontend/src/styles.css
  - ../../../packages/contracts/import-v1.schema.json
  - ../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen.md
- Kern der inhaltlichen Anpassung:
  - Der JSON-Startbereich enthält eine Personenauswahl als Anwendungskontext für den Import des KI-Ergebnisses.
  - Das Feld `KI-Ergebnis oder Import-JSON` startet nun leer statt mit echtem Beispiel-JSON. Beim Einfügen ersetzt der Paste-Vorgang den aktuellen Feldinhalt, damit neue KI-Ergebnisse ohne vorheriges Markieren übernommen werden können.
  - Der JSON-Upload-Endpunkt ignoriert `befund.personId` aus dem KI- oder Skript-JSON und verwendet nur die separat in der Anwendung gewählte Person.
  - In der Prüfansicht `Befund prüfen` gibt es für offene Importe eine nachträgliche Personenauswahl; eine dort gewählte Person hebt den blockierenden Personenfehler in der UI auf.
  - Die Backend-Übernahme akzeptiert eine `person_id_override`, schreibt sie in den gespeicherten Importpayload zurück und verwendet sie für Befund und Messwerte.
  - Die bisherige Dropdown-Liste zur Parameterzuordnung wurde durch einen Suchdialog ergänzt, der verdächtige Kandidaten mit Einheit, Werttyp, Treffergrund und Beschreibung zeigt und die Filterung auf mehr Kandidaten oder alle Parameter lockern kann.
  - In `Messwerte klären` bleiben Hinweise zum aktuell zugeordneten oder neu anzulegenden Parameter direkt in der Übersicht sichtbar.
  - Der Importvertrag trennt nun originale Laborbericht-Kommentare (`bemerkungKurz`, `bemerkungLang`) von KI-eigenen Extraktions- oder Mapping-Hinweisen (`kiHinweis`). Die Prüfübersicht zeigt diese Informationen getrennt an, damit Originaltext nicht mit KI-Kommentar vermischt wird.
  - Für neue Parameter-Vorschläge wurde die Abgrenzung von `beschreibungKurz` geschärft: Dort gehört nur eine allgemeine, berichtsunabhängige Fachbeschreibung hin. Berichtskommentare, Zusatzuntersuchungs-Empfehlungen, Einsendehinweise oder patientenbezogene Risikohinweise bleiben Messwertbemerkung oder Dokumentbegründung; wenn keine allgemeine Beschreibung ableitbar ist, zeigt die UI an, dass der Parameter ohne Beschreibung angelegt würde.
  - KI-Hinweise, Detailbemerkungen, Unsicherheitsflag und Prüfbedarfsflag aus einzelnen Messwerten werden nun in der Import-Prüfübersicht angezeigt; beim Speichern des Messwerts bleiben die originalen Bemerkungsfelder und die Flags relevant, während `kiHinweis` als Importprüfhinweis dient.
  - Die Messwertübersicht kann nach Zuordnungsweg gefiltert werden, zum Beispiel offene Zuordnungen, Neuanlage, manuell angepasst, automatisch durch Stammdaten erkannt oder aus dem KI-/JSON-Ergebnis übernommen.
  - Die missverständlichen Aktionen wurden sprachlich geschärft: Der Löschbereich heißt in der Importoberfläche nun `Importversuch löschen`; `Leeren` am einzelnen Messwert heißt nun `Zuordnung zurücksetzen` und löscht den Messwert nicht.
  - Die allgemeine Löschprüfung für Importvorgänge bietet nun eine Option, ein exklusiv verknüpftes Importdokument mitzulöschen. Wird das Dokument noch von anderen Importen oder Befunden verwendet, bleibt es geschützt.
  - Verifiziert mit Backend-Importtests, Backend-Löschlogiktests, Frontend-Tests, Frontend-Build und `git diff --check`.

### [2026-04-26] update | Vitamin-D-Dubletten zusammengeführt
- Anlass oder Quelle: Nutzerhinweis, dass `25-Hydroxy-Vitamin D` und `Vitamin D3 (25-OH)` fachlich zusammengehören und für ein gemeinsames Diagramm zusammengeführt werden sollen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
- Kern der inhaltlichen Anpassung:
  - Vor der Änderung wurde eine lokale Sicherung `apps/backend/labordaten.pre-vitamin-d-duplicates-20260426-175951.db` angelegt.
  - `Vitamin D3 (25-OH)` wurde in den kanonischen Parameter `25-Hydroxy-Vitamin D` zusammengeführt.
  - Die bisherigen Messwerte, der Zielbereich und die Gruppenzuordnung wurden auf den Zielparameter umgehängt; `Vitamin D3 (25-OH)` und `Vitamin D3 (25-OH) LCMS` bleiben als Aliase erhalten.
  - Die aktive Umrechnungsregel `ng/ml` nach `µg/l` bleibt am Zielparameter; die redundante Gegenrichtung wurde deaktiviert, damit die Standardeinheit `µg/l` eindeutig bleibt.
  - Der übernommene Zielbereich wurde wegen der 1:1-Umrechnung von `ng/ml` auf `µg/l` umgestellt.
  - Verifiziert mit direkter DB-Abfrage auf Quellparameter, Aliase, Messwerte, Zielbereich, Umrechnungsregeln und Backend-Tests `python -m pytest tests/test_parameter_duplicate_merge.py tests/test_parameter_conversion_rules.py`.

### [2026-04-26] update | FT3- und FT4-Dubletten zusammengeführt
- Anlass oder Quelle: Nutzerhinweis, dass `freies Thyroxin fT4`/`FT4` und entsprechend `freies Trijodthyronin fT3`/`FT3` noch Dubletten sind
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
- Kern der inhaltlichen Anpassung:
  - Vor der Änderung wurde eine lokale Sicherung `apps/backend/labordaten.pre-thyroid-duplicates-20260426-175457.db` angelegt.
  - `freies Trijodthyronin fT3` wurde in den kanonischen Parameter `FT3` zusammengeführt; vorhandene Messwerte wurden umgehängt und die Langnamen inklusive Importalias bleiben als Aliase erhalten.
  - `freies Thyroxin fT4` wurde in den kanonischen Parameter `FT4` zusammengeführt; vorhandene Messwerte wurden umgehängt und die Langnamen inklusive Importalias bleiben als Aliase erhalten.
  - Die Gruppe `Schilddrüsenwerte` wurde nach der Zusammenführung auf die Reihenfolge `TSH basal`, `FT3`, `FT4`, `Calcitonin im Serum (hCT)` gebracht.
  - Verifiziert mit direkter DB-Abfrage auf entfernte Quellparameter, Aliasbestand, Messwertzahlen, Gruppensortierung und Backend-Test `python -m pytest tests/test_parameter_duplicate_merge.py`.

### [2026-04-26] update | Auswertungsdiagramme interaktiver und MPV-Alias ergänzt
- Anlass oder Quelle: Nutzerwunsch, Wertetabellen unter den Auswertungsdiagrammen einklappbar zu machen, Personenlinien im Diagramm per Klick ein- und auszuschalten sowie `mittl. Plättchenvolumen` als MPV-Wert im kleinen Blutbild zu behandeln
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
  - ../../../apps/frontend/src/styles.css
- Kern der inhaltlichen Anpassung:
  - Die Messwerttabellen unter den Diagrammen sind nun pro Parameter ein- und ausklappbar; standardmäßig bleiben sie eingeklappt.
  - Im Auswertungsfilter gibt es die Option, Wertetabellen nach dem Laden direkt geöffnet zu starten.
  - Diagramme zeigen eine klickbare Personen-Legende, über die einzelne Personenlinien je Diagramm ein- und ausgeschaltet werden können.
  - Für den Parameter `mittl. Plättchenvolumen` wurde der Alias `MPV` ergänzt; der Wert bleibt als eigener Thrombozytenindex in den Blutbildgruppen bestehen.
  - Verifiziert mit Frontend-Build `npm run build`, Frontend-Tests `npm test` und direkter DB-Abfrage des Alias.

### [2026-04-26] update | Differentialblutbild und sichere Blutbild-Dubletten gepflegt
- Anlass oder Quelle: Nutzerwunsch, zusätzlich eine eigene Gruppe `Differentialblutbild` anzulegen und erkennbare Blutbild-Dubletten mit Alias-Rückfall zu bereinigen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
- Kern der inhaltlichen Anpassung:
  - Vor der Änderung wurde eine lokale Sicherung `apps/backend/labordaten.pre-differential-duplicates-20260426-172937.db` angelegt.
  - Die neue Gruppe `Differentialblutbild` wurde als reine Leukozyten-Differenzierung ohne kleines Blutbild angelegt und in üblicher Reihenfolge sortiert.
  - Sichere Dubletten mit gleicher Einheit wurden zusammengeführt: `RDW`, `RDW (Ery-Verteilungsbreite)` und `Ery. Verteilbreite (RDW)` in `RDW-CV`; `Neutrophile Granulozyten` in `Neutrophile`; `Eosinophile Granulozyten` in `Eosinophile`; `Basophile Granulozyten` in `Basophile`.
  - Die bisherigen Anzeigenamen wurden als Aliase an den Zielparametern erhalten, damit künftige Importe weiterhin gemappt werden können.
  - Absolute Granulozyten-Dubletten mit abweichenden Standardeinheiten (`/µl` versus `Tsd./µl`) wurden bewusst nicht automatisch zusammengeführt, weil dafür zuerst eine saubere Umrechnungsentscheidung nötig ist.
  - `Kleines Blutbild` und `Großes Blutbild` wurden nach der Dublettenbereinigung neu sortiert und auf die kanonischen Parameter umgestellt.
  - Verifiziert mit direkten DB-Queries auf Gruppeninhalt, Aliasbestand und entfernte Quellparameter.
  - Ein zusätzlicher `PRAGMA foreign_key_check` zeigte eine bereits in der Sicherung vorhandene verwaiste `parameter_umrechnungsregel`; sie hängt nicht an den Blutbild-Zusammenführungen und wurde nicht ohne sichere fachliche Zielzuordnung umgehängt.

### [2026-04-26] update | Blutbild-Gruppen fachlich bereinigt
- Anlass oder Quelle: Nutzerwunsch, `Kleines Blutbild` anzulegen beziehungsweise zuzuordnen, `Großes Blutbild` von falsch zugeordneten Parametern zu bereinigen und die übliche Laborreihenfolge zu setzen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
- Kern der inhaltlichen Anpassung:
  - Vor der Änderung wurde eine lokale Sicherung `apps/backend/labordaten.pre-blutbild-20260426-172009.db` angelegt.
  - Die bestehende aktive Gruppe `Kleines Blutbild` wurde als Zielgruppe verwendet und auf 13 passende aktive Blutbildparameter mit üblicher Reihenfolge gesetzt.
  - Die Gruppe `Großes Blutbild` wurde auf `Kleines Blutbild` plus Differenzialblutbild der Leukozyten gesetzt; fachfremde Eisen-, Vitamin-, Zucker-, Lipid-, Elektrolyt-, Nieren- und Chemiewerte wurden aus dieser Gruppe entfernt.
  - Fachgleiche aktive Varianten wie `RDW-CV`, `Neutrophile Granulozyten` und absolute Differenzialwerte bleiben bewusst zugeordnet, damit vorhandene ältere Messwerte in Gruppenfiltern nicht herausfallen.
  - Verifiziert mit direkten DB-Queries auf Gruppeninhalt, Sortierung und fachfremde Restzuordnungen.

### [2026-04-26] update | Auswertungsfilter kompakter zusammengefasst
- Anlass oder Quelle: Nutzerwunsch, den Knopf `Auswertung laden` unter den Auswertungsfilter zu setzen und den eingeklappten Filter platzsparend als Text zusammenzufassen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
  - ../../../apps/frontend/src/styles.css
- Kern der inhaltlichen Anpassung:
  - Der Ladeknopf steht nun als eigene Aktionszeile unterhalb des Rahmens `Auswertungsfilter` und bleibt auch bei eingeklapptem Filter sichtbar.
  - `Filter zurücksetzen` steht als eigene Aktion oberhalb der eigentlichen Filterauswahl statt am Ende des Filterformulars.
  - Der Auswertungsfilter wird im Browser gespeichert und beim Zurückkehren zur Auswertungsseite wiederhergestellt; explizite URL-Filter aus Kontextabsprüngen haben weiterhin Vorrang.
  - `Filter öffnen`, `Filter zurücksetzen` und das Schließen-X stehen platzsparend rechts im Kopf des Auswertungsfilters.
  - Der Umschalter für die Wertetabelle unter Diagrammen nutzt nun statt eines langen Textbuttons einen kompakten Chevron-Button wie andere Einklappbereiche.
  - Personen-Schalter in Diagrammen werden nur noch für Personen angezeigt, die in der konkreten Parameter-Serie auch numerische Diagrammpunkte haben.
  - Die Wertetabelle wird unter dem Diagramm nur noch als `Werte` mit Chevron beschriftet; die Anzahl der numerischen Werte steht stattdessen direkt je Person im Diagramm-Schalter.
  - Parameterbeschreibungen werden in Auswertungsserien mitgeliefert und im Diagrammkopf platzsparend einzeilig mit optionalem Chevron zum Ausklappen angezeigt.
  - Unter dem Auswertungsfilter gibt es nun einen eigenen Bereich `Darstellung`; dort werden Diagrammtyp, Zeitraumdarstellung, Laborreferenzen, Zielbereiche und Standardöffnung der Wertetabellen konfiguriert.
  - Als Diagrammtypen stehen `Verlauf`, `Punkte` und `Punkte + Bereiche` zur Verfügung; die Punkte-Ansichten zeichnen keine Verbindungslinien zwischen Messpunkten.
  - Optionale, nicht genutzte Auswahlfilter in der Auswertung werden im eingeklappten Zustand kompakt als einfache Filter-Pillen angezeigt; erst bei Auswahl oder Öffnen erscheint der große Auswahlkasten.
  - Die eingeklappten Auswahltexte wurden gekürzt und verzichten auf erklärende Sätze wie `Liste eingeklappt. Bei Bedarf aufklappen.`
  - Die Darstellungsoption für Wertetabellen heißt nun `Wertetabellen standardmäßig geöffnet`, damit sie den Zustand klarer beschreibt.
  - Die eingeklappte Filterzusammenfassung zeigt bei überschaubaren Auswahlen die konkreten Namen für Personen, Gruppen, Parameter, KSG-Klassen und Labore; bei mehr als 20 Parametern fällt sie auf die reine Anzahl zurück.
  - Die oberen Kennzahlenkarten zeigen nun die Treffer der aktuellen Filterauswahl für Personen, Parameter, Messwerte und Befunde; die jeweiligen Gesamtzahlen bleiben als Vergleich sichtbar.
  - Ein kurzer Hinweis unter den Karten benennt den aktiven Zeitraum, damit Standard-Datumsfilter und echte Gesamtbetrachtung unterscheidbar bleiben.
  - Wenn mehr als 20 Parameter betroffen sind, startet die Auswertung nicht ungefragt, sondern verlangt vor dem Laden eine Bestätigung.
  - Der Ladebutton bleibt textlich stabil bei `Auswertung laden`; nur während des echten Ladevorgangs wechselt er auf `Lädt...`.
  - Die Vorab-Trefferzählung deaktiviert den Ladebutton nicht mehr; blockierend sind nur fehlende Personenauswahl und eine bereits laufende Auswertung.
  - Anzeigeoptionen wie Achsenmodus, Laborreferenzen und Zielbereiche werden in der kompakten Filterzeile nicht mehr als Filtertext geführt.
  - Verifiziert mit `npm run build` und `npm test` im Frontend.

### [2026-04-26] update | KSG-Festlegungen in lokale Datenbank übernommen
- Anlass oder Quelle: Nutzerwunsch, die abgestimmten KSG-Festlegungen in die Datenbank zu übernehmen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/labordaten.db
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
- Kern der inhaltlichen Anpassung:
  - Vor der Änderung wurde eine lokale Sicherung `apps/backend/labordaten.pre-ksg-20260426-140145.db` angelegt.
  - Alle 353 vorhandenen Laborparameter wurden gegen den KSG-Vorschlag abgeglichen; 350 erhielten eine primäre KSG-Klasse, 3 bleiben bewusst ohne Klassifikation.
  - Die Primärverteilung in der DB lautet nun: `krankwert` 88, `schluesselwert` 119, `gesundmachwert` 143, ohne KSG-Klasse 3.
  - Aus der Spalte `Sinnvolle Zusatzrolle` wurden 481 aktive Einträge in `parameter_klassifikation` angelegt.
  - Verifiziert mit direkten DB-Queries und Backend-Tests `test_api_contract_fixed_codes.py`, `test_code_field_validation.py`, `test_import_prompt.py`.

### [2026-04-26] update | KSG-Tabellen S01 und S06-S16 ausgewertet
- Anlass oder Quelle: Nutzerquellen `KSG-Klassifikation Tab S01.pdf` sowie `KSG-Klassifikation Tab S06.pdf` bis `KSG-Klassifikation Tab S16.pdf`
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S01 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S06 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S07 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S08 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S09 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S10 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S11 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S12 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S13 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S14 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S15 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S16 Transkription]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/Begriffe und Konzepte/KSG Klassifizierung von Laborparametern]]
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
- Kern der inhaltlichen Anpassung:
  - Die zusätzlichen Tabellen wurden als Rohquellen übernommen und als manuelle Transkriptionen aus den Bild-PDFs dokumentiert.
  - eGFR wurde im Vorschlag auf primär `schluesselwert` korrigiert, weil S07 eGFR ausdrücklich so führt; die Niereninsuffizienz-Abklärung bleibt Zusatzrolle `krankwert`.
  - Prolaktin wurde im vorhandenen Vorschlag auf primär `krankwert` korrigiert, weil S13 dies für den nicht-schwangeren Kontext vorgibt.
  - Neu in der Datenbank vorhandene Parameter wurden im Vorschlag ergänzt: intrazelluläres ATP und intrazelluläres Glutathion als `gesundmachwert`, Nitrotyrosin im Serum als `krankwert`.
  - Mehrfachrollen wie fT3 `S/G`, fT4 `S/K`, HDL-C `G/S`, Homocystein `K/S`, TSH `S/K` und geschlechtsabhängiges Testosteron wurden in Wissensbasis und Import-Prompt ergänzt.

### [2026-04-26] update | Absprung vom Befundmesswert in die Auswertung ergänzt
- Anlass oder Quelle: Nutzerwunsch, aus einem angezeigten Befund je Messwert direkt dessen zeitlichen Verlauf für die betroffene Person öffnen zu können
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - ../../../apps/frontend/src/features/befunde/BefundePage.tsx
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
- Kern der inhaltlichen Anpassung:
  - Die Messwerttabelle im Befunddetail erhält pro Messwert eine Aktion `Verlauf`.
  - Der Absprung setzt Person und Laborparameter als Auswertungsfilter und lässt den Datumsbereich offen, damit der gesamte bekannte Verlauf sichtbar wird.
  - Die Auswertung lädt bei diesem Kontextsprung automatisch, ohne dass der Nutzer zusätzlich `Auswertung laden` klicken muss.
  - Verifiziert mit `npm run build` und `npm test` im Frontend.

### [2026-04-26] update | KSG-Tabellen S04/S05 ausgewertet
- Anlass oder Quelle: Nutzerquellen `KSG-Klassifikation Tab S04.pdf` und `KSG-Klassifikation Tab S05.pdf`
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S04 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S05 Transkription]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/KSG Klassifizierung von Laborparametern]]
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
- Kern der inhaltlichen Anpassung:
  - Die zwei weiteren bildbasierten PDF-Tabellen wurden als Rohquellen übernommen und transkribiert.
  - Der KSG-Vorschlag wurde bei AP auf primär `schluesselwert` mit Zusatzrolle `krankwert` korrigiert, weil S04 AP als Schlüsselwert führt, obwohl eine frühere Übersicht AP auch als Extra-Krankwert nennt.
  - Coenzym Q10 wurde konsolidiert als `gesundmachwert` geführt, auch für die cholesterinkorrigierte vorhandene Größe.
  - Weitere nicht vorhandene Beispiele wie reverse T3, Zonulin, ANA-AK, Apo-B, CCP-AK und Cystatin C wurden in Projektwissen und Import-Prompt ergänzt.

### [2026-04-26] update | Primäre KSG-Klasse in Messwerten und Auswertungen sichtbar gemacht
- Anlass oder Quelle: Nutzerentscheidung, die primäre KSG-Klassifikation in Messwerten und Auswertungen auf jeden Fall mit anzuzeigen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/modules/messwerte/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/messwerte/service.py
  - ../../../apps/frontend/src/features/messwerte/MesswertePage.tsx
  - ../../../apps/frontend/src/features/auswertung/AuswertungPage.tsx
  - ../../../apps/frontend/src/shared/types/api.ts
- Kern der inhaltlichen Anpassung:
  - Messwert-API-Antworten enthalten nun die primäre KSG-Klasse des zugehörigen Parameters.
  - Die Messwertliste und das Messwertdetail zeigen die primäre KSG-Klasse sichtbar an.
  - Die Auswertung zeigt die primäre KSG-Klasse zusätzlich in Werttabellen und qualitativen Ereignissen, nicht nur im Serienkopf.

### [2026-04-26] update | KSG-Klasse als gemeinsamer Filter für Messwerte ergänzt
- Anlass oder Quelle: Nutzerprüfung, ob die Anzeige der KSG-Klassifikation auch in den zugehörigen Filterungen berücksichtigt ist
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../apps/backend/src/labordaten_backend/api/routes/messwerte.py
  - ../../../apps/backend/src/labordaten_backend/modules/messwerte/service.py
  - ../../../apps/frontend/src/features/messwerte/MesswertePage.tsx
  - ../../../apps/frontend/src/shared/utils/filterNavigation.ts
- Kern der inhaltlichen Anpassung:
  - Die Messwertliste kann nun nach `klassifikationen` filtern und weist ungültige KSG-Freitexte backendseitig ab.
  - Die Messwert-Filteroberfläche enthält eine eigene Auswahl für KSG-Klassen.
  - Der gemeinsame URL-Filter übernimmt `klassifikationen`, sodass Navigation von Messwerten zu Berichten und Auswertung die KSG-Auswahl mitnimmt.

### [2026-04-26] update | Zusätzliche KSG-Tabellen S02/S03 ausgewertet
- Anlass oder Quelle: Nutzerquellen `KSG-Klassifikation Tab S02.pdf` und `KSG-Klassifikation Tab S03.pdf`
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S02 Transkription]]
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S03 Transkription]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/KSG Klassifizierung von Laborparametern]]
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
  - ../../../apps/backend/src/labordaten_backend/modules/importe/service.py
- Kern der inhaltlichen Anpassung:
  - Die zwei bildbasierten PDF-Tabellen wurden als Rohquellen übernommen und für die Wissensarbeit transkribiert.
  - Der bestehende KSG-Vorschlag wurde bei Kupfer/Kupfer-Zink von reinem `gesundmachwert` auf primär `schluesselwert` mit Zusatzrolle `gesundmachwert` korrigiert, weil die Quelle Kupfer im Vollblut als `S/G` führt.
  - Weitere genannte, aktuell nicht vorhandene Parameter wie BDNF, DAO, HNMT, I-FABP, Lp-PLA2, MDA-LDL und Nitrotyrosin wurden als Orientierungsbeispiele in Projektwissen und Import-Prompt übernommen.

### [2026-04-26] update | KSG-Vorschlag gegen PDF-Quelle für Knochen und Gefäße abgeglichen
- Anlass oder Quelle: Nutzerquelle `KSG-Klassifikation.pdf` mit Übersicht zu Krank-, Schlüssel- und Gesundmachwerten für Knochen und Gefäße
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/KSG-Klassifikation Transkription]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/KSG Klassifizierung von Laborparametern]]
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
- Kern der inhaltlichen Anpassung:
  - Die PDF wurde als externe Rohquelle übernommen; weil sie keinen extrahierbaren Text enthält, wurde eine aus dem Seitenbild abgeleitete Transkription für die Wissensarbeit angelegt.
  - Der KSG-Klassifikationsvorschlag wurde bei den explizit genannten Knochen- und Gefäßmarkern korrigiert.
  - Betroffen waren insbesondere Knochenumbauwerte, LDL-/Small-LDL-Werte, Triglyceride, HbA1c, HOMA, Harnsäure, Ferritin, Transferrinsättigung, Magnesium, Progesteron, DHEA-S und freies Testosteron.
  - Der Import-Prompt wurde um kurze KSG-Orientierungsbeispiele aus der PDF ergänzt, damit neue Parameter-Vorschläge fachlich näher an der Quelle liegen.

### [2026-04-26] create | KSG-Klassifikationsvorschlag für vorhandene Parameter erstellt
- Anlass oder Quelle: Nutzerauftrag zur KSG-Einordnung der bestehenden Parameter und Prüfung der Import-/Prompt-Abbildung
- Neu angelegte Seiten:
  - [[../03 Betrieb/KSG-Klassifikationsvorschlag vorhandene Parameter 2026-04-26]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Für die aktuell 348 vorhandenen `laborparameter` wurde ein datierter Vorschlag zur primären KSG-Klasse erstellt.
  - Der Vorschlag setzt keine Datenbankwerte, sondern dient als prüfbare Grundlage für eine spätere fachliche Freigabe oder Migration.
  - Die Importstrecke wurde daraufhin geprüft, ob `primaereKlassifikation` in Prompt, Contract, Validierung, Preview und bewusster Neuanlage neuer Parameter abgebildet ist.

### [2026-04-26] update | Haupt-Vault-Anbindung mit Priorität und lokalem Fallback präzisiert
- Anlass oder Quelle: Review der Umstellung auf `AGENTS.local.md` und Haupt-Vault-Modell mit Bedarf nach klarerem Vorrang und robusterem Fallback
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../AGENTS.md
  - [[../03 Betrieb/Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - `AGENTS.md` beschreibt jetzt ausdrücklich die Prioritätsreihenfolge zwischen lokalen Projektregeln, optionaler Auflösung über `AGENTS.local.md` und globalen oder typspezifischen Default-Regeln aus dem Haupt-Vault.
  - Für Abschlusskommandos wie `Finito`, `Finale`, `Endfinale` und `Ende` gibt es zusätzlich einen lokalen Minimalkontrakt, falls die globale Definition in einer Umgebung nicht auflösbar ist.
  - Der konkrete private Vault-Name wurde aus der getrackten Wissensseite entfernt; dort bleibt nur noch die neutrale Einordnung als Delta gegenüber dem führenden Haupt-Vault bestehen.

### [2026-04-26] update | KSG-Klassifizierung für Laborparameter umgesetzt
- Anlass oder Quelle: Nutzerauftrag zur Prüfung und Umsetzung der Rohquelle [[../01 Rohquellen/externe-quellen/Laborwerte_Systematik_KSG]] als Klassifizierung von Laborparametern
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/KSG Klassifizierung von Laborparametern]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Ziel-Datenmodell]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Technisches Schema]]
  - ../../../apps/backend/src/labordaten_backend/models/laborparameter.py
  - ../../../apps/backend/src/labordaten_backend/models/parameter_klassifikation.py
  - ../../../apps/backend/src/labordaten_backend/models/zielbereich.py
  - ../../../apps/frontend/src/features/parameter/ParameterPage.tsx
  - ../../../packages/contracts/import-v1.schema.json
- Kern der inhaltlichen Anpassung:
  - Die KSG-Systematik wird als Parameter-Klassifikation umgesetzt, nicht als Messwert-Ampel und nicht als normale Gruppe.
  - `Laborparameter` kann nun eine primäre KSG-Klasse tragen; kontextabhängige Mehrfachrollen werden über `parameter_klassifikation` dokumentiert.
  - Zielbereiche erhalten einen Typ wie `optimalbereich`, `therapieziel`, `mangelbereich` oder `risikobereich`, damit Referenzbereich und Zielbereich fachlich besser getrennt werden können.
  - Importvertrag, API-Schemas, Auswertung, Berichte und Parameteroberfläche wurden um die neuen festen Codes ergänzt.

### [2026-04-26] update | Agentensteuerung auf Haupt-Vault und lokale Deltas ausgerichtet
- Anlass oder Quelle: offene lokale Projektanpassung zur Trennung von globalen, typspezifischen und projektspezifischen Agenten- und Wissensregeln
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - ../../../AGENTS.md
  - [[../03 Betrieb/Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - `AGENTS.md` verweist nun auf eine optionale lokale Datei `AGENTS.local.md`, über die das führende Haupt-Vault und der passende Projekttyp eingebunden werden können.
  - Die Projektanweisungen unterscheiden Regeln jetzt bewusster nach global, typspezifisch und projektspezifisch, statt nur zwischen generisch und projektspezifisch.
  - Die generischen Entwicklungsvorgaben werden dadurch ausdrücklich als projektinterne Delta-Sammlung gegenüber dem führenden Haupt-Vault eingeordnet.
  - Die globalen Abschlusskommandos werden nicht mehr vollständig lokal dupliziert, sondern über die Haupt-Vault-Anbindung als führend behandelt; projektspezifische Ergänzungen bleiben weiterhin lokal dokumentiert.

### [2026-04-25] update | UI-Leitlinien aus Thread als generische Regeln verdichtet
- Anlass oder Quelle: Nutzerauftrag, eine in einem anderen Thread erarbeitete UI-Regelliste auf Konsistenz zu prüfen, prägnanter zu formulieren und passend in der KI-Wissensbasis zu verankern
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-25 Rueckmeldung UI-Leitlinien fuer arbeitsorientierte Weboberflaechen]]
- Geänderte Seiten:
  - [[../03 Betrieb/Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die neue Regelliste wurde als Rohquelle aufgenommen, damit Herkunft und vollständiger Ursprungsinhalt nachvollziehbar bleiben.
  - Der dauerhaft wiederverwendbare Teil wurde in den generischen Entwicklungsvorgaben als Regelgruppe für Arbeitswege, Benennung, sichtbare nächste Schritte, Status, Historie, Warnklassifikation, vollständige Handlungsmöglichkeiten, robuste Copy-Flows sowie bewusst kurze und einheitlich einklappbare Oberflächen verankert.
  - Eine zwischenzeitlich ergänzte importspezifische Ableitung wurde wieder verworfen, weil sie für die generische Wissenspflege zu speziell ist.
  - Bewusst nicht als eigene Wissensseite angelegt wurde eine parallele UI-Regelsammlung, damit die generischen Vorgaben die zentrale Regelbasis bleiben.

### [2026-04-25] update | Startdokumentation nach Workspace-Umzug auf relative Pfade bereinigt
- Anlass oder Quelle: Nutzerauftrag, nach dem Ordnerumzug alle Tests laufen zu lassen und auf alte Referenzen zu prüfen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
- Kern der inhaltlichen Anpassung:
  - Die Prozessseite zum lokalen Start enthielt noch mehrere absolute OneDrive-Pfade zum alten Repository-Standort.
  - Die Befehlsbeispiele wurden auf pfadrelative Startaufrufe wie `.\apps\backend`, `.\apps\frontend` und `.\scripts\start-dev.ps1` umgestellt.
  - Dadurch passt die Wissensseite wieder zum aktuellen Workspace und zugleich besser zur bereits pfadrelativen VS-Code- und Skriptkonfiguration.
  - Verifiziert wurde der Stand durch `pytest` im Backend, `vitest` im Frontend und eine gezielte Repository-Suche nach alten absoluten `Labordaten`-Pfaden.

### [2026-04-25] update | KI-Prompt ohne Person und mit zwei Quellenvarianten
- Anlass oder Quelle: Nutzerentscheidung, dass der Prompt nur Regeln und Stammdaten exportieren soll und die Person erst beim JSON-Import gewählt wird
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - keine fachliche Wissensseite, nur Log-Eintrag
- Kern der inhaltlichen Anpassung:
  - Die Prompt-Erzeugung benötigt keine Person, keinen Dokumenthinweis und keinen Freitext-Hinweis mehr.
  - Der Promptbereich bietet zwei Varianten: `Laborbericht, PDF oder Bild` und `Tabelle, CSV oder Excel`.
  - Beide Varianten enthalten denselben technischen Importvertrag und denselben Stammdatenkontext aus Laboren, Parametern, Aliasen, Einheiten und Gruppen; nur die Eingangs-Anweisung für die Quelle unterscheidet sich.
  - Der Prompt weist die KI nun an, `befund.personId` wegzulassen, außer eine Person-ID wurde ausdrücklich vorgegeben. Die Person wird beim Einfügen des JSON-Ergebnisses in der Anwendung ausgewählt oder überschrieben.
  - Verifiziert wurde die Änderung durch `npm run build`, die gezielten Import-Backendtests und eine Browserprüfung des Promptbereichs.

### [2026-04-25] update | Sichtbaren Import auf KI-/JSON-Weg vereinheitlicht
- Anlass oder Quelle: Nutzerentscheidung, den direkten CSV-/Excel-Import aus der Oberfläche zu entfernen und CSV/Excel stattdessen über KI-Umwandlung in Import-JSON zu behandeln
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - keine fachliche Wissensseite, nur Log-Eintrag
- Kern der inhaltlichen Anpassung:
  - Die sichtbaren Import-Tabs sind nun `KI-Prompt`, `KI-Ergebnis / JSON`, `Import prüfen` und `Historie`.
  - Der bisher sichtbare Tab `CSV/Excel` wurde aus der Importoberfläche entfernt; die Backend-Strecke bleibt vorerst technisch vorhanden.
  - Die allgemeine JSON-Schnittstellenbeschreibung weist nun ausdrücklich darauf hin, dass CSV, Excel, kopierte Tabellen, PDFs, Bilder oder Laborberichte durch eine externe KI in dasselbe Import-V1-JSON überführt werden können.
  - Verifiziert wurde die Änderung durch `npm run build`, `python -m pytest apps/backend/tests/test_import_prompt.py` und eine Browserprüfung der Import-Tabs.

### [2026-04-25] update | Übergang von KI-Chat zu KI-Ergebnis erklärt
- Anlass oder Quelle: Nutzerfeedback, dass der Zusammenhang zwischen `KI-Chat` und dem anschließenden Einfügen des Ergebnisses im JSON-Tab nicht ausreichend verständlich war
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - keine fachliche Wissensseite, nur Log-Eintrag
- Kern der inhaltlichen Anpassung:
  - Der bisherige Tab `JSON` heißt sichtbar nun `KI-Ergebnis / JSON`, damit klarer ist, dass dort auch das Ergebnis des externen KI-Chats eingefügt wird.
  - Der KI-Chat-Tab erklärt nun ausdrücklich, dass dort nur der Prompt vorbereitet wird und das Ergebnis anschließend im Tab `KI-Ergebnis / JSON` in die Anwendung übernommen wird.
  - Der Einfügebereich zeigt einen Hinweis `Weiter nach dem KI-Chat`, der den Ablauf von Chat-Antwort, optionalem Dokumentupload und Importanlage zusammenfasst.
  - Verifiziert wurde die Änderung durch `npm run build`, `python -m pytest apps/backend/tests/test_import_prompt.py` und eine Browserprüfung der Import-Tabs.

### [2026-04-25] update | Log auf Monatsblöcke und absteigende Chronologie umgestellt
- Anlass oder Quelle: Nutzerauftrag zur Umstellung der Log-Konvention innerhalb der KI-Wissensbasis
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../03 Betrieb/Log]]
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
- Kern der inhaltlichen Anpassung:
  - Das Log ist nun in Monatsblöcke gegliedert und innerhalb der Monate chronologisch absteigend sortiert.
  - Neue Einträge werden künftig im neuesten Monatsblock oben ergänzt.
  - Die Regel- und Prozessdokumentation wurde auf diese Schreibkonvention angepasst.

### [2026-04-25] update | Importversuch-Verwerfen und Parameter-Anmerkungen getrennt
- Anlass oder Quelle: Nutzerfeedback zur Formulierung des Verwerfen-Dialogs und zu vermischten KI-Beschreibungen bei unbekannten Parametern
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Der Verwerfen-Dialog fragt nun `Was soll mit dem Importversuch passieren?`.
  - Der Nutzer kann einen noch nicht übernommenen Importversuch dokumentiert verwerfen oder komplett entfernen; beim kompletten Entfernen werden Importversuch und Prüfpunkte gelöscht, das verknüpfte Dokument kann optional mit entfernt werden.
  - Der KI-Prompt trennt bei `parameterVorschlaege` nun ausdrücklich die allgemeine, berichtsunabhängige `beschreibungKurz` von berichtsbezogenen Anmerkungen in `begruendungAusDokument`.
  - Die Prüftabelle zeigt Parameter-Vorschläge entsprechend als `Fachbeschreibung` und `Anmerkung aus dem Bericht`.
  - Verifiziert wurde die Änderung durch die gezielten Import-Backendtests, `npm run build` und eine Browserprüfung des Verwerfen-Dialogs im Tab `Import prüfen`.

### [2026-04-25] update | Beschreibungsvorgabe für Parameter-Vorschläge präzisiert
- Anlass oder Quelle: Nutzerpräzisierung zur Qualität von KI-generierten Beschreibungen für unbekannte Parameter
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Der Import-Prompt fordert nun, dass `beschreibungKurz` beschreibt, was der Parameter fachlich misst oder wofür er typischerweise als Laborparameter steht.
  - Der Prompt schließt Diagnosen und Bewertungen des konkreten Messwerts ausdrücklich aus.
  - Ziel ist, generische Kontextbeschreibungen wie reine Abschnitts- oder Methodennennung zu vermeiden und trotzdem keine medizinische Interpretation des Befunds zu erzeugen.

### [2026-04-25] update | KI-Chat-Tab nach Arbeitsablauf sortiert
- Anlass oder Quelle: Nutzerfeedback, dass die Reihenfolge der Elemente im KI-Chat-Import noch nicht optimal war
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - keine fachliche Wissensseite, nur Log-Eintrag
- Kern der inhaltlichen Anpassung:
  - Der KI-Chat-Tab ist nun nach dem Arbeitsablauf gegliedert: `1. Prompt vorbereiten`, `2. Prompt im KI-Chat verwenden`, `3. Ergebnis übernehmen`.
  - Der Hilfebereich `So funktioniert dieser Weg` steht darunter und ist initial eingeklappt.
  - Die Schritte 2 und 3 erscheinen erst nach erzeugtem Prompt, damit der Einstieg nicht mit Folgeaktionen überladen ist.
  - Verifiziert wurde die Änderung durch `npm run build`, die gezielten Import-Backendtests und eine Browserprüfung des KI-Chat-Tabs.

### [2026-04-25] update | Übernahmeaktionen im Import sichtbarer gemacht
- Anlass oder Quelle: Nutzerfeedback, dass der eingeklappte Bereich `Prüfhinweise und Übernahme` die Abschlussknöpfe schwer auffindbar macht
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - keine fachliche Wissensseite, nur Log-Eintrag
- Kern der inhaltlichen Anpassung:
  - Der Übernahmebereich ist bei Importen in Prüfung nun standardmäßig offen.
  - Die Aktionen `Import übernehmen` und `Import verwerfen` stehen direkt oben im Abschnitt.
  - `Import übernehmen` bleibt sichtbar, wird aber deaktiviert, solange Fehler, offene Zuordnungen oder unbestätigte Prüfhinweise bestehen.
  - Verifiziert wurde die Änderung durch `npm run build`, die gezielten Import-Backendtests und eine Browserprüfung des Tabs `Import prüfen`.

### [2026-04-25] update | KI-Ergebnis-Import mit Dokumentzuordnung ergänzt
- Anlass oder Quelle: Nutzerfeedback, dass nach der externen KI-Analyse eine klare Möglichkeit fehlt, den Ergebnistext einzufügen und das analysierte Dokument dem Import zuzuordnen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Der JSON-Startweg heißt nun `KI-Ergebnis oder JSON einfügen` und beschreibt ausdrücklich, dass komplette KI-Antworten mit `json`-Codeblock eingefügt werden können.
  - Im selben Formular kann optional die Dokumentdatei hochgeladen werden, die der externe KI-Chat analysiert hat.
  - Das Backend stellt dafür `POST /api/importe/json-entwurf` als Multipart-Endpunkt bereit, speichert die Datei als `importquelle` und verknüpft sie direkt mit dem Importvorgang.
  - Wenn kein Dokumentname angegeben wird, bildet das Backend einen Namen aus Entnahmedatum, Person, Labor und `Laborbericht`; ein manueller Dokumentname bleibt möglich.
  - Verifiziert wurde die Änderung durch 16 gezielte Import-Backendtests, `npm run build` und eine Browserprüfung des JSON-/Dokument-Formulars.

### [2026-04-25] update | KI-Prompt mit Extraktionsüberblick und JSON-Codeblock ergänzt
- Anlass oder Quelle: Nutzerwunsch, dass der externe KI-Chat nicht nur JSON ausgibt, sondern dem Anwender kurz zusammenfasst, wie erfolgreich die Extraktion war und wo Probleme lagen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Der Prompt weist die externe KI nun an, zuerst einen kurzen Überblick mit Anzahl erkannter Messwerte, unsicheren oder unlesbaren Angaben, nicht eindeutig gematchten Parametern und Widersprüchen auszugeben.
  - Das eigentliche Import-V1-JSON soll danach in genau einem Markdown-Codeblock mit Sprache `json` stehen, damit externe Chat-Oberflächen eine Kopierbox anbieten können.
  - Der JSON-Import akzeptiert neben reinem JSON nun auch komplette KI-Antworten und extrahiert daraus den `json`-Codeblock oder ersatzweise das erste JSON-Objekt.
  - Der Prompt-Kopierbutton nutzt nun einen Fallback über ein temporäres Textfeld; wenn der Browser Kopieren weiterhin blockiert, wird der Prompt angezeigt und markiert. Das readonly-Promptfeld wirkt nicht mehr wie ein gesperrtes Eingabefeld.
  - Verifiziert wurde die Änderung durch die gezielten Import-Backendtests, `npm run build` und eine Browserprüfung des Prompt-Kopierverhaltens.

### [2026-04-25] update | Import-Prüfhinweise an aktuelle Parameterzuordnung angepasst
- Anlass oder Quelle: Nutzerfeedback, dass fehlende Parameterzuordnungen nicht mehr als Warnung erscheinen sollten, wenn bereits `Neuen Parameter anlegen` ausgewählt ist
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Die Prüfansicht filtert gespeicherte Hinweise zu fehlender Parameterzuordnung aus, sobald im aktuellen Mapping ein vorhandener Parameter oder `Neuen Parameter anlegen` gewählt ist.
  - In der sichtbaren UI heißen diese Einträge nun `Prüfhinweise` statt `Warnungen`, damit echte Fehler, fachliche Hinweise und normale Neuanlageentscheidungen klarer getrennt wirken.
  - Die technische Import-UUID wird in der Prüfansicht nicht mehr als `Historieneintrag` angezeigt; die Löschprüfung bleibt weiterhin erreichbar.
  - Verifiziert wurde die Änderung durch `npm run build`, die gezielten Import-Backendtests und eine Browserprüfung im Tab `Import prüfen`.

### [2026-04-25] update | Parameter-Vorschläge im KI-JSON-Import ergänzt
- Anlass oder Quelle: Nutzerfrage, ob der KI-Prompt bei nicht vorhandenen Parametern bereits eine erste Beschreibung recherchieren oder ableiten und im Import mitliefern kann
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - `import-v1.schema.json` erlaubt nun optionale `parameterVorschlaege` mit Anzeigename, Werttyp, Standardeinheit, Kurzbeschreibung, Alias-Hinweisen, Begründung aus dem Dokument, Unsicherheitsflag und Messwert-Indizes.
  - Der KI-Prompt weist die externe KI an, solche Vorschläge nur bei nicht eindeutig gematchten Parametern und nur mit belastbarer, kurzer Beschreibung zu liefern.
  - Die Backend-Prüfansicht gibt Parameter-Vorschläge pro Messwert zurück; bei bestätigter Neuanlage werden Anzeigename, Beschreibung, Werttyp und Einheit aus dem Vorschlag genutzt.
  - Die Frontend-Prüftabelle zeigt diese Vorschläge direkt in `Messwerte klären` an und lässt die eigentliche Stammdatenanlage weiterhin nur über die bewusste Auswahl `Neuen Parameter anlegen` zu.
  - Verifiziert wurde die Änderung durch `python -m pytest apps/backend/tests/test_import_prompt.py apps/backend/tests/test_parameter_alias_import_mapping.py apps/backend/tests/test_import_group_suggestions.py apps/backend/tests/test_import_parameter_normalization_warning.py`, `npm run build` und eine Browserprüfung der Importseite.

### [2026-04-25] update | Importoberfläche nach Startwegen und Prüfung neu strukturiert
- Anlass oder Quelle: Nutzerfeedback zur Verständlichkeit der Import-Tabs, zum Begriff `Entwurf`, zur Prüfansicht und zu mehreren offenen Importen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Die Importseite trennt neue Importwege nun sichtbar von der Weiterbearbeitung: `KI-Chat`, `CSV/Excel` und `JSON` starten Importe; `Import prüfen` und `Historie` bearbeiten bestehende Importläufe.
  - `Import prüfen` ersetzt in der UI den abstrakteren Begriff `Entwurf`, zeigt den aktuell ausgewählten Import und öffnet nur die Prüfabschnitte, die fachlich als Nächstes relevant sind.
  - Offene Importe werden im Tab `Import prüfen` per Badge gezählt; auf Start-Tabs erscheint bei offenen Importen ein direkter Hinweislink zur Prüfung.
  - Die Historie ist nur noch im eigenen Tab sichtbar; ein Klick auf einen Historieneintrag setzt diesen Import als aktuellen Import und wechselt zur Prüfung.
  - Verifiziert wurde die Änderung durch `npm run build`, `python -m pytest apps/backend/tests/test_import_prompt.py apps/backend/tests/test_parameter_alias_import_mapping.py apps/backend/tests/test_import_group_suggestions.py apps/backend/tests/test_import_parameter_normalization_warning.py` und eine Browserprüfung der Importseite.

### [2026-04-24] update | Importseite nach Wegen getrennt und Parameter-Neuanlage ergänzt
- Anlass oder Quelle: Nutzerfeedback zur langen Importseite und zur fehlenden Möglichkeit, im Messwert-Mapping echte neue Parameter anzulegen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Die Importoberfläche trennt die Einstiegswege nun über Tabs für `KI-Prompt`, `CSV/Excel` und `JSON direkt`.
  - Die Prüfansicht ist in einklappbare Schritte gegliedert, damit Befundprüfung, Messwertklärung, Übernahme und Gruppenentscheidungen nicht mehr als eine durchgehende lange Seite wirken.
  - Messwerte ohne passenden Parametermatch können im Mapping jetzt auf `Neuen Parameter anlegen` gesetzt werden; eindeutige Nicht-Treffer werden entsprechend vorbelegt.
  - Das Backend übernimmt diese Entscheidung über den bestehenden Import-Übernahme-Endpunkt und legt den Parameter mit Originalname, Werttyp und Berichtseinheit als Standardeinheit an.
  - Verifiziert wurde die Änderung durch `python -m pytest apps/backend/tests/test_parameter_alias_import_mapping.py apps/backend/tests/test_import_group_suggestions.py apps/backend/tests/test_import_parameter_normalization_warning.py` und einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-24] update | Prompt-Weg und geführter JSON-Importdialog umgesetzt
- Anlass oder Quelle: Nutzerauftrag zur Umsetzung des externen KI-Chat-Wegs mit Prompt-Erzeugung und anschließendem JSON-Importdialog
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Kern der inhaltlichen Anpassung:
  - Das Backend stellt nun `POST /api/importe/prompt` bereit und erzeugt einen Prompt mit Personenkontext nur aus `id` und `anzeigename`.
  - Der Prompt enthält Datei-, Schema- und JSON-Ausgabeinstruktionen sowie bekannte Labore, Parameter mit Aliasen, Einheiten mit Aliasen und Gruppen als Matching-Kontext.
  - Die Importoberfläche gliedert den KI-JSON-Import als geführten Ablauf mit Prompt-Erzeugung, JSON-Einfügen, Befundprüfung, Messwertklärung, Warnungsbestätigung, Übernahme, Gruppenentscheidung und Abschluss.
  - Die vorhandene Importprüfung bleibt maßgeblich; Schemafehler, Prüfpunkte, Dubletten, Parameter-Mapping, Alias-Übernahme und Gruppenvorschläge werden weiter über die bestehende Importlogik verarbeitet.
  - Verifiziert wurde die Änderung durch `python -m pytest apps/backend/tests/test_import_prompt.py apps/backend/tests/test_parameter_alias_import_mapping.py apps/backend/tests/test_import_group_suggestions.py apps/backend/tests/test_import_parameter_normalization_warning.py` und einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-24] update | Dreiwege-Zielbild für dokumentbasierten Import und KI-Prompt dokumentiert
- Anlass oder Quelle: Nutzerbeschreibung zum geplanten Import über OCR, angebundene KI-Schnittstelle und externen KI-Chat-Prompt
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-24 Dreiwege-Importkonzept und KI-Prompt]]
  - [[../02 Wissen/Begriffe und Konzepte/Zielbild Dreiwege-Import und KI-Extraktion]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Der geplante Importausbau wurde als Dreiwege-Modell beschrieben: Dokument-Upload mit OCR, Dokument-Upload mit angebundener KI-Schnittstelle und Prompt-Erzeugung für externe KI-Chats.
  - Als bevorzugtes Zielartefakt wurde JSON nach `import-v1.schema.json` festgehalten, weil es bereits in die vorhandene Importentwurfs- und Prüfansicht passt.
  - Die Konzeptseite dokumentiert optionalen Stammdatenkontext, konservative Matching-Regeln, Wert- und Referenzregeln, eine Prompt-Vorlage und offene Entscheidungen für spätere Umsetzungsschritte.

### [2026-04-24] update | Lokale Suche und Ausgewählt-Ansicht für große Filter-Checklisten ergänzt
- Anlass oder Quelle: Nutzerwunsch, die Parameterauswahl in der Auswertung bei großen Mengen gezielt nach Begriff zu filtern und optional nur die bereits ausgewählten Einträge anzuzeigen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die gemeinsame Mehrfachauswahl-Komponente unterstützt jetzt optional eine lokale Suche mit Löschfunktion sowie eine Ansicht `Nur ausgewählte anzeigen`.
  - Die lokale Suche filtert nur die Anzeige und lässt die bestehende Auswahl unverändert, sodass nacheinander verschiedene Suchbegriffe abgearbeitet werden können.
  - Bei aktiver lokaler Filterung beziehen sich `Alle auswählen` und `Alle abwählen` bewusst auf die aktuell sichtbare Teilmenge statt auf die Gesamtliste.
  - Auf der Auswertungsseite ist dieses Muster jetzt für den eingeklappten Parameterfilter aktiv.
  - Verifiziert wurde die Änderung durch einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-24] update | Parameter-Dublettenprüfung um wählbare Prüfschärfe erweitert
- Anlass oder Quelle: Nutzerwunsch, weichere Dublettenvorschläge wie `Progesteron` versus `Progesteron im Serum` gezielt zuschaltbar zu machen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung]]
- Kern der inhaltlichen Anpassung:
  - Die Parameteroberfläche bietet im Dubletten-Bereich jetzt die drei Prüfschärfen `Sicher`, `Ausgewogen` und `Großzügig`.
  - Backend und API werten diese Stufe bei der Dublettenprüfung aus, sodass die Kandidatenmenge nicht nur optisch gefiltert, sondern fachlich anders berechnet wird.
  - Die bisherige mittlere Logik bleibt als Standard unter `Ausgewogen` erhalten; `Großzügig` zeigt zusätzlich weichere Containment-Fälle ohne klaren Kontextkonflikt.
  - Verifiziert wurde dies durch `pytest apps/backend/tests/test_parameter_duplicate_merge.py`, einen erfolgreichen Frontend-Build mit `npm run build` sowie eine Live-Prüfung gegen den lokalen API-Endpunkt, bei der `Progesteron` und `Progesteron im Serum` nur unter `grosszuegig` als Vorschlag erschienen.

### [2026-04-23] update | Workspace-Run-Aktion für den lokalen Projektstart ergänzt
- Anlass oder Quelle: Nutzerwunsch, den bestehenden Start von Backend und Frontend direkt als Run-Aktion in der Workspace-Umgebung verfügbar zu machen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
- Kern der inhaltlichen Anpassung:
  - Unter `.vscode/launch.json` wurde eine Run-Aktion `Labordaten starten` ergänzt, die `scripts/start-dev.ps1 -OpenFrontend` ausführt.
  - Unter `.vscode/tasks.json` gibt es zusätzlich eine gleichnamige Task, damit derselbe Startweg auch über die Task-Ausführung verfügbar ist.
  - Die Prozessdokumentation hält diesen Workspace-Start jetzt ausdrücklich neben Skriptaufruf und Desktop-Verknüpfung fest.

### [2026-04-23] update | Kompakte Datumsbereich-Komponente als Standard für Filterranges verankert
- Anlass oder Quelle: Nutzerwunsch, die neue Datumsdarstellung nicht nur in der Auswertung zu belassen, sondern projektweit als Standard für `Datum von`- und `Datum bis`-Filter zu verankern
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Für Filterbereiche mit `Datum von` und `Datum bis` gibt es nun eine gemeinsame Frontend-Komponente mit linksbündigen kompakten Blöcken und direkt integrierten `-1 J`- und `+1 J`-Schritten.
  - Dieses Muster ist jetzt auf Befunde, Messwerte, Auswertung und Berichte vereinheitlicht, sodass Optik, Umbruchverhalten und Bedienlogik nicht mehr pro Seite auseinanderlaufen.
  - Als generische Entwicklungsregel ist festgehalten, dass vergleichbare Datums-Filterranges künftig dieses gemeinsame Muster und dieselbe wiederverwendbare Komponente verwenden sollen.
  - Verifiziert wurde die Änderung durch einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-23] update | Planung als eigene Löschentität ergänzt und in der Oberfläche angebunden
- Anlass oder Quelle: Nutzerhinweis, dass im Planungsbereich keine Löschmöglichkeit sichtbar war
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
- Kern der inhaltlichen Anpassung:
  - Die zentrale Löschlogik deckt nun zusätzlich `planung_zyklisch` und `planung_einmalig` als eigene direkt löschbare Entitäten ab.
  - Die Planungsseite bindet dafür dieselbe Zwei-Schritt-Löschprüfung wie die übrigen angebundenen Arbeitsbereiche an und zeigt damit Vorschau, Hinweise und Ausführung sichtbar in der Oberfläche.
  - Die neue Backend-Logik wurde durch zusätzliche Regressionstests in `tests/test_delete_logic_api.py` abgesichert.
  - Verifiziert wurde der Gesamtstand durch `python -m pytest apps/backend/tests/test_delete_logic_api.py` und einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-23] update | Kompakte Mehrfachsortierung für die Messwertliste umgesetzt und als Regel zurückgeführt
- Anlass oder Quelle: Nutzerauftrag zur generischen, platzsparenden Sortiersteuerung auf der Messwertseite
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die Messwertseite bietet nun links eine kompakte Sortierzusammenfassung mit aufklappbarer Mehrfachsortierung statt einer dauerhaft breiten Sortierleiste.
  - Technisch wurde dafür ein wiederverwendbares Frontend-Muster mit Search-Params und generischer Sortierkomponente eingeführt sowie die Backend-Liste um passende serverseitige Mehrfachsortierung erweitert.
  - Als generische Entwicklungsregel wurde festgehalten, dass vergleichbare Arbeitslisten dieses kompakte Sortiermuster mit wenigen Standardsortierungen und begrenzten konfigurierbaren Ebenen bevorzugen sollen.

### [2026-04-23] update | Befundseite um strukturierte Filter ergänzt
- Anlass oder Quelle: Nutzerhinweis, dass die Befundseite bisher nur eine Suche, aber keinen echten Filter bietet
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
- Kern der inhaltlichen Anpassung:
  - Die Befundseite besitzt jetzt ein eigenes Filter-Panel mit strukturierter Auswahl fuer Person, Labor, Zeitraum, Dokumentstatus, Quelle und Dublettenwarnung.
  - Die gefilterte Befundliste und die Detailauswahl laufen jetzt konsistent zusammen, sodass bei aktiven Filtern nur noch passende Befunde in Auswahl und Detailansicht sichtbar bleiben.
  - Die Freitextsuche bleibt erhalten und wirkt jetzt gemeinsam mit den strukturierten Filtern.
  - Verifiziert wurde die Aenderung durch einen erfolgreichen Frontend-Build mit `npm run build`.

### [2026-04-22] update | Laufzeitartefakte bereinigt und kanonischen Backend-Startkontext festgehalten
- Anlass oder Quelle: Nutzerfrage zu verbleibenden Laufzeitartefakten, Gitignore und dauerhaft nuetzlichen Betriebsregeln
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die Betriebsdokumentation haelt nun explizit fest, dass relative Backend-Defaults an den tatsaechlichen Startordner gebunden sind und der kanonische lokale Start fuer dieses Projekt aus `apps/backend` erfolgen soll.
  - Als generische Entwicklungsregel ist jetzt dokumentiert, dass lokale Laufzeitdaten, Sperrdateien, Dokumentablagen und temporaere Analyseartefakte nicht versioniert werden sollen.
  - Im Workspace wurden Gitignore-Regeln fuer Dokumentablagen, Sperrdatei und `tmp_*`-Artefakte ergaenzt.
  - Eine noch auf das Repository-Wurzelverzeichnis zeigende Dokumentreferenz wurde auf die kanonische Dokumentablage unter `apps/backend/documents` konsolidiert; zusaetzliche unreferenzierte Duplikate und temporaere Analyseordner wurden bereinigt.

### [2026-04-22] update | Wissensbasis auf Projektpraefix `KI-Wissen-Labordaten` umbenannt
- Anlass oder Quelle: Nutzerwunsch, die projektbezogene Wissensbasis in Obsidian eindeutig ueber einen festen Projektpraefix unterscheidbar zu machen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../../README]]
  - [[../../docs/README]]
  - [[README]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Projektstruktur, Module und Schnittstellen]]
  - [[../02 Wissen/Begriffe und Konzepte/Systembild und Paketuebersicht der Anwendung]]
- Kern der inhaltlichen Anpassung:
  - Der Wissensbasis-Ordner wurde von der bisherigen generischen Bezeichnung auf `KI-Wissen-Labordaten/` umgestellt.
  - Projektdokumentation und Agent-Hinweise verwenden nun denselben Namen, damit Einstiegspfade und Pflegehinweise wieder konsistent sind.
  - Der Backend-Default fuer den Wissensordner zeigt jetzt relativ aus `apps/backend` korrekt auf den Wissensbasis-Ordner im Repository-Wurzelverzeichnis.
  - Die lokalen Runtime-Einstellungen wurden ebenfalls auf den neuen absoluten Wissenspfad nachgezogen, damit die Anwendung die Wissensbasis weiterhin direkt findet.

### [2026-04-22] update | Import warnt nun bei zugeordneten, aber noch nicht normierbaren Parameter-Einheiten
- Anlass oder Quelle: Nutzerfrage zur fachlichen Grenze zwischen kanonischem Parameter-Mapping und fehlender Umrechnungslogik bei mehreren Einheiten
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Die Importpruefung erzeugt jetzt eine eigene Warnung, wenn ein numerischer Messwert bereits einem Parameter zugeordnet ist, aber aus seiner Berichtseinheit noch nicht sauber in die fuehrende Normeinheit dieses Parameters ueberfuehrt werden kann.
  - Dadurch bleibt der Fall sichtbar, dass fachgleiches Mapping bereits plausibel ist, die parameterbezogene Umrechnungsregel aber noch fehlt.
  - Die Uebernahme bleibt weiterhin moeglich, erfordert in diesem Fall aber die bewusste Bestaetigung der Warnung statt einer stillen Freigabe.
  - Verifiziert wurde dies durch neue Backend-Tests fuer Warnfall und Nicht-Warnfall sowie durch erfolgreiche Regressionen in `tests/test_import_parameter_normalization_warning.py`, `tests/test_parameter_conversion_rules.py`, `tests/test_parameter_standard_unit.py` und `tests/test_parameter_alias_import_mapping.py`.

### [2026-04-22] update | Parameter-Dublettensuche um unterdrueckbare Fehlvorschlaege und Messwert-Anzahl erweitert
- Anlass oder Quelle: Nutzerwunsch, offensichtliche Nicht-Dubletten dauerhaft aus den Vorschlaegen herauszuhalten, ohne die Entscheidung unsichtbar zu machen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung]]
- Kern der inhaltlichen Anpassung:
  - Die Parameter-Dublettensuche erlaubt nun eine dauerhafte, aber ruecknehmbare Markierung `Kein Dublett` pro Parameterpaar.
  - Unterdrueckte Paare werden aus kuenftigen Vorschlaegen herausgefiltert und im Dubletten-Bereich fuer den ausgewaehlten Parameter mit Aufhebemoeglichkeit sichtbar angezeigt.
  - Das Frontend leert beim Oeffnen des Dubletten-Panels bewusst alte Treffer, damit Vorschlaege nicht wie automatisch neu berechnet wirken.
  - Im Parameter-Detailbereich wird zusaetzlich die berechnete Anzahl vorhandener Messwerte zum ausgewaehlten Parameter angezeigt.
  - Verifiziert wurde dies durch `tests/test_parameter_duplicate_merge.py`, `tests/test_delete_logic_api.py`, einen erfolgreichen Frontend-Build und eine eingespielte Alembic-Migration auf die lokale Dev-Datenbank.

### [2026-04-22] update | Diagnoseleitlinie fuer Dev-Betrieb staerker als generische Vorgabe eingeordnet
- Anlass oder Quelle: Nutzerpraezisierung, dass die Annahme eines laufenden Dev-Modus vor allem als generische Entwicklungsregel und weniger als hervorgehobene Startseitenbesonderheit verstanden werden soll
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die Prozessseite zum lokalen Start enthaelt dazu nun nur noch den knappen Betriebsmodus mit Reload- beziehungsweise Dev-Server-Hinweis.
  - Die eigentliche Diagnoseleitlinie wurde klarer in den generischen Entwicklungsvorgaben verankert.
  - Damit ist fuer kuenftige Analysen ausdruecklicher festgehalten, dass im normalen Dev-Betrieb ein fehlender Reload nicht reflexhaft als erste Ursache angenommen werden soll.

### [2026-04-22] update | Lokaler Entwicklungsbetrieb als Dev-Modus und Diagnoseleitlinie dokumentiert
- Anlass oder Quelle: Nutzerhinweis, dass Frontend und Backend im Projektalltag grundsaetzlich im Dev-Modus laufen und Neustart- oder Reload-Vermutungen deshalb nicht standardmaessig im Vordergrund stehen sollen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Die Startdokumentation beschreibt nun ausdruecklich, dass das Backend lokal mit Reload und das Frontend ueber den Vite-Dev-Server betrieben wird.
  - Daraus wurde fuer den Projektalltag festgehalten, dass ein veralteter Build oder fehlender Neustart nicht die erste Standardvermutung bei Analysen und Rueckmeldungen sein soll.
  - Manuelles Neuladen oder Neustarten bleibt als spaetere Sicherheitsmassnahme moeglich, wenn konkrete Symptome oder eine festgefahrene Analyse dafuer sprechen.

### [2026-04-22] update | Parameter-Dublettensuche nutzt nun auch Messwert-Referenzbereiche fuer Referenzkontexte
- Anlass oder Quelle: Nachverifikation am echten Datenbestand zeigte, dass die betroffenen Testosteron-Parameter keine gepflegten Zielbereiche, aber identische Messwert-Referenzbereiche besitzen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung]]
- Kern der inhaltlichen Anpassung:
  - Die Dublettensuche wertet bei weicheren Namensvarianten nun nicht nur aktive Zielbereiche, sondern auch identische Messwert-Referenzbereiche als Referenzkontext aus.
  - Dadurch wird der reale Fall `Gesamt-Testosteron` versus `Gesamt-Testosteron im Serum` jetzt auch dann vorgeschlagen, wenn der gleiche Referenzbereich nur an vorhandenen Messwerten und nicht als Zielbereichsstammsatz vorliegt.
  - Die Zusatzlogik wurde so korrigiert, dass aeltere interne Schluessel ohne Token-Trennzeichen den Containment-Fall nicht versehentlich blockieren.
  - Verifiziert wurde dies sowohl durch den erweiterten Backend-Testlauf `5 passed` als auch direkt gegen den aktuellen Workspace-Datenbestand, in dem das Paar nun mit `0.96` Aehnlichkeit vorgeschlagen wird.

### [2026-04-22] update | Parameter-Dublettensuche um Zielbereichsabgleich fuer weiche Namensvarianten erweitert
- Anlass oder Quelle: Nutzerfrage zur ausbleibenden Dublettenerkennung zwischen `Gesamt-Testosteron` und `Gesamt-Testosteron im Serum`
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung]]
- Kern der inhaltlichen Anpassung:
  - Die Parameter-Dublettensuche bewertet nun aktive Zielbereiche als zusaetzlichen Kontextfaktor fuer weichere Namensvarianten.
  - Wenn ein Parametername vollstaendig im anderen enthalten ist und die aktiven Zielbereiche exakt uebereinstimmen, wird jetzt ein Dublettenvorschlag erzeugt.
  - Wenn bei solchen weicheren Namens-Treffern die aktiven Zielbereiche klar abweichen, wird der Vorschlag bewusst unterdrueckt.
  - Die Grenze bleibt sichtbar: `Labor` ist dafuer weiterhin kein Kriterium, weil der Parameterstammsatz aktuell keine Laborbindung traegt.
  - Die Aenderung wurde durch Backend-Tests fuer positiven und negativen Zielbereichsfall sowie den bestehenden Merge-Test verifiziert; `tests/test_parameter_duplicate_merge.py` lief erfolgreich mit `4 passed`.

### [2026-04-22] update | Linke Hauptnavigation als schmaler Desktop-Rail einklappbar gemacht
- Anlass oder Quelle: Nutzerwunsch nach mehr nutzbarer Flaeche fuer den Hauptarbeitsbereich bei erhaltener linker Menueleiste
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
  - [[../02 Wissen/Begriffe und Konzepte/Geraeteprofile und mobile Bedienbarkeit]]
- Kern der inhaltlichen Anpassung:
  - Im Frontend kann die linke Hauptnavigation jetzt auf Desktop in einen schmalen Rail-Zustand eingeklappt und wieder ausgeklappt werden.
  - Der Zustand wird lokal im Browser gemerkt, damit die bevorzugte Flaechenaufteilung fuer den jeweiligen Arbeitsplatz erhalten bleibt.
  - Im eingeklappten Zustand bleiben Umschalter und Navigationsziele ueber kurze Labels und Tooltips weiter schnell erreichbar; auf kleineren Breiten bleibt die vollstaendige Navigation bewusst sichtbar.
  - Der neue Shell-Zuschnitt wurde durch einen erfolgreichen Frontend-Build verifiziert.

### [2026-04-22] update | PowerShell-7-Standard fuer lokalen Windows-Workflow verankert
- Anlass oder Quelle: Nutzerauftrag nach Analyse wiederkehrender UTF-8- und Codierungsprobleme im lokalen Windows-Workflow
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Der lokale Windows-Workflow verweist nun ausdruecklich auf PowerShell 7 (`pwsh`) als bevorzugten Standard fuer Start und Textarbeit im Repository.
  - Als generische Entwicklungsvorgabe wurde festgehalten, dass Windows PowerShell 5.1 bei UTF-8-lastigen Dateien wiederholt Fehlinterpretationen verursachen kann und deshalb moeglichst nicht der Standard fuer Repo-Arbeit sein sollte.
  - Die projektbezogene Startdokumentation beschreibt zusaetzlich, dass das Startskript bevorzugt `pwsh` nutzt und nur noch als Rueckfall auf Windows PowerShell 5.1 ausweicht.

### [2026-04-22] update | Generische UI-Regel fuer einklappbare Filterbereiche ergaenzt
- Anlass oder Quelle: Nutzerfeedback zur Messwertseite und zur einheitlichen Gestaltung groesserer Filterbloecke
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Als wiederverwendbare UI-Regel wurde festgehalten, dass groessere Filterbloecke dieselbe Auf- und Zuklapplogik wie andere einklappbare Arbeitsbereiche verwenden sollen.
  - Zugehoerige Bereichsaktionen wie `Alle auswaehlen` und `Alle abwaehlen` sollen dabei nicht ausserhalb eines eingeklappten Blocks sichtbar bleiben.
  - Kleine, kompakte Eingaben wie einzelne Datumsfelder wurden bewusst von dieser Regel ausgenommen.

### [2026-04-22] update | Zentrale Loeschlogik auf weitere Stammdaten und Fachobjekte erweitert
- Anlass oder Quelle: Fortsetzung der gleichen Fachentscheidung zur standardisierten Loeschmatrix
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
- Kern der inhaltlichen Anpassung:
  - Die zentrale Loeschpruefung und Ausfuehrung deckt nun zusaetzlich `labor`, `laborparameter`, `parameter_gruppe`, `zielbereich` und `parameter_umrechnungsregel` ab.
  - Fuer `laborparameter` wird zwischen unbenutzten, kaskadierbar loeschbaren Pflegestrukturen und verwendeten Parametern mit Deaktivierungsempfehlung unterschieden.
  - Fuer `labor` und `parameter_umrechnungsregel` wurde die Blockade bei historischer Nutzung mit Deaktivierungsersatz umgesetzt; `parameter_gruppe` und `zielbereich` loeschen ihre klaren Kindobjekte mit.
  - Die erweiterten Loeschpfade wurden durch weitere API-Regressionstests abgesichert; der gesamte Backend-Teststand lief danach erfolgreich mit `50 passed`.

### [2026-04-22] update | Zentrale Loeschlogik fuer erste Kernentitaeten umgesetzt und dokumentiert
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-22 Rueckmeldung Loeschlogik und Deaktivierungsregeln]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-22 Rueckmeldung Loeschlogik und Deaktivierungsregeln]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln]]
- Geaenderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Im Backend wurde eine zentrale Loeschpruefung mit getrennter Ausfuehrung fuer `person`, `befund`, `messwert`, `importvorgang` und `einheit` umgesetzt.
  - Die neue Logik unterscheidet zwischen `direkt`, `kaskade` und `blockiert`, kann bei blockierten Stammdaten `deaktivieren` empfehlen und repariert bei geloeschten Messwerten betroffene Planungen in derselben Transaktion.
  - Fuer `messwert` wird ein danach leerer `befund` standardmaessig mitgeloescht, waehrend verknuepfte Dokumente bewusst unveraendert bleiben.
  - Die Wissensbasis trennt dazu nun die projektspezifische Loeschmatrix von den generischen Regeln; zusaetzlich wurden eigene API-Regressionstests eingebaut und der gesamte Backend-Teststand erfolgreich mit `45 passed` verifiziert.

### [2026-04-22] update | Generische UI-Regeln fuer produktive Texte und reduzierte Shell ergaenzt
- Anlass oder Quelle: Nutzerfeedback zur verfeinerten Startseite und zur reduzierten linken Navigation
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Fuer UI-Texte wurde als wiederverwendbare Regel ergaenzt, dass Seitenkoepfe und Einleitungstexte am produktiven Einsatz der Anwendung ausgerichtet sein sollen statt an Entwicklungs- oder Einfuehrungslogik.
  - Zusaetzlich wurde festgehalten, dass kleine Vorspann-Labels ueber Hauptueberschriften nur bei echtem fachlichem Mehrwert bleiben sollten und dass persistente Shell-Bereiche wie eine linke Navigation keine zusaetzlichen Beschreibungstexte brauchen, wenn die Orientierung bereits klar ist.

### [2026-04-22] update | Generische UI-Regel fuer visuelle Startseiten und Versionsanzeige ergaenzt
- Anlass oder Quelle: Nutzerauftrag, die Startseite visuell aufzuwerten und die Versionsanzeige sinnvoll in die Shell einzubetten
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Fuer arbeitsorientierte Start- und Uebersichtsseiten wurde festgehalten, dass ruhige, hochwertige Bildmotive oder kleine Markenbilder sinnvoll sein koennen, solange arbeitsrelevante Kennzahlen, Warnlagen und Anschlussaktionen der eigentliche Fokus bleiben.
  - Zusaetzlich wurde als wiederverwendbare Leitlinie ergaenzt, dass Versionsnummern und aehnliche technische Metadaten dezent im Branding, in der Shell oder in Einstellungen erscheinen sollten statt als dominanter Hauptinhalt der Seite.

### [2026-04-22] update | Generische Regel fuer arbeitsorientierte Stammdatenseiten ergaenzt
- Anlass oder Quelle: Nutzerauftrag, den umgestellten Seitenaufbau von Parameter- und Gruppenseite als generische UI-Regel festzuhalten
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Kern der inhaltlichen Anpassung:
  - Fuer vergleichbare Stammdatenseiten wurde als generische Leitlinie festgehalten, dass links die filterbare Liste der fuehrenden Datensaetze und rechts der Detailbereich des ausgewaehlten Eintrags stehen soll.
  - Werkzeuge sollen als kompakte Leiste direkt unter dem Detailkopf liegen und nur bei Bedarf geoeffnet werden, statt als dauerhaft offene Zusatzspalten viel Raum zu verbrauchen.
  - Zugeordnete oder abhaengige Daten sollen unterhalb des Detailbereichs in einem eigenen Bereich erscheinen und bei breiteren Inhalten bevorzugt gestapelt und einklappbar dargestellt werden.

### [2026-04-22] update | Projektstatus und Log in der Wissenspflege klar getrennt
- Anlass oder Quelle: Nutzerentscheidung, `Aktueller Projektstatus` als Snapshot und `Log` als Chronik sauber zu trennen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
- Kern der inhaltlichen Anpassung:
  - Die Wissenspflege-Regeln beschreiben jetzt ausdruecklich, dass `Aktueller Projektstatus` eine verdichtete Zustandsuebersicht und kein Aenderungsprotokoll ist.
  - Das `Log` bleibt die chronologische, append-only gefuehrte Stelle fuer Verlauf, Verifikation und einzelne Umsetzungsschritte.
  - Die Statusseite wurde entsprechend auf kompakte Rubriken wie `Umgesetzt`, `Teilweise umgesetzt`, `Offen` und `Wichtige Grenzen` umgebaut.

### [2026-04-22] update | Importstrecke um dateibasierte Importe und Gruppenvorschlaege im Ist-Stand ergaenzt
- Anlass oder Quelle: Abschlusspruefung mit Rueckfuehrung des aktuellen Importfunktionsstands in die Wissensbasis
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Die Ist-Stand-Seite zur Importstrecke beschreibt jetzt ausdruecklich, dass neben JSON auch CSV- und Excel-Dateien in Importentwuerfe ueberfuehrt werden koennen.
  - Zusaetzlich wurde festgehalten, dass die Importstrecke Gruppenvorschlaege aus Importdaten ableiten, aehnliche vorhandene Gruppen anzeigen und diese nach der Uebernahme auf neue oder bestehende Gruppen anwenden kann.
  - Veraltete Aussagen, nach denen CSV- und Excel-Dateiimporte noch fehlen, wurden entsprechend korrigiert.

### [2026-04-22] update | Generische und projektspezifische Regeln zu Einheiten und Normeinheiten getrennt dokumentiert
- Anlass oder Quelle: Nutzerauftrag, die bisherigen Erkenntnisse sauber in generische Regeln und projektspezifisches Fachwissen fuer dieses Themenfeld aufzuteilen
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung]]
- Geaenderte Seiten:
  - [[Generische Entwicklungsvorgaben]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - In den generischen Entwicklungsvorgaben wurden neue wiederverwendbare Regeln zu Lesefeldern, Original- versus Vergleichsdaten, explizit gepflegten Zielauspraegungen, konsistenter Neuberechnung und der Trennung von Alias und fachlicher Transformation ergaenzt.
  - Fuer das Projekt `Labordaten` wurde zusaetzlich eine eigene Fachseite angelegt, die den aktuellen Zuschnitt fuer zentrale Einheitenstammdaten, Einheiten-Aliase, parameterbezogene Umrechnungsregeln und die fuehrende Normeinheit beschreibt.
  - Der Index verweist nun explizit auf diese Trennung zwischen allgemeinem Regelwissen und projektspezifischer Einheitenlogik.

### [2026-04-21] update | Generische Entwicklungsvorgaben als Projektregelbasis eingeordnet
- Anlass oder Quelle: Nutzerauftrag, die bisherige Sammlung fuer ein naechstes Projekt in generische Entwicklungsvorgaben fuer das aktuelle Projekt umzubauen
- Neu angelegte Seiten:
  - [[Generische Entwicklungsvorgaben]]
- Geaenderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Kern der inhaltlichen Anpassung:
  - Die bisherige Sammlung `erkenntnisse-fuer-naechstes-projekt` wurde fachlich in eine allgemeine Regelbasis fuer dieses Projekt ueberfuehrt.
  - Generische, wiederverwendbare Regeln sollen kuenftig dort gesammelt werden, waehrend einzelfallbezogene Entscheidungen weiter in thematisch passende Wissensseiten gehoeren.
  - Als neue generische Regel wurde zusaetzlich festgehalten, dass Seitenkopftexte in der Anwendung aus Anwendersicht formuliert sein sollen und die Nutzung einer Seite erklaeren statt die Implementierung zu kommentieren.

### [2026-04-21] update | Vertragstests zwischen Frontend und Backend als uebertragbare Erkenntnis ergaenzt
- Anlass oder Quelle: Nutzerauftrag, die neue Erkenntnis zu Frontend-Backend-Vertragstests fuer kuenftige Projekte festzuhalten
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Kern der inhaltlichen Anpassung:
  - Fuer technologisch getrennte Frontend- und Backend-Zuschnitte wurde festgehalten, dass reine Backend-Tests nicht genuegen, um den tatsaechlich produzierten Request-Vertrag abzusichern.
  - Als wiederverwendbare Empfehlung wurden dafuer Backend-Validierungstests, Frontend-nahe Payload- oder Formularlogiktests und einige API- oder Integrationspfade fuer kritische Eingaben benannt.
  - Die Erkenntnis wurde bewusst an die Voraussetzung geknuepft, dass das System ueber getrennte Eingabeformung, Serialisierung oder API-Payloads verfuegt und solche Vertragstests dort echten Nutzen stiften.

### [2026-04-21] update | Erweiterbare Fachkataloge gegenueber festen Codes und Freitext eingeordnet
- Anlass oder Quelle: Nutzerauftrag, die Kandidaten fuer pflegbare Kataloge konkreter einzuordnen und einen Vorschlag fuer `BasisdatenTyp` auszuarbeiten
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/V1 Ziel-Datenmodell]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Technisches Schema]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Projektstruktur, Module und Schnittstellen]]
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Kern der inhaltlichen Anpassung:
  - Die Wissensbasis unterscheidet jetzt ausdruecklich zwischen festen Codefeldern, pflegbaren Fachkatalogen und echtem Freitext.
  - Fuer den bisher freien Typ von Person-Basisdaten wurde ein konkreter Katalogvorschlag `BasisdatenTyp` mit fachlichen und technischen Feldern ausgearbeitet.
  - Das technische Schema und die Projektstruktur enthalten dafuer nun einen konkreten Tabellen- und API-Vorschlag, damit eine spaetere Katalogpflege nicht nur konzeptionell, sondern strukturell vorbereitet ist.

### [2026-04-21] update | Feste Auspraegungen fuer semantische Codefelder im Datenmodell geschaerft
- Anlass oder Quelle: Nutzerauftrag, die neue Erkenntnis zu Freitext versus festen Auspraegungen einzutragen und das Modell auf weitere Kandidaten zu pruefen
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/V1 Ziel-Datenmodell]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Technisches Schema]]
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Kern der inhaltlichen Anpassung:
  - Im Ziel-Datenmodell wurde `geschlecht_code` als kleine feste Referenzkategorie statt als Freitext geschaerft.
  - Zusaetzlich wurde eine Kandidatenliste fuer weitere Felder dokumentiert, die frueh auf Enums, feste Codewerte oder kontrollierte Kataloge geprueft werden sollten.
  - Im technischen Schema wurde die Enum-Pruefung fuer `person.geschlecht_code` konkretisiert und der offene Restpunkt auf weitere semantisch enge Codefelder verallgemeinert.
  - Die uebertragbare Erkenntnis wurde in `erkenntnisse-fuer-naechstes-projekt.md` als allgemeine Modellierungsregel fuer kuenftige Projekte festgehalten.

### [2026-04-21] update | Startseite als arbeitsorientierte Uebersicht im Screenplan verankert
- Anlass oder Quelle: Nutzerauftrag, die zuvor abgestimmte Startseitenlogik in die Wissensbasis zurueckzufuehren
- Neu angelegte Seiten:
  - keine
- Geaenderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows]]
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Kern der inhaltlichen Anpassung:
  - Im Screenplan wurde fuer den Bereich `Start` festgehalten, dass die Startseite vorrangig als arbeitsleitende Uebersicht dienen soll und nicht als Flaeche fuer technische Stack-Angaben.
  - Als prominente Inhalte wurden live relevante Informationen wie Datenbestand, offene Importlagen mit Warn- und Fehlerhinweisen sowie lokale Betriebszustaende geschaerft.
  - Die Erkenntnis wurde zusaetzlich als uebertragbare Produktanforderung fuer aehnliche Fachsysteme in die Datei `erkenntnisse-fuer-naechstes-projekt.md` aufgenommen.

### [2026-04-21] update | Uebertragbare Erkenntnis zur automatischen Schluesselvergabe ergaenzt
- Anlass oder Quelle: aktualisierte AGENTS-Anforderung zur Sammlung projektuebergreifend nuetzlicher Anforderungen
- Neu angelegte Seiten:
  - [[erkenntnisse-fuer-naechstes-projekt]]
- Geaenderte Seiten:
  - [[Log]]
- Kern der inhaltlichen Anpassung:
  - Die Anforderung, technische Schluessel in der Stammdatenpflege standardmaessig automatisch aus fachlichen Namen abzuleiten, wurde als uebertragbare Erkenntnis fuer aehnliche Systeme festgehalten.

### [2026-04-21] update | Automatische interne Parameterschluessel umgesetzt
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Automatische interne Parameterschluessel]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Automatische interne Parameterschluessel]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Automatische interne Parameterschluessel]]
- Geaenderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Neue Parameter erhalten ihren technischen Schluessel nun automatisch aus dem Anzeigenamen.
  - Die Parameteroberflaeche verlangt bei der Neuanlage keinen manuell gepflegten internen Schluessel mehr.
  - Gleiche Anzeigenamen werden ueber numerische Suffixe wie `_2` eindeutig gemacht.
  - Die neue Schluesselvergabe wurde durch einen eigenen Backend-Test und den erfolgreichen Frontend-Build verifiziert.

### [2026-04-21] update | Parameter-Dublettenpruefung und Zusammenfuehrung umgesetzt
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Parameter-Dubletten und Zusammenfuehrung]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Parameter-Dubletten und Zusammenfuehrung]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Parameter-Dubletten und Zusammenfuehrung]]
- Geaenderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Die Parameteroberflaeche kann nun vorhandene Parameter auf wahrscheinliche Dubletten pruefen und eine bestaetigte Zusammenfuehrung anbieten.
  - Bei der Zusammenfuehrung werden Messwerte, Zielbereiche, Gruppen- und Planungsbezuege auf einen Zielparameter umgehaengt.
  - Nicht mehr verwendete Namen und bestehende Quell-Aliase werden nach Moeglichkeit als Aliase des Zielparameters erhalten, damit kuenftige Importe weiterhin sauber mappen.
  - Backend-Tests und Frontend-Build wurden fuer den neuen Merge-Flow erfolgreich verifiziert.

### [2026-04-21] update | Desktop-Verkn�pfung f�r lokalen Start mit Browser�ffnung erg�nzt
- Anlass oder Quelle: Nutzerwunsch nach einem Desktop-Icon f�r den gemeinsamen Start und die automatische Anzeige des Frontends
- Neu angelegte Seiten:
  - keine
- Ge�nderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
- Kern der inhaltlichen Anpassung:
  - Das bestehende Startskript wurde um die Option -OpenFrontend erweitert, die nach kurzem Warten die lokale Frontend-URL pr�ft und im Standardbrowser �ffnet.
  - Zus�tzlich wurde auf dem Desktop eine Verkn�pfung Labordaten starten.lnk angelegt, die das Skript direkt in diesem Modus startet.
  - Die Betriebsdokumentation wurde um diesen Bedienweg erg�nzt.

### [2026-04-21] update | Startskript f�r Backend und Frontend als Ein-Aufruf erg�nzt
- Anlass oder Quelle: Nutzerwunsch nach einem gemeinsamen Startskript f�r beide Entwicklungsprozesse
- Neu angelegte Seiten:
  - keine
- Ge�nderte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
- Kern der inhaltlichen Anpassung:
  - Im Repository wurde unter `scripts/start-dev.ps1` ein PowerShell-Skript erg�nzt, das Backend und Frontend mit einem Aufruf in getrennten Fenstern startet.
  - Das Backend nutzt dabei direkt den Python-Interpreter aus `apps/backend/.venv`; optional k�nnen vor dem Start per Schalter auch Migrationen ausgef�hrt werden.
  - Die Startdokumentation wurde im Repository-README und in der Wissensbasis um den neuen Kurzweg erg�nzt.

### [2026-04-21] update | Lokaler Start f�r Backend und Frontend als Betriebswissen dokumentiert
- Anlass oder Quelle: Nutzerfrage zum Start von Backend und Frontend sowie R�ckf�hrungswunsch in die Wissensbasis
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Lokaler Start von Backend und Frontend]]
- Ge�nderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Der lokale Start wurde als eigene Betriebsseite dokumentiert, mit klarer Trennung zwischen Erstinstallation und t�glichem Start.
  - Zus�tzlich wurden die Standard-URLs f�r Frontend, Backend und API-Dokumentation sowie die Abh�ngigkeit des Frontend-Proxys vom laufenden Backend festgehalten.
  - Als praktische Betriebsnotizen wurden Migrationsbedarf nach Updates, erneute Paketinstallation bei Abh�ngigkeits�nderungen und die bestehende Single-User-Sperrlogik erg�nzt.

### [2026-04-21] update | PDF-Seitenumbr�che f�r Verlaufsberichte blockorientiert verfeinert
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung PDF-Seitenumbrueche]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung PDF-Seitenumbrueche]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand PDF-Seitenumbrueche in Berichten]]
- Ge�nderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Der PDF-Verlaufsbericht behandelt Wertebereiche jetzt als zusammenh�ngende Bl�cke statt sie nur von der Standard-Paginierung treiben zu lassen.
  - Kompakte Abschnitte bleiben zusammen; gro�e Bereiche beginnen auf einer frischen Seite und d�rfen innerhalb langer Tabellen sauber weiterlaufen.
  - F�r die mehrseitige Fortsetzung wird jetzt `LongTable` mit wiederholter Kopfzeile genutzt, zus�tzlich abgesichert durch Backend-Tests f�r Blocklogik und l�ngere Verlaufs-PDFs.

### [2026-04-21] update | Batch-Import des Ludwig-Verzeichnisses weiter vertieft und Dateiklassen geschärft
- Anlass oder Quelle: fortgesetzter Nutzerauftrag, das Verzeichnis `C:\Users\Lui\OneDrive\ðŸ¥ Gesundheit\Laborergebnisse\Ludwig` ohne Unterbrechung weiter abzuarbeiten
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Zusätzlich zu den bereits verarbeiteten neueren Befunden wurden weitere echte Laborberichte und Spezialprofile erfolgreich importiert, darunter `2024-05-06 MVZ Laborwerte`, `2024-05-06 LGS Laborwerte`, `2025-02-05 Messung Lithium`, `2021-08-25_Bioviz`, `Ludwig_2019_11_22_Glyphosat`, `Ludwig_2017-07-19_bioviz_Aminosäurestatus` und `Ludwig_2017_07_19_Bioviz VBMineral`.
  - Damit wurde praktisch bestätigt, dass die Importstrecke auch mit Spezialwerten, Profilberichten, zahlreichen neu anzulegenden Parametern und vielen Referenzvarianten belastbar funktioniert.
  - Die verbleibenden Dateiklassen wurden geschärft: nicht passende medizinische Dokumente, Rechnungen, doppelte Nachweise, Identitätskonflikte und technisch beschädigte Dateien wurden klar von wirklich importierbaren Laborbefunden getrennt.

### [2026-04-21] update | Bedienbarkeit auf Tablet und Smartphone aus Konzept und Frontend abgeleitet
- Anlass oder Quelle: Nutzerfrage zur Nutzbarkeit der Anwendung auf Tablet oder Mobiltelefon
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Geraeteprofile und mobile Bedienbarkeit]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Die Anwendung wurde als lokale Browser-Oberfläche mit grundsätzlicher Responsive-Basis eingeordnet, nicht als native Mobil-App.
  - Für den aktuellen Stand wurde festgehalten: Desktop ist das Primärziel, Tablet ist grundsätzlich gut nutzbar, Smartphones sind eher für lesende und kurze Aufgaben geeignet.
  - Als Hauptgrenzen wurden tabellenlastige Ansichten, dichte Mehrfachauswahlen und fehlende explizite Touch- oder PWA-Optimierung dokumentiert.

### [2026-04-21] update | Alias-Vorschläge und steuerbare Berichtseinheiten umgesetzt
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Alias-Vorschlaege und Berichtseinheiten]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Alias-Vorschlaege und Berichtseinheiten]]
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Alias-Vorschlaege und Berichtseinheiten]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Die Parameteroberfläche kann nun sichere Alias-Vorschläge aus bereits bestätigten Original-Parameternamen laden und direkt in echte Aliase überführen.
  - Arztbericht und Verlaufsbericht akzeptieren jetzt eine parameterbezogene Darstellungseinheit, wenn alle betroffenen numerischen Werte diese Zieldarstellung tragen.
  - Die Berichtslogik nutzt dafür nur belastbar vorhandene Original- oder normierte Werte und kennzeichnet Referenzbereiche bei Einheitenwechsel weiterhin als Originalreferenz.
  - Frontend-Build sowie Backend-Tests für Alias-Vorschläge und Berichtseinheiten wurden erfolgreich verifiziert.

### [2026-04-21] update | Batch-Import eines realen Ergebnisverzeichnisses praktisch verifiziert
- Anlass oder Quelle: Nutzerauftrag, das Verzeichnis `C:\Users\Lui\OneDrive\🥝 Gesundheit\Laborergebnisse\Ludwig` vollständig auf importierbare Laborberichte zu prüfen und passende Befunde in die Anwendung zu übernehmen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Die bestehende Importstrecke wurde gegen ein reales Mischverzeichnis aus PDFs und Bildern praktisch verifiziert. Mehrere zusätzliche Laborberichte aus den Jahren 2020 bis 2025 konnten erfolgreich als strukturierte Importentwürfe angelegt und ohne Warnungen übernommen werden.
  - Dabei wurde bestätigt, dass auch Bilddateien über denselben JSON-Weg importiert werden können, solange die Extraktion außerhalb des Backends erfolgt und `dokumentPfad` gesetzt wird.
- Gleichzeitig wurde ein wichtiger Schutzfall sichtbar: Im Verzeichnis lag mindestens ein Befund für `Hirth, Ludwig` mit dem abweichenden Geburtsdatum `13.04.1964`. Solche Fälle müssen als Identitätskonflikt behandelt und dürfen nicht automatisch auf die vorhandene Person gemappt werden.
- Zusätzlich wurde eine praktische Grenze des Alias-Mappings dokumentiert: Ohne Einheiten-Normalisierung dürfen fachlich ähnliche Werte mit inkompatiblen Einheitenskalen nicht blind auf denselben kanonischen Parameter gemappt werden. Für den Batch mussten deshalb einzelne Parameter bewusst getrennt nach Einheitsskala geführt werden.
- Im selben Zuge wurde eine beschädigte Problemdatei sichtbar: `2025-06-25 Laborwerte.pdf` ließ sich mit den lokal verfügbaren PDF-Werkzeugen nicht öffnen und bleibt bis zu einer Reparatur oder alternativen Quelle technisch unlesbar.

### [2026-04-21] update | Berichts- und Import-UX anhand Nutzerfeedback verfeinert
- Anlass oder Quelle: [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Berichte und Import UX]]
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Berichte und Import UX]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows]]
- Kern der inhaltlichen Anpassung:
  - Die Berichts- und Messwertlisten wurden auf direkt sichtbare Detailzugänge mit Referenzwerten ausgerichtet.
  - Mehrfachauswahlen in Berichten und Messwertfiltern wurden als kompakte Komfortsteuerung mit Sammelaktionen konkretisiert.
  - Für Berichte wurden zusammenfassende Kennzahlen und eine kurze Schwerpunktbeschreibung als sinnvolle V1-Komfortstufe festgehalten.
  - Für Dateiimporte wurde festgehalten, dass Importbemerkungen vorbelegt, aber weiter editierbar sein sollen.

### [2026-04-21] update | Aliasverwaltung für Parameter und automatische Importzuordnung umgesetzt
- Anlass oder Quelle: Nutzerauftrag, das erkannte Synonymproblem praktisch im System zu lösen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Das Backend enthält jetzt eine eigene Alias-Tabelle für Laborparameter samt API-Endpunkten zur Pflege dieser Alternativnamen.
  - Die Importprüfung kann Messwerte nun automatisch über internen Schlüssel, normalisierten Anzeigenamen und gepflegte Aliase auf kanonische Parameter auflösen.
  - Das Frontend zeigt den Zuordnungsweg in der Prüfansicht an und enthält auf der Parameterseite eine Pflegeoberfläche für Aliase.
  - Der neue Ablauf wurde praktisch gegen den laufenden Workspace verifiziert: Für `Vitamin D3 (25-OH) LCMS` wurde ein Alias angelegt und ein nachfolgender Importentwurf automatisch per Alias auf `Vitamin D3 (25-OH)` gemappt.

### [2026-04-21] update | Zweites reales PDF importiert und Parameter-Synonymproblem konkretisiert
- Anlass oder Quelle: Nutzerdatei `2021-10-30 pur-life.pdf`
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Ein realer Pur-life-Befund für Ludwig Hirth wurde aus dem PDF extrahiert, mit 101 Messwerten als Importentwurf angelegt und ohne Warnungen übernommen.
  - Das Originaldokument wurde dabei automatisch als `Dokument` gespeichert und mit dem resultierenden Befund verknüpft.
  - Zusätzlich wurde am konkreten Beispiel `Vitamin D3 (25-OH) LCMS` sichtbar gemacht, dass fachlich gleiche Werte laborabhängig anders benannt sein können und deshalb eine künftige Alias- oder Synonymverwaltung für kanonische Parameter sinnvoll ist.

### [2026-04-21] update | JSON-Import an lokale Dokumentverknüpfung und erweiterten Referenzkontext angebunden
- Anlass oder Quelle: Nutzerauftrag, den bestehenden PDF-zu-Import-Flow zu vervollständigen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - JSON-Importe mit lokalem `dokumentPfad` erzeugen jetzt ebenfalls ein echtes `Dokument` und verknüpfen dieses mit Importvorgang und Befund.
  - Das Importschema und die Prüfansicht wurden um Referenzkontext wie Altersgrenzen, Geschlecht und Referenzbemerkung erweitert.
  - Der bereits importierte Bioscientia-Befund wurde nachträglich mit dem Original-PDF und dem altersbezogenen Referenzkontext verbunden.

### [2026-04-21] update | Reales PDF per API in Stammdaten und Import überführt
- Anlass oder Quelle: Nutzerdatei `2026-01-20 Bioscientia Trap5 und beta-Cross-Laps.pdf`
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Kern der inhaltlichen Anpassung:
  - Ein realer Bioscientia-Befund für Ludwig Hirth wurde visuell aus dem PDF extrahiert und über bestehende API-Schnittstellen verarbeitet.
  - Dabei wurden ein Labor und zwei Parameter angelegt sowie ein Importentwurf ohne Warnungen übernommen.
  - Zusätzlich wurde sichtbar, dass `dokumentPfad` bei Unicode-reichen Pfaden im Rückgabekontext noch ein Kodierungsthema haben kann.

### [2026-04-21] update | Wissensbasis als lesender Arbeitsbereich umgesetzt
- Anlass oder Quelle: nächster Ausbaupunkt nach Einstellungen und lokaler Betriebslogik
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend liest jetzt Markdown-Seiten aus dem konfigurierten Wissensordner, extrahiert einfache Frontmatter-Metadaten und stellt Liste sowie Detailansicht per API bereit.
  - Das Frontend enthält eine echte Wissensbasis-Seite mit Suche, Seitenauswahl, Frontmatter-Anzeige und Markdown-Detailansicht.
  - Backend-Kompilation, Frontend-Build und ein Rauchtest für `Wissensseiten-Liste -> Detailansicht` wurden erfolgreich ausgeführt.

### [2026-04-21] update | Laufzeit-Einstellungen und lokale Sperrlogik als echte Betriebsfunktion umgesetzt
- Anlass oder Quelle: Fortsetzung der lokalen V1-Betriebslogik nach Dateiimport und Dokumentverknüpfung
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend besitzt nun persistente Laufzeit-Einstellungen für Datenpfad, Dokumentenpfad, Wissensordner und mehrere Betriebsoptionen.
  - Zusätzlich wurde eine filebasierte Single-User-Sperrlogik mit Heartbeat, Konflikterkennung, Statusabfrage und kontrolliertem Reset umgesetzt.
  - Das Frontend enthält jetzt eine echte Einstellungsseite mit Systemstatus, Sperrinformationen und speicherbaren Laufzeitoptionen.
  - Backend-Kompilation, Frontend-Build und ein API-Rauchtest für `Settings -> Lock aktiv -> Konflikt zweite Instanz -> Reset` wurden erfolgreich ausgeführt.

### [2026-04-21] update | Dateiimport für CSV und Excel mit Dokumentverknüpfung umgesetzt
- Anlass oder Quelle: Fortsetzung des V1-Importausbaus nach Gruppen und Auswertungsfiltern
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend unterstützt nun Dateiimporte für CSV und Excel als prüfbare Importentwürfe inklusive Metadaten-Ergänzung.
  - Optional abgelegte Quelldateien werden als `Dokument` gespeichert und beim Übernehmen mit dem erzeugten Befund verknüpft.
  - Das Frontend enthält dafür eine reale Upload-Oberfläche mit Datei, Person, Labor, Datum, Bemerkungen und Quellablage-Option.
  - Backend-Kompilation, Frontend-Build, Paketinstallation mit `openpyxl`, Alembic-Ausführung und ein API-Rauchtest für `CSV/XLSX -> Entwurf -> Übernahme -> Dokumentlink` wurden erfolgreich ausgeführt.

### [2026-04-21] update | Gruppen und bereichsübergreifende Filter als echter Durchstich umgesetzt
- Anlass oder Quelle: Nutzerauftrag, Gruppen fachlich voll nutzbar zu machen und Ansichten nach Person, Gruppen, Labor und Zeitraum kombinierbar auszubauen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das Backend wurde um `ParameterGruppe`, `GruppenParameter` und passende API-Endpunkte für Gruppenverwaltung und Parameterzuordnung erweitert.
  - Das Frontend enthält jetzt eine echte Gruppenverwaltung sowie kombinierbare Filter nach Personen, Gruppen, Laboren und Zeitraum in Messwerten, Berichten und Auswertung.
  - Personenübergreifende Familienansichten sind damit in Listen, Berichtsvorschauen, Verlaufs-PDF und Diagrammen technisch verfügbar.
  - Backend-Kompilation, Frontend-Build, Alembic-Migration bis `20260421_0005` und ein API-Rauchtest über Gruppen-, Berichts- und Auswertungsflüsse wurden erfolgreich ausgeführt.

### [2026-04-21] update | Ist-Stand der Importstrecke gegenüber PDF-Import geklärt
- Anlass oder Quelle: Nutzerfrage, ob der aktuelle Programmstand schon für PDF-basierte Laborberichtimporte ausreicht
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Ist-Stand Importstrecke und PDF-Grenzen]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Der aktuelle Importfluss wurde fachlich und technisch präzisiert.
  - Festgehalten wurde, dass strukturierte JSON-Importe bereits geprüft und übernommen werden können, ein direkter PDF-Upload mit Extraktion aber noch fehlt.
  - Zusätzlich wurde dokumentiert, dass Labore bei `laborName` im Import automatisch neu angelegt werden können, Personen aber bereits vorhanden sein sollten.

### [2026-04-21] update | Mermaid-Diagramme für Obsidian schmaler umgebaut
- Anlass oder Quelle: Nutzerhinweis auf abgeschnittene Diagramme in der Obsidian-Anzeige
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Systembild und Paketuebersicht der Anwendung]]
- Kern der inhaltlichen Anpassung:
  - Die beiden technischen Diagramme wurden von einer breiten Links-nach-Rechts-Anordnung auf schmalere Top-down-Anordnungen umgestellt.
  - Lange Knotenbeschriftungen wurden gekürzt, damit die Mermaid-SVGs in Obsidian robuster in die verfügbare Seitenbreite passen.

### [2026-04-21] update | Vereinfachte Managementsicht zur Architektur ergänzt
- Anlass oder Quelle: Nutzerwunsch nach einer zusätzlichen vereinfachten Überblickssicht
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Systembild und Paketuebersicht der Anwendung]]
- Kern der inhaltlichen Anpassung:
  - Die bestehende Architekturübersicht wurde um ein drittes, bewusst vereinfachtes Diagramm ergänzt.
  - Die neue Sicht reduziert die Anwendung auf Nutzer, Oberfläche, Anwendungslogik, Daten, Dokumente, Import, Wissensbasis und optionale externe Helfer.

### [2026-04-21] update | Visuelles Systembild und Paketübersicht aus Wiki und Workspace abgeleitet
- Anlass oder Quelle: Nutzerfrage nach einer verständlichen Architekturübersicht für aktuellen Stand und Zielbild
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Systembild und Paketuebersicht der Anwendung]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Der aktuelle Workspace-Stand wurde mit der dokumentierten V1-Architektur abgeglichen.
  - Daraus wurden zwei wiederverwendbare Diagramm-Sichten abgeleitet: Systemkomponenten und Programmpakete.
  - Unterschiede zwischen heutigem Ist-Stand und geplantem Zielbild wurden explizit kenntlich gemacht.

### [2026-04-21] update | Auswertung mit echten Diagrammen umgesetzt
- Anlass oder Quelle: Nutzerauftrag zum nächsten Ausbaupunkt nach dem PDF-Berichtsstand
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend liefert nun Gesamtzahlen und auswertungsfähige Zeitreihen pro Parameter inklusive Laborreferenzen, Zielbereichen und qualitativen Ereignissen.
  - Das Frontend enthält eine echte Auswertungsseite mit Filtern, Kennzahlen, Diagrammen und Ereignistabelle.
  - Backend-Kompilation, Frontend-Build und ein API-Rauchtest für den neuen Auswertungsbereich wurden erfolgreich ausgeführt.

### [2026-04-21] update | Erste lokale PDF-Berichte umgesetzt
- Anlass oder Quelle: Nutzerauftrag zum nächsten Berichts-Ausbauschritt nach den Vorschauen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend erzeugt nun lokale PDF-Dateien für Arztbericht und Verlaufsbericht direkt aus den bestehenden Berichtsdaten.
  - Das Frontend enthält Download-Aktionen für beide Berichtstypen.
  - Backend-Kompilation, Frontend-Build und ein API-Rauchtest für Vorschau plus PDF-Ausgabe wurden erfolgreich ausgeführt.

### [2026-04-20] update | Erste Berichtsansichten als echter Durchstich umgesetzt
- Anlass oder Quelle: Nutzerauftrag zum nächsten Schritt nach Commit und Zwischenstatus
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das Backend liefert nun Vorschauen für Arztbericht und Verlaufsbericht auf Basis realer Messdaten.
  - Das Frontend enthält eine echte Berichtsseite mit Filtern und Vorschautabellen.
  - Python-Kompilation, Frontend-Build, Alembic-Ausführung und ein API-Rauchtest für `Arztbericht-Vorschau` und `Verlaufsbericht-Vorschau` wurden erfolgreich ausgeführt.

### [2026-04-20] update | Personenspezifische Zielbereichs-Overrides als echter Durchstich umgesetzt
- Anlass oder Quelle: Nutzerauftrag zum nächsten Ausbau nach Importprüfung
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das Backend wurde um Endpunkte und Logik für personenspezifische Überschreibungen allgemeiner Zielbereiche erweitert.
  - Das Frontend erlaubt nun auf der Personenseite die Anlage und Anzeige solcher Overrides.
  - Python-Kompilation, Frontend-Build, Alembic-Ausführung und ein API-Rauchtest für `Zielbereich -> Person-Override -> Liste` wurden erfolgreich ausgeführt.

### [2026-04-20] update | Importprüfung und Prüfansicht als echter Durchstich umgesetzt
- Anlass oder Quelle: Nutzerauftrag zum nächsten V1-Kernbaustein nach dem Planungsdurchstich
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das Backend wurde um Importentwurf, Prüfpunkte, Parameter-Mapping und bewusste Übernahme erweitert.
  - Das Frontend enthält jetzt eine reale Importseite mit Prüfansicht und Steuerung der Übernahme.
  - Python-Kompilation, Frontend-Build, Alembic-Migration und ein API-Rauchtest für `Importentwurf -> Prüfpunkte -> Mapping -> Übernahme` wurden erfolgreich ausgeführt.

### [2026-04-20] update | Planung, Fälligkeiten und Vorschlagsliste als echter Durchstich umgesetzt
- Anlass oder Quelle: Nutzerauftrag zur nächsten V1-Kernfunktion nach Referenzen und Zielbereichen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das Backend wurde um Modelle, Migration, Services und API-Endpunkte für `PlanungZyklisch`, `PlanungEinmalig` und `Fälligkeiten` erweitert.
  - Das Frontend enthält jetzt eine reale Planungsseite mit Formularen, Listen und einer konsolidierten Vorschlagsliste.
  - Python-Kompilation, Frontend-Build, Alembic-Migration und ein API-Rauchtest für die Planungslogik wurden erfolgreich ausgeführt.

### [2026-04-20] update | Referenzen und Zielbereiche in den Durchstich integriert
- Anlass oder Quelle: Nutzerauftrag zur nächsten fachlichen Ausbauphase nach dem ersten Durchstich
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Das Backend wurde um Endpunkte und Datenmodelle für `MesswertReferenz` und `Zielbereich` ergänzt.
  - Das Frontend erlaubt nun die Pflege von Laborreferenzen zu Messwerten und allgemeinen Zielbereichen zu Parametern.
  - Migration, Frontend-Build und API-Rauchtests für die neue Logik wurden erfolgreich ausgeführt.

### [2026-04-20] update | Erster technischer Durchstich für Kernobjekte umgesetzt
- Anlass oder Quelle: Nutzerauftrag zur direkten Umsetzung des ersten End-to-End-Flows
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Personen, Parameter, Befunde und Messwerte wurden im Frontend an echte API-Endpunkte angebunden.
  - Backend und Frontend wurden technisch verifiziert: Python-Kompilation, Frontend-Build, Alembic-Migration und API-Rauchtest.
  - Ein erster vollständiger Durchstich von Stammdaten über Befund bis Messwert ist damit nicht mehr nur konzeptionell, sondern lauffähig vorbereitet.

### [2026-04-20] update | Technisches V1-Scaffold im Workspace angelegt
- Anlass oder Quelle: Umsetzung des Projektgerüsts nach Architektur-, Schema- und Screenplanableitung
- Neu angelegte Seiten:
  - [[../01 Rohquellen/repo-root/2026-04-20 V1 Scaffold Workspace-Stand]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Im Repository wurden `apps/backend`, `apps/frontend`, `packages/contracts` und erste Beispielstrukturen angelegt.
  - Das Backend enthält nun API-Grundgerüst, erste Fachmodule, SQLAlchemy-Modelle und eine initiale Alembic-Migration.
  - Das Frontend enthält eine erste Routen- und Layout-Shell für die sachlichen V1-Hauptbereiche.
  - Ein erstes versioniertes Import-JSON-Schema wurde als Vertragsgrundlage ergänzt.

### [2026-04-20] update | V1-Projektstruktur, Module und Schnittstellen konkretisiert
- Anlass oder Quelle: Nutzerauftrag zur nächsten Ableitungsebene nach Schema und Screenplan
- Neu angelegte Seiten:
  - [[../02 Wissen/Entscheidungen/V1 Empfohlener Technologie-Stack]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Projektstruktur, Module und Schnittstellen]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Für V1 wurde ein konkreter lokaler Technologie-Stack empfohlen.
  - Die Projektstruktur wurde auf Backend-Module, API-Endpunkte, Frontend-Routen und empfohlene Ordnerstruktur heruntergebrochen.

### [2026-04-20] update | Technisches V1-Schema und Screenplan ergänzt
- Anlass oder Quelle: Nutzerauftrag zur Priorisierung und Ausarbeitung der nächsten Schritte
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/V1 Technisches Schema]]
  - [[../02 Wissen/Begriffe und Konzepte/V1 Screenplan und Kernworkflows]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das fachliche Datenmodell wurde in eine relationale technische Schemasicht mit Tabellen, Indizes, Checks und Anwendungskontrollen überführt.
  - Daraus wurde ein arbeitsbereichsorientierter V1-Screenplan mit Hauptseiten, Detailansichten und Kernworkflows abgeleitet.

### [2026-04-20] update | V1-Ziel-Datenmodell ausformuliert
- Anlass oder Quelle: Nutzerauftrag zur verbindlichen Modellierung von Entitäten, Feldern und Beziehungen
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/V1 Ziel-Datenmodell]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Das fachliche V1-Datenmodell wurde mit Entitäten, Pflicht- und Zusatzfeldern, Beziehungen, Prüfregeln und Modellierungsprinzipien konkretisiert.
  - Messwertmodell, Referenzlogik, Zielbereichsüberschreibungen, Importprüfung und Sperrlogik wurden zu einem konsistenten Gesamtschnitt verdichtet.

### [2026-04-20] update | Bedeutung qualitativer Messwerte konkretisiert
- Anlass oder Quelle: Nutzerbestätigung zu qualitativen Befunden
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-20 Konzeptklaerungen V1 aus Rueckfragen]]
  - [[../02 Wissen/Entscheidungen/V1 Vorentscheidungen Produktform und Kernmodell]]
  - [[../02 Wissen/Begriffe und Konzepte/Fachkonzept Laboranwendung Grundstruktur]]
  - [[../02 Wissen/Begriffe und Konzepte/Planung Erstarchitektur und Umsetzungsphasen]]
- Kern der inhaltlichen Anpassung:
  - Qualitative Messwerte wurden als textuelle, kategoriale oder halbquantitative Befunde konkretisiert.
  - Das Datenmodell für V1 wurde damit eindeutig auf numerische und nichtnumerische Laborbefunde ausgerichtet.

### [2026-04-20] update | Weitere V1-Festlegungen zu Anzeige, Dubletten und Referenzvarianten
- Anlass oder Quelle: zusätzliche Nutzerantworten zu V1-Rückfragen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-20 Konzeptklaerungen V1 aus Rueckfragen]]
  - [[../02 Wissen/Entscheidungen/V1 Vorentscheidungen Produktform und Kernmodell]]
  - [[../02 Wissen/Begriffe und Konzepte/Fachkonzept Laboranwendung Grundstruktur]]
  - [[../02 Wissen/Risiken und offene Punkte/Erste Konzeptvorgabe Klaerungsbedarf]]
  - [[../02 Wissen/Begriffe und Konzepte/Planung Erstarchitektur und Umsetzungsphasen]]
- Kern der inhaltlichen Anpassung:
  - Wissensseiten wurden für V1 auf reine Anzeige eingegrenzt.
  - Dublettenerkennung wurde als Warnung mit bewusster Übernahmeentscheidung präzisiert.
  - Berichtsfelder sollen standardmäßig vorbelegt und abwählbar sein.
  - Alters- und geschlechtsabhängige Referenzvarianten wurden als fachlich notwendige Fähigkeit für V1 ergänzt.

### [2026-04-20] update | V1-Rückfragen geklärt und in Architekturplanung übernommen
- Anlass oder Quelle: Nutzerquelle `Konzeptklärungen V1 aus Rückfragen`
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-20 Konzeptklaerungen V1 aus Rueckfragen]]
  - [[../02 Wissen/Entscheidungen/V1 Vorentscheidungen Produktform und Kernmodell]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Fachkonzept Laboranwendung Grundstruktur]]
  - [[../02 Wissen/Risiken und offene Punkte/Erste Konzeptvorgabe Klaerungsbedarf]]
  - [[../02 Wissen/Begriffe und Konzepte/Planung Erstarchitektur und Umsetzungsphasen]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Produktform, qualitative Messwerte, Labor als Stammdatenobjekt, Zielbereichslogik und Sicherheitsrahmen für V1 wurden präzisiert.
  - Eine genormte externe Importschnittstelle wurde als wichtige Architekturfolge ergänzt.
  - Die V1-Berichtsschwerpunkte wurden auf Listenbericht für Arzttermine und Verlaufsbericht mit Zeitachse konkretisiert.

### [2026-04-20] update | Erste fachliche Konzeptvorgabe zur Laboranwendung aufgenommen
- Anlass oder Quelle: Nutzerquelle `Erste Konzeptvorgabe`
- Neu angelegte Seiten:
  - [[../01 Rohquellen/fachkonzepte/2026-04-20 Erste Konzeptvorgabe Laboranwendung]]
  - [[../02 Wissen/Begriffe und Konzepte/Fachkonzept Laboranwendung Grundstruktur]]
  - [[../02 Wissen/Risiken und offene Punkte/Erste Konzeptvorgabe Klaerungsbedarf]]
  - [[../02 Wissen/Begriffe und Konzepte/Planung Erstarchitektur und Umsetzungsphasen]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Die erste umfassende fachliche Spezifikation der geplanten Laboranwendung wurde als Rohquelle abgelegt.
  - Das Fachkonzept wurde in eine strukturierte Wissensseite überführt.
  - Offene Punkte und Präzisierungsbedarf vor der Implementierung wurden als eigene Wissensseite erfasst.

### [2026-04-20] create | Initiale Projekt-Wissensbasis und Repository-Grundstruktur
- Anlass oder Quelle: Einrichtung der Projektumgebung für `Labordaten`
- Neu angelegte Seiten:
  - [[../00 Projektstart]]
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Projektueberblick]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - [[../02 Wissen/Prozesse/Quellenverarbeitung in dieser Wissensbasis]]
  - [[../02 Wissen/Prozesse/Wiki-first Query und Linting]]
- Geänderte Seiten:
  - keine
- Kern der inhaltlichen Anpassung:
  - Git-Repository und neutrales Projektgrundgerüst wurden angelegt.
  - `AGENTS.md` wurde auf wiki-first Wissensarbeit für dieses Projekt ausgerichtet.
  - Eine initiale projektbezogene Wissensbasis für die spätere Aufnahme der Fachkonzepte wurde eingerichtet.
