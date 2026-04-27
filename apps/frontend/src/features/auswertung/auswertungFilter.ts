import { PARAMETER_KLASSIFIKATION_OPTIONS } from "../../shared/constants/fieldOptions";
import { formatShortDisplayDate as formatShortDate } from "../../shared/utils/dateFormatting";
import { applySharedFilterSearchParams } from "../../shared/utils/filterNavigation";
import type {
  AnsichtVorlageKonfiguration,
  AuswertungGesamtzahlen,
  AuswertungResponse,
  Gruppe,
  Labor,
  Messwert,
  Parameter,
  ParameterKlassifikationCode,
  Person
} from "../../shared/types/api";
import { auswertungFilterStorageKey, initialForm } from "./auswertungConfig";
import type {
  AuswertungFormState,
  AuswertungPreviewCounts,
  DiagrammDarstellung,
  QualitativeAuswertungEvent,
  StatistikCard,
  VertikalachsenModus,
  ZeitraumDarstellung
} from "./auswertungTypes";

const sharedFilterSearchParamKeys = [
  "person_ids",
  "laborparameter_ids",
  "gruppen_ids",
  "klassifikationen",
  "labor_ids",
  "datum_von",
  "datum_bis"
];

export function hasSharedFilterSearchParams(searchParams: URLSearchParams): boolean {
  return sharedFilterSearchParamKeys.some((key) => searchParams.has(key));
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function readKlassifikationen(value: unknown): ParameterKlassifikationCode[] {
  const validValues = new Set<string>(PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => option.value));
  return readStringArray(value).filter((item): item is ParameterKlassifikationCode => validValues.has(item));
}

export function readDiagrammDarstellung(value: unknown): DiagrammDarstellung {
  if (value === "punkte" || value === "punkte_bereiche" || value === "verlauf") {
    return value;
  }
  return initialForm.diagramm_darstellung;
}

export function readVertikalachsenModus(value: unknown): VertikalachsenModus {
  if (value === "datenbereich" || value === "nullbasis") {
    return value;
  }
  return initialForm.vertikalachsen_modus;
}

