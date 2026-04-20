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
import type {
  AuswertungGesamtzahlen,
  AuswertungPunkt,
  AuswertungResponse,
  AuswertungsSerie,
  Parameter,
  Person
} from "../../shared/types/api";

type AuswertungFormState = {
  person_id: string;
  laborparameter_ids: string[];
  datum_von: string;
  datum_bis: string;
  include_laborreferenz: boolean;
  include_zielbereich: boolean;
};

const initialForm: AuswertungFormState = {
  person_id: "",
  laborparameter_ids: [],
  datum_von: "",
  datum_bis: "",
  include_laborreferenz: true,
  include_zielbereich: true
};

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

function formatTooltipValue(value: unknown): string {
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}

function buildChartData(points: AuswertungPunkt[]) {
  return points
    .filter((point) => point.wert_num !== null && point.wert_num !== undefined)
    .map((point) => ({
      datumLabel: formatDate(point.datum),
      wert: point.wert_num,
      laborreferenz_unten: point.laborreferenz_untere_num,
      laborreferenz_oben: point.laborreferenz_obere_num,
      zielbereich_unten: point.zielbereich_untere_num,
      zielbereich_oben: point.zielbereich_obere_num
    }));
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

  if (!chartData.length) {
    return <p>Für diesen Parameter gibt es aktuell keine numerischen Punkte für ein Diagramm.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ccb9" />
          <XAxis dataKey="datumLabel" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatTooltipValue(value)} />
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
          <Line type="monotone" dataKey="wert" name="Messwert" stroke="#1f5a92" strokeWidth={3} connectNulls />
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
  const gesamtzahlenQuery = useQuery({
    queryKey: ["auswertung", "gesamtzahlen"],
    queryFn: () => apiFetch<AuswertungGesamtzahlen>("/api/auswertung/gesamtzahlen")
  });

  const selectedParameters = useMemo(() => new Set(form.laborparameter_ids), [form.laborparameter_ids]);

  const auswertungMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuswertungResponse>("/api/auswertung/verlauf", {
        method: "POST",
        body: JSON.stringify({
          person_id: form.person_id,
          laborparameter_ids: form.laborparameter_ids,
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
          Dieser Bereich zeigt jetzt echte Zeitreihen, Laborreferenzen, Zielbereiche und qualitative Ereignisse auf
          Basis der vorhandenen Messdaten.
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
          <label className="field">
            <span>Person</span>
            <select
              required
              value={form.person_id}
              onChange={(event) => setForm((current) => ({ ...current, person_id: event.target.value }))}
            >
              <option value="">Bitte wählen</option>
              {personenQuery.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.anzeigename}
                </option>
              ))}
            </select>
          </label>

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

          <label className="field field--full">
            <span>Parameter</span>
            <div className="checkbox-grid">
              {parameterQuery.data?.map((parameter) => (
                <label key={parameter.id}>
                  <input
                    type="checkbox"
                    checked={selectedParameters.has(parameter.id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        laborparameter_ids: event.target.checked
                          ? [...current.laborparameter_ids, parameter.id]
                          : current.laborparameter_ids.filter((item) => item !== parameter.id)
                      }))
                    }
                  />
                  {parameter.anzeigename}
                </label>
              ))}
            </div>
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
            <button type="submit" disabled={auswertungMutation.isPending || !form.person_id}>
              {auswertungMutation.isPending ? "Lädt..." : "Auswertung laden"}
            </button>
            {auswertungMutation.isError ? <p className="form-error">{auswertungMutation.error.message}</p> : null}
          </div>
        </form>
      </article>

      {auswertungMutation.data ? (
        <div className="workspace-grid">
          {auswertungMutation.data.serien.map((serie) => (
            <article className="card" key={serie.laborparameter_id}>
              <div className="trend-card__header">
                <div>
                  <h3>{serie.parameter_anzeigename}</h3>
                  <p>{serie.standard_einheit ? `Standardeinheit: ${serie.standard_einheit}` : "Ohne definierte Standardeinheit"}</p>
                </div>
                <div className="trend-badges">
                  <span className="trend-badge">Messungen: {serie.statistik.anzahl_messungen}</span>
                  <span className="trend-badge">Trend: {formatTrend(serie.statistik.trendrichtung)}</span>
                  <span className="trend-badge">Letzter Wert: {serie.statistik.letzter_wert_anzeige ?? "—"}</span>
                </div>
              </div>

              <div className="trend-meta">
                <span>
                  Zeitraum: {formatDate(serie.statistik.zeitraum_von)} bis {formatDate(serie.statistik.zeitraum_bis)}
                </span>
                <span>Minimum: {formatNumber(serie.statistik.minimum_num)}</span>
                <span>Maximum: {formatNumber(serie.statistik.maximum_num)}</span>
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
                  <td>{event.parameter_anzeigename}</td>
                  <td>{[event.wert_anzeige, event.einheit].filter(Boolean).join(" ")}</td>
                  <td>{event.messwertbemerkung || event.befundbemerkung || "—"}</td>
                  <td>{event.labor_name || "—"}</td>
                </tr>
              ))}
              {!qualitativeEvents.length ? (
                <tr>
                  <td colSpan={5}>Noch keine qualitativen Ereignisse für die aktuelle Auswahl.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
