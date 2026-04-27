import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { apiFetch } from "../../shared/api/client";
import { DateRangeFilterFields, isInvalidDateRange } from "../../shared/components/DateRangeFilterFields";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { ViewTemplateBar } from "../../shared/components/ViewTemplateBar";
import {
  PARAMETER_KLASSIFIKATION_OPTIONS,
  formatParameterKlassifikation
} from "../../shared/constants/fieldOptions";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import {
  formatDisplayDate as formatDate,
  formatShortDisplayDate as formatShortDate
} from "../../shared/utils/dateFormatting";
import { applySharedFilterSearchParams, buildSharedFilterSearchParams } from "../../shared/utils/filterNavigation";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type {
  AnsichtVorlage,
  AnsichtVorlageCreatePayload,
  AnsichtVorlageDeleteResult,
  AnsichtVorlageKonfiguration,
  AnsichtVorlageUpdatePayload,
  AuswertungGesamtzahlen,
  AuswertungPunkt,
  AuswertungResponse,
  AuswertungsSerie,
  Gruppe,
  Labor,
  Messwert,
  Parameter,
  ParameterKlassifikationCode,
  Person
} from "../../shared/types/api";

const defaultDateRange = getDefaultDateRange();
const maxAuswertungParameter = 20;
const auswertungFilterStorageKey = "labordaten.auswertung.filter";

type DiagrammDarstellung = "verlauf" | "punkte" | "punkte_bereiche";

type AuswertungFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  klassifikationen: ParameterKlassifikationCode[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  diagramm_darstellung: DiagrammDarstellung;
  zeitraum_darstellung: "wertezeitraum" | "selektionszeitraum";
  include_laborreferenz: boolean;
  include_zielbereich: boolean;
  messwerttabelle_standard_offen: boolean;
};

const initialForm: AuswertungFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  klassifikationen: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  diagramm_darstellung: "verlauf",
  zeitraum_darstellung: "wertezeitraum",
  include_laborreferenz: true,
  include_zielbereich: true,
  messwerttabelle_standard_offen: false
};

const palette = ["#1f5a92", "#1f6a53", "#d77a2f", "#8d4aa5", "#a34848", "#4d6b1f"];
const laborreferenzPalette = ["#d97706", "#dc2626", "#c026d3", "#7c3aed", "#2563eb", "#0891b2"];
const zielbereichPalette = ["#1f6a53", "#4d7f2a", "#008097", "#2b6f92", "#5f7f1f", "#6f6f1f"];
const diagrammDarstellungOptions: Array<{ value: DiagrammDarstellung; label: string }> = [
  { value: "verlauf", label: "Verlauf" },
  { value: "punkte", label: "Punkte" },
  { value: "punkte_bereiche", label: "Punkte + Bereiche" }
];
const sharedFilterSearchParamKeys = [
  "person_ids",
  "laborparameter_ids",
  "gruppen_ids",
  "klassifikationen",
  "labor_ids",
  "datum_von",
  "datum_bis"
];

function hasSharedFilterSearchParams(searchParams: URLSearchParams): boolean {
  return sharedFilterSearchParamKeys.some((key) => searchParams.has(key));
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readKlassifikationen(value: unknown): ParameterKlassifikationCode[] {
  const validValues = new Set<string>(PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => option.value));
  return readStringArray(value).filter((item): item is ParameterKlassifikationCode => validValues.has(item));
}

function readDiagrammDarstellung(value: unknown): DiagrammDarstellung {
  if (value === "punkte" || value === "punkte_bereiche" || value === "verlauf") {
    return value;
  }
  return initialForm.diagramm_darstellung;
}

function readStoredAuswertungFilter(): AuswertungFormState | null {
  try {
    const rawValue = window.localStorage.getItem(auswertungFilterStorageKey);
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
      zeitraum_darstellung:
        parsed.zeitraum_darstellung === "selektionszeitraum" || parsed.zeitraum_darstellung === "wertezeitraum"
          ? parsed.zeitraum_darstellung
          : initialForm.zeitraum_darstellung,
      include_laborreferenz:
        typeof parsed.include_laborreferenz === "boolean"
          ? parsed.include_laborreferenz
          : initialForm.include_laborreferenz,
      include_zielbereich:
        typeof parsed.include_zielbereich === "boolean" ? parsed.include_zielbereich : initialForm.include_zielbereich,
      messwerttabelle_standard_offen:
        typeof parsed.messwerttabelle_standard_offen === "boolean"
          ? parsed.messwerttabelle_standard_offen
          : initialForm.messwerttabelle_standard_offen
    };
  } catch {
    return null;
  }
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function buildAuswertungVorlageConfig(form: AuswertungFormState): AnsichtVorlageKonfiguration {
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
      messwerttabelle_standard_offen: form.messwerttabelle_standard_offen
    }
  };
}