export function readZeitraumDarstellung(value: unknown): ZeitraumDarstellung {
  if (value === "selektionszeitraum" || value === "wertezeitraum") {
    return value;
  }
  return initialForm.zeitraum_darstellung;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function readStoredAuswertungFilter(storage: Pick<Storage, "getItem"> = window.localStorage): AuswertungFormState | null {
  try {
    const rawValue = storage.getItem(auswertungFilterStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<AuswertungFormState>;
    return {
      ...initialForm,
      person_ids: readStringArray(parsed.person_ids),
      laborparameter_ids: readStringArray(parsed.laborparameter_ids),
      gruppen_ids: readStringArray(parsed.gruppen_ids),
      klassifikationen: readKlassifikationen(parsed.klassifikationen),
      labor_ids: readStringArray(parsed.labor_ids),
      datum_von: typeof parsed.datum_von === "string" ? parsed.datum_von : initialForm.datum_von,
      datum_bis: typeof parsed.datum_bis === "string" ? parsed.datum_bis : initialForm.datum_bis,
      diagramm_darstellung: readDiagrammDarstellung(parsed.diagramm_darstellung),
      zeitraum_darstellung: readZeitraumDarstellung(parsed.zeitraum_darstellung),
      vertikalachsen_modus: readVertikalachsenModus(parsed.vertikalachsen_modus),
      include_laborreferenz: readBoolean(parsed.include_laborreferenz, initialForm.include_laborreferenz),
      include_zielbereich: readBoolean(parsed.include_zielbereich, initialForm.include_zielbereich),
      messwerttabelle_standard_offen: readBoolean(
        parsed.messwerttabelle_standard_offen,
        initialForm.messwerttabelle_standard_offen
      )
    };
  } catch {
    return null;
  }
}

export function buildInitialAuswertungForm(searchParams: URLSearchParams): AuswertungFormState {
  const baseFilter = hasSharedFilterSearchParams(searchParams)
    ? initialForm
    : (readStoredAuswertungFilter() ?? initialForm);
  return applySharedFilterSearchParams(baseFilter, searchParams);
}

export function buildAuswertungVorlageConfig(form: AuswertungFormState): AnsichtVorlageKonfiguration {
  return {
    filter: {
      person_ids: form.person_ids,
      laborparameter_ids: form.laborparameter_ids,
      gruppen_ids: form.gruppen_ids,
      klassifikationen: form.klassifikationen,
      labor_ids: form.labor_ids,
      datum_von: form.datum_von || null,
      datum_bis: form.datum_bis || null
    },
    optionen: {
      include_laborreferenz: form.include_laborreferenz,
      include_zielbereich: form.include_zielbereich,
      diagramm_darstellung: form.diagramm_darstellung,
      zeitraum_darstellung: form.zeitraum_darstellung,
      vertikalachsen_modus: form.vertikalachsen_modus,
      messwerttabelle_standard_offen: form.messwerttabelle_standard_offen
    }
  };
}

export function applyAuswertungVorlageConfig(config: AnsichtVorlageKonfiguration): AuswertungFormState {
  const filter = config.filter ?? initialForm;
  const optionen = config.optionen ?? {};

  return {
    ...initialForm,
    person_ids: readStringArray(filter.person_ids),
    laborparameter_ids: readStringArray(filter.laborparameter_ids),
    gruppen_ids: readStringArray(filter.gruppen_ids),
    klassifikationen: readKlassifikationen(filter.klassifikationen),
    labor_ids: readStringArray(filter.labor_ids),
    datum_von: typeof filter.datum_von === "string" ? filter.datum_von : filter.datum_von === null ? "" : initialForm.datum_von,
    datum_bis: typeof filter.datum_bis === "string" ? filter.datum_bis : filter.datum_bis === null ? "" : initialForm.datum_bis,
    diagramm_darstellung: readDiagrammDarstellung(optionen.diagramm_darstellung),
    zeitraum_darstellung: readZeitraumDarstellung(optionen.zeitraum_darstellung),
    vertikalachsen_modus: readVertikalachsenModus(optionen.vertikalachsen_modus),
    include_laborreferenz: readBoolean(optionen.include_laborreferenz, initialForm.include_laborreferenz),
    include_zielbereich: readBoolean(optionen.include_zielbereich, initialForm.include_zielbereich),
    messwerttabelle_standard_offen: readBoolean(
      optionen.messwerttabelle_standard_offen,
      initialForm.messwerttabelle_standard_offen
    )
  };
}

function countMissingIds(ids: string[], knownIds: string[]): number {
  const known = new Set(knownIds);
  return ids.filter((id) => !known.has(id)).length;
}

export function buildMissingTemplateWarning(
  form: AuswertungFormState,
  data: {
    personen: Person[];
    gruppen: Gruppe[];
    parameter: Parameter[];
    labore: Labor[];
  }
): string | null {
  const missingCount =
    countMissingIds(form.person_ids, data.personen.map((person) => person.id)) +
    countMissingIds(form.gruppen_ids, data.gruppen.map((gruppe) => gruppe.id)) +
    countMissingIds(form.laborparameter_ids, data.parameter.map((parameter) => parameter.id)) +
    countMissingIds(form.labor_ids, data.labore.map((labor) => labor.id));

  return missingCount ? `Diese Vorlage enthält ${missingCount} nicht mehr verfügbare Auswahlwerte.` : null;
}

export function formatSelectedSummary(
  ids: string[],
  labelsById: Map<string, string>,
  countLabel: string,
  maxNamedItems: number,
  emptyLabel?: string
): string | null {
  if (!ids.length) {
    return emptyLabel ?? null;
  }

  if (ids.length > maxNamedItems) {
    return `${ids.length} ${countLabel}`;
  }

  const labels = ids.map((id) => labelsById.get(id)).filter((label): label is string => Boolean(label));
  if (labels.length !== ids.length) {
    return `${ids.length} ${countLabel}`;
  }

  return labels.join(", ");
}

export function buildFilterSummary(
  form: AuswertungFormState,
  options: {
    personen: Person[];
    gruppen: Gruppe[];
    parameter: Parameter[];
    labore: Labor[];
  }
): string[] {
  const personenById = new Map(options.personen.map((person) => [person.id, person.anzeigename]));
  const gruppenById = new Map(options.gruppen.map((gruppe) => [gruppe.id, gruppe.name]));
  const parameterById = new Map(options.parameter.map((parameter) => [parameter.id, parameter.anzeigename]));
  const laboreById = new Map(options.labore.map((labor) => [labor.id, labor.name]));
  const klassifikationById = new Map(PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => [option.value, option.label]));

  const summary = [
    formatSelectedSummary(form.person_ids, personenById, "Pers.", 6, "Keine Person"),
    formatSelectedSummary(form.gruppen_ids, gruppenById, "Parametergruppen", 6),
    formatSelectedSummary(form.laborparameter_ids, parameterById, "Param.", 20),
    formatSelectedSummary(form.klassifikationen, klassifikationById, "KSG", 6),
    formatSelectedSummary(form.labor_ids, laboreById, "Lab.", 6)
  ].filter((item): item is string => Boolean(item));

  if (form.datum_von || form.datum_bis) {
    summary.push(`${formatShortDate(form.datum_von)}-${formatShortDate(form.datum_bis)}`);
  }

  return summary;
}

export function buildAuswertungPreviewCounts(messwerte: Messwert[], personCount: number): AuswertungPreviewCounts {
  return {
    personen: personCount,
    parameter: new Set(messwerte.map((messwert) => messwert.laborparameter_id)).size,
    messwerte: messwerte.length,
    befunde: new Set(messwerte.map((messwert) => messwert.befund_id)).size
  };
}

export function buildFilterPeriodLabel(form: AuswertungFormState): string {
  return form.datum_von || form.datum_bis
    ? `${formatShortDate(form.datum_von)} bis ${formatShortDate(form.datum_bis)}`
    : "alle Zeiträume";
}

export function buildStatistikCards(params: {
  form: AuswertungFormState;
  previewCounts: AuswertungPreviewCounts;
  gesamtzahlen?: AuswertungGesamtzahlen;
  isPreviewFetching: boolean;
  hasPreviewData: boolean;
}): StatistikCard[] {
  const previewValue = (value: number) =>
    params.form.person_ids.length ? (params.isPreviewFetching && !params.hasPreviewData ? "…" : value) : "—";

  return [
    {
      label: "Personen",
      value: params.form.person_ids.length ? params.previewCounts.personen : "—",
      detail: `${params.gesamtzahlen?.personen_anzahl ?? "—"} gesamt`
    },
    {
      label: "Parameter",
      value: previewValue(params.previewCounts.parameter),
      detail: `${params.gesamtzahlen?.parameter_anzahl ?? "—"} gesamt`
    },
    {
      label: "Messwerte",
      value: previewValue(params.previewCounts.messwerte),
      detail: `${params.gesamtzahlen?.messwerte_anzahl ?? "—"} gesamt`
    },
    {
      label: "Befunde",
      value: previewValue(params.previewCounts.befunde),
      detail: `${params.gesamtzahlen?.befunde_anzahl ?? "—"} gesamt`
    }
  ];
}

export function buildQualitativeEvents(data?: AuswertungResponse): QualitativeAuswertungEvent[] {
  return (data?.serien ?? [])
    .flatMap((serie) =>
      serie.punkte
        .filter((punkt) => punkt.wert_typ !== "numerisch" || punkt.wert_num === null || punkt.wert_num === undefined)
        .map((punkt) => ({
          ...punkt,
          parameter_anzeigename: serie.parameter_anzeigename
        }))
    )
    .sort((left, right) => (left.datum ?? "").localeCompare(right.datum ?? ""));
}
