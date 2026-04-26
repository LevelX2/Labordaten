---
typ: fachkonzept
status: aktiv
letzte_aktualisierung: 2026-04-26
quellen:
  - ../../01 Rohquellen/externe-quellen/Laborwerte_Systematik_KSG.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S01.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S01 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S02.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S02 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S03.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S03 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S04.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S04 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S05.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S05 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S06.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S06 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S07.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S07 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S08.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S08 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S09.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S09 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S10.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S10 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S11.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S11 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S12.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S12 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S13.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S13 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S14.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S14 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S15.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S15 Transkription.md
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S16.pdf
  - ../../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S16 Transkription.md
  - ../../../apps/backend/src/labordaten_backend/models/laborparameter.py
  - ../../../apps/backend/src/labordaten_backend/models/parameter_klassifikation.py
  - ../../../apps/backend/src/labordaten_backend/models/zielbereich.py
  - ../../../packages/contracts/import-v1.schema.json
tags:
  - ksg
  - klassifikation
  - laborparameter
  - zielbereiche
---

# KSG Klassifizierung von Laborparametern

## Kurzfassung
Die KSG-Systematik ergänzt die Laboranwendung um eine interpretative Schicht auf Ebene des Laborparameters. Sie unterscheidet, ob ein Parameter typischerweise als `krankwert`, `schluesselwert` oder `gesundmachwert` eingeordnet wird. Diese Einordnung ist keine Messwert-Ampel und keine Diagnose, sondern beschreibt die fachliche Funktion des Parameters.

## Fachliche Bedeutung
- `krankwert`: Der Parameter dient vor allem dazu, Krankheit, Organschädigung, Entzündung, Entgleisung, Risiko oder Verlauf sichtbar zu machen.
- `schluesselwert`: Der Parameter beschreibt einen regulierten Funktions- oder Versorgungszustand, bei dem ein günstiger Bereich relevant ist und zu niedrige sowie zu hohe Werte ungünstig sein können.
- `gesundmachwert`: Der Parameter beschreibt Versorgung, Reserve, hormonelle Ausgangslage oder therapeutisch beeinflussbare Grundlage, bei der Zielbereiche vom reinen Laborreferenzbereich abweichen können.

## Modellierungsentscheidung
- Jeder `Laborparameter` kann optional eine `primaere_klassifikation` tragen.
- Kontextabhängige Mehrfachrollen werden nicht als zusätzliche Parameter oder Gruppen modelliert, sondern in `parameter_klassifikation` mit `klassifikation`, `kontext_beschreibung` und `begruendung`.
- Die drei KSG-Codes sind feste Werte und keine freien Texte.
- Gruppen bleiben fachliche Sammlungen für Filter, Berichte, Planung und Erfassung; sie ersetzen die KSG-Klassifikation nicht.

## Zielbereiche
Zielbereiche erhalten zusätzlich einen `zielbereich_typ`. Dadurch lassen sich allgemeine Zielbereiche von `optimalbereich`, `therapieziel`, `mangelbereich` und `risikobereich` unterscheiden. Diese Typisierung ist besonders relevant für Schlüsselwerte und Gesundmachwerte, weil dort Referenzbereich, Optimum, Mangelbereich und therapeutisches Ziel nicht zwingend identisch sind.

## Abgleich Knochen und Gefäße
Die PDF-Quelle `KSG-Klassifikation.pdf` konkretisiert die Systematik für Knochen und Gefäße. Daraus ergeben sich projektintern wichtige Leitplanken für die Parameter-Einordnung:

