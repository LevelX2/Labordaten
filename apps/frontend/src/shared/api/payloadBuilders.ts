import type {
  BlutgruppeCode,
  GeschlechtCode,
  MesswertCreatePayload,
  MesswertReferenzCreatePayload,
  PersonCreatePayload,
  PersonUpdatePayload,
  ReferenzGrenzOperator,
  RhesusfaktorCode,
  WertOperator,
  WertTyp,
  ZielbereichCreatePayload,
  ZielbereichUpdatePayload,
  ZielbereichTyp,
} from "../types/api";

type PersonPayloadInput = {
  anzeigename: string;
  vollname: string;
  geburtsdatum: string;
  geschlecht_code: string;
  blutgruppe?: string;
  rhesusfaktor?: string;
  hinweise_allgemein: string;
};

type MesswertPayloadInput = {
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: WertTyp;
  wert_operator: string;
  wert_roh_text: string;
  wert_num: string;
  wert_text: string;
  einheit_original: string;
  bemerkung_kurz: string;
};

type ReferenzPayloadInput = {
  wert_typ: WertTyp;
  referenz_text_original: string;
  untere_grenze_num: string;
  untere_grenze_operator: string;
  obere_grenze_num: string;
  obere_grenze_operator: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  bemerkung: string;
};

type ZielbereichPayloadInput = {
  wert_typ: WertTyp;
  zielbereich_typ: ZielbereichTyp;
  zielbereich_quelle_id: string;
  zielwert_paket_id: string;
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  quelle_original_text: string;
  quelle_stelle: string;
  bemerkung: string;
};

function emptyToNull(value: string): string | null {
  return value || null;
}

function emptyToOptionalGeschlechtCode(value: string): GeschlechtCode | null {
  return value ? (value as GeschlechtCode) : null;
}

function emptyToOptionalBlutgruppeCode(value?: string): BlutgruppeCode | null {
  return value ? (value as BlutgruppeCode) : null;
}

function emptyToOptionalRhesusfaktorCode(value?: string): RhesusfaktorCode | null {
  return value ? (value as RhesusfaktorCode) : null;
}

function stringNumberToNull(value: string): number | null {
  return value ? Number(value) : null;
}

export function buildPersonCreatePayload(input: PersonPayloadInput): PersonCreatePayload {
  return {
    anzeigename: input.anzeigename,
    vollname: emptyToNull(input.vollname),
    geburtsdatum: input.geburtsdatum,
    geschlecht_code: emptyToOptionalGeschlechtCode(input.geschlecht_code),
    blutgruppe: emptyToOptionalBlutgruppeCode(input.blutgruppe),
    rhesusfaktor: emptyToOptionalRhesusfaktorCode(input.rhesusfaktor),
    hinweise_allgemein: emptyToNull(input.hinweise_allgemein),
  };
}

export function buildPersonUpdatePayload(input: PersonPayloadInput): PersonUpdatePayload {
  return buildPersonCreatePayload(input);
}

export function buildMesswertCreatePayload(input: MesswertPayloadInput): MesswertCreatePayload {
  return {
    person_id: input.person_id,
    befund_id: input.befund_id,
    laborparameter_id: input.laborparameter_id,
    original_parametername: input.original_parametername,
    wert_typ: input.wert_typ,
    wert_operator: (input.wert_operator || "exakt") as WertOperator,
    wert_roh_text: input.wert_roh_text,
    wert_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.wert_num) : null,
    wert_text: input.wert_typ === "text" ? emptyToNull(input.wert_text) ?? input.wert_roh_text : null,
    einheit_original: input.wert_typ === "numerisch" ? emptyToNull(input.einheit_original) : null,
    bemerkung_kurz: emptyToNull(input.bemerkung_kurz),
  };
}

export function buildMesswertReferenzCreatePayload(
  input: ReferenzPayloadInput,
  fallbackEinheit?: string | null,
): MesswertReferenzCreatePayload {
  return {
    referenz_typ: "labor",
    wert_typ: input.wert_typ,
    referenz_text_original: emptyToNull(input.referenz_text_original),
    untere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.untere_grenze_num) : null,
    untere_grenze_operator:
      input.wert_typ === "numerisch" && input.untere_grenze_num
        ? ((emptyToNull(input.untere_grenze_operator) ?? "groesser_gleich") as ReferenzGrenzOperator)
        : null,
    obere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.obere_grenze_num) : null,
    obere_grenze_operator:
      input.wert_typ === "numerisch" && input.obere_grenze_num
        ? ((emptyToNull(input.obere_grenze_operator) ?? "kleiner_gleich") as ReferenzGrenzOperator)
        : null,
    einheit: input.wert_typ === "numerisch" ? emptyToNull(input.einheit) ?? fallbackEinheit ?? null : null,
    soll_text: input.wert_typ === "text" ? emptyToNull(input.soll_text) : null,
    geschlecht_code: emptyToOptionalGeschlechtCode(input.geschlecht_code),
    bemerkung: emptyToNull(input.bemerkung),
  };
}

export function buildZielbereichCreatePayload(
  input: ZielbereichPayloadInput,
  fallbackEinheit?: string | null,
): ZielbereichCreatePayload {
  return {
    wert_typ: input.wert_typ,
    zielbereich_typ: input.zielbereich_typ,
    zielbereich_quelle_id: emptyToNull(input.zielbereich_quelle_id),
    zielwert_paket_id: emptyToNull(input.zielwert_paket_id),
    untere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.untere_grenze_num) : null,
    obere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.obere_grenze_num) : null,
    einheit: input.wert_typ === "numerisch" ? emptyToNull(input.einheit) ?? fallbackEinheit ?? null : null,
    soll_text: input.wert_typ === "text" ? emptyToNull(input.soll_text) : null,
    geschlecht_code: emptyToOptionalGeschlechtCode(input.geschlecht_code),
    quelle_original_text: emptyToNull(input.quelle_original_text),
    quelle_stelle: emptyToNull(input.quelle_stelle),
    bemerkung: emptyToNull(input.bemerkung),
  };
}

export function buildZielbereichUpdatePayload(
  input: ZielbereichPayloadInput,
  fallbackEinheit?: string | null,
): ZielbereichUpdatePayload {
  const payload = buildZielbereichCreatePayload(input, fallbackEinheit);
  return {
    zielbereich_typ: payload.zielbereich_typ,
    zielbereich_quelle_id: payload.zielbereich_quelle_id,
    zielwert_paket_id: payload.zielwert_paket_id,
    untere_grenze_num: payload.untere_grenze_num,
    obere_grenze_num: payload.obere_grenze_num,
    einheit: payload.einheit,
    soll_text: payload.soll_text,
    geschlecht_code: payload.geschlecht_code,
    alter_min_tage: payload.alter_min_tage,
    alter_max_tage: payload.alter_max_tage,
    quelle_original_text: payload.quelle_original_text,
    quelle_stelle: payload.quelle_stelle,
    bemerkung: payload.bemerkung,
  };
}
