import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { BefundDetailCard } from "../../shared/components/BefundDetailCard";
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

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function toFileUrl(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("/") ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
}

export function BefundePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BefundFormState>(initialForm);
  const [selectedBefundId, setSelectedBefundId] = useState<string | null>(null);

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
    onSuccess: async (befund) => {
      setForm(initialForm);
      setSelectedBefundId(befund.id);
      await queryClient.invalidateQueries({ queryKey: ["befunde"] });
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Befunde und Herkunft</span>
        <h2>Befunde</h2>
        <p>
          Die Übersicht zeigt jetzt pro Befund auch die Anzahl enthaltener Messwerte. Dokumente und Detailinfos lassen
          sich direkt aus der Liste heraus öffnen.
        </p>
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

        <article className="card card--wide">
          <h3>Vorhandene Befunde</h3>
          <p>Zeilen markieren einen Befund für die Detailansicht darunter.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entnahme</th>
                  <th>Befund</th>
                  <th>Person</th>
                  <th>Labor</th>
                  <th>Werte</th>
                  <th>Dokument</th>
                </tr>
              </thead>
              <tbody>
                {befundeQuery.data?.map((befund) => (
                  <tr
                    key={befund.id}
                    onClick={() => setSelectedBefundId(befund.id)}
                    className={befund.id === selectedBefundId ? "row-selected" : undefined}
                  >
                    <td>{formatDate(befund.entnahmedatum)}</td>
                    <td>{formatDate(befund.befunddatum)}</td>
                    <td>{befund.person_anzeigename || befund.person_id}</td>
                    <td>{befund.labor_name || "—"}</td>
                    <td>{befund.messwerte_anzahl}</td>
                    <td>
                      {befund.dokument_pfad ? (
                        <a
                          className="inline-button"
                          href={toFileUrl(befund.dokument_pfad)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {befund.dokument_dateiname || "Dokument öffnen"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!befundeQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Noch keine Befunde vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <BefundDetailCard
          befundId={selectedBefundId}
          title="Ausgewählter Befund"
          emptyText="Bitte in der Befundliste einen Eintrag auswählen."
          className="card card--wide"
        />
      </div>
    </section>
  );
}
