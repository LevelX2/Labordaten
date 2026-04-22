import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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

type GruppenPanelKey = "create" | "assignments";
type AssignmentViewMode = "all" | "assigned";

const initialForm: GruppenFormState = {
  name: "",
  beschreibung: "",
  sortierschluessel: ""
};

function summarizeDescription(text: string | null | undefined): string {
  const value = text?.trim();
  if (!value) {
    return "Noch keine Erläuterung hinterlegt.";
  }
  if (value.length <= 120) {
    return value;
  }
  return `${value.slice(0, 117).trimEnd()}...`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatWertTyp(value: string): string {
  if (value === "numerisch") {
    return "Numerisch";
  }
  if (value === "ordinal") {
    return "Ordinal";
  }
  return "Text";
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function GruppenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GruppenFormState>(initialForm);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [zuordnungen, setZuordnungen] = useState<Record<string, ZuordnungState>>({});
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState("");
  const [assignmentViewMode, setAssignmentViewMode] = useState<AssignmentViewMode>("all");
  const [activePanel, setActivePanel] = useState<GruppenPanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [showRelatedParameters, setShowRelatedParameters] = useState(true);

  const gruppenQuery = useQuery({
    queryKey: ["gruppen"],
    queryFn: () => apiFetch<Gruppe[]>("/api/gruppen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const gruppenParameterQuery = useQuery({
    queryKey: ["gruppen-parameter", selectedGroupId],
    queryFn: () => apiFetch<GruppenParameter[]>(`/api/gruppen/${selectedGroupId}/parameter`),
    enabled: Boolean(selectedGroupId)
  });

  const sortedGroups = useMemo(
    () =>
      [...(gruppenQuery.data ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "de-DE", { sensitivity: "base" })
      ),
    [gruppenQuery.data]
  );

  useEffect(() => {
    if (!sortedGroups.length) {
      setSelectedGroupId(null);
      return;
    }

    const selectionStillExists = sortedGroups.some((gruppe) => gruppe.id === selectedGroupId);
    if (!selectedGroupId || !selectionStillExists) {
      setSelectedGroupId(sortedGroups[0].id);
    }
  }, [selectedGroupId, sortedGroups]);

  const filteredGroups = useMemo(() => {
    const normalizedSearchQuery = groupSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return sortedGroups;
    }

    return sortedGroups.filter((gruppe) =>
      [gruppe.name, gruppe.beschreibung ?? "", gruppe.sortierschluessel ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery)
    );
  }, [groupSearchQuery, sortedGroups]);

  const sortedParameters = useMemo(
    () =>
      [...(parameterQuery.data ?? [])].sort((left, right) =>
        left.anzeigename.localeCompare(right.anzeigename, "de-DE", { sensitivity: "base" })
      ),
    [parameterQuery.data]
  );

  const selectedGroup = useMemo(
    () => sortedGroups.find((gruppe) => gruppe.id === selectedGroupId) ?? null,
    [selectedGroupId, sortedGroups]
  );

  useEffect(() => {
    setZuordnungen({});
    setAssignmentSearchQuery("");
    setAssignmentViewMode("all");
    setShowRelatedParameters(true);
  }, [selectedGroupId]);

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

  const filteredParameters = useMemo(() => {
    const normalizedSearchQuery = assignmentSearchQuery.trim().toLocaleLowerCase("de-DE");
    return sortedParameters.filter((parameter) => {
      const item = effectiveAssignments[parameter.id] ?? { aktiv: false, sortierung: "" };
      if (assignmentViewMode === "assigned" && !item.aktiv) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      return [parameter.anzeigename, parameter.interner_schluessel, parameter.beschreibung ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery);
    });
  }, [assignmentSearchQuery, assignmentViewMode, effectiveAssignments, sortedParameters]);

  const assignedParameterCount = Object.values(effectiveAssignments).filter((item) => item.aktiv).length;
  const hasActiveGroupFilter = groupSearchQuery.trim().length > 0;
  const groupCountLabel = hasActiveGroupFilter
    ? `${filteredGroups.length} von ${sortedGroups.length} Gruppen`
    : `${sortedGroups.length} Gruppen`;

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
      setSelectedGroupId(gruppe.id);
      setActivePanel(null);
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

      return apiFetch<GruppenParameter[]>(`/api/gruppen/${selectedGroupId}/parameter`, {
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
        queryClient.invalidateQueries({ queryKey: ["gruppen-parameter", selectedGroupId] })
      ]);
    }
  });

  const handleOpenPanel = (panel: GruppenPanelKey) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const renderPanelCloseButton = (label = "Werkzeug schließen") => (
    <button
      type="button"
      className="icon-button"
      onClick={() => setActivePanel(null)}
      aria-label={label}
      title={label}
    >
      ×
    </button>
  );

  const renderActionPanel = () => {
    if (!activePanel) {
      return null;
    }

    if (activePanel === "create") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Neue Gruppe</h3>
              <p>Gruppen bündeln fachlich zusammengehörige Parameter für Filter, Berichte und Auswertungen.</p>
            </div>
            {renderPanelCloseButton("Panel Neue Gruppe schließen")}
          </div>
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
      );
    }

    if (!selectedGroupId || !selectedGroup) {
      return (
        <article className="card card--soft">
          <h3>Parameter zuordnen</h3>
          <p>Bitte wähle zuerst links eine Gruppe aus.</p>
        </article>
      );
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Parameter zuordnen</h3>
            <p>Lege fest, welche Parameter in dieser Gruppe enthalten sind und in welcher Reihenfolge sie erscheinen.</p>
          </div>
          {renderPanelCloseButton("Panel Parameter zuordnen schließen")}
        </div>

        <label className="field field--full">
          <span>Suche in Parametern</span>
          <div className="clearable-field">
            <input
              className="clearable-field__input"
              value={assignmentSearchQuery}
              onChange={(event) => setAssignmentSearchQuery(event.target.value)}
              placeholder="Name, Schlüssel oder Beschreibung"
            />
            <button
              type="button"
              className="clearable-field__clear"
              onClick={() => setAssignmentSearchQuery("")}
              aria-label="Suche löschen"
              title="Suche löschen"
              disabled={!assignmentSearchQuery}
            >
              ×
            </button>
          </div>
        </label>

        <div className="parameter-panel__toolbar">
          <button
            type="button"
            className={`parameter-toolrail__button ${assignmentViewMode === "all" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setAssignmentViewMode("all")}
            aria-pressed={assignmentViewMode === "all"}
          >
            Alle Parameter
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${assignmentViewMode === "assigned" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setAssignmentViewMode("assigned")}
            aria-pressed={assignmentViewMode === "assigned"}
          >
            Nur zugeordnete
          </button>
        </div>

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
              {filteredParameters.map((parameter) => {
                const item = effectiveAssignments[parameter.id] ?? { aktiv: false, sortierung: "" };
                return (
                  <tr key={parameter.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.aktiv}
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
                    <td>{formatWertTyp(parameter.wert_typ_standard)}</td>
                    <td>{parameter.standard_einheit || "—"}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.sortierung}
                        disabled={!item.aktiv}
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
              {!filteredParameters.length ? (
                <tr>
                  <td colSpan={5}>
                    {assignmentViewMode === "assigned"
                      ? "Für diese Ansicht passen aktuell keine zugeordneten Parameter zur Suche."
                      : "Keine Parameter passen zur aktuellen Suche."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button
            type="button"
            disabled={saveAssignmentsMutation.isPending || !selectedGroupId}
            onClick={() => saveAssignmentsMutation.mutate()}
          >
            {saveAssignmentsMutation.isPending ? "Speichert..." : "Zuordnung speichern"}
          </button>
          {saveAssignmentsMutation.isError ? <p className="form-error">{saveAssignmentsMutation.error.message}</p> : null}
        </div>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Gruppen</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Gruppenseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du Gruppen, ordnest Parameter zu und prüfst die bereits zugeordneten Daten.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Gruppen</h3>
              <p>{groupCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={groupSearchQuery}
                onChange={(event) => setGroupSearchQuery(event.target.value)}
                placeholder="Name, Schlüssel oder Beschreibung"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setGroupSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!groupSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          <div className="parameter-list">
            {filteredGroups.map((gruppe) => (
              <button
                key={gruppe.id}
                type="button"
                className={`parameter-list__item ${selectedGroupId === gruppe.id ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedGroupId(gruppe.id)}
              >
                <div className="parameter-list__title-row">
                  <strong>{gruppe.name}</strong>
                </div>
                <p>{summarizeDescription(gruppe.beschreibung)}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">
                    {formatCountLabel(gruppe.parameter_anzahl, "Parameter", "Parameter")}
                  </span>
                  {gruppe.sortierschluessel ? <span className="parameter-pill">{gruppe.sortierschluessel}</span> : null}
                </div>
              </button>
            ))}
            {!filteredGroups.length ? (
              <div className="parameter-list__empty">
                <p>Keine Gruppen passen zur aktuellen Suche.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            {!selectedGroup ? (
              <p>Noch keine Gruppen vorhanden. Lege über die Werkzeugleiste die erste Gruppe an.</p>
            ) : (
              <>
                <div className="parameter-toolrail">
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "create" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => handleOpenPanel("create")}
                  >
                    Neue Gruppe
                  </button>
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "assignments" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => handleOpenPanel("assignments")}
                  >
                    Parameter zuordnen
                  </button>
                </div>

                {renderActionPanel()}

                <div className="parameter-detail__header">
                  <div>
                    <h3 className="parameter-detail__title">{selectedGroup.name}</h3>
                    <p>{selectedGroup.beschreibung?.trim() || "Zu dieser Gruppe ist noch keine Erläuterung hinterlegt."}</p>
                  </div>
                  <div className="parameter-header-controls">
                    <button
                      type="button"
                      className={`parameter-mode-toggle ${showAdvancedDetails ? "parameter-mode-toggle--advanced" : ""}`}
                      onClick={() => setShowAdvancedDetails((current) => !current)}
                      aria-pressed={showAdvancedDetails}
                      title={showAdvancedDetails ? "Zur einfachen Ansicht wechseln" : "Zur Expertenansicht wechseln"}
                    >
                      <span className="parameter-mode-toggle__icon" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="parameter-mode-toggle__text">{showAdvancedDetails ? "Experte" : "Einfach"}</span>
                    </button>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Zugeordnete Parameter</span>
                    <strong>{assignedParameterCount}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Sortierschlüssel</span>
                    <strong>{selectedGroup.sortierschluessel || "Nicht gesetzt"}</strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    <div className="detail-grid__item">
                      <span>Status</span>
                      <strong>{selectedGroup.aktiv ? "Aktiv" : "Inaktiv"}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>{formatDateTime(selectedGroup.erstellt_am)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>{formatDateTime(selectedGroup.geaendert_am)}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Interne ID</span>
                      <strong className="detail-grid__value--break">{selectedGroup.id}</strong>
                    </div>
                  </div>
                ) : null}

                <section className="card card--soft parameter-related">
                  <div className="parameter-related__header">
                    <div>
                      <h3>Zugeordnete Daten</h3>
                      <p>{formatCountLabel(gruppenParameterQuery.data?.length ?? 0, "Parameter", "Parameter")}</p>
                    </div>
                  </div>

                  <div className="parameter-related__list">
                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${showRelatedParameters ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedParameters((current) => !current)}
                        aria-expanded={showRelatedParameters}
                      >
                        <span>
                          <strong>Parameter</strong>
                          <small>
                            {formatCountLabel(gruppenParameterQuery.data?.length ?? 0, "Eintrag", "Einträge")}
                          </small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedParameters ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Parameter</th>
                                  <th>Typ</th>
                                  <th>Einheit</th>
                                  <th>Sortierung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gruppenParameterQuery.data?.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.parameter_anzeigename}</td>
                                    <td>{formatWertTyp(item.wert_typ_standard)}</td>
                                    <td>{item.standard_einheit || "—"}</td>
                                    <td>{item.sortierung ?? "—"}</td>
                                  </tr>
                                ))}
                                {!gruppenParameterQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={4}>Noch keine Parameter für diese Gruppe zugeordnet.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  </div>
                </section>
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
