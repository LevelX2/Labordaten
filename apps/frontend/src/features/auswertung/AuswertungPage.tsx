import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { apiFetch } from "../../shared/api/client";
import { DateRangeFilterFields } from "../../shared/components/DateRangeFilterFields";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import { applySharedFilterSearchParams } from "../../shared/utils/filterNavigation";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type {
  AuswertungGesamtzahlen,
  AuswertungPunkt,
  AuswertungResponse,
  AuswertungsSerie,
  Gruppe,
  Labor,
  Parameter,
  Person
} from "../../shared/types/api";

const defaultDateRange = getDefaultDateRange();

type AuswertungFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  zeitraum_darstellung: "wertezeitraum" | "selektionszeitraum";
  include_laborreferenz: boolean;
  include_zielbereich: boolean;
};

const initialForm: AuswertungFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  zeitraum_darstellung: "wertezeitraum",
  include_laborreferenz: true,
  include_zielbereich: true
};

const palette = ["#1f5a92", "#1f6a53", "#d77a2f", "#8d4aa5", "#a34848", "#4d6b1f"];

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
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

function buildChartData(points: AuswertungPunkt[]) {
  const byDate = new Map<number, Record<string, string | number | null>>();
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
      datumLabel: formatDate(point.datum),
      laborreferenz_unten: point.laborreferenz_untere_num ?? null,
      laborreferenz_oben: point.laborreferenz_obere_num ?? null,
      zielbereich_unten: point.zielbereich_untere_num ?? null,
      zielbereich_oben: point.zielbereich_obere_num ?? null
    };
    row[point.person_anzeigename] = point.wert_num;
    row[`${point.person_anzeigename}__display`] = point.wert_anzeige;
    row[`${point.person_anzeigename}__operator`] = point.wert_operator;
    if (row.laborreferenz_unten === null && point.laborreferenz_untere_num !== null && point.laborreferenz_untere_num !== undefined) {
      row.laborreferenz_unten = point.laborreferenz_untere_num;
    }
    if (row.laborreferenz_oben === null && point.laborreferenz_obere_num !== null && point.laborreferenz_obere_num !== undefined) {
      row.laborreferenz_oben = point.laborreferenz_obere_num;
    }
    if (row.zielbereich_unten === null && point.zielbereich_untere_num !== null && point.zielbereich_untere_num !== undefined) {
      row.zielbereich_unten = point.zielbereich_untere_num;
    }
    if (row.zielbereich_oben === null && point.zielbereich_obere_num !== null && point.zielbereich_obere_num !== undefined) {
      row.zielbereich_oben = point.zielbereich_obere_num;
    }
    byDate.set(timestamp, row);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left - right)
    .map(([, value]) => value);
}