function applyAuswertungVorlageConfig(config: AnsichtVorlageKonfiguration): AuswertungFormState {
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
    zeitraum_darstellung:
      optionen.zeitraum_darstellung === "selektionszeitraum" || optionen.zeitraum_darstellung === "wertezeitraum"
        ? optionen.zeitraum_darstellung
        : initialForm.zeitraum_darstellung,
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

function buildMissingTemplateWarning(
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

function formatSelectedSummary(
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

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(value);
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);
}

function formatTrend(value: string): string {
  if (value === "steigend") {
    return "Steigend";
  }
  if (value === "fallend") {
    return "Fallend";
  }
  return "Unverändert";
}

function formatTargetRange(point: AuswertungPunkt): string {
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

function parseDateToTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  return Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText));
}

type ChartRow = Record<string, string | number | null>;

type ChartPerson = {
  id: string;
  name: string;
  index: number;
  pointCount: number;
  laborreferenzCount: number;
  zielbereichCount: number;
};

type ChartLineGroup = {
  id: string;
  label: string;
  color: string;
  kind: "wert" | "laborreferenz" | "zielbereich";
  count: number;
};

function buildPersonChartData(points: AuswertungPunkt[]): ChartPerson[] {
  const byPerson = new Map<string, ChartPerson>();
  for (const point of points) {
    if (point.wert_num === null || point.wert_num === undefined || parseDateToTimestamp(point.datum) === null) {
      continue;
    }

    const current = byPerson.get(point.person_id) ?? {
      id: point.person_id,
      name: point.person_anzeigename,
      index: byPerson.size,
      pointCount: 0,
      laborreferenzCount: 0,
      zielbereichCount: 0
    };
    current.pointCount += 1;
    if (
      (point.laborreferenz_untere_num !== null && point.laborreferenz_untere_num !== undefined) ||
      (point.laborreferenz_obere_num !== null && point.laborreferenz_obere_num !== undefined)
    ) {
      current.laborreferenzCount += 1;
    }
    if (
      (point.zielbereich_untere_num !== null && point.zielbereich_untere_num !== undefined) ||
      (point.zielbereich_obere_num !== null && point.zielbereich_obere_num !== undefined)
    ) {
      current.zielbereichCount += 1;
    }
    byPerson.set(point.person_id, current);
  }
  return Array.from(byPerson.values());
}

function buildChartLineGroups(
  people: ChartPerson[],
  includeLaborreferenz: boolean,
  includeZielbereich: boolean,
  showReferenceAreas: boolean
): ChartLineGroup[] {
  return people.flatMap((person) => {
    const groups: ChartLineGroup[] = [
      {
        id: `wert__${person.id}`,
        label: person.name,
        color: palette[person.index % palette.length],
        kind: "wert",
        count: person.pointCount
      }
    ];

    if (showReferenceAreas && includeLaborreferenz && person.laborreferenzCount > 0) {
      groups.push({
        id: `laborreferenz__${person.id}`,
        label: `Laborreferenz ${person.name}`,
        color: laborreferenzPalette[person.index % laborreferenzPalette.length],
        kind: "laborreferenz",
        count: person.laborreferenzCount
      });
    }

    if (showReferenceAreas && includeZielbereich && person.zielbereichCount > 0) {
      groups.push({
        id: `zielbereich__${person.id}`,
        label: `Zielbereich ${person.name}`,
        color: zielbereichPalette[person.index % zielbereichPalette.length],
        kind: "zielbereich",
        count: person.zielbereichCount
      });
    }

    return groups;
  });
}

function buildChartData(points: AuswertungPunkt[]) {
  const byDate = new Map<number, ChartRow>();
  for (const point of points) {
    if (point.wert_num === null || point.wert_num === undefined) {
      continue;
    }

    const timestamp = parseDateToTimestamp(point.datum);
    if (timestamp === null) {
      continue;
    }

    const row = byDate.get(timestamp) ?? {
      timestamp,
      datumLabel: formatDate(point.datum)
    };
    const valueKey = `wert__${point.person_id}`;
    row[valueKey] = point.wert_num;
    row[`${valueKey}__display`] = point.wert_anzeige;
    row[`${valueKey}__operator`] = point.wert_operator;
    row[`laborreferenz_unten__${point.person_id}`] = point.laborreferenz_untere_num ?? null;
    row[`laborreferenz_oben__${point.person_id}`] = point.laborreferenz_obere_num ?? null;
    row[`zielbereich_unten__${point.person_id}`] = point.zielbereich_untere_num ?? null;
    row[`zielbereich_oben__${point.person_id}`] = point.zielbereich_obere_num ?? null;
    byDate.set(timestamp, row);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left - right)
    .map(([, value]) => value);
}

function buildFilterSummary(
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
  const klassifikationById = new Map(
    PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => [option.value, option.label])
  );

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

function formatTooltipValue(value: unknown): string {
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}

