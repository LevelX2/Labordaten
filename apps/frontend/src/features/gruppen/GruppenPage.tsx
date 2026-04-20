import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { Gruppe, GruppenParameter, Parameter } from "../../shared/types/api";

type GruppenFormState = {
  name: string;
  beschreibung: string;
  sortierschluessel: string;
};

type ZuordnungState = {
  aktiv: boolean;
  sortierung: string;
};

const initialForm: GruppenFormState = {
  name: "",
  beschreibung: "",
  sortierschluessel: ""
};

export function GruppenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GruppenFormState>(initialForm);
  const [gruppeId, setGruppeId] = useState("");
  const [zuordnungen, setZuordnungen] = useState<Record<string, ZuordnungState>>({});

  const gruppenQuery = useQuery({
    queryKey: ["gruppen"],
    queryFn: () => apiFetch<Gruppe[]>("/api/gruppen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const gruppenParameterQuery = useQuery({
    queryKey: ["gruppen-parameter", gruppeId],
    queryFn: () => apiFetch<GruppenParameter[]>(`/api/gruppen/${gruppeId}/parameter`),
    enabled: Boolean(gruppeId)
  });

  const selectedGroup = useMemo(
    () => gruppenQuery.data?.find((gruppe) => gruppe.id === gruppeId) ?? null,
    [gruppenQuery.data, gruppeId]
  );

  const currentAssignments = useMemo(() => {
    const mapping: Record<string, ZuordnungState> = {};
    for (const item of gruppenParameterQuery.data ?? []) {
      mapping[item.laborparameter_id] = {
        aktiv: true,
        sortierung: item.sortierung?.toString() ?? ""
      };
    }
    return mapping;
  }, [gruppenParameterQuery.data]);

  const effectiveAssignments = Object.keys(zuordnungen).length ? zuordnungen : currentAssignments;

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Gruppe>("/api/gruppen", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          beschreibung: form.beschreibung || null,
          sortierschluessel: form.sortierschluessel || null
        })
      }),
    onSuccess: async (gruppe) => {
      setForm(initialForm);
      setGruppeId(gruppe.id);
      setZuordnungen({});
      await queryClient.invalidateQueries({ queryKey: ["gruppen"] });
    }
  });

  const saveAssignmentsMutation = useMutation({
    mutationFn: () => {
      const eintraege = Object.entries(effectiveAssignments)
        .filter(([, item]) => item.aktiv)
        .map(([laborparameter_id, item]) => ({
          laborparameter_id,
          sortierung: item.sortierung ? Number(item.sortierung) : null
        }));

      return apiFetch<GruppenParameter[]>(`/api/gruppen/${gruppeId}/parameter`, {
        method: "PUT",
        body: JSON.stringify({ eintraege })
      });
    },
    onSuccess: async (data) => {
      const mapping: Record<string, ZuordnungState> = {};
      for (const item of data) {
        mapping[item.laborparameter_id] = {
          aktiv: true,
          sortierung: item.sortierung?.toString() ?? ""
        };
      }
      setZuordnungen(mapping);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gruppen"] }),
        queryClient.invalidateQueries({ queryKey: ["gruppen-parameter", gruppeId] })
      ]);
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Gruppen und Zuordnung</span>
        <h2>Gruppen</h2>
        <p>
          Gruppen bündeln Parameter für Filter, Berichte und Auswertungen. Ein Parameter kann in mehreren Gruppen
          enthalten sein.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neue Gruppe</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="field">
              <span>Name</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Sortierschlüssel</span>
              <input
                value={form.sortierschluessel}
                onChange={(event) => setForm((current) => ({ ...current, sortierschluessel: event.target.value }))}
              />
            </label>

            <label className="field field--full">
              <span>Beschreibung</span>
              <textarea
                rows={4}
                value={form.beschreibung}
                onChange={(event) => setForm((current) => ({ ...current, beschreibung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Speichert..." : "Gruppe anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Vorhandene Gruppen</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Parameter</th>
                  <th>Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                {gruppenQuery.data?.map((gruppe) => (
                  <tr
                    key={gruppe.id}
                    className={gruppe.id === gruppeId ? "row-selected" : undefined}
                    onClick={() => {
                      setGruppeId(gruppe.id);
                      setZuordnungen({});
                    }}
                  >
                    <td>{gruppe.name}</td>
                    <td>{gruppe.parameter_anzahl}</td>
                    <td>{gruppe.beschreibung || "—"}</td>
                  </tr>
                ))}
                {!gruppenQuery.data?.length ? (
                  <tr>
                    <td colSpan={3}>Noch keine Gruppen vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Parameterzuordnung</h3>
          {!gruppeId ? <p>Bitte zuerst eine Gruppe auswählen.</p> : null}
          {selectedGroup ? <p>Aktive Gruppe: <strong>{selectedGroup.name}</strong></p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aktiv</th>
                  <th>Parameter</th>
                  <th>Typ</th>
                  <th>Einheit</th>
                  <th>Sortierung</th>
                </tr>
              </thead>
              <tbody>
                {parameterQuery.data?.map((parameter) => {
                  const item = effectiveAssignments[parameter.id] ?? { aktiv: false, sortierung: "" };
                  return (
                    <tr key={parameter.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.aktiv}
                          disabled={!gruppeId}
                          onChange={(event) =>
                            setZuordnungen((current) => ({
                              ...current,
                              [parameter.id]: {
                                aktiv: event.target.checked,
                                sortierung: current[parameter.id]?.sortierung ?? item.sortierung
                              }
                            }))
                          }
                        />
                      </td>
                      <td>{parameter.anzeigename}</td>
                      <td>{parameter.wert_typ_standard}</td>
                      <td>{parameter.standard_einheit || "—"}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={item.sortierung}
                          disabled={!gruppeId || !item.aktiv}
                          onChange={(event) =>
                            setZuordnungen((current) => ({
                              ...current,
                              [parameter.id]: {
                                aktiv: current[parameter.id]?.aktiv ?? item.aktiv,
                                sortierung: event.target.value
                              }
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
                {!parameterQuery.data?.length ? (
                  <tr>
                    <td colSpan={5}>Noch keine Parameter vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" disabled={saveAssignmentsMutation.isPending || !gruppeId} onClick={() => saveAssignmentsMutation.mutate()}>
              {saveAssignmentsMutation.isPending ? "Speichert..." : "Zuordnung speichern"}
            </button>
            {saveAssignmentsMutation.isError ? <p className="form-error">{saveAssignmentsMutation.error.message}</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
