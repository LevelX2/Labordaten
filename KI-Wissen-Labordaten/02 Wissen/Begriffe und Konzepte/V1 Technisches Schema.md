---
typ: technisches-schema
status: entwurf
letzte_aktualisierung: 2026-04-21
quellen:
  - V1 Ziel-Datenmodell.md
  - Planung Erstarchitektur und Umsetzungsphasen.md
  - ../Entscheidungen/V1 Vorentscheidungen Produktform und Kernmodell.md
  - ../../../apps/backend/src/labordaten_backend/modules/personen/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/messwerte/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/referenzen/schemas.py
  - ../../../apps/backend/src/labordaten_backend/modules/zielbereiche/schemas.py
  - ../../../apps/backend/src/labordaten_backend/models/zielbereich_quelle.py
  - ../../../apps/backend/src/labordaten_backend/models/zielwert_paket.py
  - ../../../apps/backend/src/labordaten_backend/modules/befunde/schemas.py
tags:
  - schema
  - datenbank
  - v1
  - technik
---

# V1 Technisches Schema

## Kurzfassung
Das technische V1-Schema setzt das fachliche Ziel-Datenmodell in eine relationale lokale Datenbank um. Es priorisiert klare Beziehungen, prüfbare Konsistenz, saubere Importfreigabe und gute Erweiterbarkeit bei gleichzeitig überschaubarer V1-Komplexität.

## Priorisierung
- Dieses Schema sollte vor dem UI-Screenplan konkretisiert werden.
- Die Oberfläche hängt stark an Importprüfung, Zielbereichslogik, Messwerttypisierung und Planungsabfragen.
- Ein stabiles Schema reduziert spätere Umbauten an Formularen, Filtern und Berichten.

## Technische Grundannahmen
- Relationale lokale Datenbank, bevorzugt SQLite für V1.
- Primärschlüssel als `TEXT` mit UUID oder als `INTEGER`; fachlich ist beides möglich.
- Zeitstempel in ISO-8601 UTC oder als lokale Zeit mit klarer Konvention.
- JSON-Felder nur dort, wo Struktur bewusst flexibel bleiben soll.
- Dateien wie PDFs oder Markdown-Seiten bleiben im Dateisystem.

## Tabellenübersicht
- `person`
- `basisdaten_typ`
- `person_basisdaten_eintrag`
- `labor`
- `wissensseite`
- `laborparameter`
- `parameter_synonym`
- `parameter_umrechnungsregel`
- `parameter_beziehung`
- `parameter_klassifikation`
- `parameter_gruppe`
- `gruppen_parameter`
- `dokument`
- `importvorgang`
- `import_pruefpunkt`
- `befund`
- `messwert`
- `messwert_referenz`
- `zielbereich_quelle`
- `zielwert_paket`
- `zielbereich`
- `zielbereich_person_override`
- `planung_zyklisch`
- `planung_einmalig`
- `berichtsvorlage`
- `einstellung`
- `datenbasis_sperre`

## Tabellen im Detail

### person
- `id` PK
- `anzeigename` NOT NULL
- `vollname`
- `geburtsdatum` NOT NULL
- `geschlecht_code`
- `blutgruppe`
- `rhesusfaktor`
- `hinweise_allgemein`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Checks:
- `geschlecht_code` entweder NULL oder in `w`, `m`, `d`

Indizes:
- Index auf `anzeigename`
- Index auf `geburtsdatum`
- Optional zusammengesetzt auf `aktiv, anzeigename`

### basisdaten_typ
- `id` PK
- `code` NOT NULL UNIQUE
- `anzeigename` NOT NULL
- `beschreibung`
- `standard_einheit`
- `aktiv` NOT NULL DEFAULT 1
- `sortierung`
- `system_flag` NOT NULL DEFAULT 0
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Unique auf `code`
- Index auf `aktiv, sortierung, anzeigename`

### person_basisdaten_eintrag
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `basisdaten_typ_id` NOT NULL FK -> `basisdaten_typ.id`
- `wert_num` NOT NULL
- `einheit`
- `datum` NOT NULL
- `bemerkung`
- `quelle_text`
- `erstellt_am` NOT NULL

Indizes:
- Index auf `person_id, basisdaten_typ_id, datum DESC`

Checks:
- `wert_num` bleibt in V1 numerisch; textuelle Basisdaten brauchen erst mit eigener Modellentscheidung zusätzliche Felder

### labor
- `id` PK
- `name` NOT NULL
- `adresse`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `name`
- Optional `aktiv, name`

