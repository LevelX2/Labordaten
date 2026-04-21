import type {
  GeschlechtCode,
  MesswertCreatePayload,
  MesswertReferenzCreatePayload,
  PersonCreatePayload,
  WertTyp,
  ZielbereichCreatePayload,
} from "../types/api";

type PersonPayloadInput = {
  anzeigename: string;
  vollname: string;
  geburtsdatum: string;
  geschlecht_code: string;
  hinweise_allgemein: string;
};

type MesswertPayloadInput = {
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: WertTyp;
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
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  bemerkung: string;
};

type ZielbereichPayloadInput = {
  wert_typ: WertTyp;
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  bemerkung: string;
};

function emptyToNull(value: string): string | null {
  return value || null;
}

function emptyToOptionalGeschlechtCode(value: string): GeschlechtCode | null {
  return value ? (value as GeschlechtCode) : null;
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
    hinweise_allgemein: emptyToNull(input.hinweise_allgemein),
  };
}

export function buildMesswertCreatePayload(input: MesswertPayloadInput): MesswertCreatePayload {
  return {
    person_id: input.person_id,
    befund_id: input.befund_id,
    laborparameter_id: input.laborparameter_id,
    original_parametername: input.original_parametername,
    wert_typ: input.wert_typ,
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
    obere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.obere_grenze_num) : null,
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
    untere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.untere_grenze_num) : null,
    obere_grenze_num: input.wert_typ === "numerisch" ? stringNumberToNull(input.obere_grenze_num) : null,
    einheit: input.wert_typ === "numerisch" ? emptyToNull(input.einheit) ?? fallbackEinheit ?? null : null,
    soll_text: input.wert_typ === "text" ? emptyToNull(input.soll_text) : null,
    geschlecht_code: emptyToOptionalGeschlechtCode(input.geschlecht_code),
    bemerkung: emptyToNull(input.bemerkung),
  };
}
