export type Person = {
  id: string;
  anzeigename: string;
  vollname?: string | null;
  geburtsdatum: string;
  geschlecht_code?: string | null;
  blutgruppe?: string | null;
  rhesusfaktor?: string | null;
  hinweise_allgemein?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type Parameter = {
  id: string;
  interner_schluessel: string;
  anzeigename: string;
  beschreibung?: string | null;
  standard_einheit?: string | null;
  wert_typ_standard: string;
  sortierschluessel?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
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
  labor_id?: string | null;
  dokument_id?: string | null;
  entnahmedatum?: string | null;
  befunddatum?: string | null;
  eingangsdatum?: string | null;
  bemerkung?: string | null;
  quelle_typ: string;
  duplikat_warnung: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type Messwert = {
  id: string;
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: string;
  wert_operator: string;
  wert_roh_text: string;
  wert_num?: number | null;
  wert_text?: string | null;
  einheit_original?: string | null;
  wert_normiert_num?: number | null;
  einheit_normiert?: string | null;
  bemerkung_kurz?: string | null;
  bemerkung_lang?: string | null;
  unsicher_flag: boolean;
  pruefbedarf_flag: boolean;
  erstellt_am: string;
  geaendert_am: string;
};

export type MesswertReferenz = {
  id: string;
  messwert_id: string;
  referenz_typ: string;
  referenz_text_original?: string | null;
  wert_typ: string;
  untere_grenze_num?: number | null;
  obere_grenze_num?: number | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: string | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  bemerkung?: string | null;
};

export type Zielbereich = {
  id: string;
  laborparameter_id: string;
  wert_typ: string;
  untere_grenze_num?: number | null;
  obere_grenze_num?: number | null;
  einheit?: string | null;
  soll_text?: string | null;
  geschlecht_code?: string | null;
  alter_min_tage?: number | null;
  alter_max_tage?: number | null;
  bemerkung?: string | null;
  aktiv: boolean;
  erstellt_am: string;
  geaendert_am: string;
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
