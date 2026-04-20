import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { Befund, Labor, Person } from "../../shared/types/api";

type BefundFormState = {
  person_id: string;
  labor_id: string;
  entnahmedatum: string;
  befunddatum: string;
  bemerkung: string;
};

const initialForm: BefundFormState = {
  person_id: "",
  labor_id: "",
  entnahmedatum: "",
  befunddatum: "",
  bemerkung: ""
};

export function BefundePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BefundFormState>(initialForm);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });

  const laboreQuery = useQuery({
    queryKey: ["labore"],
    queryFn: () => apiFetch<Labor[]>("/api/labore")
  });

  const befundeQuery = useQuery({
    queryKey: ["befunde"],
    queryFn: () => apiFetch<Befund[]>("/api/befunde")
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Befund>("/api/befunde", {
        method: "POST",
        body: JSON.stringify({
          person_id: form.person_id,
          labor_id: form.labor_id || null,
          entnahmedatum: form.entnahmedatum || null,
          befunddatum: form.befunddatum || null,
          bemerkung: form.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["befunde"] });
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Erster Durchstich</span>
        <h2>Befunde</h2>
        <p>Ein Befundkopf kann jetzt für eine Person angelegt und direkt wieder in der Liste angezeigt werden.</p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neuer Befund</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
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
              <span>Labor</span>
              <select
                value={form.labor_id}
                onChange={(event) => setForm((current) => ({ ...current, labor_id: event.target.value }))}
              >
                <option value="">Ohne Laborzuordnung</option>
                {laboreQuery.data?.map((labor) => (
                  <option key={labor.id} value={labor.id}>
                    {labor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Entnahmedatum</span>
              <input
                type="date"
                value={form.entnahmedatum}
                onChange={(event) => setForm((current) => ({ ...current, entnahmedatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Befunddatum</span>
              <input
                type="date"
                value={form.befunddatum}
                onChange={(event) => setForm((current) => ({ ...current, befunddatum: event.target.value }))}
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={4}
                value={form.bemerkung}
                onChange={(event) => setForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending || !personenQuery.data?.length}>
                {createMutation.isPending ? "Speichert..." : "Befund anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Vorhandene Befunde</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entnahme</th>
                  <th>Befund</th>
                  <th>Person-ID</th>
                  <th>Labor-ID</th>
                </tr>
              </thead>
              <tbody>
                {befundeQuery.data?.map((befund) => (
                  <tr key={befund.id}>
                    <td>{befund.entnahmedatum || "—"}</td>
                    <td>{befund.befunddatum || "—"}</td>
                    <td>{befund.person_id}</td>
                    <td>{befund.labor_id || "—"}</td>
                  </tr>
                ))}
                {!befundeQuery.data?.length ? (
                  <tr>
                    <td colSpan={4}>Noch keine Befunde vorhanden.</td>
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

