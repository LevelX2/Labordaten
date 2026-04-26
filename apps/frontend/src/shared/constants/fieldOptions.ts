import type {
  BefundQuelleTyp,
  GeschlechtCode,
  ParameterKlassifikationCode,
  ReferenzGrenzOperator,
  WertOperator,
  WertTyp,
  ZielbereichTyp
} from "../types/api";

export const GESCHLECHT_CODE_OPTIONS = [
  { value: "w", label: "Weiblich" },
  { value: "m", label: "Männlich" },
  { value: "d", label: "Divers" }
] as const satisfies ReadonlyArray<{ value: GeschlechtCode; label: string }>;

export const PERSON_GESCHLECHT_OPTIONS = [
  { value: "", label: "Nicht angegeben" },
  ...GESCHLECHT_CODE_OPTIONS
] as const;

export const KONTEXT_GESCHLECHT_OPTIONS = [
  { value: "", label: "Alle Geschlechter" },
  ...GESCHLECHT_CODE_OPTIONS
] as const;

export const WERT_TYP_OPTIONS = [
  { value: "numerisch", label: "Numerisch" },
  { value: "text", label: "Text" }
] as const satisfies ReadonlyArray<{ value: WertTyp; label: string }>;

export const PARAMETER_KLASSIFIKATION_OPTIONS = [
  { value: "krankwert", label: "Krankwert" },
  { value: "schluesselwert", label: "Schlüsselwert" },
  { value: "gesundmachwert", label: "Gesundmachwert" }
] as const satisfies ReadonlyArray<{ value: ParameterKlassifikationCode; label: string }>;

export const PARAMETER_KLASSIFIKATION_FILTER_OPTIONS = [
  { value: "", label: "Alle Klassifikationen" },
  ...PARAMETER_KLASSIFIKATION_OPTIONS
] as const;

export const ZIELBEREICH_TYP_OPTIONS = [
  { value: "allgemein", label: "Allgemein" },
  { value: "optimalbereich", label: "Optimalbereich" },
  { value: "therapieziel", label: "Therapieziel" },
  { value: "mangelbereich", label: "Mangelbereich" },
  { value: "risikobereich", label: "Risikobereich" }
] as const satisfies ReadonlyArray<{ value: ZielbereichTyp; label: string }>;

export const WERT_OPERATOR_OPTIONS = [
  { value: "exakt", label: "Exakt" },
  { value: "kleiner_als", label: "Kleiner als (<)" },
  { value: "kleiner_gleich", label: "Kleiner oder gleich (<=)" },
  { value: "groesser_als", label: "Größer als (>)" },
  { value: "groesser_gleich", label: "Größer oder gleich (>=)" },
  { value: "ungefaehr", label: "Ungefähr (~)" }
] as const satisfies ReadonlyArray<{ value: WertOperator; label: string }>;

export const REFERENZ_GRENZ_OPERATOR_OPTIONS = [
  { value: "groesser_gleich", label: "Größer oder gleich (>=)" },
  { value: "groesser_als", label: "Größer als (>)" },
  { value: "kleiner_gleich", label: "Kleiner oder gleich (<=)" },
  { value: "kleiner_als", label: "Kleiner als (<)" }
] as const satisfies ReadonlyArray<{ value: ReferenzGrenzOperator; label: string }>;

const WERT_TYP_LABELS: Record<WertTyp, string> = {
  numerisch: "Numerisch",
  text: "Text"
};

const PARAMETER_KLASSIFIKATION_LABELS: Record<ParameterKlassifikationCode, string> = {
  krankwert: "Krankwert",
  schluesselwert: "Schlüsselwert",
  gesundmachwert: "Gesundmachwert"
};

const ZIELBEREICH_TYP_LABELS: Record<ZielbereichTyp, string> = {
  allgemein: "Allgemein",
  optimalbereich: "Optimalbereich",
  therapieziel: "Therapieziel",
  mangelbereich: "Mangelbereich",
  risikobereich: "Risikobereich"
};

const WERT_OPERATOR_LABELS: Record<WertOperator, string> = {
  exakt: "Exakt",
  kleiner_als: "Kleiner als (<)",
  kleiner_gleich: "Kleiner oder gleich (<=)",
  groesser_als: "Größer als (>)",
  groesser_gleich: "Größer oder gleich (>=)",
  ungefaehr: "Ungefähr (~)"
};

const REFERENZ_GRENZ_OPERATOR_LABELS: Record<ReferenzGrenzOperator, string> = {
  groesser_als: "Größer als (>)",
  groesser_gleich: "Größer oder gleich (>=)",
  kleiner_als: "Kleiner als (<)",
  kleiner_gleich: "Kleiner oder gleich (<=)"
};

const BEFUND_QUELLE_LABELS: Record<BefundQuelleTyp, string> = {
  manuell: "Manuell",
  import: "Import",
  ki_import: "KI-Import"
};

export function formatGeschlechtCode(code?: string | null, emptyLabel = "—"): string {
  if (!code) {
    return emptyLabel;
  }

  const option = GESCHLECHT_CODE_OPTIONS.find((item) => item.value === code);
  return option?.label ?? code;
}

export function formatWertTyp(value: string): string {
  return WERT_TYP_LABELS[value as WertTyp] ?? value;
}

export function formatParameterKlassifikation(value?: string | null, emptyLabel = "Nicht klassifiziert"): string {
  if (!value) {
    return emptyLabel;
  }
  return PARAMETER_KLASSIFIKATION_LABELS[value as ParameterKlassifikationCode] ?? value;
}

export function formatZielbereichTyp(value?: string | null): string {
  if (!value) {
    return "Allgemein";
  }
  return ZIELBEREICH_TYP_LABELS[value as ZielbereichTyp] ?? value;
}

export function formatWertOperator(value?: string | null, emptyLabel = "—"): string {
  if (!value) {
    return emptyLabel;
  }
  return WERT_OPERATOR_LABELS[value as WertOperator] ?? value;
}

export function formatReferenzGrenzOperator(value?: string | null, emptyLabel = "—"): string {
  if (!value) {
    return emptyLabel;
  }
  return REFERENZ_GRENZ_OPERATOR_LABELS[value as ReferenzGrenzOperator] ?? value;
}

export function formatBefundQuelleTyp(value: string): string {
  return BEFUND_QUELLE_LABELS[value as BefundQuelleTyp] ?? value;
}
