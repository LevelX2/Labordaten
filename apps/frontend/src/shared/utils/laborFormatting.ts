import type { Messwert, MesswertReferenz, ReferenzGrenzOperator, WertOperator } from "../types/api";

const measurementOperatorPrefix: Record<WertOperator, string> = {
  exakt: "",
  kleiner_als: "< ",
  kleiner_gleich: "<= ",
  groesser_als: "> ",
  groesser_gleich: ">= ",
  ungefaehr: "~ "
};

const referenceOperatorSymbol: Record<ReferenzGrenzOperator, string> = {
  kleiner_als: "<",
  kleiner_gleich: "<=",
  groesser_als: ">",
  groesser_gleich: ">="
};

export function formatMesswertAnzeige(messwert: Pick<Messwert, "wert_typ" | "wert_text" | "wert_roh_text" | "wert_num" | "wert_operator">): string {
  if (messwert.wert_typ === "text") {
    return messwert.wert_text || messwert.wert_roh_text;
  }

  const prefix = measurementOperatorPrefix[messwert.wert_operator ?? "exakt"] ?? "";
  if (messwert.wert_num !== null && messwert.wert_num !== undefined) {
    return `${prefix}${messwert.wert_num}`;
  }
  return `${prefix}${messwert.wert_roh_text ?? ""}`.trim();
}

export function formatReferenzAnzeige(
  referenz: Pick<
    MesswertReferenz,
    | "wert_typ"
    | "soll_text"
    | "referenz_text_original"
    | "untere_grenze_num"
    | "untere_grenze_operator"
    | "obere_grenze_num"
    | "obere_grenze_operator"
    | "einheit"
  >
): string {
  if (referenz.wert_typ === "text") {
    return referenz.soll_text || referenz.referenz_text_original || "—";
  }

  const lower = formatReferenzGrenze("lower", referenz.untere_grenze_num, referenz.untere_grenze_operator);
  const upper = formatReferenzGrenze("upper", referenz.obere_grenze_num, referenz.obere_grenze_operator);
  const unit = referenz.einheit ? ` ${referenz.einheit}` : "";

  if (lower && upper) {
    if (
      (referenz.untere_grenze_operator ?? "groesser_gleich") === "groesser_gleich" &&
      (referenz.obere_grenze_operator ?? "kleiner_gleich") === "kleiner_gleich"
    ) {
      return `${referenz.untere_grenze_num} bis ${referenz.obere_grenze_num}${unit}`;
    }
    return `${lower} bis ${upper}${unit}`;
  }
  if (lower) {
    return `${lower}${unit}`;
  }
  if (upper) {
    return `${upper}${unit}`;
  }
  return referenz.referenz_text_original || "—";
}

function formatReferenzGrenze(
  side: "lower" | "upper",
  value?: number | null,
  operator?: ReferenzGrenzOperator | null
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedOperator =
    operator ?? (side === "lower" ? "groesser_gleich" : "kleiner_gleich");
  return `${referenceOperatorSymbol[normalizedOperator]} ${value}`;
}