- Für Knochen werden `Beta-CrossLaps`, `TRAP 5b`, `ucOC` und `D-Ratio` ausdrücklich als `krankwert` geführt; `PTH`, `1,25-OH-Vitamin-D` und Calcium in Serum/Vollblut als `schluesselwert`; Bor, Mangan, B12, Vitamin C und Vitamin A als `gesundmachwert`.
- Für Gefäße werden `Lp(a)`, `LDL-C`, Small-LDLs, `TG`, `HbA1c`, `HOMA-Index` und Harnsäure als `krankwert` geführt. Zusätzlich werden unter anderem CRP/hsCRP, RANTES, oxidiertes LDL, TPO-AK/TAK, Kreatinin mit GFR, GPT, GOT, AP, gGT und CK als Extra-Krankwerte genannt.
- `HDL-C`, Homocystein (`HC`), Ferritin und Transferrinsättigung werden für Gefäße als `schluesselwert` geführt.
- Zink, Chrom, Selen, Jod, Eisen, Q10, Vitamin E, Alpha-Liponsäure, Lithium, Folsäure, Biotin, bioaktive B-Vitamine, Omega-3-Index und Molybdän werden für Gefäße als `gesundmachwert` geführt.
- Magnesium, Omega-3-Fette, 25-OH-Vitamin-D, Progesteron, DHEA-S und männliches freies oder Gesamt-Testosteron werden als für Knochen und Gefäße wichtige `gesundmachwert`-Kontexte genannt. Bei geschlechts- oder kontextabhängigen Hormonen bleibt eine Zusatzrolle sinnvoll, wenn der vorhandene Parameter nicht zwischen Mann/Frau oder Zyklus-/Therapiekontext unterscheidet.
- Die Tabellen S02/S03 ergänzen weitere konkrete Beispiele: Blei, Cadmium, DAO-Genetik, HNMT, I-FABP, Lp-PLA2, MDA-LDL, Nickel und Nitrotyrosin sind `krankwert`; BDNF, Histamin gesamt, Kalium im Vollblut und Kupfer im Vollblut werden als `schluesselwert` bzw. bei Kupfer als Mehrfachrolle `S/G` geführt; Bor, Chrom, DAO im Serum, SCFA, bioaktive Folsäure, reduziertes Glutathion, Magnesium, Mangan, Molybdän, Aminosäureprofile und Omega-3-Index sind `gesundmachwert`.
- Bei expliziter Mehrfachrolle wie `S/G` wird im Projekt die primäre Klassifikation als `schluesselwert` modelliert und `gesundmachwert` als Zusatzrolle dokumentiert, sofern kein engerer Kontext eine andere Priorisierung verlangt.
- Die Tabellen S04/S05 ergänzen und bestätigen weitere Beispiele: Quecksilber, reverse T3, Zonulin, ANA, Apo-B, Beta-CrossLaps, Bilirubin gesamt, CCP-AK, CK, CRP/hsCRP und Cystatin C sind `krankwert`; Cortisol basal und Calcium im Serum sind `schluesselwert`; bioaktive Vitamine B1/B2/B6, freies 25-OH-Vitamin-D, Zink und Biotin sind `gesundmachwert`.
- Für Selen im Vollblut wird `G/S` genannt; im Projekt bleibt Selen primär `gesundmachwert` mit möglicher Zusatzrolle `schluesselwert`.
- Für AP gibt es einen Quellenkonflikt: Die Überblicksquelle nennt AP unter Extra-Krankwerten, S04 führt die alkalische Phosphatase in der Detailtabelle als `schluesselwert`. Für das Projekt ist AP primär `schluesselwert`, während ein Organ-/Gefäß- oder Pathologiekontext als Zusatzrolle `krankwert` dokumentiert werden sollte.
- S01 beschreibt die Tabellenlogik selbst: KSG-Klassen sind nicht als Diagnose-Ampel zu verstehen, sondern als fachliche Orientierung zu krankmachenden, schützenden oder steuernden Parameterfunktionen. Die Quelle betont außerdem, dass Laborreferenzen, Methoden und Einheiten zwischen Laboren abweichen können.
- Die Tabellen S06-S16 bestätigen viele bisherige Zuordnungen und präzisieren Mehrfachrollen: fT3 wird als `S/G`, fT4 und TSH als `S/K`, HDL-C als `G/S`, Homocystein als `K/S`, Testosteron geschlechtsabhängig als `G Mann / S Frau` und Prolaktin als `K` im nicht-schwangeren Kontext geführt.
- Die Detailtabellen führen eGFR ausdrücklich als `schluesselwert`, obwohl Nierenfunktionsmarker im allgemeinen Vorschlag oft als Krankheitsabklärung eingeordnet wurden. Projektintern soll eGFR deshalb primär `schluesselwert` sein; die pathologische Nierenfunktionsabklärung bleibt Zusatzrolle `krankwert`.
- Weitere bestätigte Beispiele aus S06-S16: DHEA-S, Folsäure, Holo-TC, Jod, Magnesium, Melatonin, Nikotinamid/Vitamin B3, Pregnenolon, Progesteron, Q10, Vitamin A, B12, C, D-25-OH und E sind `gesundmachwert`; DHT, Estradiol, Ferritin, FSH, Gesamteiweiß, Leukozyten, LH, Lipoprint/LDL-Subfraktionen, Natrium, Östron, Parathormon, Phosphat, Quick, RBP, Serotonin, SHBG, Transferrinsättigung und Thrombozyten sind `schluesselwert`; HbA1c, HOMA, gGT, GOT, GPT, Harnsäure, Harnstoff, IgE, Kreatinin, LDL-C, Lipase, Lp(a), Mikroalbuminurie, NT-proBNP, oxidiertes LDL, TAK, TG, TPO-AK, TRAK, TRAP5b und Vitamin-D-Ratio sind `krankwert`.

## Grenzen
- Die Klassifikation bewertet die typische Funktion eines Parameters, nicht den konkreten Messwert.
- Eine KSG-Klasse erzeugt keine automatische medizinische Bewertung.
- Kontextdaten wie Zyklusphase, nüchtern, Medikation oder Therapie bleiben vorerst in Bemerkungen und Begründungen; eine eigene strukturierte Kontext-Entität ist nicht Teil dieses Umbaus.
