import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type {
  ImportVorgangDetail,
  ImportVorgangListItem,
  Parameter,
  Person
} from "../../shared/types/api";

type ImportFormState = {
  payload_json: string;
  person_id_override: string;
  bemerkung: string;
};

const examplePayload = `{
  "schemaVersion": "1.0",
  "quelleTyp": "json",
  "befund": {
    "entnahmedatum": "2026-04-20"
  },
  "messwerte": [
    {
      "originalParametername": "Ferritin",
      "wertTyp": "numerisch",
      "wertRohText": "41",
      "wertNum": 41,
      "einheitOriginal": "ng/ml"
    }
  ]
}`;

const initialForm: ImportFormState = {
  payload_json: examplePayload,
  person_id_override: "",
  bemerkung: ""
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

export function ImportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ImportFormState>(initialForm);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [mappingState, setMappingState] = useState<Record<number, string>>({});
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const importsQuery = useQuery({
    queryKey: ["importe"],
    queryFn: () => apiFetch<ImportVorgangListItem[]>("/api/importe")
  });
  const selectedImportQuery = useQuery({
    queryKey: ["importe", selectedImportId],
    queryFn: () => apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}`),
    enabled: Boolean(selectedImportId)
  });

  useEffect(() => {
    if (!selectedImportId && importsQuery.data?.length) {
      setSelectedImportId(importsQuery.data[0].id);
    }
  }, [importsQuery.data, selectedImportId]);

  useEffect(() => {
    const nextMappings: Record<number, string> = {};
    selectedImportQuery.data?.messwerte.forEach((messwert) => {
      if (messwert.parameter_id) {
        nextMappings[messwert.messwert_index] = messwert.parameter_id;
      }
    });
    setMappingState(nextMappings);
    setWarningsConfirmed(false);
  }, [selectedImportQuery.data]);

  const personById = useMemo(
    () => new Map((personenQuery.data ?? []).map((person) => [person.id, person])),
    [personenQuery.data]
  );
  const parameterById = useMemo(
    () => new Map((parameterQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parameterQuery.data]
  );

  const createDraftMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>("/api/importe/entwurf", {
        method: "POST",
        body: JSON.stringify({
          payload_json: form.payload_json,
          person_id_override: form.person_id_override || null,
          bemerkung: form.bemerkung || null
        })
      }),
    onSuccess: async (detail) => {
      setSelectedImportId(detail.id);
      await queryClient.invalidateQueries({ queryKey: ["importe"] });
      await queryClient.invalidateQueries({ queryKey: ["importe", detail.id] });
    }
  });

  const uebernehmenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}/uebernehmen`, {
        method: "POST",
        body: JSON.stringify({
          bestaetige_warnungen: warningsConfirmed,
          parameter_mappings: Object.entries(mappingState).map(([messwert_index, laborparameter_id]) => ({
            messwert_index: Number(messwert_index),
            laborparameter_id
          }))
        })
      }),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", detail.id] }),
        queryClient.invalidateQueries({ queryKey: ["befunde"] }),
        queryClient.invalidateQueries({ queryKey: ["messwerte"] })
      ]);
    }
  });

  const verwerfenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}/verwerfen`, {
        method: "POST"
      }),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", detail.id] })
      ]);
    }
  });

  const selectedImport = selectedImportQuery.data;
  const hasWarnings = Boolean(selectedImport?.warnung_anzahl);

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Importprüfung</span>
        <h2>Import</h2>
        <p>
          JSON-Importe können jetzt als Entwurf angelegt, mit Prüfpunkten kontrolliert und erst danach bewusst
          übernommen werden.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Importentwurf anlegen</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createDraftMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person überschreiben</span>
              <select
                value={form.person_id_override}
                onChange={(event) => setForm((current) => ({ ...current, person_id_override: event.target.value }))}
              >
                <option value="">Keine Überschreibung</option>
                {personenQuery.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <input
                value={form.bemerkung}
                onChange={(event) => setForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <label className="field field--full">
              <span>Import-JSON</span>
              <textarea
                rows={18}
                value={form.payload_json}
                onChange={(event) => setForm((current) => ({ ...current, payload_json: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createDraftMutation.isPending}>
                {createDraftMutation.isPending ? "Prüft..." : "Entwurf anlegen"}
              </button>
              {createDraftMutation.isError ? <p className="form-error">{createDraftMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Import-Historie</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Quelle</th>
                  <th>Person</th>
                  <th>Messwerte</th>
                  <th>Fehler</th>
                  <th>Warnungen</th>
                </tr>
              </thead>
              <tbody>
                {importsQuery.data?.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedImportId(item.id)}
                    style={{ cursor: "pointer", background: item.id === selectedImportId ? "#f3ede4" : undefined }}
                  >
                    <td>{item.status}</td>
                    <td>{item.quelle_typ}</td>
                    <td>{personById.get(item.person_id_vorschlag || "")?.anzeigename ?? "—"}</td>
                    <td>{item.messwerte_anzahl}</td>
                    <td>{item.fehler_anzahl}</td>
                    <td>{item.warnung_anzahl}</td>
                  </tr>
                ))}
                {!importsQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Noch keine Importentwürfe vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Prüfansicht</h3>
          {!selectedImport ? <p>Bitte einen Importentwurf auswählen.</p> : null}
          {selectedImport ? (
            <>
              <p>
                Befund für{" "}
                <strong>{personById.get(selectedImport.befund.person_id || "")?.anzeigename ?? "nicht zugeordnet"}</strong>
                {" · "}
                Entnahme {formatDate(selectedImport.befund.entnahmedatum)}
              </p>
              <p>
                Labor: <strong>{selectedImport.befund.labor_name || selectedImport.befund.labor_id || "—"}</strong>
              </p>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Originalname</th>
                      <th>Rohwert</th>
                      <th>Typ</th>
                      <th>Parameter-Zuordnung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedImport.messwerte.map((messwert) => (
                      <tr key={messwert.messwert_index}>
                        <td>{messwert.original_parametername}</td>
                        <td>{messwert.wert_roh_text}</td>
                        <td>{messwert.wert_typ}</td>
                        <td>
                          <select
                            value={mappingState[messwert.messwert_index] ?? ""}
                            onChange={(event) =>
                              setMappingState((current) => ({
                                ...current,
                                [messwert.messwert_index]: event.target.value
                              }))
                            }
                          >
                            <option value="">Bitte wählen</option>
                            {parameterQuery.data?.map((parameter) => (
                              <option key={parameter.id} value={parameter.id}>
                                {parameter.anzeigename}
                              </option>
                            ))}
                          </select>
                          {mappingState[messwert.messwert_index]
                            ? ` (${parameterById.get(mappingState[messwert.messwert_index])?.anzeigename ?? "zugeordnet"})`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4>Prüfpunkte</h4>
              <ul>
                {selectedImport.pruefpunkte.map((item) => (
                  <li key={item.id}>
                    <strong>{item.status}</strong>: {item.meldung}
                  </li>
                ))}
              </ul>
              {!selectedImport.pruefpunkte.length ? <p>Keine Prüfpunkte vorhanden.</p> : null}

              {hasWarnings ? (
                <label className="field field--full">
                  <span>Warnungen bewusst bestätigen</span>
                  <input
                    type="checkbox"
                    checked={warningsConfirmed}
                    onChange={(event) => setWarningsConfirmed(event.target.checked)}
                  />
                </label>
              ) : null}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => uebernehmenMutation.mutate()}
                  disabled={uebernehmenMutation.isPending || !selectedImportId}
                >
                  {uebernehmenMutation.isPending ? "Übernimmt..." : "Import übernehmen"}
                </button>
                <button
                  type="button"
                  onClick={() => verwerfenMutation.mutate()}
                  disabled={verwerfenMutation.isPending || !selectedImportId}
                >
                  {verwerfenMutation.isPending ? "Verwirft..." : "Import verwerfen"}
                </button>
              </div>
              {uebernehmenMutation.isError ? <p className="form-error">{uebernehmenMutation.error.message}</p> : null}
              {verwerfenMutation.isError ? <p className="form-error">{verwerfenMutation.error.message}</p> : null}
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
