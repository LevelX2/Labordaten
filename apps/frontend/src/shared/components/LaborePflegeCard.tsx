import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api/client";
import type { Labor, LaborCreatePayload, LaborUpdatePayload } from "../types/api";
import { LoeschAktionPanel } from "./LoeschAktionPanel";

type LaborePflegeCardProps = {
  className?: string;
};

type LaborFormState = {
  name: string;
  adresse: string;
  bemerkung: string;
};

const initialForm: LaborFormState = {
  name: "",
  adresse: "",
  bemerkung: ""
};

function buildPayload(form: LaborFormState): LaborCreatePayload | LaborUpdatePayload {
  return {
    name: form.name,
    adresse: form.adresse || null,
    bemerkung: form.bemerkung || null
  };
}

export function LaborePflegeCard({ className = "card" }: LaborePflegeCardProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LaborFormState>(initialForm);
  const [selectedLaborId, setSelectedLaborId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [showLoeschpruefung, setShowLoeschpruefung] = useState(false);

  const laboreQuery = useQuery({
    queryKey: ["labore"],
    queryFn: () => apiFetch<Labor[]>("/api/labore")
  });

  const sortedLabore = useMemo(
    () =>
      [...(laboreQuery.data ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "de-DE", { sensitivity: "base" })
      ),
    [laboreQuery.data]
  );

  const filteredLabore = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearch) {
      return sortedLabore;
    }
    return sortedLabore.filter((labor) =>
      [labor.name, labor.adresse ?? "", labor.bemerkung ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearch)
    );
  }, [searchTerm, sortedLabore]);

  const selectedLabor = useMemo(
    () => sortedLabore.find((labor) => labor.id === selectedLaborId) ?? null,
    [selectedLaborId, sortedLabore]
  );

  useEffect(() => {
    if (!sortedLabore.length) {
      setSelectedLaborId(null);
      setShowLoeschpruefung(false);
      return;
    }
    const selectionStillExists = sortedLabore.some((labor) => labor.id === selectedLaborId);
    if (!selectedLaborId || !selectionStillExists) {
      setSelectedLaborId(sortedLabore[0].id);
      setShowLoeschpruefung(false);
    }
  }, [selectedLaborId, sortedLabore]);

  const createLaborMutation = useMutation({
    mutationFn: () =>
      apiFetch<Labor>("/api/labore", {
        method: "POST",
        body: JSON.stringify(buildPayload(form))
      }),
    onSuccess: async (labor) => {
      setForm(initialForm);
      setEditMode("create");
      setSelectedLaborId(labor.id);
      await queryClient.invalidateQueries({ queryKey: ["labore"] });
    }
  });

  const updateLaborMutation = useMutation({
    mutationFn: () => {
      if (!selectedLabor) {
        throw new Error("Bitte zuerst ein Labor auswählen.");
      }
      return apiFetch<Labor>(`/api/labore/${selectedLabor.id}`, {
        method: "PATCH",
        body: JSON.stringify(buildPayload(form))
      });
    },
    onSuccess: async (labor) => {
      setSelectedLaborId(labor.id);
      setEditMode("create");
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["labore"] });
      await queryClient.invalidateQueries({ queryKey: ["befunde"] });
      await queryClient.invalidateQueries({ queryKey: ["messwerte"] });
    }
  });

  const startEdit = () => {
    if (!selectedLabor) {
      return;
    }
    setEditMode("edit");
    setShowLoeschpruefung(false);
    setForm({
      name: selectedLabor.name,
      adresse: selectedLabor.adresse ?? "",
      bemerkung: selectedLabor.bemerkung ?? ""
    });
  };

  return (
    <article className={className}>
      <div className="unit-care__header">
        <div>
          <h3>Labore</h3>
          <p>Labore sind Stammdaten für Befunde, Filter und Berichte. Bestehende Befunde behalten ihre Laborzuordnung.</p>
        </div>
        <div className="unit-care__stats" aria-label="Laborbestand">
          <span className="parameter-pill parameter-pill--accent">{sortedLabore.length} Labore</span>
        </div>
      </div>

      {laboreQuery.isLoading ? <p>Lädt...</p> : null}
      {laboreQuery.isError ? <p className="form-error">{laboreQuery.error.message}</p> : null}

      <div className="unit-workspace">
        <aside className="unit-sidebar" aria-label="Labore auswählen oder neu anlegen">
          <form
            className="unit-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (editMode === "edit") {
                updateLaborMutation.mutate();
              } else {
                createLaborMutation.mutate();
              }
            }}
          >
            <label className="field">
              <span>{editMode === "edit" ? "Name bearbeiten" : "Neues Labor"}</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>

            <label className="field">
              <span>Adresse</span>
              <textarea
                rows={3}
                value={form.adresse}
                onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={form.bemerkung}
                onChange={(event) => setForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                disabled={createLaborMutation.isPending || updateLaborMutation.isPending || !form.name.trim()}
              >
                {createLaborMutation.isPending || updateLaborMutation.isPending
                  ? "Speichert..."
                  : editMode === "edit"
                    ? "Labor speichern"
                    : "Labor anlegen"}
              </button>
              {editMode === "edit" ? (
                <button
                  type="button"
                  className="inline-button"
                  onClick={() => {
                    setEditMode("create");
                    setForm(initialForm);
                  }}
                >
                  Abbrechen
                </button>
              ) : null}
              {createLaborMutation.isError ? <p className="form-error">{createLaborMutation.error.message}</p> : null}
              {updateLaborMutation.isError ? <p className="form-error">{updateLaborMutation.error.message}</p> : null}
            </div>
          </form>

          <label className="field">
            <span>Bestand durchsuchen</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, Adresse oder Hinweis" />
          </label>

          <div className="unit-list" role="list">
            {filteredLabore.map((labor) => (
              <button
                key={labor.id}
                type="button"
                className={`unit-list__item ${labor.id === selectedLaborId ? "unit-list__item--selected" : ""}`}
                onClick={() => {
                  setSelectedLaborId(labor.id);
                  setShowLoeschpruefung(false);
                }}
              >
                <span className="unit-list__main">
                  <strong>{labor.name}</strong>
                  <small>{labor.adresse || labor.bemerkung || "Keine Zusatzangaben"}</small>
                </span>
                <span className={`parameter-pill ${labor.aktiv ? "parameter-pill--accent" : ""}`}>
                  {labor.aktiv ? "Aktiv" : "Inaktiv"}
                </span>
              </button>
            ))}
            {!filteredLabore.length ? (
              <div className="parameter-list__empty">
                <p>Kein passendes Labor gefunden.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="unit-detail" aria-live="polite">
          {selectedLabor ? (
            <>
              <div className="parameter-detail__header">
                <div>
                  <h3 className="parameter-detail__title">{selectedLabor.name}</h3>
                  <p>{selectedLabor.bemerkung || "Zu diesem Labor ist noch keine Bemerkung hinterlegt."}</p>
                </div>
                <div className="parameter-header-controls">
                  <button type="button" className="inline-button" onClick={startEdit}>
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="inline-button"
                    onClick={() => setShowLoeschpruefung((current) => !current)}
                  >
                    {showLoeschpruefung ? "Prüfung ausblenden" : "Löschprüfung"}
                  </button>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-grid__item detail-grid__item--full">
                  <span>Adresse</span>
                  <strong>{selectedLabor.adresse || "Nicht hinterlegt"}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>Status</span>
                  <strong>{selectedLabor.aktiv ? "Aktiv" : "Inaktiv"}</strong>
                </div>
                <div className="detail-grid__item detail-grid__item--full">
                  <span>Interne ID</span>
                  <strong className="detail-grid__value--break">{selectedLabor.id}</strong>
                </div>
              </div>

              {showLoeschpruefung ? (
                <LoeschAktionPanel
                  entitaetTyp="labor"
                  entitaetId={selectedLabor.id}
                  title="Löschprüfung für dieses Labor"
                  emptyText="Bitte zuerst ein Labor auswählen."
                  className="unit-delete-panel"
                  onClose={() => setShowLoeschpruefung(false)}
                  invalidateQueryKeys={[["labore"], ["befunde"], ["messwerte"]]}
                />
              ) : null}
            </>
          ) : (
            <div className="parameter-list__empty">
              <p>Lege links ein Labor an oder wähle ein vorhandenes Labor aus.</p>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
