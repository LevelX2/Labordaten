import { formatDisplayDate as formatDate } from "../../shared/utils/dateFormatting";
import type { AuswertungPunkt } from "../../shared/types/api";
import { laborreferenzPalette, palette, zielbereichPalette } from "./auswertungConfig";
import type {
  ChartLineGroup,
  ChartPerson,
  ChartRow,
  RangeMarker,
  VertikalachsenModus,
  YAxisScaleConfig
} from "./auswertungTypes";

export function parseDateToTimestamp(value?: string | null): number | null {
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

export function buildPersonChartData(points: AuswertungPunkt[]): ChartPerson[] {
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

export function buildChartLineGroups(
  people: ChartPerson[],
  includeLaborreferenz: boolean,
  includeZielbereich: boolean,
  showReferenceAreas: boolean
): ChartLineGroup[] {
  return people.flatMap((person) => {
    const groups: ChartLineGroup[] = [
      {
        id: `wert__${person.id}`,
        personId: person.id,
        label: person.name,
        color: palette[person.index % palette.length],
        kind: "wert",
        count: person.pointCount
      }
    ];

    if (showReferenceAreas && includeLaborreferenz && person.laborreferenzCount > 0) {
      groups.push({
        id: `laborreferenz__${person.id}`,
        personId: person.id,
        label: `Laborreferenz ${person.name}`,
        color: laborreferenzPalette[person.index % laborreferenzPalette.length],
        kind: "laborreferenz",
        count: person.laborreferenzCount
      });
    }

    if (showReferenceAreas && includeZielbereich && person.zielbereichCount > 0) {
      groups.push({
        id: `zielbereich__${person.id}`,
        personId: person.id,
        label: `Zielbereich ${person.name}`,
        color: zielbereichPalette[person.index % zielbereichPalette.length],
        kind: "zielbereich",
        count: person.zielbereichCount
      });
    }

    return groups;
  });
}

export function formatLegendItemLabel(group: ChartLineGroup): string {
  if (group.kind === "wert") {
    return `Werte (${group.count})`;
  }
  if (group.kind === "laborreferenz") {
    return "Laborreferenz";
  }
  return "Zielbereich";
}

export function buildChartData(points: AuswertungPunkt[]): ChartRow[] {
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

export function buildRangeMarkers(points: AuswertungPunkt[], people: ChartPerson[]): RangeMarker[] {
  const personIndexById = new Map(people.map((person) => [person.id, person.index]));
  const markers: RangeMarker[] = [];

  for (const point of points) {
    if (point.wert_num === null || point.wert_num === undefined) {
      continue;
    }

    const timestamp = parseDateToTimestamp(point.datum);
    if (timestamp === null) {
      continue;
    }

    const personIndex = personIndexById.get(point.person_id) ?? 0;
    const laborLower = point.laborreferenz_untere_num ?? null;
    const laborUpper = point.laborreferenz_obere_num ?? null;
    if (laborLower !== null || laborUpper !== null) {
      markers.push({
        id: `laborreferenz__${point.person_id}__${point.messwert_id}`,
        timestamp,
        personId: point.person_id,
        kind: "laborreferenz",
        lower: laborLower,
        upper: laborUpper,
        color: laborreferenzPalette[personIndex % laborreferenzPalette.length]
      });
    }

    const targetLower = point.zielbereich_untere_num ?? null;
    const targetUpper = point.zielbereich_obere_num ?? null;
    if (targetLower !== null || targetUpper !== null) {
      markers.push({
        id: `zielbereich__${point.person_id}__${point.messwert_id}`,
        timestamp,
        personId: point.person_id,
        kind: "zielbereich",
        lower: targetLower,
        upper: targetUpper,
        color: zielbereichPalette[personIndex % zielbereichPalette.length]
      });
    }
  }

  return markers;
}

function addFiniteNumber(values: number[], value: number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    values.push(value);
  }
}

export function collectYAxisDomainValues(
  points: AuswertungPunkt[],
  includeLaborreferenz: boolean,
  includeZielbereich: boolean
): number[] {
  const values: number[] = [];

  for (const point of points) {
    if (point.wert_num === null || point.wert_num === undefined || parseDateToTimestamp(point.datum) === null) {
      continue;
    }

    addFiniteNumber(values, point.wert_num);
    if (includeLaborreferenz) {
      addFiniteNumber(values, point.laborreferenz_untere_num);
      addFiniteNumber(values, point.laborreferenz_obere_num);
    }
    if (includeZielbereich) {
      addFiniteNumber(values, point.zielbereich_untere_num);
      addFiniteNumber(values, point.zielbereich_obere_num);
    }
  }

  return values;
}

export function normalizeChartNumber(value: number): number {
  const normalized = Number(value.toPrecision(12));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function chooseYAxisStep(span: number): number {
  if (span <= 0 || !Number.isFinite(span)) {
    return 1;
  }

  const rawStep = span / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const factors = magnitude >= 1 ? [1, 2, 5, 10] : [1, 2.5, 5, 10];
  const factor = factors.find((candidate) => candidate * magnitude >= rawStep) ?? 10;
  return normalizeChartNumber(factor * magnitude);
}

export function buildTicks(domainMin: number, domainMax: number, step: number): number[] {
  const ticks: number[] = [];
  const maxIterations = 100;

  for (let index = 0; index < maxIterations; index += 1) {
    const tick = normalizeChartNumber(domainMin + step * index);
    if (tick > domainMax + step * 0.25) {
      break;
    }
    ticks.push(tick);
  }

  return ticks;
}

function getFractionDigitsForStep(step?: number): number {
  if (!step || !Number.isFinite(step)) {
    return 2;
  }

  const normalizedStep = normalizeChartNumber(step);
  const [, decimals = ""] = normalizedStep.toFixed(8).replace(/0+$/, "").split(".");
  return Math.min(decimals.length, 4);
}

export function formatYAxisTick(value: unknown, step?: number): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: getFractionDigitsForStep(step)
  }).format(numericValue);
}