function renderOperatorDot(props: {
  cx?: number;
  cy?: number;
  fill?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}) {
  const { cx, cy, fill = "#1f5a92", dataKey, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || typeof dataKey !== "string") {
    return <circle cx={0} cy={0} r={0} fill="transparent" stroke="transparent" />;
  }

  const operator = payload?.[`${dataKey}__operator`];
  if (operator === "kleiner_als" || operator === "kleiner_gleich") {
    return <path d={`M ${cx} ${cy + 7} L ${cx - 7} ${cy - 5} L ${cx + 7} ${cy - 5} Z`} fill={fill} stroke={fill} />;
  }
  if (operator === "groesser_als" || operator === "groesser_gleich") {
    return <path d={`M ${cx} ${cy - 7} L ${cx - 7} ${cy + 5} L ${cx + 7} ${cy + 5} Z`} fill={fill} stroke={fill} />;
  }
  if (operator === "ungefaehr") {
    return <path d={`M ${cx} ${cy - 7} L ${cx - 7} ${cy} L ${cx} ${cy + 7} L ${cx + 7} ${cy} Z`} fill={fill} stroke={fill} />;
  }
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke={fill} />;
}

function SeriesChart({
  serie,
  diagrammDarstellung,
  zeitraumDarstellung,
  datumVon,
  datumBis,
  includeLaborreferenz,
  includeZielbereich
}: {
  serie: AuswertungsSerie;
  diagrammDarstellung: DiagrammDarstellung;
  zeitraumDarstellung: "wertezeitraum" | "selektionszeitraum";
  datumVon: string;
  datumBis: string;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
}) {
  const chartData = useMemo(() => buildChartData(serie.punkte), [serie.punkte]);
  const people = useMemo(() => buildPersonChartData(serie.punkte), [serie.punkte]);
  const [hiddenLineGroups, setHiddenLineGroups] = useState<Set<string>>(() => new Set());
  const connectPersonPoints = diagrammDarstellung === "verlauf";
  const showReferenceAreas = diagrammDarstellung !== "punkte";
  const lineGroups = useMemo(
    () => buildChartLineGroups(people, includeLaborreferenz, includeZielbereich, showReferenceAreas),
    [includeLaborreferenz, includeZielbereich, people, showReferenceAreas]
  );
  const visibleLineGroups = lineGroups.filter((group) => !hiddenLineGroups.has(group.id));
  const axisDomain =
    zeitraumDarstellung === "wertezeitraum"
      ? (["dataMin", "dataMax"] as [string, string])
      : ([
          parseDateToTimestamp(datumVon) ?? "dataMin",
          parseDateToTimestamp(datumBis) ?? "dataMax"
        ] as [number | string, number | string]);

  useEffect(() => {
    const availableGroupIds = new Set(lineGroups.map((group) => group.id));
    setHiddenLineGroups((current) => new Set([...current].filter((groupId) => availableGroupIds.has(groupId))));
  }, [lineGroups]);

  if (!chartData.length) {
    return <p>Für diesen Parameter gibt es aktuell keine numerischen Punkte für ein Diagramm.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ccb9" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={axisDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => (typeof value === "number" ? formatTimestamp(value) : "")}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => (typeof label === "number" ? formatTimestamp(label) : String(label))}
            formatter={(value, name, item) => {
              const dataKey = item?.dataKey;
              if (typeof dataKey === "string") {
                const displayValue = item?.payload?.[`${dataKey}__display`];
                if (typeof displayValue === "string") {
                  return [displayValue, name];
                }
              }
              return [formatTooltipValue(value), String(name)];
            }}
          />
          {visibleLineGroups.map((group) => {
            if (group.kind === "laborreferenz") {
              const personId = group.id.replace("laborreferenz__", "");
              return (
                <Fragment key={group.id}>
                  <Line
                    type="monotone"
                    dataKey={`laborreferenz_unten__${personId}`}
                    name={`${group.label} unten`}
                    stroke={group.color}
                    dot={false}
                    strokeDasharray="4 4"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey={`laborreferenz_oben__${personId}`}
                    name={`${group.label} oben`}
                    stroke={group.color}
                    dot={false}
                    strokeDasharray="4 4"
                    connectNulls
                  />
                </Fragment>
              );
            }

            if (group.kind === "zielbereich") {
              const personId = group.id.replace("zielbereich__", "");
              return (
                <Fragment key={group.id}>
                  <Line
                    type="monotone"
                    dataKey={`zielbereich_unten__${personId}`}
                    name={`${group.label} unten`}
                    stroke={group.color}
                    dot={false}
                    strokeDasharray="2 4"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey={`zielbereich_oben__${personId}`}
                    name={`${group.label} oben`}
                    stroke={group.color}
                    dot={false}
                    strokeDasharray="2 4"
                    connectNulls
                  />
                </Fragment>
              );
            }

            const personId = group.id.replace("wert__", "");
            return (
              <Line
                key={group.id}
                type="monotone"
                dataKey={`wert__${personId}`}
                name={group.label}
                stroke={group.color}
                strokeWidth={connectPersonPoints ? 3 : 0}
                connectNulls={connectPersonPoints}
                dot={(props) => renderOperatorDot({ ...props, fill: group.color })}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <div className="trend-legend" aria-label="Diagrammlinien ein- und ausblenden">
        {lineGroups.map((group) => {
          const isHidden = hiddenLineGroups.has(group.id);
          return (
            <button
              type="button"
              key={group.id}
              className={`trend-legend__item ${isHidden ? "trend-legend__item--muted" : ""}`}
              onClick={() =>
                setHiddenLineGroups((current) => {
                  const next = new Set(current);
                  if (next.has(group.id)) {
                    next.delete(group.id);
                  } else {
                    next.add(group.id);
                  }
                  return next;
                })
              }
              aria-pressed={!isHidden}
            >
              <span
                className={`trend-legend__swatch trend-legend__swatch--${group.kind}`}
                style={{ backgroundColor: group.color }}
                aria-hidden="true"
              />
              {group.label} ({group.count})
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeriesResultCard({
  serie,
  diagrammDarstellung,
  zeitraumDarstellung,
  datumVon,
  datumBis,
  includeLaborreferenz,
  includeZielbereich,
  defaultTableOpen
}: {
  serie: AuswertungsSerie;
  diagrammDarstellung: DiagrammDarstellung;
  zeitraumDarstellung: "wertezeitraum" | "selektionszeitraum";
  datumVon: string;
  datumBis: string;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
  defaultTableOpen: boolean;
}) {
  const [isTableOpen, setIsTableOpen] = useState(defaultTableOpen);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const parameterDescription = serie.parameter_beschreibung?.trim() ?? "";

  useEffect(() => {
    setIsTableOpen(defaultTableOpen);
  }, [defaultTableOpen, serie.laborparameter_id]);

  useEffect(() => {
    setIsDescriptionOpen(false);
  }, [serie.laborparameter_id]);

  return (
    <article className="card card--wide">
      <div className="trend-card__header">
        <div>
          <h3>{serie.parameter_anzeigename}</h3>
          <p>
            {serie.standard_einheit ? `Standardeinheit: ${serie.standard_einheit}` : "Ohne definierte Standardeinheit"}
            {" · "}
            {formatParameterKlassifikation(serie.parameter_primaere_klassifikation)}
          </p>
          {parameterDescription ? (
            <div className={`trend-description${isDescriptionOpen ? " trend-description--open" : ""}`}>
              <p>{parameterDescription}</p>
              <button
                type="button"
                className={`trend-description__toggle${isDescriptionOpen ? " trend-description__toggle--open" : ""}`}
                onClick={() => setIsDescriptionOpen((current) => !current)}
                aria-expanded={isDescriptionOpen}
                aria-label={isDescriptionOpen ? "Parameterbeschreibung einklappen" : "Parameterbeschreibung ausklappen"}
                title={isDescriptionOpen ? "Parameterbeschreibung einklappen" : "Parameterbeschreibung ausklappen"}
              >
                <span aria-hidden="true">▾</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="trend-badges">
          <span className="trend-badge">Messungen: {serie.statistik.anzahl_messungen}</span>
          <span className="trend-badge">Personen: {serie.statistik.personen_anzahl}</span>
          <span className="trend-badge">Trend: {formatTrend(serie.statistik.trendrichtung)}</span>
        </div>
      </div>

      <div className="trend-meta">
        <span>
          Zeitraum: {formatDate(serie.statistik.zeitraum_von)} bis {formatDate(serie.statistik.zeitraum_bis)}
        </span>
        <span>Minimum: {formatNumber(serie.statistik.minimum_num)}</span>
        <span>Maximum: {formatNumber(serie.statistik.maximum_num)}</span>
        <span>Letzter Wert: {serie.statistik.letzter_wert_anzeige ?? "—"}</span>
      </div>

      <SeriesChart
        serie={serie}
        diagrammDarstellung={diagrammDarstellung}
        zeitraumDarstellung={zeitraumDarstellung}
        datumVon={datumVon}
        datumBis={datumBis}
        includeLaborreferenz={includeLaborreferenz}
        includeZielbereich={includeZielbereich}
      />

      <div className="trend-table-panel">
        <div className="trend-table-panel__header">
          <span>Werte</span>
          <button
            type="button"
            className={`trend-table-toggle${isTableOpen ? " trend-table-toggle--open" : ""}`}
            onClick={() => setIsTableOpen((current) => !current)}
            aria-expanded={isTableOpen}
            aria-label={isTableOpen ? "Wertetabelle einklappen" : "Wertetabelle ausklappen"}
            title={isTableOpen ? "Wertetabelle einklappen" : "Wertetabelle ausklappen"}
          >
            <span aria-hidden="true">▾</span>
          </button>
        </div>
        {isTableOpen ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>KSG</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Laborreferenz</th>
                  <th>Zielbereich</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {serie.punkte.map((punkt) => (
                  <tr key={punkt.messwert_id}>
                    <td>{punkt.person_anzeigename}</td>
                    <td>{formatParameterKlassifikation(punkt.parameter_primaere_klassifikation)}</td>
                    <td>{formatDate(punkt.datum)}</td>
                    <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                    <td>{punkt.laborreferenz_text || "—"}</td>
                    <td>{formatTargetRange(punkt)}</td>
                    <td>{punkt.labor_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AuswertungPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuswertungFormState>(() => {
    const baseFilter = hasSharedFilterSearchParams(searchParams)
      ? initialForm
      : (readStoredAuswertungFilter() ?? initialForm);
    return applySharedFilterSearchParams(baseFilter, searchParams);
  });
  const autoLoadKeyRef = useRef<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateBaseline, setTemplateBaseline] = useState("");
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => form.person_ids.length === 0);
  const previewQueryString = useMemo(() => buildSharedFilterSearchParams(form).toString(), [form]);
  const currentTemplateConfig = useMemo(() => buildAuswertungVorlageConfig(form), [form]);
  const currentTemplateSignature = useMemo(() => JSON.stringify(currentTemplateConfig), [currentTemplateConfig]);
  const isDateRangeInvalid = isInvalidDateRange(form.datum_von, form.datum_bis);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const gruppenQuery = useQuery({
    queryKey: ["gruppen"],
    queryFn: () => apiFetch<Gruppe[]>("/api/gruppen")
  });
  const laboreQuery = useQuery({
    queryKey: ["labore"],
    queryFn: () => apiFetch<Labor[]>("/api/labore")
  });
  const auswertungPreviewQuery = useQuery({
    queryKey: ["auswertung", "treffer-vorab", previewQueryString],
    queryFn: () => apiFetch<Messwert[]>(`/api/messwerte?${previewQueryString}`),
    enabled: form.person_ids.length > 0 && !isDateRangeInvalid
  });
  const gesamtzahlenQuery = useQuery({
    queryKey: ["auswertung", "gesamtzahlen"],
    queryFn: () => apiFetch<AuswertungGesamtzahlen>("/api/auswertung/gesamtzahlen")
  });
  const templatesQuery = useQuery({
    queryKey: ["vorlagen", "auswertung_verlauf"],
    queryFn: () => apiFetch<AnsichtVorlage[]>("/api/vorlagen?bereich=auswertung&vorlage_typ=auswertung_verlauf")
  });

  const auswertungMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuswertungResponse>("/api/auswertung/verlauf", {
        method: "POST",
        body: JSON.stringify({
          person_ids: form.person_ids,
          laborparameter_ids: form.laborparameter_ids,
          gruppen_ids: form.gruppen_ids,
          klassifikationen: form.klassifikationen,
          labor_ids: form.labor_ids,
          datum_von: form.datum_von || null,
          datum_bis: form.datum_bis || null,
          include_laborreferenz: form.include_laborreferenz,
          include_zielbereich: form.include_zielbereich
        })
      })
  });
  const createTemplateMutation = useMutation({
    mutationFn: (payload: AnsichtVorlageCreatePayload) =>
      apiFetch<AnsichtVorlage>("/api/vorlagen", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "auswertung_verlauf"] });
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnsichtVorlageUpdatePayload }) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "auswertung_verlauf"] });
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const applyTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}/anwenden`, {
        method: "POST"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vorlagen", "auswertung_verlauf"] })
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlageDeleteResult>(`/api/vorlagen/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "auswertung_verlauf"] });
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
    }
  });

  useEffect(() => {
    window.localStorage.setItem(auswertungFilterStorageKey, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    const autoLoadKey = searchParams.toString();
    if (
      searchParams.get("auto_laden") === "1" &&
      form.person_ids.length > 0 &&
      autoLoadKeyRef.current !== autoLoadKey
    ) {
      autoLoadKeyRef.current = autoLoadKey;
      auswertungMutation.mutate();
    }
  }, [auswertungMutation, form.person_ids.length, searchParams]);

  const qualitativeEvents = useMemo(
    () =>
      (auswertungMutation.data?.serien ?? [])
        .flatMap((serie) =>
          serie.punkte
            .filter((punkt) => punkt.wert_typ !== "numerisch" || punkt.wert_num === null || punkt.wert_num === undefined)
            .map((punkt) => ({
              ...punkt,
              parameter_anzeigename: serie.parameter_anzeigename
            }))
        )
        .sort((left, right) => (left.datum ?? "").localeCompare(right.datum ?? "")),
    [auswertungMutation.data]
  );
  const auswertungPreviewCounts = useMemo(() => {
    const messwerte = auswertungPreviewQuery.data ?? [];
    return {
      personen: form.person_ids.length,
      parameter: new Set(messwerte.map((messwert) => messwert.laborparameter_id)).size,
      messwerte: messwerte.length,
      befunde: new Set(messwerte.map((messwert) => messwert.befund_id)).size
    };
  }, [auswertungPreviewQuery.data, form.person_ids.length]);
  const filterSummary = useMemo(
    () =>
      buildFilterSummary(form, {
        personen: personenQuery.data ?? [],
        gruppen: gruppenQuery.data ?? [],
        parameter: parameterQuery.data ?? [],
        labore: laboreQuery.data ?? []
      }),
    [form, gruppenQuery.data, laboreQuery.data, parameterQuery.data, personenQuery.data]
  );

  const previewValue = (value: number) =>
    form.person_ids.length ? (auswertungPreviewQuery.isFetching && !auswertungPreviewQuery.data ? "…" : value) : "—";
  const filterPeriodLabel =
    form.datum_von || form.datum_bis
      ? `${formatShortDate(form.datum_von)} bis ${formatShortDate(form.datum_bis)}`
      : "alle Zeiträume";
  const statistikCards = [
    {
      label: "Personen",
      value: form.person_ids.length ? auswertungPreviewCounts.personen : "—",
      detail: `${gesamtzahlenQuery.data?.personen_anzahl ?? "—"} gesamt`
    },
    {
      label: "Parameter",
      value: previewValue(auswertungPreviewCounts.parameter),
      detail: `${gesamtzahlenQuery.data?.parameter_anzahl ?? "—"} gesamt`
    },
    {
      label: "Messwerte",
      value: previewValue(auswertungPreviewCounts.messwerte),
      detail: `${gesamtzahlenQuery.data?.messwerte_anzahl ?? "—"} gesamt`
    },
    {
      label: "Befunde",
      value: previewValue(auswertungPreviewCounts.befunde),
      detail: `${gesamtzahlenQuery.data?.befunde_anzahl ?? "—"} gesamt`
    }
  ];
  const hasTooManyPreviewParameters = auswertungPreviewCounts.parameter > maxAuswertungParameter;
  const isLoadBlocked = auswertungMutation.isPending || !form.person_ids.length || isDateRangeInvalid;
  const selectedTemplate = (templatesQuery.data ?? []).find((template) => template.id === selectedTemplateId) ?? null;
  const templateActionPending =
    createTemplateMutation.isPending ||
    updateTemplateMutation.isPending ||
    applyTemplateMutation.isPending ||
    deleteTemplateMutation.isPending;
  const templateError =
    createTemplateMutation.error ??
    updateTemplateMutation.error ??
    applyTemplateMutation.error ??
    deleteTemplateMutation.error ??
    null;
  const hasUnsavedTemplateChanges = Boolean(selectedTemplateId && templateBaseline !== currentTemplateSignature);
  const handleLoadAuswertung = () => {
    if (isLoadBlocked) {
      return;
    }
    if (
      hasTooManyPreviewParameters &&
      !window.confirm(
        `Die aktuelle Filterauswahl umfasst ${auswertungPreviewCounts.parameter} Parameter und ${auswertungPreviewCounts.messwerte} Messwerte. Auswertung trotzdem laden?`
      )
    ) {
      return;
    }
    auswertungMutation.mutate();
  };
  const handleSelectTemplate = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
      return;
    }

    const template = (templatesQuery.data ?? []).find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const nextForm = applyAuswertungVorlageConfig(template.konfiguration_json);
    setForm(nextForm);
    setSelectedTemplateId(template.id);
    setTemplateBaseline(JSON.stringify(template.konfiguration_json));
    setTemplateWarning(
      buildMissingTemplateWarning(nextForm, {
        personen: personenQuery.data ?? [],
        gruppen: gruppenQuery.data ?? [],
        parameter: parameterQuery.data ?? [],
        labore: laboreQuery.data ?? []
      })
    );
    applyTemplateMutation.mutate(template.id);
  };
  const handleSaveTemplate = () => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name: selectedTemplate.name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleSaveTemplateAs = (name: string) => {
    createTemplateMutation.mutate({
      name,
      bereich: "auswertung",
      vorlage_typ: "auswertung_verlauf",
      beschreibung: null,
      konfiguration_json: currentTemplateConfig
    });
  };
  const handleRenameTemplate = (name: string) => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleDeleteTemplate = () => {
    if (selectedTemplateId) {
      deleteTemplateMutation.mutate(selectedTemplateId);
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h2>Auswertung</h2>
        <p>
          Vergleiche Verläufe über Personen, Parametergruppen, Parameter, Labore und Zeitraum und blende Referenz- oder
          Zielbereiche bei Bedarf ein.
        </p>
      </header>

      <div className="card-grid">
        {statistikCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span className="stat-card__label">{card.label}</span>
            <strong>{card.value}</strong>
            <p className="stat-card__detail">{card.detail}</p>
          </div>
        ))}
      </div>
      <p className="auswertung-stats-context">
        Oben stehen die Treffer der aktuellen Filterauswahl für {filterPeriodLabel}; die Gesamtzahlen dienen als
        Vergleich.
      </p>

      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Auswertungsfilter</h3>
            <p>Die Auswahl steuert Diagramme, Kennzahlen und qualitative Ereignisse gemeinsam.</p>
          </div>
          <div className="auswertung-filter-toolbar auswertung-filter-toolbar--header">
            {!isFilterPanelOpen ? (
              <button type="button" className="inline-button" onClick={() => setIsFilterPanelOpen(true)}>
                Filter öffnen
              </button>
            ) : null}
            <button
              type="button"
              className="inline-button"
              onClick={() => {
                setForm(initialForm);
                setSelectedTemplateId("");
                setTemplateBaseline("");
                setTemplateWarning(null);
              }}
            >
              Filter zurücksetzen
            </button>
            {isFilterPanelOpen ? (
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsFilterPanelOpen(false)}
                aria-label="Panel Auswertungsfilter schließen"
                title="Panel Auswertungsfilter schließen"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        <ViewTemplateBar
          templates={templatesQuery.data ?? []}
          selectedTemplateId={selectedTemplateId}
          hasUnsavedChanges={hasUnsavedTemplateChanges}
          isPending={templateActionPending}
          onSelect={handleSelectTemplate}
          onSave={handleSaveTemplate}
          onSaveAs={handleSaveTemplateAs}
          onRename={handleRenameTemplate}
          onDelete={handleDeleteTemplate}
        />
        {templateWarning ? <p className="form-hint">{templateWarning}</p> : null}
        {templateError ? <p className="form-error">{templateError.message}</p> : null}

        {isFilterPanelOpen ? (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              handleLoadAuswertung();
            }}
          >
            <SelectionChecklist
              label="Personen"
              options={(personenQuery.data ?? []).map((person) => ({
                id: person.id,
                label: person.anzeigename
              }))}
              selectedIds={form.person_ids}
              onChange={(person_ids) => setForm((current) => ({ ...current, person_ids }))}
              emptyText="Noch keine Personen vorhanden."
              collapsible
            />

            <SelectionChecklist
              label="Parametergruppen"
              options={(gruppenQuery.data ?? []).map((gruppe) => ({
                id: gruppe.id,
                label: gruppe.name,
                meta: gruppe.beschreibung
              }))}
              selectedIds={form.gruppen_ids}
              onChange={(gruppen_ids) => setForm((current) => ({ ...current, gruppen_ids }))}
              emptyText="Noch keine Parametergruppen vorhanden."
              collapsible
              defaultExpanded={false}
              compactWhenEmptyCollapsed
            />

            <SelectionChecklist
              label="Parameter"
              options={(parameterQuery.data ?? []).map((parameter) => ({
                id: parameter.id,
                label: parameter.anzeigename,
                meta: parameter.standard_einheit
              }))}
              selectedIds={form.laborparameter_ids}
              onChange={(laborparameter_ids) => setForm((current) => ({ ...current, laborparameter_ids }))}
              emptyText="Noch keine Parameter vorhanden."
              collapsible
              defaultExpanded={false}
              searchable
              searchPlaceholder="Parameter filtern"
              showSelectedOnlyToggle
              selectedOnlyLabel="Nur ausgewählte anzeigen"
              compactWhenEmptyCollapsed
            />

            <SelectionChecklist
              label="KSG-Klassen"
              options={PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => ({
                id: option.value,
                label: option.label
              }))}
              selectedIds={form.klassifikationen}
              onChange={(klassifikationen) =>
                setForm((current) => ({
                  ...current,
                  klassifikationen: klassifikationen as ParameterKlassifikationCode[]
                }))
              }
              emptyText="Keine KSG-Klassen verfügbar."
              collapsible
              defaultExpanded={false}
              compactWhenEmptyCollapsed
            />

            <SelectionChecklist
              label="Labore"
              options={(laboreQuery.data ?? []).map((labor) => ({
                id: labor.id,
                label: labor.name
              }))}
              selectedIds={form.labor_ids}
              onChange={(labor_ids) => setForm((current) => ({ ...current, labor_ids }))}
              emptyText="Noch keine Labore vorhanden."
              collapsible
              defaultExpanded={false}
              compactWhenEmptyCollapsed
            />

            <DateRangeFilterFields
              fromValue={form.datum_von}
              toValue={form.datum_bis}
              fallbackFromValue={initialForm.datum_von}
              fallbackToValue={initialForm.datum_bis}
              onFromChange={(datum_von) => setForm((current) => ({ ...current, datum_von }))}
              onToChange={(datum_bis) => setForm((current) => ({ ...current, datum_bis }))}
            />
          </form>
        ) : (
          <div className="inline-actions auswertung-filter-summary">
            <span className="inline-actions__label">Aktive Auswahl:</span>
            <span>{filterSummary.join(" • ")}</span>
          </div>
        )}

        {isDateRangeInvalid && !isFilterPanelOpen ? (
          <p className="form-error">Das Bis-Datum darf nicht vor dem Von-Datum liegen.</p>
        ) : null}
        {hasTooManyPreviewParameters ? (
          <p className="form-hint">
            Diese Auswahl umfasst mehr als {maxAuswertungParameter} Parameter. Beim Laden fragt die Anwendung nach.
          </p>
        ) : null}
        {auswertungPreviewQuery.isError ? <p className="form-error">{auswertungPreviewQuery.error.message}</p> : null}

      </article>

      <article className="card card--soft parameter-action-panel auswertung-display-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Darstellung</h3>
            <p>Diese Einstellungen verändern nur die Ansicht der geladenen Auswertung, nicht die Filterauswahl.</p>
          </div>
        </div>

        <div className="auswertung-display-grid">
          <div className="field field--full">
            <span>Diagrammtyp</span>
            <div className="auswertung-display-modes" role="group" aria-label="Diagrammtyp auswählen">
              {diagrammDarstellungOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`auswertung-display-mode${
                    form.diagramm_darstellung === option.value ? " auswertung-display-mode--active" : ""
                  }`}
                  onClick={() => setForm((current) => ({ ...current, diagramm_darstellung: option.value }))}
                  aria-pressed={form.diagramm_darstellung === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Zeitraumdarstellung im Diagramm</span>
            <select
              value={form.zeitraum_darstellung}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  zeitraum_darstellung: event.target.value as AuswertungFormState["zeitraum_darstellung"]
                }))
              }
            >
              <option value="wertezeitraum">Nur Zeitraum mit Werten</option>
              <option value="selektionszeitraum">Gewählten Selektionszeitraum fest anzeigen</option>
            </select>
          </label>

          <label className="field">
            <span>Laborreferenzen anzeigen</span>
            <input
              type="checkbox"
              checked={form.include_laborreferenz}
              onChange={(event) => setForm((current) => ({ ...current, include_laborreferenz: event.target.checked }))}
            />
          </label>

          <label className="field">
            <span>Zielbereiche anzeigen</span>
            <input
              type="checkbox"
              checked={form.include_zielbereich}
              onChange={(event) => setForm((current) => ({ ...current, include_zielbereich: event.target.checked }))}
            />
          </label>

          <label className="field">
            <span>Wertetabellen standardmäßig geöffnet</span>
            <input
              type="checkbox"
              checked={form.messwerttabelle_standard_offen}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  messwerttabelle_standard_offen: event.target.checked
                }))
              }
            />
          </label>
        </div>
      </article>

      <div className="form-actions auswertung-filter-load">
        <button type="button" onClick={handleLoadAuswertung} disabled={isLoadBlocked}>
          {auswertungMutation.isPending ? "Lädt..." : "Auswertung laden"}
        </button>
        {auswertungMutation.isError ? <p className="form-error">{auswertungMutation.error.message}</p> : null}
      </div>

      {auswertungMutation.data && !auswertungMutation.data.serien.length && !qualitativeEvents.length ? (
        <article className="card">
          <h3>Keine Ergebnisse</h3>
          <p>Für die aktuelle Auswahl liegen derzeit keine passenden Verlaufsdaten oder qualitativen Ereignisse vor.</p>
        </article>
      ) : null}

      {auswertungMutation.data ? (
        <div className="workspace-grid">
          {auswertungMutation.data.serien.map((serie) => (
            <SeriesResultCard
              key={serie.laborparameter_id}
              serie={serie}
              diagrammDarstellung={form.diagramm_darstellung}
              zeitraumDarstellung={form.zeitraum_darstellung}
              datumVon={form.datum_von}
              datumBis={form.datum_bis}
              includeLaborreferenz={form.include_laborreferenz}
              includeZielbereich={form.include_zielbereich}
              defaultTableOpen={form.messwerttabelle_standard_offen}
            />
          ))}
        </div>
      ) : null}

      {auswertungMutation.data ? (
        <article className="card">
          <h3>Qualitative Ereignisse</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>KSG</th>
                  <th>Wert</th>
                  <th>Bemerkung</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {qualitativeEvents.map((event) => (
                  <tr key={event.messwert_id}>
                    <td>{formatDate(event.datum)}</td>
                    <td>{event.person_anzeigename}</td>
                    <td>{event.parameter_anzeigename}</td>
                    <td>{formatParameterKlassifikation(event.parameter_primaere_klassifikation)}</td>
                    <td>{[event.wert_anzeige, event.einheit].filter(Boolean).join(" ")}</td>
                    <td>{event.messwertbemerkung || event.befundbemerkung || "—"}</td>
                    <td>{event.labor_name || "—"}</td>
                  </tr>
                ))}
                {!qualitativeEvents.length ? (
                  <tr>
                    <td colSpan={7}>Noch keine qualitativen Ereignisse für die aktuelle Auswahl.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
