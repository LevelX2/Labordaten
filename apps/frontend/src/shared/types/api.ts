export type GeschlechtCode = "w" | "m" | "d";
export type BlutgruppeCode = "0" | "A" | "B" | "AB";
export type RhesusfaktorCode = "positiv" | "negativ";
export type WertTyp = "numerisch" | "text";
export type WertOperator =
  | "exakt"
  | "kleiner_als"
  | "kleiner_gleich"
  | "groesser_als"
  | "groesser_gleich"
  | "ungefaehr";
export type ReferenzGrenzOperator =
  | "kleiner_als"
  | "kleiner_gleich"
  | "groesser_als"
  | "groesser_gleich";
export type ReferenzTyp = "labor" | "ziel_allgemein" | "ziel_person";
export type BefundQuelleTyp = "manuell" | "import" | "ki_import";
export type UmrechnungsregelTyp = "faktor" | "faktor_plus_offset" | "formel";
export type ParameterKlassifikationCode = "krankwert" | "schluesselwert" | "gesundmachwert";
export type ZielbereichTyp = "allgemein" | "optimalbereich" | "therapieziel" | "mangelbereich" | "risikobereich";
export type ZielbereichQuelleTyp = "experte" | "buch" | "leitlinie" | "labor" | "eigene_vorgabe";

export type PersonCreatePayload = {
  anzeigename: string;
  vollname?: string | null;
  geburtsdatum: string;
  geschlecht_code?: GeschlechtCode | null;
  blutgruppe?: BlutgruppeCode | null;
  rhesusfaktor?: RhesusfaktorCode | null;
  hinweise_allgemein?: string | null;
};

export type PersonUpdatePayload = PersonCreatePayload;

export type LaborCreatePayload = {
  name: string;
  adresse?: string | null;
  bemerkung?: string | null;
};

export type LaborUpdatePayload = LaborCreatePayload;

export type ParameterCreatePayload = {
  interner_schluessel?: string | null;
  anzeigename: string;
  beschreibung?: string | null;
  standard_einheit?: string | null;
  wert_typ_standard: WertTyp;
  primaere_klassifikation?: ParameterKlassifikationCode | null;
  sortierschluessel?: string | null;
};

export type ParameterStandardEinheitUpdatePayload = {
  standard_einheit?: string | null;
};

export type ParameterPrimaereKlassifikationUpdatePayload = {
  primaere_klassifikation?: ParameterKlassifikationCode | null;
};

export type ParameterPrimaereKlassifikationUpdateResult = {
  parameter_id: string;
  parameter_anzeigename: string;
  primaere_klassifikation?: ParameterKlassifikationCode | null;
};

export type ParameterWissensseiteUpdatePayload = {
  pfad_relativ?: string | null;
};

export type ParameterWissensseiteUpdateResult = {
  parameter_id: string;
  parameter_anzeigename: string;
  wissensseite_id?: string | null;
  wissensseite_pfad_relativ?: string | null;
  wissensseite_titel?: string | null;
};

export type ParameterUmrechnungsregelCreatePayload = {
  von_einheit: string;
  nach_einheit: string;
  regel_typ: UmrechnungsregelTyp;
  faktor?: number | null;
  offset?: number | null;
  formel_text?: string | null;
  rundung_stellen?: number | null;
  quelle_beschreibung?: string | null;
  bemerkung?: string | null;
};

export type EinheitCreatePayload = {
  kuerzel: string;
};

export type EinheitAliasCreatePayload = {
  alias_text: string;
  bemerkung?: string | null;
};

export type MesswertCreatePayload = {
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: WertTyp;
  wert_operator?: WertOperator;
  wert_roh_text: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit_original?: string | null;
  bemerkung_kurz?: string | null;
  bemerkung_lang?: string | null;
  unsicher_flag?: boolean;
  pruefbedarf_flag?: boolean;
};

export type MesswertReferenzCreatePayload = {
  referenz_typ: ReferenzTyp;
  wert_typ: WertTyp;
  referenz_text_original?: string | null;
  untere_grenze_num?: number | null;
  untere_grenze_operator?: ReferenzGrenzOperator | null;
  obere_grenze_num?: number | null;
  obere_grenze_operator?: ReferenzGrenzOperator | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: GeschlechtCode | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  bemerkung?: string | null;
};

