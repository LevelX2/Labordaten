import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type { AuswertungPunkt } from "../../shared/types/api";

export function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(value);
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);
}

export function formatTrend(value: string): string {
  if (value === "steigend") {
    return "Steigend";
  }
  if (value === "fallend") {
    return "Fallend";
  }
  return "Unverändert";
}

export function formatTargetRange(point: AuswertungPunkt): string {
  if (point.zielbereich_text) {
    return point.zielbereich_text;
  }
  return formatReferenzAnzeige({
    wert_typ: "numerisch",
    soll_text: null,
    referenz_text_original: null,
    untere_grenze_num: point.zielbereich_untere_num,
    untere_grenze_operator: null,
    obere_grenze_num: point.zielbereich_obere_num,
    obere_grenze_operator: null,
    einheit: point.zielbereich_einheit
  });
}

export function formatTooltipValue(value: unknown): string {
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}
