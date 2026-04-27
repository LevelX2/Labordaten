import { formatWertTyp } from "../../shared/constants/fieldOptions";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type { Gruppe, ImportMesswertPreview, ImportPruefpunkt, ImportVorgangDetail, Parameter } from "../../shared/types/api";

export type GruppenVorschlagAktion = "neu" | "vorhanden" | "ignorieren";
export type MappingFilterMode = "alle" | "offen" | "neu" | "ignoriert" | "manuell" | "automatisch" | "explizit";
export type ParameterDialogFilterMode = "streng" | "locker" | "alle";

export type GruppenVorschlagState = {
  aktion: GruppenVorschlagAktion;
  gruppe_id: string;
  gruppenname: string;
};

export type ParameterCandidate = {
  parameter: Parameter;
  score: number;
  gruende: string[];
};

export const NEW_PARAMETER_MAPPING_VALUE = "__new_parameter__";
export const IGNORE_MEASUREMENT_MAPPING_VALUE = "__ignore_measurement__";

export function formatMappingInfo(messwert: ImportMesswertPreview, currentParameterId?: string): string {
  if (currentParameterId === IGNORE_MEASUREMENT_MAPPING_VALUE || messwert.parameter_mapping_herkunft === "ignoriert") {
    return "Wird nicht übernommen";
  }
  if (currentParameterId === NEW_PARAMETER_MAPPING_VALUE) {
    return "Neuanlage vorgesehen";
  }
  if (currentParameterId && currentParameterId !== (messwert.parameter_id ?? "")) {
    return "Manuell angepasst";
  }

  const source = messwert.parameter_mapping_herkunft;
  const hint = messwert.parameter_mapping_hinweis;
  if (source === "alias") {
    return hint ? `Automatisch über Alias: ${hint}` : "Automatisch über Alias";
  }
  if (source === "anzeigename") {
    return hint ? `Automatisch über Anzeigenamen: ${hint}` : "Automatisch über Anzeigenamen";
  }
  if (source === "schluessel") {
    return hint ? `Automatisch über Schlüssel: ${hint}` : "Automatisch über Schlüssel";
  }
  if (source === "explizit") {
    return "Aus KI-/JSON-Ergebnis übernommen";
  }
  if (source === "manuell") {
    return "Manuell zugeordnet";
  }
  if (source === "neu") {
    return "Neuanlage vorgesehen";
  }
  if (source === "uebernommen") {
    return hint ? `Bereits übernommen: ${hint}` : "Bereits übernommen";
  }
  return "Noch offen";
}

export function getMappingFilterMode(messwert: ImportMesswertPreview, currentParameterId?: string): MappingFilterMode {
  if (currentParameterId === IGNORE_MEASUREMENT_MAPPING_VALUE || messwert.parameter_mapping_herkunft === "ignoriert") {
    return "ignoriert";
  }
  if (currentParameterId === NEW_PARAMETER_MAPPING_VALUE) {
    return "neu";
  }
  if (currentParameterId && currentParameterId !== (messwert.parameter_id ?? "")) {
    return "manuell";
  }
  if (!currentParameterId && !messwert.parameter_id) {
    return "offen";
  }
  if (messwert.parameter_mapping_herkunft === "explizit") {
    return "explizit";
  }
  if (messwert.parameter_mapping_herkunft === "neu") {
    return "neu";
  }
  if (["alias", "anzeigename", "schluessel", "uebernommen"].includes(messwert.parameter_mapping_herkunft ?? "")) {
    return "automatisch";
  }
  if (messwert.parameter_mapping_herkunft === "manuell") {
    return "manuell";
  }
  return currentParameterId ? "manuell" : "offen";
}