### wissensseite
- `id` PK
- `pfad_relativ` NOT NULL
- `titel_cache`
- `alias_cache`
- `frontmatter_json`
- `letzter_scan_am`
- `aktiv` NOT NULL DEFAULT 1

Constraints:
- `pfad_relativ` UNIQUE

### laborparameter
- `id` PK
- `interner_schluessel` NOT NULL UNIQUE
- `anzeigename` NOT NULL
- `beschreibung`
- `standard_einheit`
- `wert_typ_standard` NOT NULL
- `primaere_klassifikation`
- `wissensseite_id` FK -> `wissensseite.id`
- `aktiv` NOT NULL DEFAULT 1
- `sortierschluessel`
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- UNIQUE auf `interner_schluessel`
- Index auf `anzeigename`
- Index auf `aktiv, anzeigename`
- Index auf `primaere_klassifikation`

Checks:
- `wert_typ_standard` in `numerisch`, `text`
- `primaere_klassifikation` NULL oder in `krankwert`, `schluesselwert`, `gesundmachwert`

### parameter_synonym
- `id` PK
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `synonym` NOT NULL
- `labor_id` FK -> `labor.id`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1

Indizes:
- Unique auf `laborparameter_id, synonym, labor_id`
- Suchindex auf `synonym`

Hinweis:
- Konflikte gleicher Synonyme über mehrere Parameter werden nicht hart per globalem Unique verboten, sondern im Import als Warnung behandelt.

### parameter_umrechnungsregel
- `id` PK
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `von_einheit` NOT NULL
- `nach_einheit` NOT NULL
- `regel_typ` NOT NULL
- `faktor`
- `offset`
- `formel_text`
- `rundung_stellen`
- `quelle_beschreibung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL

Indizes:
- Unique auf `laborparameter_id, von_einheit, nach_einheit, aktiv`

Checks:
- `regel_typ` in `faktor`, `faktor_offset`, `formel`

### parameter_beziehung
- `id` PK
- `quelle_parameter_id` NOT NULL FK -> `laborparameter.id`
- `ziel_parameter_id` NOT NULL FK -> `laborparameter.id`
- `beziehungs_typ` NOT NULL
- `bemerkung`

Indizes:
- Unique auf `quelle_parameter_id, ziel_parameter_id, beziehungs_typ`

### parameter_klassifikation
- `id` PK
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `klassifikation` NOT NULL
- `kontext_beschreibung`
- `begruendung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `laborparameter_id`
- Index auf `klassifikation`

Checks:
- `klassifikation` in `krankwert`, `schluesselwert`, `gesundmachwert`

### parameter_gruppe
- `id` PK
- `name` NOT NULL
- `beschreibung`
- `wissensseite_id` FK -> `wissensseite.id`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `name`

### gruppen_parameter
- `id` PK
- `parameter_gruppe_id` NOT NULL FK -> `parameter_gruppe.id`
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `sortierung`
- `bemerkung`

Constraints:
- UNIQUE auf `parameter_gruppe_id, laborparameter_id`

Indizes:
- Index auf `parameter_gruppe_id, sortierung`

### dokument
- `id` PK
- `dokument_typ` NOT NULL
- `pfad_relativ`
- `pfad_absolut`
- `dateiname` NOT NULL
- `mime_typ`
- `dateigroesse_bytes`
- `checksumme_sha256`
- `originalquelle_behalten` NOT NULL DEFAULT 0
- `bemerkung`
- `erstellt_am` NOT NULL

Checks:
- mindestens eines von `pfad_relativ` oder `pfad_absolut` befüllt

Indizes:
- Index auf `dokument_typ`
- Index auf `checksumme_sha256`

### importvorgang
- `id` PK
- `quelle_typ` NOT NULL
- `status` NOT NULL
- `person_id_vorschlag` FK -> `person.id`
- `dokument_id` FK -> `dokument.id`
- `roh_payload_text`
- `schema_version`
- `fingerprint`
- `warnungen_text`
- `bemerkung`
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `status, erstellt_am DESC`
- Index auf `quelle_typ`
- Index auf `fingerprint`

### import_pruefpunkt
- `id` PK
- `importvorgang_id` NOT NULL FK -> `importvorgang.id`
- `objekt_typ` NOT NULL
- `objekt_schluessel_temp`
- `pruefart` NOT NULL
- `status` NOT NULL
- `meldung` NOT NULL
- `bestaetigt_vom_nutzer` NOT NULL DEFAULT 0
- `bestaetigt_am`

Indizes:
- Index auf `importvorgang_id, status`
- Index auf `importvorgang_id, objekt_typ`

