import type { BefundQuelleTyp, GeschlechtCode, WertTyp } from "../types/api";

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

const WERT_TYP_LABELS: Record<WertTyp, string> = {
  numerisch: "Numerisch",
  text: "Text"
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

export function formatBefundQuelleTyp(value: string): string {
  return BEFUND_QUELLE_LABELS[value as BefundQuelleTyp] ?? value;
}