export type ZielbereichCreatePayload = {
  wert_typ: WertTyp;
  zielbereich_typ: ZielbereichTyp;
  zielbereich_quelle_id?: string | null;
  untere_grenze_num?: number | null;
  obere_grenze_num?: number | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: GeschlechtCode | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  quelle_original_text?: string | null;
  quelle_stelle?: string | null;
  bemerkung?: string | null;
};

export type ZielbereichUpdatePayload = Omit<ZielbereichCreatePayload, "wert_typ">;

export type ZielbereichQuelleCreatePayload = {
  name: string;
  quellen_typ: ZielbereichQuelleTyp;
  titel?: string | null;
  jahr?: number | null;
  version?: string | null;
  bemerkung?: string | null;
};

export type ZielbereichQuelleUpdatePayload = ZielbereichQuelleCreatePayload & {
  aktiv: boolean;
};

export type Person = {
  id: string;
  anzeigename: string;
  vollname?: string | null;
  geburtsdatum: string;
  geschlecht_code?: GeschlechtCode | null;
  blutgruppe?: BlutgruppeCode | null;
  rhesusfaktor?: RhesusfaktorCode | null;
  hinweise_allgemein?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
  messwerte_anzahl: number;
};

export type Parameter = {
  id: string;
  interner_schluessel: string;
  anzeigename: string;
  beschreibung?: string | null;
  standard_einheit?: string | null;
  wert_typ_standard: WertTyp;
  primaere_klassifikation?: ParameterKlassifikationCode | null;
  sortierschluessel?: string | null;
  wissensseite_id?: string | null;
  wissensseite_pfad_relativ?: string | null;
  wissensseite_titel?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
  messwerte_anzahl: number;
};

export type ParameterStandardEinheitUpdateResult = {
  parameter_id: string;
  parameter_anzeigename: string;
  standard_einheit?: string | null;
  neu_berechnete_messwerte: number;
};

export type Einheit = {
  id: string;
  kuerzel: string;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
  aliase: EinheitAlias[];
};

export type EinheitAlias = {
  id: string;
  einheit_id: string;
  alias_text: string;
  alias_normalisiert: string;
  bemerkung?: string | null;
  erstellt_am: string;
  geaendert_am: string;
};

export type ParameterAlias = {
  id: string;
  laborparameter_id: string;
  alias_text: string;
  alias_normalisiert: string;
  bemerkung?: string | null;
  erstellt_am: string;
  geaendert_am: string;
};

