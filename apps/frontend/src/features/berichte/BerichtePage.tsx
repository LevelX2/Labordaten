import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch, apiFetchBlob } from "../../shared/api/client";
import type {
  ArztberichtResponse,
  Gruppe,
  Labor,
  Parameter,
  Person,
  VerlaufsberichtResponse
} from "../../shared/types/api";

type BerichtFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  include_referenzbereich: boolean;
  include_labor: boolean;
  include_befundbemerkung: boolean;
  include_messwertbemerkung: boolean;
};

const initialForm: BerichtFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  labor_ids: [],
  datum_von: "",
  datum_bis: "",
  include_referenzbereich: true,
  include_labor: true,
  include_befundbemerkung: true,
  include_messwertbemerkung: true
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function BerichtePage() {
  const [form, setForm] = useState<BerichtFormState>(initialForm);

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

  const doctorPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    include_referenzbereich: form.include_referenzbereich,
    include_labor: form.include_labor,
    include_befundbemerkung: form.include_befundbemerkung,
    include_messwertbemerkung: form.include_messwertbemerkung
  };

  const trendPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null
  };

  const doctorReportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ArztberichtResponse>("/api/berichte/arztbericht-vorschau", {
        method: "POST",
        body: JSON.stringify(doctorPayload)
      })
  });

  const trendReportMutation = useMutation({
    mutationFn: () =>
      apiFetch<VerlaufsberichtResponse>("/api/berichte/verlauf-vorschau", {
        method: "POST",
        body: JSON.stringify(trendPayload)
      })
  });

  const doctorPdfMutation = useMutation({
    mutationFn: async () => {
      const result = await apiFetchBlob("/api/berichte/arztbericht-pdf", {
        method: "POST",
        body: JSON.stringify(doctorPayload)
      });
      downloadBlob(result.blob, result.filename ?? "arztbericht.pdf");
    }
  });

  const trendPdfMutation = useMutation({
    mutationFn: async () => {
      const result = await apiFetchBlob("/api/berichte/verlauf-pdf", {
        method: "POST",
        body: JSON.stringify(trendPayload)
      });
      downloadBlob(result.blob, result.filename ?? "verlauf.pdf");
    }
  });

  const previewPending = doctorReportMutation.isPending || trendReportMutation.isPending;

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Berichte</span>
        <h2>Berichte</h2>
        <p>
          Arztberichte und Verlaufsberichte lassen sich jetzt auch personenübergreifend sowie nach Gruppen, Laboren und
          Zeitraum filtern.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Berichtsfilter</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              doctorReportMutation.mutate();
              trendReportMutation.mutate();
            }}
          >
            <label className="field field--full">
              <span>Personen</span>
              <div className="checkbox-grid">
                {personenQuery.data?.map((person) => (
                  <label key={person.id}>
                    <input
                      type="checkbox"
                      checked={form.person_ids.includes(person.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          person_ids: event.target.checked
                            ? [...current.person_ids, person.id]
                            : current.person_ids.filter((item) => item !== person.id)
                        }))
                      }
                    />
                    {person.anzeigename}
                  </label>
                ))}
              </div>
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
              <span>Gruppen</span>
              <div className="checkbox-grid">
                {gruppenQuery.data?.map((gruppe) => (
                  <label key={gruppe.id}>
                    <input
                      type="checkbox"
                      checked={form.gruppen_ids.includes(gruppe.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          gruppen_ids: event.target.checked
                            ? [...current.gruppen_ids, gruppe.id]
                            : current.gruppen_ids.filter((item) => item !== gruppe.id)
                        }))
                      }
                    />
                    {gruppe.name}
                  </label>
                ))}
              </div>
            </label>

            <label className="field field--full">
              <span>Parameter</span>
              <div className="checkbox-grid">
                {parameterQuery.data?.map((parameter) => (
                  <label key={parameter.id}>
                    <input
                      type="checkbox"
                      checked={form.laborparameter_ids.includes(parameter.id)}
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

            <label className="field field--full">
              <span>Labore</span>
              <div className="checkbox-grid">
                {laboreQuery.data?.map((labor) => (
                  <label key={labor.id}>
                    <input
                      type="checkbox"
                      checked={form.labor_ids.includes(labor.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          labor_ids: event.target.checked
                            ? [...current.labor_ids, labor.id]
                            : current.labor_ids.filter((item) => item !== labor.id)
                        }))
                      }
                    />
                    {labor.name}
                  </label>
                ))}
              </div>
            </label>

            <label className="field">
              <span>Referenzbereich</span>
              <input
                type="checkbox"
                checked={form.include_referenzbereich}
                onChange={(event) => setForm((current) => ({ ...current, include_referenzbereich: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Labor</span>
              <input
                type="checkbox"
                checked={form.include_labor}
                onChange={(event) => setForm((current) => ({ ...current, include_labor: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Befundbemerkung</span>
              <input
                type="checkbox"
                checked={form.include_befundbemerkung}
                onChange={(event) => setForm((current) => ({ ...current, include_befundbemerkung: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Messwertbemerkung</span>
              <input
                type="checkbox"
                checked={form.include_messwertbemerkung}
                onChange={(event) => setForm((current) => ({ ...current, include_messwertbemerkung: event.target.checked }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={previewPending || !form.person_ids.length}>
                {previewPending ? "Lädt..." : "Vorschau laden"}
              </button>
              <button type="button" disabled={doctorPdfMutation.isPending || !form.person_ids.length} onClick={() => doctorPdfMutation.mutate()}>
                {doctorPdfMutation.isPending ? "PDF wird erstellt..." : "Arztbericht als PDF"}
              </button>
              <button type="button" disabled={trendPdfMutation.isPending || !form.person_ids.length} onClick={() => trendPdfMutation.mutate()}>
                {trendPdfMutation.isPending ? "PDF wird erstellt..." : "Verlaufsbericht als PDF"}
              </button>
            </div>
          </form>
        </article>

        <article className="card card--wide">
          <h3>Arztbericht Liste</h3>
          {doctorReportMutation.isError ? <p className="form-error">{doctorReportMutation.error.message}</p> : null}
          {doctorPdfMutation.isError ? <p className="form-error">{doctorPdfMutation.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Referenz</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {doctorReportMutation.data?.eintraege.map((item) => (
                  <tr key={`${item.person_id}-${item.laborparameter_id}`}>
                    <td>{item.person_anzeigename}</td>
                    <td>{item.parameter_anzeigename}</td>
                    <td>{formatDate(item.datum)}</td>
                    <td>{[item.wert_anzeige, item.einheit].filter(Boolean).join(" ")}</td>
                    <td>{item.referenzbereich || "—"}</td>
                    <td>{item.labor_name || "—"}</td>
                  </tr>
                ))}
                {doctorReportMutation.data && !doctorReportMutation.data.eintraege.length ? (
                  <tr>
                    <td colSpan={6}>Für die aktuelle Auswahl gibt es noch keine passenden Werte.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Verlaufsbericht Vorschau</h3>
          {trendReportMutation.isError ? <p className="form-error">{trendReportMutation.error.message}</p> : null}
          {trendPdfMutation.isError ? <p className="form-error">{trendPdfMutation.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Wert</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {trendReportMutation.data?.punkte.map((punkt, index) => (
                  <tr key={`${punkt.person_id}-${punkt.laborparameter_id}-${index}`}>
                    <td>{punkt.person_anzeigename}</td>
                    <td>{punkt.parameter_anzeigename}</td>
                    <td>{formatDate(punkt.datum)}</td>
                    <td>{punkt.wert_typ}</td>
                    <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                    <td>{punkt.labor_name || "—"}</td>
                  </tr>
                ))}
                {trendReportMutation.data && !trendReportMutation.data.punkte.length ? (
                  <tr>
                    <td colSpan={6}>Für die aktuelle Auswahl gibt es noch keinen Verlauf.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
