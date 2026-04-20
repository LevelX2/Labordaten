import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch, apiFetchBlob } from "../../shared/api/client";
import type {
  ArztberichtResponse,
  Parameter,
  Person,
  VerlaufsberichtResponse
} from "../../shared/types/api";

type BerichtFormState = {
  person_id: string;
  laborparameter_ids: string[];
  datum_von: string;
  datum_bis: string;
  include_referenzbereich: boolean;
  include_labor: boolean;
  include_befundbemerkung: boolean;
  include_messwertbemerkung: boolean;
};

const initialForm: BerichtFormState = {
  person_id: "",
  laborparameter_ids: [],
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

  const selectedParameters = useMemo(
    () => new Set(form.laborparameter_ids),
    [form.laborparameter_ids]
  );

  const doctorPayload = {
    person_id: form.person_id,
    laborparameter_ids: form.laborparameter_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    include_referenzbereich: form.include_referenzbereich,
    include_labor: form.include_labor,
    include_befundbemerkung: form.include_befundbemerkung,
    include_messwertbemerkung: form.include_messwertbemerkung
  };

  const trendPayload = {
    person_id: form.person_id,
    laborparameter_ids: form.laborparameter_ids,
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
          Arztbericht und Verlaufsbericht können jetzt aus echten Messdaten als Vorschau aufgebaut und direkt lokal als
          PDF erzeugt werden.
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
              <span>Referenzbereich</span>
              <input
                type="checkbox"
                checked={form.include_referenzbereich}
                onChange={(event) =>
                  setForm((current) => ({ ...current, include_referenzbereich: event.target.checked }))
                }
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, include_befundbemerkung: event.target.checked }))
                }
              />
            </label>

            <label className="field">
              <span>Messwertbemerkung</span>
              <input
                type="checkbox"
                checked={form.include_messwertbemerkung}
                onChange={(event) =>
                  setForm((current) => ({ ...current, include_messwertbemerkung: event.target.checked }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={previewPending || !form.person_id}>
                {previewPending ? "Lädt..." : "Vorschau laden"}
              </button>
              <button
                type="button"
                disabled={doctorPdfMutation.isPending || !form.person_id}
                onClick={() => doctorPdfMutation.mutate()}
              >
                {doctorPdfMutation.isPending ? "PDF wird erstellt..." : "Arztbericht als PDF"}
              </button>
              <button
                type="button"
                disabled={trendPdfMutation.isPending || !form.person_id}
                onClick={() => trendPdfMutation.mutate()}
              >
                {trendPdfMutation.isPending ? "PDF wird erstellt..." : "Verlaufsbericht als PDF"}
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Arztbericht Liste</h3>
          {doctorReportMutation.isError ? <p className="form-error">{doctorReportMutation.error.message}</p> : null}
          {doctorPdfMutation.isError ? <p className="form-error">{doctorPdfMutation.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Referenz</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {doctorReportMutation.data?.eintraege.map((item) => (
                  <tr key={item.laborparameter_id}>
                    <td>{item.parameter_anzeigename}</td>
                    <td>{formatDate(item.datum)}</td>
                    <td>{[item.wert_anzeige, item.einheit].filter(Boolean).join(" ")}</td>
                    <td>{item.referenzbereich || "—"}</td>
                    <td>{item.labor_name || "—"}</td>
                  </tr>
                ))}
                {doctorReportMutation.data && !doctorReportMutation.data.eintraege.length ? (
                  <tr>
                    <td colSpan={5}>Für die aktuelle Auswahl gibt es noch keine passenden Werte.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Verlaufsbericht Vorschau</h3>
          {trendReportMutation.isError ? <p className="form-error">{trendReportMutation.error.message}</p> : null}
          {trendPdfMutation.isError ? <p className="form-error">{trendPdfMutation.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Wert</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {trendReportMutation.data?.punkte.map((punkt, index) => (
                  <tr key={`${punkt.laborparameter_id}-${index}`}>
                    <td>{punkt.parameter_anzeigename}</td>
                    <td>{formatDate(punkt.datum)}</td>
                    <td>{punkt.wert_typ}</td>
                    <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                    <td>{punkt.labor_name || "—"}</td>
                  </tr>
                ))}
                {trendReportMutation.data && !trendReportMutation.data.punkte.length ? (
                  <tr>
                    <td colSpan={5}>Für die aktuelle Auswahl gibt es noch keinen Verlauf.</td>
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