export type ParameterKlassifikation = {
  id: string;
  laborparameter_id: string;
  klassifikation: ParameterKlassifikationCode;
  kontext_beschreibung?: string | null;
  begruendung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type ParameterKlassifikationCreatePayload = {
  klassifikation: ParameterKlassifikationCode;
  kontext_beschreibung?: string | null;
  begruendung?: string | null;
};

export type ParameterKlassifikationDeleteResult = {
  klassifikation_id: string;
};

export type ParameterAliasSuggestion = {
  laborparameter_id: string;
  parameter_anzeigename: string;
  alias_text: string;
  alias_normalisiert: string;
  vorkommen_anzahl: number;
  letzte_verwendung_am?: string | null;
};

export type ParameterUmrechnungsregel = {
  id: string;
  laborparameter_id: string;
  von_einheit: string;
  nach_einheit: string;
  regel_typ: UmrechnungsregelTyp;
  faktor?: number | null;
  offset?: number | null;
  formel_text?: string | null;
  rundung_stellen?: number | null;
  quelle_beschreibung?: string | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type ParameterGruppenzuordnung = {
  id: string;
  parameter_gruppe_id: string;
  gruppenname: string;
  sortierung?: number | null;
};

export type ParameterUsageSummary = {
  parameter_id: string;
  anzeigename: string;
  interner_schluessel: string;
  standard_einheit?: string | null;
  wert_typ_standard: WertTyp;
  primaere_klassifikation?: ParameterKlassifikationCode | null;
  messwerte_anzahl: number;
  gruppen_anzahl: number;
  zielbereiche_anzahl: number;
  planung_zyklisch_anzahl: number;
  planung_einmalig_anzahl: number;
  alias_anzahl: number;
};

export type ParameterDuplicateSuggestion = {
  ziel_parameter_id: string;
  ziel_parameter_anzeigename: string;
  quell_parameter_id: string;
  quell_parameter_anzeigename: string;
  gemeinsamer_name_vorschlag: string;
  begruendung: string;
  aehnlichkeit: number;
  einheiten_hinweis?: string | null;
  ziel_parameter: ParameterUsageSummary;
  quell_parameter: ParameterUsageSummary;
};

export type ParameterDuplicateSuppression = {
  id: string;
  erster_parameter_id: string;
  erster_parameter_anzeigename: string;
  zweiter_parameter_id: string;
  zweiter_parameter_anzeigename: string;
  erstellt_am: string;
  geaendert_am: string;
};

export type ParameterMergeResult = {
  ziel_parameter_id: string;
  geloeschter_parameter_id: string;
  gemeinsamer_name: string;
  angelegte_aliase: string[];
  uebersprungene_aliase: string[];
  verschobene_messwerte: number;
  verschobene_zielbereiche: number;
  verschobene_planung_zyklisch: number;
  verschobene_planung_einmalig: number;
  verschobene_gruppenzuordnungen: number;
  entfernte_doppelte_gruppenzuordnungen: number;
};

export type ParameterRenameResult = {
  parameter_id: string;
  neuer_name: string;
  alter_name: string;
  alias_angelegt: boolean;
  alias_name?: string | null;
};

export type Gruppe = {
  id: string;
  name: string;
  beschreibung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
  parameter_anzahl: number;
};

export type GruppenParameter = {
  id: string;
  parameter_gruppe_id: string;
  laborparameter_id: string;
  parameter_anzeigename: string;
  interner_schluessel: string;
  wert_typ_standard: WertTyp;
  standard_einheit?: string | null;
  sortierung?: number | null;
};

export type Labor = {
  id: string;
  name: string;
  adresse?: string | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type Befund = {
  id: string;
  person_id: string;
  person_anzeigename?: string | null;
  labor_id?: string | null;
  labor_name?: string | null;
  dokument_id?: string | null;
  dokument_dateiname?: string | null;
  dokument_pfad?: string | null;
  entnahmedatum?: string | null;
  befunddatum?: string | null;
  eingangsdatum?: string | null;
  bemerkung?: string | null;
  quelle_typ: BefundQuelleTyp;
  duplikat_warnung: boolean;
  messwerte_anzahl: number;
  erstellt_am: string;
  geaendert_am: string;
};

export type Messwert = {
  id: string;
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: WertTyp;
  wert_operator: WertOperator;
  wert_roh_text: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit_original?: string | null;
  wert_normiert_num?: number | null;
  einheit_normiert?: string | null;
  umrechnungsregel_id?: string | null;
  bemerkung_kurz?: string | null;
  bemerkung_lang?: string | null;
  unsicher_flag: boolean;
  pruefbedarf_flag: boolean;
  person_anzeigename?: string | null;
  parameter_anzeigename?: string | null;
  parameter_primaere_klassifikation?: ParameterKlassifikationCode | null;
  labor_id?: string | null;
  labor_name?: string | null;
  entnahmedatum?: string | null;
  gruppen_namen: string[];
  erstellt_am: string;
  geaendert_am: string;
};

export type MesswertReferenz = {
  id: string;
  messwert_id: string;
  referenz_typ: ReferenzTyp;
  referenz_text_original?: string | null;
  wert_typ: WertTyp;
  untere_grenze_num?: number | null;
  untere_grenze_operator?: ReferenzGrenzOperator | null;
  obere_grenze_num?: number | null;
  obere_grenze_operator?: ReferenzGrenzOperator | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: GeschlechtCode | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  bemerkung?: string | null;
};

export type Zielbereich = {
  id: string;
  laborparameter_id: string;
  zielbereich_quelle_id?: string | null;
  wert_typ: WertTyp;
  zielbereich_typ: ZielbereichTyp;
  untere_grenze_num?: number | null;
  obere_grenze_num?: number | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: GeschlechtCode | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  quelle_original_text?: string | null;
  quelle_stelle?: string | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type ZielbereichQuelle = {
  id: string;
  name: string;
  quellen_typ: ZielbereichQuelleTyp;
  titel?: string | null;
  jahr?: number | null;
  version?: string | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type ZielbereichOverride = {
  id: string;
  person_id: string;
  zielbereich_id: string;
  laborparameter_id: string;
  parameter_anzeigename: string;
  wert_typ: WertTyp;
  basis_untere_grenze_num?: number | null;
  basis_obere_grenze_num?: number | null;
  basis_einheit?: string | null;
  basis_soll_text?: string | null;
  untere_grenze_num?: number | null;
  obere_grenze_num?: number | null;
  einheit?: string | null;
  soll_text?: string | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am?: string | null;
};

export type PlanungZyklisch = {
  id: string;
  person_id: string;
  laborparameter_id: string;
  intervall_wert: number;
  intervall_typ: string;
  startdatum: string;
  enddatum?: string | null;
  status: string;
  prioritaet: number;
  karenz_tage: number;
  bemerkung?: string | null;
  letzte_relevante_messung_id?: string | null;
  letzte_relevante_messung_datum?: string | null;
  naechste_faelligkeit?: string | null;
  faelligkeitsstatus: string;
  erstellt_am: string;
  geaendert_am: string;
};

export type PlanungEinmalig = {
  id: string;
  person_id: string;
  laborparameter_id: string;
  status: string;
  zieltermin_datum?: string | null;
  bemerkung?: string | null;
  erledigt_durch_messwert_id?: string | null;
  erstellt_am: string;
  geaendert_am: string;
};

export type PlanungFaelligkeit = {
  planung_typ: string;
  planung_id: string;
  person_id: string;
  laborparameter_id: string;
  status: string;
  prioritaet?: number | null;
  bemerkung?: string | null;
  letzte_relevante_messung_id?: string | null;
  letzte_relevante_messung_datum?: string | null;
  naechste_faelligkeit?: string | null;
  zieltermin_datum?: string | null;
  intervall_label?: string | null;
};

export type ImportPruefpunkt = {
  id: string;
  importvorgang_id: string;
  objekt_typ: string;
  objekt_schluessel_temp?: string | null;
  pruefart: string;
  status: string;
  meldung: string;
  bestaetigt_vom_nutzer: boolean;
  bestaetigt_am?: string | null;
};

export type ImportBefundPreview = {
  person_id?: string | null;
  labor_id?: string | null;
  labor_name?: string | null;
  entnahmedatum: string;
  befunddatum?: string | null;
  bemerkung?: string | null;
  dokument_id?: string | null;
  dokument_dateiname?: string | null;
  dokument_pfad?: string | null;
};

export type ImportMesswertPreview = {
  messwert_index: number;
  parameter_id?: string | null;
  parameter_mapping_herkunft?: string | null;
  parameter_mapping_hinweis?: string | null;
  alias_uebernehmen: boolean;
  original_parametername: string;
  wert_typ: WertTyp;
  wert_operator?: WertOperator;
  wert_roh_text: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit_original?: string | null;
  bemerkung_kurz?: string | null;
  bemerkung_lang?: string | null;
  ki_hinweis?: string | null;
  unsicher_flag: boolean;
  pruefbedarf_flag: boolean;
  referenz_text_original?: string | null;
  untere_grenze_num?: number | null;
  untere_grenze_operator?: ReferenzGrenzOperator | null;
  obere_grenze_num?: number | null;
  obere_grenze_operator?: ReferenzGrenzOperator | null;
  referenz_einheit?: string | null;
  referenz_geschlecht_code?: GeschlechtCode | null;
  referenz_alter_min_tage?: number | null;
  referenz_alter_max_tage?: number | null;
  referenz_bemerkung?: string | null;
  parameter_vorschlag?: ImportParameterVorschlag | null;
};

export type ImportParameterVorschlag = {
  index: number;
  anzeigename: string;
  wert_typ_standard?: WertTyp | null;
  standard_einheit?: string | null;
  primaere_klassifikation?: ParameterKlassifikationCode | null;
  beschreibung_kurz?: string | null;
  moegliche_aliase: string[];
  begruendung_aus_dokument?: string | null;
  unsicher_flag: boolean;
  messwert_indizes: number[];
};

export type ImportAehnlicheGruppe = {
  gruppe_id: string;
  name: string;
  parameter_anzahl: number;
  gemeinsame_parameter_anzahl: number;
  gemeinsame_parameter_namen: string[];
  namensaehnlich: boolean;
};

export type ImportGruppenvorschlag = {
  index: number;
  name: string;
  beschreibung?: string | null;
  messwert_indizes: number[];
  parameter_ids: string[];
  parameter_namen: string[];
  fehlende_messwert_indizes: number[];
  aehnliche_gruppen: ImportAehnlicheGruppe[];
  anwendbar: boolean;
};

export type ImportVorgangListItem = {
  id: string;
  quelle_typ: string;
  status: string;
  person_id_vorschlag?: string | null;
  schema_version?: string | null;
  bemerkung?: string | null;
  dokument_id?: string | null;
  dokument_dateiname?: string | null;
  messwerte_anzahl: number;
  fehler_anzahl: number;
  warnung_anzahl: number;
  erstellt_am: string;
  geaendert_am: string;
};

export type ImportVorgangDetail = {
  id: string;
  quelle_typ: string;
  status: string;
  person_id_vorschlag?: string | null;
  schema_version?: string | null;
  bemerkung?: string | null;
  warnungen_text?: string | null;
  fingerprint?: string | null;
  dokument_id?: string | null;
  dokument_dateiname?: string | null;
  erstellt_am: string;
  geaendert_am: string;
  messwerte_anzahl: number;
  fehler_anzahl: number;
  warnung_anzahl: number;
  befund: ImportBefundPreview;
  messwerte: ImportMesswertPreview[];
  gruppenvorschlaege: ImportGruppenvorschlag[];
  parameter_vorschlaege: ImportParameterVorschlag[];
  pruefpunkte: ImportPruefpunkt[];
};

export type ImportGruppenvorschlagAnwendenPayload = {
  vorschlag_index: number;
  aktion: "neu" | "vorhanden" | "ignorieren";
  gruppe_id?: string | null;
  gruppenname?: string | null;
};

export type ImportGruppenvorschlaegeAnwendenResponse = {
  ergebnisse: Array<{
    vorschlag_index: number;
    aktion: string;
    gruppe_id?: string | null;
    gruppenname?: string | null;
    zugeordnete_parameter_anzahl: number;
  }>;
};

export type ImportKomplettEntfernenResponse = {
  import_id: string;
  dokument_id?: string | null;
  dokument_entfernt: boolean;
  pruefpunkte_entfernt: number;
};

export type ImportPromptPayload = {
  promptTyp: "laborbericht" | "tabelle";
};

export type ImportPromptResponse = {
  promptText: string;
  kontextZusammenfassung: string;
  schemaVersion: string;
};

export type ArztberichtEintrag = {
  messwert_id: string;
  person_id: string;
  person_anzeigename: string;
  laborparameter_id: string;
  parameter_anzeigename: string;
  parameter_primaere_klassifikation?: ParameterKlassifikationCode | null;
  datum?: string | null;
  wert_typ: WertTyp;
  wert_anzeige: string;
  wert_num?: number | null;
  einheit?: string | null;
  wert_original_num?: number | null;
  einheit_original?: string | null;
  wert_normiert_num?: number | null;
  einheit_normiert?: string | null;
  referenzbereich?: string | null;
  labor_name?: string | null;
  befundbemerkung?: string | null;
  messwertbemerkung?: string | null;
  gruppen_namen: string[];
  ausserhalb_referenzbereich?: boolean | null;
};

export type ArztberichtResponse = {
  person_ids: string[];
  eintraege: ArztberichtEintrag[];
};

export type VerlaufsberichtPunkt = {
  messwert_id: string;
  person_id: string;
  person_anzeigename: string;
  laborparameter_id: string;
  parameter_anzeigename: string;
  parameter_primaere_klassifikation?: ParameterKlassifikationCode | null;
  datum?: string | null;
  wert_typ: WertTyp;
  wert_anzeige: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit?: string | null;
  wert_original_num?: number | null;
  einheit_original?: string | null;
  wert_normiert_num?: number | null;
  einheit_normiert?: string | null;
  labor_name?: string | null;
  gruppen_namen: string[];
  ausserhalb_referenzbereich?: boolean | null;
};

export type VerlaufsberichtResponse = {
  person_ids: string[];
  punkte: VerlaufsberichtPunkt[];
};

export type AuswertungGesamtzahlen = {
  personen_anzahl: number;
  parameter_anzahl: number;
  messwerte_anzahl: number;
  befunde_anzahl: number;
};

export type AuswertungsStatistik = {
  anzahl_messungen: number;
  personen_anzahl: number;
  zeitraum_von?: string | null;
  zeitraum_bis?: string | null;
  letzte_messung_datum?: string | null;
  letzter_wert_anzeige?: string | null;
  minimum_num?: number | null;
  maximum_num?: number | null;
  trendrichtung: string;
};

export type AuswertungPunkt = {
  messwert_id: string;
  person_id: string;
  person_anzeigename: string;
  parameter_primaere_klassifikation?: ParameterKlassifikationCode | null;
  datum?: string | null;
  wert_typ: WertTyp;
  wert_operator: WertOperator;
  wert_anzeige: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit?: string | null;
  labor_name?: string | null;
  befundbemerkung?: string | null;
  messwertbemerkung?: string | null;
  laborreferenz_untere_num?: number | null;
  laborreferenz_obere_num?: number | null;
  laborreferenz_einheit?: string | null;
  laborreferenz_text?: string | null;
  zielbereich_untere_num?: number | null;
  zielbereich_obere_num?: number | null;
  zielbereich_einheit?: string | null;
  zielbereich_text?: string | null;
};

export type AuswertungsSerie = {
  laborparameter_id: string;
  parameter_anzeigename: string;
  parameter_beschreibung?: string | null;
  parameter_primaere_klassifikation?: ParameterKlassifikationCode | null;
  wert_typ_standard: WertTyp;
  standard_einheit?: string | null;
  statistik: AuswertungsStatistik;
  punkte: AuswertungPunkt[];
};

export type AuswertungResponse = {
  person_ids: string[];
  serien: AuswertungsSerie[];
};

export type SystemHealth = {
  status: string;
  app: string;
  environment: string;
  lock_status: string;
  lock_message: string;
};

export type RuntimeSettings = {
  data_path: string;
  documents_path: string;
  knowledge_path: string;
  import_store_source_files_default: boolean;
  report_include_labor_default: boolean;
  report_include_reference_default: boolean;
  allow_api_key_usage: boolean;
  import_auto_create_lab_default: boolean;
  darstellung_normierte_vergleiche: boolean;
  bericht_standardvorlage?: string | null;
  bemerkung?: string | null;
};

export type LockStatus = {
  status: string;
  message: string;
  instance_id: string;
  lock_path: string;
  owner_hostname?: string | null;
  owner_pid?: number | null;
  acquired_at?: string | null;
  heartbeat_at?: string | null;
  stale: boolean;
};

export type InitialdatenStatus = {
  snapshot_verfuegbar: boolean;
  snapshot_version?: string | null;
  stammdaten_vorhanden: boolean;
  nutzerdaten_vorhanden: boolean;
  initialimport_empfohlen: boolean;
  tabellen: Record<string, number>;
};

export type InitialdatenApplyResult = {
  snapshot_version?: string | null;
  aktualisieren: boolean;
  angelegt: Record<string, number>;
  aktualisiert: Record<string, number>;
  uebersprungen: Record<string, number>;
};

export type WissensseiteListItem = {
  pfad_relativ: string;
  pfad_absolut: string;
  titel: string;
  aliases: string[];
  excerpt?: string | null;
  geaendert_am: string;
  loeschbar: boolean;
  loesch_sperrgrund?: string | null;
};

export type WissensseiteDetail = WissensseiteListItem & {
  frontmatter: Record<string, unknown>;
  inhalt_markdown: string;
};

export type WissensseiteCreatePayload = {
  pfad_relativ: string;
  titel: string;
  inhalt_markdown?: string | null;
};

export type WissensseiteDeleteResult = {
  pfad_relativ: string;
  geloescht: boolean;
};

export type Loeschmodus = "direkt" | "kaskade" | "blockiert";
export type Loeschaktion = "loeschen" | "deaktivieren";
export type Loeschempfehlung = "loeschen" | "deaktivieren" | "nicht_loeschen";
export type LoeschAbhaengigkeitKategorie = "kind" | "nutzung" | "folge";

export type LoeschAbhaengigkeit = {
  objekt_typ: string;
  anzahl: number;
  kategorie: LoeschAbhaengigkeitKategorie;
  beschreibung?: string | null;
};

export type LoeschOptionen = {
  deaktivieren_verfuegbar: boolean;
  leeren_befund_mitloeschen_standard: boolean;
  dokument_entfernen_verfuegbar: boolean;
  dokument_entfernen_standard: boolean;
};

export type LoeschPruefung = {
  entitaet_typ: string;
  entitaet_id: string;
  anzeige_name: string;
  modus: Loeschmodus;
  empfehlung: Loeschempfehlung;
  standard_aktion?: Loeschaktion | null;
  abhaengigkeiten: LoeschAbhaengigkeit[];
  blockierungsgruende: string[];
  hinweise: string[];
  optionen: LoeschOptionen;
};

export type LoeschAusfuehrung = {
  entitaet_typ: string;
  entitaet_id: string;
  aktion: Loeschaktion;
  geloeschte_objekte: LoeschAbhaengigkeit[];
  aktualisierte_objekte: LoeschAbhaengigkeit[];
  hinweise: string[];
};
