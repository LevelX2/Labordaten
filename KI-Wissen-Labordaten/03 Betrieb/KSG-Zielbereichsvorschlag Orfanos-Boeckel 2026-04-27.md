---
typ: betrieb
status: entwurf
letzte_aktualisierung: 2026-04-27
quellen:
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S01 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S02 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S03 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S04 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S05 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S06 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S07 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S08 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S09 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S10 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S11 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S12 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S13 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S14 Transkription.md
  - ../01 Rohquellen/externe-quellen/KSG-Klassifikation Tab S15 Transkription.md
  - ../../apps/backend/src/labordaten_backend/modules/initialdaten/initialdaten_snapshot.json
tags:
  - ksg
  - zielbereiche
  - optimalbereiche
  - stammdaten
---

# KSG-Zielbereichsvorschlag Orfanos-Boeckel

Stand: 2026-04-27

Dieser Entwurf leitet aus den lokal transkribierten KSG-Tabellen Zielbereiche ab, die als `optimalbereich` mit der Zielwertquelle `Nährstoff- und Hormontherapie - Der Präventions-Leitfaden` von Dr. med. Helena Orfanos-Boeckel angelegt werden könnten. Die Zielbereiche sollen nicht als unvermeidlicher Systemstandard, sondern als optionales `ZielwertPaket` gepflegt werden.

Die Zielbereiche sind keine Laborreferenzen und keine Diagnose- oder Therapieanweisung. Sie sind quellengebundene Orientierungswerte. Bei unklaren, rein textlichen oder stark kontextabhängigen Angaben wird bewusst kein harter numerischer Bereich vorgeschlagen.

## Modellierungsregeln

- `zielbereich_typ`: immer `optimalbereich`.
- `zielbereich_quelle`: `Nährstoff- und Hormontherapie - Der Präventions-Leitfaden` als Buchquelle; Dr. med. Helena Orfanos-Boeckel bleibt als Titel-/Autorinnenangabe an der Quelle.
- `zielwert_paket`: optionales Paket, z. B. `orfanos_boeckel_ksg_2026`.
- `quelle_stelle`: kein Scan- oder Tabellenverweis, sondern der Laborbezug des Zielwertblocks, z. B. `Laborbezug: IMD Berlin` oder `Laborbezug: Labor Augsburg`.
- `quelle_original_text`: Zielwertspalte aus der Transkription.
- Numerische Zielbereiche werden nur vorgeschlagen, wenn die KSG-Angabe eine eindeutige Grenze, einen Bereich oder einen Zielpunkt nennt.
- Angaben wie `so niedrig wie möglich`, `negativ`, `je niedriger desto besser` oder `oberes Drittel der Referenz` werden als Textziel oder als Prüfhinweis vorgeschlagen, sofern keine belastbare numerische Grenze genannt wird.
- Bei Zielpunkten wie `um 4,5` sollte die Anlage technisch als Zielpunkt mit gleicher unterer und oberer Grenze erfolgen und in der Bemerkung als weicher Zielpunkt gekennzeichnet werden.
- Kontextabhängige Bereiche nach Geschlecht, Alter, HRT, Risiko oder Therapie werden nur dann direkt in getrennte Zielbereiche zerlegt, wenn das aktuelle Modell den Kontext sauber abbilden kann. Sonst bleibt der Kontext in `bemerkung` und `quelle_original_text`.

## Zusammenfassung

- Die KSG-Transkriptionen S01 bis S15 enthalten 124 auswertbare Tabellenzeilen. Für die Paketdaten wird die Scan-Seitenzählung nicht als sichtbare Zielbereichs-Fundstelle genutzt; relevant ist der Laborbezug des jeweiligen Blocks.
- Für viele Werte existieren bereits passende Parameter im Initialdaten-Snapshot.
- Mehrere Zielwerte brauchen vor dem produktiven Import neue Parameter oder Alias-Ergänzungen, vor allem bei AGEs, BDNF, DAO, Histamin, I-FABP, Lp-PLA2, rT3, Zonulin, ANA, Apo-B, CCP-AK, Cystatin C, DHT, IgA/IgG/IgM, IGF-1, IGF-BP3, LH, Melatonin, Mikroalbuminurie, NT-proBNP, Östron, Pregnenolon, RBP, Serotonin und SHBG.
- Einige vorhandene Parameter sind methodisch nah, aber nicht deckungsgleich, z. B. `Oxidiertes LDL` gegenüber `MDA-LDL`, `Nitrotyrosin im Serum` gegenüber `Nitrotyrosin im EDTA-Plasma` oder `Vitamin A` mit anderer Standardeinheit. Diese Fälle sollten vor dem Import fachlich geprüft werden.

