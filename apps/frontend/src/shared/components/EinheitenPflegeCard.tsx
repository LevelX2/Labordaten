import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../api/client";
import type {
  Einheit,
  EinheitAlias,
  EinheitAliasCreatePayload,
  EinheitCreatePayload
} from "../types/api";

type EinheitenPflegeCardProps = {
  title?: string;
  className?: string;
};

type AliasFormState = {
  einheit_id: string;
  alias_text: string;
  bemerkung: string;
};

const initialAliasForm: AliasFormState = {
  einheit_id: "",
  alias_text: "",
  bemerkung: ""
};

export function EinheitenPflegeCard({
  title = "Einheiten",
  className = "card"
}: EinheitenPflegeCardProps) {
  const queryClient = useQueryClient();
  const [kuerzel, setKuerzel] = useState("");
  const [aliasForm, setAliasForm] = useState<AliasFormState>(initialAliasForm);

  const einheitenQuery = useQuery({
    queryKey: ["einheiten"],
    queryFn: () => apiFetch<Einheit[]>("/api/einheiten")
  });

  const sortedEinheiten = useMemo(
    () =>
      [...(einheitenQuery.data ?? [])].sort((left, right) =>
        left.kuerzel.localeCompare(right.kuerzel, "de-DE", { sensitivity: "base" })
      ),
    [einheitenQuery.data]
  );

  const createEinheitMutation = useMutation({
    mutationFn: () =>
      apiFetch<Einheit>("/api/einheiten", {
        method: "POST",
        body: JSON.stringify({
          kuerzel
        } satisfies EinheitCreatePayload)
      }),
    onSuccess: async (createdEinheit) => {
      setKuerzel("");
      setAliasForm((current) => ({
        ...current,
        einheit_id: current.einheit_id || createdEinheit.id
      }));
      await queryClient.invalidateQueries({ queryKey: ["einheiten"] });
    }
  });

  const createAliasMutation = useMutation({
    mutationFn: () =>
      apiFetch<EinheitAlias>(`/api/einheiten/${aliasForm.einheit_id}/aliase`, {
        method: "POST",
        body: JSON.stringify({
          alias_text: aliasForm.alias_text,
          bemerkung: aliasForm.bemerkung || null
        } satisfies EinheitAliasCreatePayload)
      }),
    onSuccess: async () => {
      setAliasForm((current) => ({
        ...initialAliasForm,
        einheit_id: current.einheit_id
      }));
      await queryClient.invalidateQueries({ queryKey: ["einheiten"] });
    }
  });

  return (
    <article className={className}>
      <h3>{title}</h3>
      <p>
        Einheiten werden zentral gepflegt. Zusätzlich können Schreibvarianten als Alias hinterlegt werden, damit
        Import und manuelle Pflege auf dieselbe kanonische Einheit laufen, auch wenn Labore sie unterschiedlich
        schreiben.
      </p>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neue Einheit</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createEinheitMutation.mutate();
            }}
          >
            <label className="field">
              <span>Neues Kürzel</span>
              <input value={kuerzel} onChange={(event) => setKuerzel(event.target.value)} placeholder="z. B. ng/ml" />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createEinheitMutation.isPending || !kuerzel.trim()}>
                {createEinheitMutation.isPending ? "Speichert..." : "Einheit anlegen"}
              </button>
              {createEinheitMutation.isError ? (
                <p className="form-error">{createEinheitMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Alias ergänzen</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createAliasMutation.mutate();
            }}
          >
            <label className="field">
              <span>Zieleinheit</span>
              <select
                required
                value={aliasForm.einheit_id}
                onChange={(event) =>
                  setAliasForm((current) => ({ ...current, einheit_id: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {sortedEinheiten.map((einheit) => (
                  <option key={einheit.id} value={einheit.id}>
                    {einheit.kuerzel}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Alias</span>
              <input
                required
                value={aliasForm.alias_text}
                onChange={(event) =>
                  setAliasForm((current) => ({ ...current, alias_text: event.target.value }))
                }
                placeholder="z. B. mg/L"
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={aliasForm.bemerkung}
                onChange={(event) =>
                  setAliasForm((current) => ({ ...current, bemerkung: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                disabled={createAliasMutation.isPending || !aliasForm.einheit_id || !aliasForm.alias_text.trim()}
              >
                {createAliasMutation.isPending ? "Speichert..." : "Alias anlegen"}
              </button>
              {createAliasMutation.isError ? <p className="form-error">{createAliasMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
      </div>

      {einheitenQuery.isLoading ? <p>Lädt...</p> : null}
      {einheitenQuery.isError ? <p className="form-error">{einheitenQuery.error.message}</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Einheit</th>
              <th>Aliase</th>
            </tr>
          </thead>
          <tbody>
            {sortedEinheiten.map((einheit) => (
              <tr key={einheit.id}>
                <td>{einheit.kuerzel}</td>
                <td>
                  {einheit.aliase.length
                    ? einheit.aliase.map((alias) => alias.alias_text).join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
            {!sortedEinheiten.length ? (
              <tr>
                <td colSpan={2}>Noch keine Einheiten vorhanden.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}
