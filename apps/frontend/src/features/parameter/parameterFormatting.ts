import type {
  ParameterUmrechnungsregel,
  ParameterUsageSummary,
  Zielbereich,
  ZielbereichQuelle,
  ZielwertPaket,
} from "../../shared/types/api";

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatUsageSummary(summary: ParameterUsageSummary): string {
  const parts = [
    `${summary.messwerte_anzahl} Messwerte`,
    `${summary.zielbereiche_anzahl} Zielbereiche`,
    `${summary.gruppen_anzahl} Parametergruppen`,
    `${summary.planung_zyklisch_anzahl + summary.planung_einmalig_anzahl} Planungen`
  ];
  return parts.join(" • ");
}

export function summarizeDescription(description?: string | null): string {
  const text = description?.trim();
  if (!text) {
    return "Noch keine Erläuterung hinterlegt.";
  }

  if (text.length <= 140) {
    return text;
  }

  return `${text.slice(0, 137).trimEnd()}...`;
}

export function formatZielbereichValue(zielbereich: Zielbereich): string {
  if (zielbereich.wert_typ === "numerisch") {
    return `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`;
  }

  return zielbereich.soll_text || "—";
}

export function formatZielbereichQuelle(quelle?: ZielbereichQuelle | null): string {
  if (!quelle) {
    return "Keine Quelle";
  }

  const details = [quelle.titel, quelle.jahr?.toString(), quelle.version].filter(Boolean);
  return details.length ? `${quelle.name} · ${details.join(" · ")}` : quelle.name;
}

export function formatZielwertPaket(paket?: ZielwertPaket | null): string {
  if (!paket) {
    return "Kein Paket";
  }

  const details = [paket.version, paket.jahr?.toString()].filter(Boolean);
  return details.length ? `${paket.name} · ${details.join(" · ")}` : paket.name;
}

export function formatUmrechnungsregel(regel: ParameterUmrechnungsregel): string {
  if (regel.regel_typ === "faktor") {
    return `x * ${regel.faktor ?? "?"}`;
  }
  if (regel.regel_typ === "faktor_plus_offset") {
    return `x * ${regel.faktor ?? "?"} + ${regel.offset ?? 0}`;
  }
  return regel.formel_text || "—";
}

export function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildDuplicateSuggestionKey(zielParameterId: string, quellParameterId: string): string {
  return `${zielParameterId}:${quellParameterId}`;
}

export function normalizeUnitForComparison(value?: string | null): string {
  return (value ?? "").trim().toLocaleLowerCase("de-DE");
}