### befund
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `labor_id` FK -> `labor.id`
- `dokument_id` FK -> `dokument.id`
- `entnahmedatum`
- `befunddatum`
- `eingangsdatum`
- `bemerkung`
- `importvorgang_id` FK -> `importvorgang.id`
- `quelle_typ` NOT NULL
- `duplikat_warnung` NOT NULL DEFAULT 0
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `person_id, entnahmedatum DESC`
- Index auf `labor_id, entnahmedatum DESC`
- Index auf `importvorgang_id`

### messwert
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `befund_id` NOT NULL FK -> `befund.id`
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `original_parametername` NOT NULL
- `wert_typ` NOT NULL
- `wert_operator` NOT NULL DEFAULT `exakt`
- `wert_roh_text` NOT NULL
- `wert_num`
- `wert_text`
- `einheit_original`
- `wert_normiert_num`
- `einheit_normiert`
- `umrechnungsregel_id` FK -> `parameter_umrechnungsregel.id`
- `bemerkung_kurz`
- `bemerkung_lang`
- `unsicher_flag` NOT NULL DEFAULT 0
- `pruefbedarf_flag` NOT NULL DEFAULT 0
- `importvorgang_id` FK -> `importvorgang.id`
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `person_id, laborparameter_id, erstellt_am DESC`
- Index auf `befund_id`
- Index auf `laborparameter_id, wert_typ`
- Index auf `importvorgang_id`

Checks:
- `wert_typ` in `numerisch`, `text`
- `wert_operator` in `exakt`, `kleiner_als`, `kleiner_gleich`, `groesser_als`, `groesser_gleich`, `ungefaehr`
- Wenn `wert_typ = numerisch`, dann `wert_num IS NOT NULL OR pruefbedarf_flag = 1`
- Wenn `wert_typ = text`, dann `wert_text IS NOT NULL OR wert_roh_text IS NOT NULL`

Anwendungsregel:
- `messwert.person_id` muss mit `befund.person_id` übereinstimmen; das ist per Trigger oder Anwendungsschicht zu prüfen.

### messwert_referenz
- `id` PK
- `messwert_id` NOT NULL FK -> `messwert.id`
- `referenz_typ` NOT NULL
- `referenz_text_original`
- `wert_typ` NOT NULL
- `untere_grenze_num`
- `obere_grenze_num`
- `einheit`
- `soll_text`
- `geschlecht_code`
- `alter_min_tage`
- `alter_max_tage`
- `bemerkung`

Indizes:
- Index auf `messwert_id`
- Index auf `geschlecht_code, alter_min_tage, alter_max_tage`

Checks:
- `referenz_typ` in `labor`, `ziel_allgemein`, `ziel_person`
- `wert_typ` in `numerisch`, `text`

Hinweis:
- V1 nutzt für konkrete Messungen vor allem `referenz_typ = labor`; die zusätzlichen Werte erlauben aber einheitlichere Auswertung.

### zielbereich_quelle
- `id` PK
- `name` NOT NULL
- `quellen_typ` NOT NULL DEFAULT `experte`
- `titel`
- `jahr`
- `version`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `name`

Checks:
- `quellen_typ` in `experte`, `buch`, `leitlinie`, `labor`, `eigene_vorgabe`

### zielwert_paket
- `id` PK
- `paket_schluessel` NOT NULL UNIQUE
- `name` NOT NULL
- `zielbereich_quelle_id` FK -> `zielbereich_quelle.id`
- `version`
- `jahr`
- `beschreibung`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Unique auf `paket_schluessel`
- Index auf `name`
- Index auf `zielbereich_quelle_id`

Hinweis:
- `zielwert_paket` ist das technische Verwaltungsobjekt für optionale Zielbereichssammlungen. Eine Deaktivierung des Pakets deaktiviert die zugehörigen aktiven `zielbereich`-Datensätze, entfernt aber keine neutralen Parameterstammdaten.

### zielbereich
- `id` PK
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `zielbereich_quelle_id` FK -> `zielbereich_quelle.id`
- `zielwert_paket_id` FK -> `zielwert_paket.id`
- `wert_typ` NOT NULL
- `zielbereich_typ` NOT NULL DEFAULT `allgemein`
- `untere_grenze_num`
- `obere_grenze_num`
- `einheit`
- `soll_text`
- `geschlecht_code`
- `alter_min_tage`
- `alter_max_tage`
- `quelle_original_text`
- `quelle_stelle`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `laborparameter_id, aktiv`
- Index auf `zielbereich_quelle_id`
- Index auf `zielwert_paket_id`
- Index auf `zielbereich_typ`
- Index auf `geschlecht_code, alter_min_tage, alter_max_tage`