export function normalizeAliasCandidate(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeSearchText(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");
}

export function getSearchTokens(value?: string | null): string[] {
  return Array.from(
    new Set(
      normalizeSearchText(value)
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

export function countCommonTokens(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

export function scoreParameterCandidate(messwert: ImportMesswertPreview, parameter: Parameter): ParameterCandidate {
  const gruende: string[] = [];
  let score = 0;

  const importName = normalizeAliasCandidate(messwert.original_parametername);
  const parameterName = normalizeAliasCandidate(parameter.anzeigename);
  const importUnit = normalizeAliasCandidate(messwert.einheit_original);
  const parameterUnit = normalizeAliasCandidate(parameter.standard_einheit);
  const nameTokens = getSearchTokens(messwert.original_parametername);
  const parameterTokens = getSearchTokens(parameter.anzeigename);
  const descriptionTokens = getSearchTokens(parameter.beschreibung);
  const suggestionName = normalizeAliasCandidate(messwert.parameter_vorschlag?.anzeigename);

  if (importUnit && parameterUnit && importUnit === parameterUnit) {
    score += 45;
    gruende.push(`Einheit passt: ${parameter.standard_einheit}`);
  }

  if (parameter.wert_typ_standard === messwert.wert_typ) {
    score += 12;
    gruende.push(`Werttyp passt: ${formatWertTyp(parameter.wert_typ_standard)}`);
  }

  if (importName && parameterName) {
    if (importName === parameterName) {
      score += 70;
      gruende.push("Name stimmt exakt überein");
    } else if (importName.includes(parameterName) || parameterName.includes(importName)) {
      score += 36;
      gruende.push("Name überschneidet sich deutlich");
    }
  }

  const nameOverlap = countCommonTokens(nameTokens, parameterTokens);
  if (nameOverlap > 0) {
    score += Math.min(nameOverlap * 12, 36);
    gruende.push(`${nameOverlap} Namensbestandteil${nameOverlap === 1 ? "" : "e"} gemeinsam`);
  }

  const descriptionOverlap = countCommonTokens(nameTokens, descriptionTokens);
  if (descriptionOverlap > 0) {
    score += Math.min(descriptionOverlap * 4, 16);
    gruende.push("Beschreibung enthält passende Begriffe");
  }

  if (suggestionName && suggestionName === parameterName) {
    score += 50;
    gruende.push("Entspricht dem Importvorschlag");
  }

  if (!gruende.length) {
    gruende.push("Kein starker Treffergrund");
  }

  return { parameter, score, gruende };
}

export function getParameterCandidates(args: {
  messwert: ImportMesswertPreview;
  parameter: Parameter[];
  searchText: string;
  filterMode: ParameterDialogFilterMode;
}): ParameterCandidate[] {
  const search = normalizeSearchText(args.searchText);
  return args.parameter
    .map((parameter) => scoreParameterCandidate(args.messwert, parameter))
    .filter((candidate) => {
      if (search) {
        const haystack = normalizeSearchText(
          [
            candidate.parameter.anzeigename,
            candidate.parameter.interner_schluessel,
            candidate.parameter.standard_einheit,
            candidate.parameter.beschreibung
          ].join(" ")
        );
        if (!haystack.includes(search)) {
          return false;
        }
      }
      if (args.filterMode === "alle") {
        return true;
      }
      if (args.filterMode === "locker") {
        return candidate.score >= 20;
      }
      return candidate.score >= 45;
    })
    .sort((left, right) => right.score - left.score || left.parameter.anzeigename.localeCompare(right.parameter.anzeigename, "de-DE"));
}

export function getAliasRecommendation(args: {
  messwert: ImportMesswertPreview;
  parameterId?: string;
  parameterById: Map<string, Parameter>;
}): { recommended: boolean; note: string | null } {
  const { messwert, parameterId, parameterById } = args;
  if (!parameterId || parameterId === NEW_PARAMETER_MAPPING_VALUE || parameterId === IGNORE_MEASUREMENT_MAPPING_VALUE) {
    return { recommended: false, note: null };
  }

  const parameter = parameterById.get(parameterId);
  if (!parameter) {
    return { recommended: false, note: null };
  }

  if (messwert.parameter_mapping_herkunft === "alias") {
    return {
      recommended: false,
      note: "Alias bereits vorhanden. Eine zusätzliche Alias-Anlage ist nicht nötig."
    };
  }

  const original = normalizeAliasCandidate(messwert.original_parametername);
  const display = normalizeAliasCandidate(parameter.anzeigename);
  const key = normalizeAliasCandidate(parameter.interner_schluessel);
  if (!original || original === display || original === key) {
    return { recommended: false, note: null };
  }

  return {
    recommended: true,
    note: `Empfohlen, wenn '${messwert.original_parametername}' wirklich nur eine andere Schreibweise von '${parameter.anzeigename}' ist.`
  };
}

export function getGruppenVorschlagDefault(args: {
  suggestionName: string;
  gruppen: Gruppe[];
}): GruppenVorschlagState {
  const normalizedSuggestion = normalizeAliasCandidate(args.suggestionName);
  const exactMatch = args.gruppen.find(
    (gruppe) => normalizeAliasCandidate(gruppe.name) === normalizedSuggestion
  );
  if (exactMatch) {
    return {
      aktion: "vorhanden",
      gruppe_id: exactMatch.id,
      gruppenname: exactMatch.name
    };
  }

  return {
    aktion: "neu",
    gruppe_id: "",
    gruppenname: args.suggestionName
  };
}

export function getMesswertIndexFromCheck(item: ImportPruefpunkt): number | null {
  const match = item.objekt_schluessel_temp?.match(/^messwert:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function isResolvedMissingParameterCheck(item: ImportPruefpunkt, mappingState: Record<number, string>): boolean {
  if (item.objekt_typ !== "messwert" || item.pruefart !== "parameter_mapping") {
    return false;
  }
  const messwertIndex = getMesswertIndexFromCheck(item);
  return messwertIndex !== null && Boolean(mappingState[messwertIndex]);
}

export function isIgnoredMeasurementCheck(item: ImportPruefpunkt, mappingState: Record<number, string>): boolean {
  if (item.objekt_typ !== "messwert") {
    return false;
  }
  const messwertIndex = getMesswertIndexFromCheck(item);
  return messwertIndex !== null && mappingState[messwertIndex] === IGNORE_MEASUREMENT_MAPPING_VALUE;
}

export function getVisibleImportChecks(
  importDetail: ImportVorgangDetail | undefined | null,
  mappingState: Record<number, string>,
  reviewPersonId?: string
): ImportPruefpunkt[] {
  if (!importDetail || !Array.isArray(importDetail.pruefpunkte)) {
    return [];
  }
  return importDetail.pruefpunkte.filter((item) => {
    if (item.pruefart === "person_zuordnung" && item.status === "fehler" && reviewPersonId) {
      return false;
    }
    if (isIgnoredMeasurementCheck(item, mappingState)) {
      return false;
    }
    return !isResolvedMissingParameterCheck(item, mappingState);
  });
}

export function getImportChecksBySeverity(items: ImportPruefpunkt[]): {
  errors: number;
  warnings: number;
} {
  if (!Array.isArray(items)) {
    return { errors: 0, warnings: 0 };
  }
  return items.reduce(
    (counts, item) => ({
      errors: counts.errors + (item.status === "fehler" ? 1 : 0),
      warnings: counts.warnings + (item.status === "warnung" ? 1 : 0)
    }),
    { errors: 0, warnings: 0 }
  );
}

export function getOpenMappingCount(importDetail: ImportVorgangDetail | undefined, mappingState: Record<number, string>): number {
  if (!importDetail || importDetail.status === "uebernommen" || !Array.isArray(importDetail.messwerte)) {
    return 0;
  }
  return importDetail.messwerte.filter((messwert) => {
    if (messwert.parameter_mapping_herkunft === "ignoriert") {
      return false;
    }
    if (messwert.parameter_mapping_herkunft === "neu") {
      return false;
    }
    return !(mappingState[messwert.messwert_index] || messwert.parameter_id);
  }).length;
}

export function getIgnoredMeasurementCount(
  importDetail: ImportVorgangDetail | undefined,
  mappingState: Record<number, string>
): number {
  if (!importDetail || !Array.isArray(importDetail.messwerte)) {
    return 0;
  }
  return importDetail.messwerte.filter(
    (messwert) =>
      mappingState[messwert.messwert_index] === IGNORE_MEASUREMENT_MAPPING_VALUE ||
      messwert.parameter_mapping_herkunft === "ignoriert"
  ).length;
}

export function shouldPreselectNewParameter(messwert: ImportMesswertPreview): boolean {
  return !messwert.parameter_id && !messwert.parameter_mapping_hinweis;
}

export function formatImportReferenceResolved(messwert: ImportMesswertPreview): string {
  const range = formatReferenzAnzeige({
    wert_typ: messwert.wert_typ,
    soll_text: messwert.referenz_text_original,
    referenz_text_original: messwert.referenz_text_original,
    untere_grenze_num: messwert.untere_grenze_num,
    untere_grenze_operator: messwert.untere_grenze_operator,
    obere_grenze_num: messwert.obere_grenze_num,
    obere_grenze_operator: messwert.obere_grenze_operator,
    einheit: messwert.referenz_einheit || messwert.einheit_original
  });

  if (
    range !== "—" &&
    messwert.referenz_text_original &&
    !range.includes(messwert.referenz_text_original)
  ) {
    return `${range} (${messwert.referenz_text_original})`;
  }
  return range;
}