export function padYAxisDomain(minValue: number, maxValue: number, keepZeroBaseline: boolean): [number, number] {
  const span = maxValue - minValue;
  const padding = span > 0 ? span * 0.05 : Math.max(Math.abs(maxValue || minValue) * 0.05, 1);

  if (keepZeroBaseline && minValue >= 0) {
    return [0, maxValue + padding];
  }
  if (keepZeroBaseline && maxValue <= 0) {
    return [minValue - padding, 0];
  }

  return [minValue - padding, maxValue + padding];
}

export function buildNiceYAxisScale(
  minValue: number,
  maxValue: number,
  keepZeroBaseline: boolean
): YAxisScaleConfig {
  const [paddedMin, paddedMax] = padYAxisDomain(minValue, maxValue, keepZeroBaseline);
  const step = chooseYAxisStep(paddedMax - paddedMin);
  let domainMin = normalizeChartNumber(Math.floor(paddedMin / step) * step);
  let domainMax = normalizeChartNumber(Math.ceil(paddedMax / step) * step);

  if (keepZeroBaseline && minValue >= 0) {
    domainMin = 0;
  }
  if (keepZeroBaseline && maxValue <= 0) {
    domainMax = 0;
  }
  if (domainMin === domainMax) {
    domainMin = normalizeChartNumber(domainMin - step);
    domainMax = normalizeChartNumber(domainMax + step);
  }

  return {
    domain: [domainMin, domainMax],
    ticks: buildTicks(domainMin, domainMax, step),
    step
  };
}

export function buildYAxisScale(
  points: AuswertungPunkt[],
  modus: VertikalachsenModus,
  includeLaborreferenz: boolean,
  includeZielbereich: boolean
): YAxisScaleConfig | undefined {
  const values = collectYAxisDomainValues(points, includeLaborreferenz, includeZielbereich);
  if (!values.length) {
    return undefined;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (modus === "nullbasis") {
    return buildNiceYAxisScale(Math.min(0, minValue), Math.max(0, maxValue), true);
  }

  return buildNiceYAxisScale(minValue, maxValue, false);
}

export function buildAxisDomain(
  zeitraumDarstellung: "wertezeitraum" | "selektionszeitraum",
  datumVon: string,
  datumBis: string
): [string, string] | [number | string, number | string] {
  if (zeitraumDarstellung === "wertezeitraum") {
    return ["dataMin", "dataMax"];
  }
  return [parseDateToTimestamp(datumVon) ?? "dataMin", parseDateToTimestamp(datumBis) ?? "dataMax"];
}
