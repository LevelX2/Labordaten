import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
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

  const lower = point.zielbereich_untere_num ?? "—";
  const upper = point.zielbereich_obere_num ?? "—";
  const unit = point.zielbereich_einheit ? ` ${point.zielbereich_einheit}` : "";
  if (lower === "—" && upper === "—" && !unit) {
    return "—";
  }
  return `${lower} bis ${upper}${unit}`;
}

function buildChartData(points: AuswertungPunkt[]) {
  const byDate = new Map<string, Record<string, string | number | null>>();
  for (const point of points) {
    if (point.wert_num === null || point.wert_num === undefined) {
      continue;
    }

    const dateKey = point.datum ?? `unbekannt-${point.messwert_id}`;
    const row = byDate.get(dateKey) ?? {
      datumLabel: formatDate(point.datum),
      laborreferenz_unten: point.laborreferenz_untere_num ?? null,
      laborreferenz_oben: point.laborreferenz_obere_num ?? null,
      zielbereich_unten: point.zielbereich_untere_num ?? null,
      zielbereich_oben: point.zielbereich_obere_num ?? null
    };
    row[point.person_anzeigename] = point.wert_num;
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
    byDate.set(dateKey, row);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
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

function SeriesChart({
  serie,
  includeLaborreferenz,
  includeZielbereich
}: {
  serie: AuswertungsSerie;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
}) {
  const chartData = useMemo(() => buildChartData(serie.punkte), [serie.punkte]);
  const people = useMemo(
    () => Array.from(new Set(serie.punkte.map((punkt) => punkt.person_anzeigename))),
    [serie.punkte]
  );

  if (!chartData.length) {
    return <p>Für diesen Parameter gibt es aktuell keine numerischen Punkte für ein Diagramm.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ccb9" />
          <XAxis dataKey="datumLabel" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatTooltipValue(value)} />
          <Legend />
          {includeLaborreferenz ? (
            <>
              <Line type="monotone" dataKey="laborreferenz_unten" name="Laborreferenz unten" stroke="#d77a2f" dot={false} strokeDasharray="4 4" connectNulls />
              <Line type="monotone" dataKey="laborreferenz_oben" name="Laborreferenz oben" stroke="#d77a2f" dot={false} strokeDasharray="4 4" connectNulls />
            </>
          ) : null}
          {includeZielbereich ? (
            <>
              <Line type="monotone" dataKey="zielbereich_unten" name="Zielbereich unten" stroke="#1f6a53" dot={false} strokeDasharray="2 4" connectNulls />
              <Line type="monotone" dataKey="zielbereich_oben" name="Zielbereich oben" stroke="#1f6a53" dot={false} strokeDasharray="2 4" connectNulls />
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
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AuswertungPage() {
  const [form, setForm] = useState<AuswertungFormState>(initialForm);

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

  const statistikCards = [
    { label: "Personen", value: gesamtzahlenQuery.data?.personen_anzahl ?? "—" },
    { label: "Parameter", value: gesamtzahlenQuery.data?.parameter_anzahl ?? "—" },
    { label: "Messwerte", value: gesamtzahlenQuery.data?.messwerte_anzahl ?? "—" },
    { label: "Befunde", value: gesamtzahlenQuery.data?.befunde_anzahl ?? "—" }
  ];

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Auswertung und Verlauf</span>
        <h2>Auswertung</h2>
        <p>
          Die Auswertung kann jetzt Personen zusammenführen und gleichzeitig nach Gruppen, Parametern, Laboren und
          Zeitraum filtern.
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

      <article className="card">
        <h3>Filter</h3>
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
          />

          <label className="field">
            <span>Datum von</span>
            <input
              type="date"
              value={form.datum_von}
              onChange={(event) => setForm((current) => ({ ...current, datum_von: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Datum bis</span>
            <input
              type="date"
              value={form.datum_bis}
              onChange={(event) => setForm((current) => ({ ...current, datum_bis: event.target.value }))}
            />
          </label>

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
          />

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
            <button type="submit" disabled={auswertungMutation.isPending || !form.person_ids.length}>
              {auswertungMutation.isPending ? "Lädt..." : "Auswertung laden"}
            </button>
            {auswertungMutation.isError ? <p className="form-error">{auswertungMutation.error.message}</p> : null}
          </div>
        </form>
      </article>

      {auswertungMutation.data ? (
        <div className="workspace-grid">
          {auswertungMutation.data.serien.map((serie) => (
            <article className="card card--wide" key={serie.laborparameter_id}>
              <div className="trend-card__header">
                <div>
                  <h3>{serie.parameter_anzeigename}</h3>
                  <p>{serie.standard_einheit ? `Standardeinheit: ${serie.standard_einheit}` : "Ohne definierte Standardeinheit"}</p>
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
    </section>
  );
}
