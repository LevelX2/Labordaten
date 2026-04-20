import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { Person } from "../../shared/types/api";

type PersonFormState = {
  anzeigename: string;
  vollname: string;
  geburtsdatum: string;
  geschlecht_code: string;
  hinweise_allgemein: string;
};

const initialForm: PersonFormState = {
  anzeigename: "",
  vollname: "",
  geburtsdatum: "",
  geschlecht_code: "",
  hinweise_allgemein: ""
};

export function PersonenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PersonFormState>(initialForm);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Person>("/api/personen", {
        method: "POST",
        body: JSON.stringify({
          anzeigename: form.anzeigename,
          vollname: form.vollname || null,
          geburtsdatum: form.geburtsdatum,
          geschlecht_code: form.geschlecht_code || null,
          hinweise_allgemein: form.hinweise_allgemein || null
        })
      }),
    onSuccess: async () => {
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["personen"] });
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Erster Durchstich</span>
        <h2>Personen</h2>
        <p>Personen können jetzt tatsächlich angelegt und wieder aus der lokalen API gelesen werden.</p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neue Person</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="field">
              <span>Anzeigename</span>
              <input
                required
                value={form.anzeigename}
                onChange={(event) => setForm((current) => ({ ...current, anzeigename: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Vollname</span>
              <input
                value={form.vollname}
                onChange={(event) => setForm((current) => ({ ...current, vollname: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Geburtsdatum</span>
              <input
                required
                type="date"
                value={form.geburtsdatum}
                onChange={(event) => setForm((current) => ({ ...current, geburtsdatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Geschlecht</span>
              <input
                value={form.geschlecht_code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, geschlecht_code: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Hinweise</span>
              <textarea
                rows={4}
                value={form.hinweise_allgemein}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hinweise_allgemein: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Speichert..." : "Person anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Vorhandene Personen</h3>
          {personenQuery.isLoading ? <p>Lädt...</p> : null}
          {personenQuery.isError ? <p className="form-error">{personenQuery.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Anzeigename</th>
                  <th>Geburtsdatum</th>
                  <th>Geschlecht</th>
                </tr>
              </thead>
              <tbody>
                {personenQuery.data?.map((person) => (
                  <tr key={person.id}>
                    <td>{person.anzeigename}</td>
                    <td>{person.geburtsdatum}</td>
                    <td>{person.geschlecht_code || "—"}</td>
                  </tr>
                ))}
                {!personenQuery.data?.length ? (
                  <tr>
                    <td colSpan={3}>Noch keine Personen vorhanden.</td>
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