Checks:
- `zielbereich_typ` in `allgemein`, `optimalbereich`, `therapieziel`, `mangelbereich`, `risikobereich`

### zielbereich_person_override
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `zielbereich_id` NOT NULL FK -> `zielbereich.id`
- `untere_grenze_num`
- `obere_grenze_num`
- `einheit`
- `soll_text`
- `bemerkung`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL

Constraints:
- Unique auf `person_id, zielbereich_id, aktiv`

### planung_zyklisch
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `intervall_wert` NOT NULL
- `intervall_typ` NOT NULL
- `startdatum` NOT NULL
- `enddatum`
- `status` NOT NULL
- `prioritaet`
- `karenz_tage` NOT NULL DEFAULT 0
- `bemerkung`
- `letzte_relevante_messung_id` FK -> `messwert.id`
- `naechste_faelligkeit`
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `person_id, status, naechste_faelligkeit`
- Index auf `laborparameter_id, status`

Checks:
- `intervall_typ` in `tage`, `wochen`, `monate`, `jahre`
- `status` in `aktiv`, `pausiert`, `beendet`

### planung_einmalig
- `id` PK
- `person_id` NOT NULL FK -> `person.id`
- `laborparameter_id` NOT NULL FK -> `laborparameter.id`
- `status` NOT NULL
- `erstellt_am` NOT NULL
- `zieltermin_datum`
- `bemerkung`
- `erledigt_durch_messwert_id` FK -> `messwert.id`
- `geaendert_am` NOT NULL

Indizes:
- Index auf `person_id, status, zieltermin_datum`

Checks:
- `status` in `offen`, `naechster_termin`, `erledigt`, `uebersprungen`, `abgebrochen`

### berichtsvorlage
- `id` PK
- `name` NOT NULL
- `bericht_typ` NOT NULL
- `konfiguration_json`
- `aktiv` NOT NULL DEFAULT 1
- `erstellt_am` NOT NULL
- `geaendert_am` NOT NULL

Indizes:
- Index auf `bericht_typ, aktiv`

### einstellung
- `id` PK
- `schluessel` NOT NULL UNIQUE
- `wert_text`
- `wert_json`
- `bereich` NOT NULL
- `geaendert_am` NOT NULL

### datenbasis_sperre
- `id` PK
- `datenbasis_name` NOT NULL
- `geraetename` NOT NULL
- `prozess_info`
- `gesperrt_seit` NOT NULL
- `heartbeat_am` NOT NULL
- `manuell_freigegeben_am`
- `bemerkung`

Indizes:
- Unique oder semantisch eindeutig auf `datenbasis_name`

## Empfohlene Trigger oder Anwendungskontrollen
- `messwert.person_id == befund.person_id`
- `planung_zyklisch.letzte_relevante_messung_id` muss zur gleichen Person und zum gleichen Parameter passen
- `planung_einmalig.erledigt_durch_messwert_id` muss zu Person und Parameter passen
- Dublettenvorschläge auf Basis von `person_id`, `labor_id`, `entnahmedatum`, `befunddatum`, Dokument-Checksumme und Messwertähnlichkeit
- Beim Löschen von Stammdaten bevorzugt `aktiv = 0` statt physischem Delete

## Empfohlene View- oder Query-Bausteine
- `vw_letzter_messwert_pro_person_parameter`
- `vw_faellige_planung`
- `vw_naechster_termin_vorschlag`
- `vw_aktive_zielbereiche_effektiv`
- `vw_messwert_mit_laborreferenz`
- `vw_import_warnungen_offen`

## Bewusste V1-Vereinfachungen
- Keine formale Änderungshistorie über alte Datensätze hinweg
- Keine komplizierte Rollen- oder Benutzerverwaltung
- Keine harte globale Normalisierung jeder Referenzlogik
- Keine direkte DB-Schnittstelle für externe KI-Helfer

## Offene technische Restpunkte
- Exakte ID-Strategie: UUID oder Integer
- Trigger versus reine Anwendungskontrolle für Konsistenzregeln
- Ob `pfad_absolut` wirklich nötig bleibt oder auf Basispfade reduziert werden kann
- Welche weiteren semantisch engen Codefelder in V1 nicht nur dokumentiert, sondern auch durchgängig in API-Schemas, UI-Auswahlen und Datenbank-Checks hart validiert werden sollen

## Einordnung für die weitere Umsetzung
- Dieses Schema ist der richtige technische Startpunkt für Migrationen und Repository-Struktur.
- Der nächste sinnvolle Schritt ist daraus die Oberflächenlogik mit Hauptseiten, Detailseiten, Formularmodi und Prüfworkflows abzuleiten.