function buildFilterSummary(form: AuswertungFormState): string[] {
  const summary: string[] = [];

  if (form.person_ids.length) {
    summary.push(`${form.person_ids.length} Person${form.person_ids.length === 1 ? "" : "en"}`);
  }
  if (form.gruppen_ids.length) {
    summary.push(`${form.gruppen_ids.length} Gruppe${form.gruppen_ids.length === 1 ? "" : "n"}`);
  }
  if (form.laborparameter_ids.length) {
    summary.push(`${form.laborparameter_ids.length} Parameter`);
  }
  if (form.labor_ids.length) {
    summary.push(`${form.labor_ids.length} Labor${form.labor_ids.length === 1 ? "" : "e"}`);
  }

  if (form.datum_von || form.datum_bis) {
    summary.push(
      `Zeitraum ${form.datum_von ? formatDate(form.datum_von) : "offen"} bis ${form.datum_bis ? formatDate(form.datum_bis) : "offen"}`
    );
  }
  summary.push(
    form.zeitraum_darstellung === "selektionszeitraum"
      ? "Achse zeigt Selektionszeitraum"
      : "Achse zeigt Wertezeitraum"
  );

  if (form.include_laborreferenz) {
    summary.push("mit Laborreferenzen");
  }
  if (form.include_zielbereich) {
    summary.push("mit Zielbereichen");
  }

  return summary.length ? summary : ["Noch keine Auswertungsfilter gesetzt."];
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
  zeitraumDarstellung,
  datumVon,
  datumBis,
  includeLaborreferenz,
  includeZielbereich
}: {
  serie: AuswertungsSerie;
  zeitraumDarstellung: "wertezeitraum" | "selektionszeitraum";
  datumVon: string;
  datumBis: string;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
}) {
  const chartData = useMemo(() => buildChartData(serie.punkte), [serie.punkte]);
  const people = useMemo(
    () => Array.from(new Set(serie.punkte.map((punkt) => punkt.person_anzeigename))),
    [serie.punkte]
  );
  const axisDomain =
    zeitraumDarstellung === "wertezeitraum"
      ? (["dataMin", "dataMax"] as [string, string])
      : ([
          parseDateToTimestamp(datumVon) ?? "dataMin",
          parseDateToTimestamp(datumBis) ?? "dataMax"
        ] as [number | string, number | string]);

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
              if (typeof name === "string") {
                const displayValue = item?.payload?.[`${name}__display`];
                if (typeof displayValue === "string") {
                  return [displayValue, name];
                }
              }
              return [formatTooltipValue(value), String(name)];
            }}
          />
          <Legend />
          {includeLaborreferenz ? (
            <>
              <Line
                type="monotone"
                dataKey="laborreferenz_unten"
                name="Laborreferenz unten"
                stroke="#d77a2f"
                dot={false}
                strokeDasharray="4 4"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="laborreferenz_oben"
                name="Laborreferenz oben"
                stroke="#d77a2f"
                dot={false}
                strokeDasharray="4 4"
                connectNulls
              />
            </>
          ) : null}
          {includeZielbereich ? (
            <>
              <Line
                type="monotone"
                dataKey="zielbereich_unten"
                name="Zielbereich unten"
                stroke="#1f6a53"
                dot={false}
                strokeDasharray="2 4"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="zielbereich_oben"
                name="Zielbereich oben"
                stroke="#1f6a53"
                dot={false}
                strokeDasharray="2 4"
                connectNulls
              />
            </>
          ) : null}
          {people.map((personName, index) => (
            <Line
              key={personName}
              type="monotone"
              dataKey={personName}
              name={personName}
              stroke={palette[index % palette.length]}
              strokeWidth={3}
              connectNulls
              dot={renderOperatorDot}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AuswertungPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuswertungFormState>(() =>
    applySharedFilterSearchParams(initialForm, searchParams)
  );
  const autoLoadKeyRef = useRef<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => form.person_ids.length === 0);

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
  const gesamtzahlenQuery = useQuery({
    queryKey: ["auswertung", "gesamtzahlen"],
    queryFn: () => apiFetch<AuswertungGesamtzahlen>("/api/auswertung/gesamtzahlen")
  });

  const auswertungMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuswertungResponse>("/api/auswertung/verlauf", {
        method: "POST",
        body: JSON.stringify({
          person_ids: form.person_ids,
          laborparameter_ids: form.laborparameter_ids,
          gruppen_ids: form.gruppen_ids,
          labor_ids: form.labor_ids,
          datum_von: form.datum_von || null,
          datum_bis: form.datum_bis || null,
          include_laborreferenz: form.include_laborreferenz,
          include_zielbereich: form.include_zielbereich
        })
      })
  });

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
  const filterSummary = useMemo(() => buildFilterSummary(form), [form]);

  const statistikCards = [
    { label: "Personen", value: gesamtzahlenQuery.data?.personen_anzahl ?? "—" },
    { label: "Parameter", value: gesamtzahlenQuery.data?.parameter_anzahl ?? "—" },
    { label: "Messwerte", value: gesamtzahlenQuery.data?.messwerte_anzahl ?? "—" },
    { label: "Befunde", value: gesamtzahlenQuery.data?.befunde_anzahl ?? "—" }
  ];

  return (
    <section className="page">
      <header className="page__header">
        <h2>Auswertung</h2>
        <p>
          Vergleiche Verläufe über Personen, Gruppen, Parameter, Labore und Zeitraum und blende Referenz- oder
          Zielbereiche bei Bedarf ein.
        </p>
      </header>

      <div className="card-grid">
        {statistikCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span className="stat-card__label">{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Auswertungsfilter</h3>
            <p>Die Auswahl steuert Diagramme, Kennzahlen und qualitative Ereignisse gemeinsam.</p>
          </div>
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
          ) : (
            <button type="button" className="inline-button" onClick={() => setIsFilterPanelOpen(true)}>
              Filter öffnen
            </button>
          )}
        </div>

        {isFilterPanelOpen ? (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              auswertungMutation.mutate();
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
              label="Gruppen"
              options={(gruppenQuery.data ?? []).map((gruppe) => ({
                id: gruppe.id,
                label: gruppe.name,
                meta: gruppe.beschreibung
              }))}
              selectedIds={form.gruppen_ids}
              onChange={(gruppen_ids) => setForm((current) => ({ ...current, gruppen_ids }))}
              emptyText="Noch keine Gruppen vorhanden."
              collapsible
              defaultExpanded={false}
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
            />

            <DateRangeFilterFields
              fromValue={form.datum_von}
              toValue={form.datum_bis}
              fallbackFromValue={initialForm.datum_von}
              fallbackToValue={initialForm.datum_bis}
              onFromChange={(datum_von) => setForm((current) => ({ ...current, datum_von }))}
              onToChange={(datum_bis) => setForm((current) => ({ ...current, datum_bis }))}
            />

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

            <div className="form-actions">
              <button type="button" onClick={() => setForm(initialForm)}>
                Filter zurücksetzen
              </button>
              <button type="submit" disabled={auswertungMutation.isPending || !form.person_ids.length}>
                {auswertungMutation.isPending ? "Lädt..." : "Auswertung laden"}
              </button>
              {auswertungMutation.isError ? <p className="form-error">{auswertungMutation.error.message}</p> : null}
            </div>
          </form>
        ) : (
          <div className="inline-actions">
            <span className="inline-actions__label">Aktive Auswahl:</span>
            <span>{filterSummary.join(" • ")}</span>
          </div>
        )}
      </article>

      {auswertungMutation.data && !auswertungMutation.data.serien.length && !qualitativeEvents.length ? (
        <article className="card">
          <h3>Keine Ergebnisse</h3>
          <p>Für die aktuelle Auswahl liegen derzeit keine passenden Verlaufsdaten oder qualitativen Ereignisse vor.</p>
        </article>
      ) : null}

      {auswertungMutation.data ? (
        <div className="workspace-grid">
          {auswertungMutation.data.serien.map((serie) => (
            <article className="card card--wide" key={serie.laborparameter_id}>
              <div className="trend-card__header">
                <div>
                  <h3>{serie.parameter_anzeigename}</h3>
                  <p>
                    {serie.standard_einheit
                      ? `Standardeinheit: ${serie.standard_einheit}`
                      : "Ohne definierte Standardeinheit"}
                  </p>
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
                zeitraumDarstellung={form.zeitraum_darstellung}
                datumVon={form.datum_von}
                datumBis={form.datum_bis}
                includeLaborreferenz={form.include_laborreferenz}
                includeZielbereich={form.include_zielbereich}
              />

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Person</th>
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
            </article>
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
                    <td>{[event.wert_anzeige, event.einheit].filter(Boolean).join(" ")}</td>
                    <td>{event.messwertbemerkung || event.befundbemerkung || "—"}</td>
                    <td>{event.labor_name || "—"}</td>
                  </tr>
                ))}
                {!qualitativeEvents.length ? (
                  <tr>
                    <td colSpan={6}>Noch keine qualitativen Ereignisse für die aktuelle Auswahl.</td>
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