## Vorschlagstabelle

| Stelle | KSG-Parameter | Parameteranlage | Zielwertvorschlag | Bemerkung für Zielbereich |
|---|---|---|---|---|
| S01 | AGEs | Neu: `ages_advanced_glycation_endproducts`, Einheit `µg/ml`, KSG `krankwert` | numerisch `<= 50 µg/ml` | Quelle: besser `< 50 µg/ml`; `je niedriger desto besser` in Bemerkung übernehmen. |
| S01 | Aluminium im Vollblut | Vorhanden: `aluminium_im_vollblut` | Textziel: `so niedrig wie möglich` | Keine harte therapeutische Grenze in der Tabelle; Laborreferenz `< 11,4 µg/l` nicht als Optimalbereich missbrauchen. |
| S01 | Arsen im Vollblut | Vorhanden: `arsen_im_vollblut` | Textziel: `so niedrig wie möglich` | Keine harte therapeutische Grenze in der Tabelle. |
| S01 | ATP intrazellulär | Vorhanden: `intrazellulaeres_atp` | numerisch `>= 3,5 µM` | `> 5 µM` als guter Wert in Bemerkung; Messbereich bis `10 µM`. |
| S02 | BDNF | Neu: `bdnf`, Einheit `ng/ml`, KSG `schluesselwert` | numerisch `30-40 ng/ml` | Werte `< 20 ng/ml` vermeiden; Bedeutung `> 60 ng/ml` unklar. |
| S02 | Blei im Vollblut | Vorhanden: `blei_im_vollblut` | numerisch `<= 10 µg/l` | Zusätzlich `so niedrig wie möglich`. |
| S02 | Bor im Serum | Vorhanden: `borserum` | numerisch `140-150 µg/l` | Mindestziel `>= 120 µg/l` in Bemerkung. |
| S02 | Cadmium im Vollblut | Vorhanden: `cadmium_im_vollblut` | Textziel: `so niedrig wie möglich` | Keine harte therapeutische Grenze in der Tabelle. |
| S02 | Calcium im Vollblut | Vorhanden: `calcium_im_vollblut` | numerisch `60-61 mg/l` | Zusätzlich `nicht > 62 mg/l`; Zielpunktcharakter. |
| S02 | Chrom im Vollblut | Vorhanden: `chrom_im_vollblut` | numerisch `0,40-0,50 µg/l` | Direkter Bereich. |
| S02 | Diaminooxidase im Serum | Neu: `diaminooxidase_dao_im_serum`, Einheit `IU/ml`, KSG `gesundmachwert` | numerisch `>= 15 IU/ml` | Kupfer- und B6-Abhängigkeit in Bemerkung. |
| S02 | DAO-Genetik | Neu: `dao_genetik`, Werttyp `text`, KSG `krankwert` | Textziel: `keine verminderte Aktivität` | Kein numerischer Zielbereich; genetischer Kontext. |
| S02 | SCFA im Serum | Neu bevorzugt: `acetat_im_serum`, `propionat_im_serum`, `butyrat_im_serum`; alternativ Sammelparameter `scfa_im_serum` | Textziel: `je höher desto besser`; optional Einzelgrenzen aus Referenz übernehmen | Die Quelle nennt Zielrichtung, aber keine oberen Optimalgrenzen; Einzelparameter sind fachlich sauberer als ein Sammelwert. |
| S02 | Folsäure bioaktiv im EDTA-Blut | Vorhanden: `vitaminb9folsaeurebioaktiviedta` | numerisch `>= 160 µg/l` | Quelle: `bei > 160 µg/l halten`. |
| S02 | Glutathion reduziert intrazellulär | Vorhanden: GSH-Zellparameter für Monozyten, NK-Zellen und T-Lymphozyten | Textziel: `möglichst hoch` | Keine einheitliche Grenze; Zelltyp-spezifische Referenzen nicht als ein Zielbereich zusammenziehen. |
| S02 | Histamin gesamt im Heparin-Blut | Neu: `histamin_gesamt_im_heparin_blut`, Einheit `ng/ml`, KSG `schluesselwert` | numerisch `30-60 ng/ml` | Werte `> 150 ng/ml` meist unangenehm, `< 30 ng/ml` auffällig. |
| S02 | HNMT | Neu: `hnmt_genetik`, Werttyp `text`, KSG `krankwert` | Textziel: `keine verminderte Aktivität` | Genetischer Kontext, kein numerischer Laborzielbereich. |
| S02 | I-FABP im Serum | Neu: `i_fabp_im_serum`, Einheit `pg/ml`, KSG `krankwert` | numerisch `<= 1500 pg/ml` | `gern auch < 1000 pg/ml` in Bemerkung. |
| S02 | Kalium im Vollblut | Vorhanden: `kalium_im_vollblut` | numerisch `1600-1700 mg/l` | Direkter Bereich. |
| S02 | Kupfer im Vollblut | Vorhanden: `kupfer_im_vollblut` | numerisch `1,0-1,1 mg/l` | Pille und DAO-Kontext in Bemerkung. |
| S03 | Lithium im EDTA-Blut | Vorhanden nah: `lithium_serum_plasma`; für EDTA-Blut ggf. neu `lithium_im_edta_blut` | Kein Zielbereich | Quelle sagt `Zielbereich unklar`; nicht produktiv anlegen. |
| S03 | Lp-PLA2 | Neu: `lp_pla2`, Einheit `U/l`, KSG `krankwert` | numerisch `<= 500 U/l` als präventiver Standard | Strengere Ziele `< 350` bei positivem RF und `< 250` nach Ereignis in Bemerkung; später Kontextmodell prüfen. |
| S03 | Magnesium im Vollblut | Vorhanden: `magnesium_im_vollblut` | numerisch `>= 35 mg/l` | `bis 38 mg/l auch ok` in Bemerkung. |
| S03 | Mangan im Vollblut | Vorhanden: `mangan_im_vollblut` | numerisch `10-11 µg/ml` | Einheit prüfen, weil vorhandene Spurenelemente teils `µg/l` nutzen. |
| S03 | MDA-LDL im Serum | Vorhanden nah: `oxidiertes_ldl`; ggf. neu `mda_ldl_im_serum` | numerisch `<= 40 U/l` | Quelle nennt `< 30-40 U/l`; nur importieren, wenn nicht mit `oxidiertes LDL ng/ml` vermischt wird. |
| S03 | Molybdän im Vollblut | Vorhanden: `molybdan_im_vollblut` | Zielpunkt `1,0 µg/l` | Weicher Zielpunkt. |
| S03 | Aminosäureprofile | Vorhanden: viele Einzelaminosäuren | Textziel: `keine absoluten Mängel; obere Hälfte der Referenz` | Nicht als Sammelzielbereich anlegen; später pro Aminosäure nur mit Laborreferenz sinnvoll. |
| S03 | Nickel im Vollblut | Vorhanden: `nickel_im_vollblut` | Textziel: `so niedrig wie möglich` | Keine harte therapeutische Grenze. |
| S03 | Nitrotyrosin im EDTA-Plasma | Vorhanden nah: `nitrotyrosin_im_serum`; ggf. neu `nitrotyrosin_im_edta_plasma` | numerisch `<= 200 nmol/l` | Mindestziel `< 400 nmol/l`; Material Serum/EDTA-Plasma prüfen. |
| S03 | Omega-3-Index | Vorhanden: `omega_3_index` und `omega_3_index_edta` | numerisch `>= 10 %` | `gern auch 12 %`; EPA `> 2,5 %` und DHA `> 7 %` als Bemerkung oder eigene EPA/DHA-Zielbereiche. |
| S04 | Quecksilber im Vollblut | Vorhanden: `quecksilber_im_vollblut` | Textziel: `so niedrig wie möglich` | Keine harte therapeutische Grenze. |
| S04 | reverse T3 | Neu: `reverse_t3_im_serum`, Einheit `pg/ml`, KSG `krankwert` | numerisch `<= 200 pg/ml` | Quelle nennt `< 180-200 pg/ml`; optional strenger `<= 180` in Bemerkung. |
| S04 | Selen im Vollblut | Vorhanden: `selen_im_vollblut` | numerisch `140-160 µg/l` | Direkter Bereich. |
| S04 | ucOC im Serum | Vorhanden: `ucosteocalcinucocis` | numerisch `<= 2,0 ng/ml` | Bei Osteoporose/Arteriosklerose gern `< 1,0 ng/ml`. |
| S04 | Vitamin B1 bioaktiv im EDTA-Blut | Vorhanden: `vitaminb1bioaktiviedtablut` | numerisch `>= 60 µg/l` | Bei erhöhten AGE großzügig dosieren; Ziel nicht als Laborreferenz. |
| S04 | Vitamin B2 bioaktiv im Serum | Vorhanden: `vitaminb2bioaktivis` | numerisch `250-300 µg/l` | Direkter Bereich. |
| S04 | Vitamin B6 bioaktiv im Serum | Vorhanden: `vitaminb6bioaktivis` | numerisch `30-36 µg/l` | Direkter Bereich. |
| S04 | freies 25-OH-Vitamin-D | Neu prüfen: `freies_25_oh_vitamin_d_im_serum`, Einheit `pg/ml`, KSG `gesundmachwert` | numerisch `19-25 pg/ml` | Nicht auf Gesamt-25-OH-Vitamin-D legen. |
| S04 | Zink im Vollblut | Vorhanden: `zink_im_vollblut` | Zielpunkt `6,0 mg/l` | `7,0 mg/l auch ok`; als weicher Zielpunkt kennzeichnen. |
| S04 | Zonulin im Serum | Neu: `zonulin_im_serum`, Einheit `ng/ml`, KSG `krankwert` | numerisch `<= 30 ng/ml` | `je niedriger desto besser`; Werte `> 70 ng/ml` hoch. |
| S04 | Alkalische Phosphatase | Vorhanden: `alkalische_phosphatase_ap` | getrennt: Männer/Frauen > 50 `80-100 U/l`, Frauen < 50 `60-80 U/l` | Alters-/Geschlechtskontext nur anlegen, wenn sauber abbildbar; sonst zwei Vorschläge mit Bemerkung. |
| S04 | ANA | Neu: `ana_antinukleaere_antikoerper`, Werttyp `text`, KSG `krankwert` | Textziel: `negativ` | Titerwerte `1:80`, `1:160`, `1:360` unspezifisch; `>= 1:640` auffällig. |
| S04 | freier Androgen-Index | Neu: `freier_androgen_index`, KSG geschlechtsabhängig | Männer 20-49 `>= 60`, Männer ab 50 `>= 50`, Frauen 20-49 `2-3`, Frauen ab 50 `1-3` | Nur mit Geschlechts- und Alterskontext anlegen. |
| S04 | Apo-B | Neu: `apolipoprotein_b`, Einheit `mg/dl`, KSG `krankwert` | numerisch `<= 50 mg/dl` | `gern auch < 30 mg/dl`; risikoadaptierte Laborziele nicht vermischen. |
| S05 | Beta-CrossLaps | Vorhanden: `beta_crosslaps` | numerisch `<= 0,5 ng/ml` | Postmenopausal nicht `> 0,7`; bei `> 1,0` Knochendichtemessung. |
| S05 | Biotin | Vorhanden: `biotin` | numerisch `>= 1000 ng/l` | Quelle: `gern > 1000 ng/l halten`. |
| S05 | Bilirubin gesamt | Vorhanden: `bilirubin_gesamt` | Textziel: `möglichst niedrig` | Keine harte therapeutische Grenze; genetisch bedingte Erhöhung beachten. |
| S05 | Calcium im Serum | Vorhanden: `calciumimserum` | Zielpunkt `2,45 mmol/l` | Oberer Referenzbereich günstig; deutlich erhöhte Werte ärztlich abklären. |
| S05 | CCP-AK | Neu: `ccp_antikoerper`, Einheit `U/ml`, KSG `krankwert` | Textziel: `negativ` | Werte `> 200 U/ml` stark hoch; numerische Negativgrenze hängt vom Labor ab. |
| S05 | Cortisol basal im Serum | Vorhanden nah: `cortisol_im_serum`; Tageszeitparameter prüfen | Zielpunkt morgens `120 ng/ml` | Aktuelle Standardeinheit `µg/dl` weicht ab; vor Import Einheit/Parameter klären. |
| S05 | CK | Vorhanden: `ck_kreatinkinase` | Männer `<= 170 U/l`, Frauen `<= 150 U/l` | Geschlechtsgetrennte Zielbereiche. |
| S05 | CRP / hs-CRP | Vorhanden: `crp_hochsensitiv` und `crpquantitativ` | numerisch `<= 0,6 mg/l` | `auf jeden Fall < 1,0 mg/l`; vorhandener allgemeiner Zielbereich `0-1 mg/l` bleibt weniger streng. |
| S05 | Cystatin C | Neu: `cystatin_c`, Einheit `mg/l`, KSG `krankwert` | numerisch `<= 1,0 mg/l` | GFR sollte `> 70 ml/min` sein. |
| S06 | DHEA-S | Vorhanden: `dehydroepiandrosteronsulfat` | Textziel: `oberes Drittel der Referenz` | Alters-/geschlechtsabhängig; kein fixer numerischer Zielbereich. |
| S06 | DHT | Neu: `dihydrotestosteron`, Einheit `ng/dl`, KSG `schluesselwert` | Textziel: `befundabhängig, nicht zu hoch bei Glatzenneigung` | Kein fixer Zielbereich. |
| S06 | Estradiol | Vorhanden: `oestradiol17ssimserum` | Männer `20-25 pg/ml`; Frauen unter HRT `60-80 pg/ml`, max. `100 pg/ml` | Kontext Östron beachten; HRT-Kontext in Bemerkung. |
| S06 | Ferritin | Vorhanden: `ferritin` | Männer `100-300 ng/ml`, Frauen `70-200 ng/ml` | Geschlechtsgetrennte Zielbereiche. |
| S06 | Folsäure im Serum | Vorhanden: `folsaure` | numerisch `>= 16 ng/ml` | Quelle: `anheben und darüber halten`. |
| S06 | FSH | Vorhanden: `fsh_follikelstim_hormon_im_serum` | Textziel mit Kontexten | Männer `< 10 mIU/ml`; HRT mit E2 `40-60 mIU/l`; postmenopausal `> 100` Hinweis auf E2-Mangel. |
| S06 | fT3 | Vorhanden: `ft3` | numerisch `>= 3,0 pg/ml` | `gerne > 3,5 pg/ml`; Therapiekontext. |
| S07 | fT4 | Vorhanden: `ft4` | Zielpunkt `1,4 ng/dl` | Nicht höher bevorzugt wegen rT3-Kontext. |
| S07 | Gesamteiweiß | Vorhanden: `gesamteiwei` | numerisch `7,0-7,5 g/dl` | Bei Auffälligkeiten Elektrophorese/Immunfixation berücksichtigen. |
| S07 | eGFR nach Kreatinin und Cystatin C | Vorhanden: GFR-Parameter | numerisch `>= 70 ml/min/1,73 m²` als abgeleiteter Vorschlag | Quelle formuliert Abklärung bei `< 60`; aus Cystatin-C-Zeile kommt Ziel `> 70`. |
| S07 | Gamma-GT | Vorhanden: `gamma_gt_im_serum` | Männer `<= 40 U/l`, Frauen `<= 30 U/l` | Geschlechtsgetrennt. |
| S07 | GOT | Vorhanden: `got_ast_im_serum` | Männer `<= 35 U/l`, Frauen `<= 30 U/l` | Geschlechtsgetrennt. |
| S07 | GPT | Vorhanden: `gpt_alt_im_serum` | Männer `<= 35 U/l`, Frauen `<= 30 U/l` | Geschlechtsgetrennt. |
| S07 | Harnsäure | Vorhanden: `harnsaure_im_serum` | Männer `<= 6,0 mg/dl`, Frauen `<= 5,0 mg/dl` | Geschlechtsgetrennt. |
| S07 | Harnstoff | Vorhanden: `harnstoff` | numerisch `<= 50 mg/dl` | Identisch mit oberer Referenz; eher Risikogrenze als enger Optimalbereich. |
| S08 | Hämoglobin | Vorhanden: `hamoglobin` | Männer `14,5-16,5 g/dl`, Frauen `12,5-14,5 g/dl` | Unter Testosteronersatz nicht `> 17 g/dl`. |
| S08 | HbA1c | Vorhanden: `hba1c_ifcc` und ggf. Prozentparameter prüfen | numerisch `<= 5,3 %` als optimal; maximal `< 5,7 %` | Nicht auf IFCC-`mmol/mol` legen, solange Einheit Prozent nicht geklärt ist. |
| S08 | HDL-Cholesterin | Vorhanden: `hdl_cholesterin` | numerisch `>= 60 mg/dl` | Quelle: `> 60 mg/dl ist besser`. |
| S08 | Holo-Transcobalamin | Vorhanden: `holotranscobalamin` oder `holotranscobalamin_im_serum` | numerisch `>= 100 pmol/l` | Direkter Mindestwert. |
| S08 | HOMA-Index | Vorhanden: `homa_score` | numerisch `<= 2,0` | Zusätzlich Nüchtern-Insulin `< 5 µU/ml` als Bemerkung oder eigener Zielbereich. |
| S08 | Homocystein | Vorhanden: `homocystein_im_plasma` und `homocystein_i_s` | Zielpunkt `7 µmol/l`, alternativ `<= 10 µmol/l` | Zielpunkt und maximale Grenze getrennt kennzeichnen. |
| S08 | IgA | Neu: `immunglobulin_a_iga`, Einheit `g/l`, KSG `gesundmachwert` | numerisch `>= 1,0 g/l` | Quelle: `besser > 1,0 g/l`. |
| S08 | IgE-Gesamt | Vorhanden: `immunglobulin_e_ige` | Textziel: `negativ, möglichst niedrig` | Keine harte therapeutische Grenze. |
| S08 | IGF BP3 | Neu: `igf_bp3`, Einheit `mg/l`, KSG `schluesselwert` | Kein fixer Zielbereich | Relation zu IGF-1 beobachten; nicht als harter Bereich anlegen. |
| S08 | IGF-1 | Neu: `igf_1`, KSG `schluesselwert` | Textziel: `oberes Drittel der Referenz` | Alters- und geschlechtsabhängig. |
| S09 | IgG | Neu: `immunglobulin_g_igg`, Einheit `g/l`, KSG `schluesselwert` | numerisch `>= 9 g/l` | Bei `> 16 g/l` MGUS/Immunfixation prüfen, wenn Elektrophorese-Hinweis. |
| S09 | IgM | Neu: `immunglobulin_m_igm`, Einheit `g/l`, KSG `schluesselwert` | numerisch `>= 1,0 g/l` | Darf etwas erhöht sein, wenn Elektrophorese unauffällig. |
| S09 | Jod im Serum | Vorhanden: `jod_im_serum` | numerisch `70-100 µg/l` | Kontext TSH, fT4 und rT3 beachten. |
| S09 | Kalium im Serum | Vorhanden: `kaliumimserum` | Zielpunkt `4,5 mmol/l` | Vollblut-Kalium darf nicht niedrig sein. |
| S09 | Kreatinin im Serum | Vorhanden: `kreatinin_im_serum` | Textziel: `knapp unter oberer Referenz bei GFR > 70` | Kein fixer parameterübergreifender Zielbereich wegen Alter/Geschlecht/Muskelmasse. |
| S09 | LDL-Cholesterin | Vorhanden: `ldl_cholesterin` | numerisch `<= 120 mg/dl` als allgemeiner gesunder Bereich | Strenger bei vaskulärem Risiko; nach Ereignissen eher `< 50-70 mg/dl`. |
| S10 | Leukozyten | Vorhanden: `leukozyten` | numerisch `5-6 Tsd./µl` | Weicher unauffälliger Bereich. |
| S10 | LH | Neu: `lh_luteinisierendes_hormon`, Einheit `mIU/ml`, KSG `schluesselwert` | Textziel | FSH:LH-Ratio und HRT-Kontext; kein alleiniger fixer Bereich. |
| S10 | Lipase | Vorhanden: `lipase` | Kein Zielbereich | Quelle gibt keinen Zielwert, sondern Abklärungskontext. |
| S10 | Lp(a) | Vorhanden: `lipoprotein_a_lpa` | numerisch `<= 30 nmol/l` | `noch besser negativ`; Einheit mg/dl/nmol/l nicht mischen. |
| S10 | Lipoprint / LDL-Subfraktionen | Vorhanden: `ldl_1_ls` bis `ldl_7_ls` | Textziel: `small LDL 3-7 negativ; LDL nur aus 1+2` | Als Textziel oder getrennte Zielbereiche für LDL 3-7 mit Ziel `negativ` prüfen. |
| S11 | Magnesium im Serum | Vorhanden: `magnesiumimserum` | numerisch `>= 0,85 mmol/l` | Quelle nennt `> 0,85-1,0`; Vollblut-Magnesium darf nicht niedrig sein. |
| S11 | Melatonin im Serum | Neu: `melatonin_im_serum`, Einheit `µg/l`, KSG `gesundmachwert` | numerisch `>= 15 µg/l` | Quelle: morgens nüchtern mindestens `> 10`, besser `> 15`; Einheit in Quelle uneinheitlich als pg/ml bzw. µg/l genannt. |
| S11 | Mikroalbuminurie | Neu: `mikroalbuminurie`, Einheit kontextabhängig, KSG `krankwert` | Textziel: `kein Mikroalbumin im Urin` | Messart Spontanurin/24h/Kreatininbezug vorher als separate Parameter oder Kontext klären. |
| S11 | Natrium im Serum | Vorhanden: `natriumimserum` | Zielpunkt `140 mmol/l` | Weicher Zielpunkt. |
| S11 | Nikotinamid / Vitamin B3 | Vorhanden: `vitaminb3nicotinamidbioaktiv` | numerisch `>= 40 µg/l` | Direkter Mindestwert. |
| S11 | NT-proBNP | Neu: `nt_probnp`, Einheit `pg/ml`, KSG `krankwert` | bis 50 J. `<= 120 pg/ml`, bis 70 J. `<= 200 pg/ml` | Alterskontext nötig. |
| S11 | oxidiertes LDL | Vorhanden: `oxidiertes_ldl` | numerisch `<= 170 ng/ml` | `je niedriger desto besser`; Ziel entspricht oberer Referenz. |
| S11 | Östron | Neu: `oestron_e1`, Einheit `pg/ml`, KSG `schluesselwert` | Männer `30-50 pg/ml`, Frauen unter transdermaler HRT `50-80 pg/ml` | Zu hoch ungünstig, zu niedrig Osteoporoserisiko. |
| S12 | Parathormon intakt | Vorhanden: `parathormonbiointakt184` | numerisch `20-30 ng/l` | `> 45 ng/l` Hinweis auf Calcium-/Vitamin-D-Thema. |
| S12 | Phosphat im Serum | Vorhanden: `phosphat` | numerisch `2,5-4,0 mg/dl` | Einheit des vorhandenen Parameters `mmol/l`; vor Import ggf. Umrechnung oder neuer Serum-mg/dl-Parameter. |
| S12 | Pregnenolon-S | Neu: `pregnenolon_s`, Einheit `ng/ml`, KSG `gesundmachwert` | numerisch `>= 100 ng/l` laut Transkription | Einheit widersprüchlich zur Referenz `ng/ml`; vor Import Original-PDF prüfen. |
| S12 | Progesteron | Vorhanden: `progesteronimserum` | Männer unter Therapie `1-2 ng/ml`, Frauen unter HRT `2-6 ng/ml` | Therapie- und Geschlechtskontext nötig. |
| S12 | Prolaktin | Vorhanden: `prolaktin` | numerisch `<= 20 ng/ml` | Gilt im nicht-schwangeren Kontext. |
| S12 | Q10 | Vorhanden: `coenzym_q10_mg_l` nah; cholesterinkorrigierten Parameter nicht verwenden | Gesunde `>= 2000 µg/l`; bei Organkrankheit/Mitochondrien `>= 2500 µg/l` | Ggf. neuen nicht cholesterinkorrigierten Q10-Parameter prüfen. |
| S12 | Quick | Neu: `quick`, Einheit `%`, KSG `schluesselwert` | numerisch `>= 80 %` | Untergrenze kann K1-Mangelhinweis sein. |
| S12 | RBP | Neu: `retinol_bindendes_protein`, Einheit `mg/dl`, KSG `schluesselwert` | Kein fixer Zielbereich | Quelle beschreibt Kontext Vitamin A; nicht als harter Bereich anlegen. |
| S12 | Serotonin im Serum | Neu: `serotonin_im_serum`, Einheit `µg/l`, KSG `schluesselwert` | numerisch `>= 150 µg/l` | Mindestens `> 120 µg/l`, besser `> 150 µg/l`; morgens nüchtern. |
| S13 | SHBG | Neu: `shbg`, Einheit `nmol/l`, KSG `schluesselwert` | Kein fixer Zielbereich | Quelle nennt Bindungs-/Östrogenkontext, keinen Zielwert. |
| S13 | TAK | Vorhanden fachlich: `thyreoglobulin_antikoerper` | Textziel: `negativ` | Alias `TAK` ergänzen. |
| S13 | freies Testosteron | Vorhanden prüfen: eigener freier Testosteronparameter fehlt wahrscheinlich | Männer Textziel `obere Referenz`, Frauen `Mitte der Referenz` | Besser separaten Parameter `testosteron_frei` anlegen, nicht auf Gesamt-Testosteron legen. |
| S13 | Gesamt-Testosteron | Vorhanden: `testosteron` | Männer Textziel `oberer Bereich`; Frauen `0,3-0,45 ng/ml` oder höher je nach Befund/SHBG | Geschlechtskontext zwingend. |
| S13 | Triglyceride | Vorhanden: `triglyceride` | numerisch `<= 120 mg/dl` | Nüchternwert. |
| S13 | TPO-AK | Vorhanden: `tpo_antikoerper` | Textziel: `negativ` | Alias `TPO-AK` ggf. ergänzen. |
| S13 | TRAK | Vorhanden: `tsh_rezeptor_antikoerper` | Textziel: `negativ` | Alias `TRAK` ggf. ergänzen. |
| S13 | Transferrinsättigung | Vorhanden: `transferrinsattigung` | Frauen `20-40 %`, Männer `25-45 %` | Geschlechtsgetrennt. |
| S13 | TRAP5b | Vorhanden: `trap_5b` | numerisch `<= 3,5 U/l` | `> 5,0 U/l` starker Knochenabbau-Kontext. |
| S13 | Thrombozyten | Vorhanden: `thrombozyten` | Zielpunkt `200 Tsd./µl` | Weicher unauffälliger Zielpunkt; deutliche/dauerhafte Abweichungen abklären. |
| S14 | TSH | Vorhanden: `tsh_basal` | ohne T4/T3-Therapie `<= 2,0 µIU/ml`; Kinderwunsch Zielpunkt `0,5`, mindestens `< 1,0` | Therapie/Knoten/Autoimmunthyreoiditis anders; Kontext zwingend. |
| S14 | Vitamin A / Retinol | Vorhanden: `vitamin_a` | numerisch `700-900 µg/l` | Vorhandene Standardeinheit `ng/ml`; 1:1 zu `µg/l`, Einheit bewusst prüfen. |
| S14 | Vitamin B12 | Vorhanden: `vitamin_b12` | Zielpunkt `1000 pg/ml` | `< 600 pg/ml` für Gesundheitsgestaltung zu wenig. |
| S14 | Vitamin C | Neu: `vitamin_c_im_serum`, Einheit `mg/l`, KSG `gesundmachwert` | numerisch `10-20 mg/l` | Quelle: `bei > 10-20 mg/l halten`. |
| S14 | 1,25-OH-Vitamin-D / Calcitriol | Vorhanden: `125dihydroxyvitamindcalcitriol` | numerisch `30-40 pg/ml` | D-Ratio zusätzlich beachten. |
| S14 | 25-OH-Vitamin-D / Calcidiol | Vorhanden: `25hydroxyvitamind` | numerisch `50-70 ng/ml` | Werte höher ok, solange D-Ratio `< 1,0` und Serum-Calcium normal; vorhandener allgemeiner Zielbereich ist weniger spezifisch. |
| S15 | Vitamin-D-Ratio | Vorhanden: `vitamin_d_ratio` | Zielpunkt `0,5`; maximal `< 1,0` | Als Zielpunkt plus obere Grenze oder zwei getrennte Zielbereichshinweise modellieren. |
| S15 | Vitamin E | Vorhanden: `vitamin_e` | numerisch `16-25 mg/l` | Bei gutem Vitamin C; vorhandene Standardeinheit `µg/ml` entspricht `mg/l`. |

## Direkte Folgearbeiten vor produktiver Anlage

1. Parameter-Neuanlagen und Alias-Ergänzungen aus der Tabelle prüfen.
2. Einheitengleichheit prüfen, besonders bei Vitamin A, Vitamin E, Phosphat, Cortisol, HbA1c, Q10, Mangan und Pregnenolon.
3. Für `negativ`, `so niedrig wie möglich`, Zielpunkte und alters-/geschlechtsabhängige Bereiche entscheiden, ob sie als Textziel oder getrennte numerische Zielbereiche angelegt werden sollen.
4. Danach kann ein optionaler Paket-Patch erzeugt werden, der die Orfanos-Boeckel-Optimalbereiche mit `zielwert_paket`, Laborbezug in `quelle_stelle` und `quelle_original_text` in `zielbereiche` ergänzt.
