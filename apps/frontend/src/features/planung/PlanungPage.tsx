import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type {
  Parameter,
  Person,
  PlanungEinmalig,
  PlanungFaelligkeit,
  PlanungZyklisch
} from "../../shared/types/api";

type ZyklischFormState = {
  person_id: string;
  laborparameter_id: string;
  intervall_wert: string;
  intervall_typ: "tage" | "wochen" | "monate" | "jahre";
  startdatum: string;
  enddatum: string;
  prioritaet: string;
  karenz_tage: string;
  bemerkung: string;
};

type EinmaligFormState = {
  person_id: string;
  laborparameter_id: string;
  status: "offen" | "naechster_termin";
  zieltermin_datum: string;
  bemerkung: string;
};

type PlanungPanelKey = "zyklisch-create" | "einmalig-create";

type PlanungListItem =
  | {
      key: string;
      typ: "zyklisch";
      person_id: string;
      laborparameter_id: string;
      zyklisch: PlanungZyklisch;
    }
  | {
      key: string;
      typ: "einmalig";
      person_id: string;
      laborparameter_id: string;
      einmalig: PlanungEinmalig;
    };

const today = new Date().toISOString().slice(0, 10);

const initialZyklischForm: ZyklischFormState = {
  person_id: "",
  laborparameter_id: "",
  intervall_wert: "6",
  intervall_typ: "monate",
  startdatum: today,
  enddatum: "",
  prioritaet: "0",
  karenz_tage: "30",
  bemerkung: ""
};

const initialEinmaligForm: EinmaligFormState = {
  person_id: "",
  laborparameter_id: "",
  status: "offen",
  zieltermin_datum: "",
  bemerkung: ""
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
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

function formatIntervall(value: number, typ: string): string {
  const labels: Record<string, string> = {
    tage: value === 1 ? "Tag" : "Tage",
    wochen: value === 1 ? "Woche" : "Wochen",
    monate: value === 1 ? "Monat" : "Monate",
    jahre: value === 1 ? "Jahr" : "Jahre"
  };

  return `${value} ${labels[typ] ?? typ}`;
}

function formatPlanungsstatus(value: string): string {
  const labels: Record<string, string> = {
    aktiv: "Aktiv",
    pausiert: "Pausiert",
    beendet: "Beendet",
    ueberfaellig: "Überfällig",
    faellig: "Fällig",
    bald_faellig: "Bald fällig",
    geplant: "Geplant",
    ohne_faelligkeit: "Ohne Fälligkeit",
    offen: "Offen",
    naechster_termin: "Nächster Termin",
    erledigt: "Erledigt",
    uebersprungen: "Übersprungen",
    abgebrochen: "Abgebrochen"
  };

  return labels[value] ?? value;
}

function formatPlanungstyp(value: "zyklisch" | "einmalig"): string {
  return value === "zyklisch" ? "Zyklisch" : "Einmalig";
}

function summarizePlanningItem(item: PlanungListItem): string {
  if (item.typ === "zyklisch") {
    return [
      formatIntervall(item.zyklisch.intervall_wert, item.zyklisch.intervall_typ),
      formatPlanungsstatus(item.zyklisch.faelligkeitsstatus)
    ].join(" • ");
  }

  return [
    formatPlanungsstatus(item.einmalig.status),
    item.einmalig.zieltermin_datum ? `Zieltermin ${formatDate(item.einmalig.zieltermin_datum)}` : ""
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPlanningSortValue(item: PlanungListItem): number {
  if (item.typ === "zyklisch") {
    return new Date(item.zyklisch.naechste_faelligkeit ?? item.zyklisch.startdatum).getTime();
  }

  return new Date(item.einmalig.zieltermin_datum ?? item.einmalig.erstellt_am).getTime();
}

function getPlanningSearchText(item: PlanungListItem, person?: Person, parameter?: Parameter): string {
  const common = [person?.anzeigename ?? "", parameter?.anzeigename ?? ""];

  if (item.typ === "zyklisch") {
    return [
      ...common,
      item.zyklisch.bemerkung ?? "",
      item.zyklisch.status,
      item.zyklisch.faelligkeitsstatus,
      item.zyklisch.intervall_typ
    ]
      .join(" ")
      .toLocaleLowerCase("de-DE");
  }

  return [
    ...common,
    item.einmalig.bemerkung ?? "",
    item.einmalig.status,
    item.einmalig.zieltermin_datum ?? ""
  ]
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

export function PlanungPage() {
  const queryClient = useQueryClient();
  const [zyklischForm, setZyklischForm] = useState<ZyklischFormState>(initialZyklischForm);
  const [einmaligForm, setEinmaligForm] = useState<EinmaligFormState>(initialEinmaligForm);
  const [personFilter, setPersonFilter] = useState("");
  const [planningSearchQuery, setPlanningSearchQuery] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PlanungPanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [showRelatedFaelligkeiten, setShowRelatedFaelligkeiten] = useState(true);
  const [showRelatedPersonPlans, setShowRelatedPersonPlans] = useState(false);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const zyklischQuery = useQuery({
    queryKey: ["planung", "zyklisch", personFilter],
    queryFn: () =>
      apiFetch<PlanungZyklisch[]>(`/api/planung/zyklisch${personFilter ? `?person_id=${personFilter}` : ""}`)
  });
  const einmaligQuery = useQuery({
    queryKey: ["planung", "einmalig", personFilter],
    queryFn: () =>
      apiFetch<PlanungEinmalig[]>(`/api/planung/einmalig${personFilter ? `?person_id=${personFilter}` : ""}`)
  });
  const faelligkeitenQuery = useQuery({
    queryKey: ["planung", "faelligkeiten", personFilter],
    queryFn: () =>
      apiFetch<PlanungFaelligkeit[]>(
        `/api/planung/faelligkeiten${personFilter ? `?person_id=${personFilter}` : ""}`
      )
  });

  const personById = useMemo(
    () => new Map((personenQuery.data ?? []).map((person) => [person.id, person])),
    [personenQuery.data]
  );
  const parameterById = useMemo(
    () => new Map((parameterQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parameterQuery.data]
  );

  const combinedPlans = useMemo<PlanungListItem[]>(() => {
    const items: PlanungListItem[] = [
      ...(zyklischQuery.data ?? []).map((planung) => ({
        key: `zyklisch-${planung.id}`,
        typ: "zyklisch" as const,
        person_id: planung.person_id,
        laborparameter_id: planung.laborparameter_id,
        zyklisch: planung
      })),
      ...(einmaligQuery.data ?? []).map((planung) => ({
        key: `einmalig-${planung.id}`,
        typ: "einmalig" as const,
        person_id: planung.person_id,
        laborparameter_id: planung.laborparameter_id,
        einmalig: planung
      }))
    ];

    return items.sort((left, right) => {
      const dateDifference = getPlanningSortValue(left) - getPlanningSortValue(right);
      if (dateDifference !== 0) {
        return dateDifference;
      }

      const leftPerson = personById.get(left.person_id)?.anzeigename ?? "";
      const rightPerson = personById.get(right.person_id)?.anzeigename ?? "";
      return leftPerson.localeCompare(rightPerson, "de-DE", { sensitivity: "base" });
    });
  }, [einmaligQuery.data, personById, zyklischQuery.data]);

  const filteredPlans = useMemo(() => {
    const normalizedSearchQuery = planningSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return combinedPlans;
    }

    return combinedPlans.filter((item) =>
      getPlanningSearchText(item, personById.get(item.person_id), parameterById.get(item.laborparameter_id)).includes(
        normalizedSearchQuery
      )
    );
  }, [combinedPlans, parameterById, personById, planningSearchQuery]);

  useEffect(() => {
    if (!filteredPlans.length) {
      setSelectedPlanKey(null);
      return;
    }

    const selectionStillExists = filteredPlans.some((item) => item.key === selectedPlanKey);
    if (!selectedPlanKey || !selectionStillExists) {
      setSelectedPlanKey(filteredPlans[0].key);
    }
  }, [filteredPlans, selectedPlanKey]);

  const selectedPlan = useMemo(
    () => filteredPlans.find((item) => item.key === selectedPlanKey) ?? combinedPlans.find((item) => item.key === selectedPlanKey) ?? null,
    [combinedPlans, filteredPlans, selectedPlanKey]
  );

  const selectedPerson = selectedPlan ? personById.get(selectedPlan.person_id) ?? null : null;
  const selectedParameter = selectedPlan ? parameterById.get(selectedPlan.laborparameter_id) ?? null : null;

  const relatedPlansForPerson = useMemo(() => {
    if (!selectedPlan) {
      return [];
    }

    return combinedPlans.filter((item) => item.person_id === selectedPlan.person_id && item.key !== selectedPlan.key);
  }, [combinedPlans, selectedPlan]);

  const hasActivePlanningFilter = planningSearchQuery.trim().length > 0;
  const planningCountLabel = hasActivePlanningFilter
    ? `${filteredPlans.length} von ${combinedPlans.length} Planungen`
    : `${combinedPlans.length} Planungen`;

  const invalidatePlanning = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["planung", "zyklisch"] }),
      queryClient.invalidateQueries({ queryKey: ["planung", "einmalig"] }),
      queryClient.invalidateQueries({ queryKey: ["planung", "faelligkeiten"] })
    ]);
  };

  const createZyklischMutation = useMutation({
    mutationFn: () =>
      apiFetch<PlanungZyklisch>("/api/planung/zyklisch", {
        method: "POST",
        body: JSON.stringify({
          person_id: zyklischForm.person_id,
          laborparameter_id: zyklischForm.laborparameter_id,
          intervall_wert: Number(zyklischForm.intervall_wert),
          intervall_typ: zyklischForm.intervall_typ,
          startdatum: zyklischForm.startdatum,
          enddatum: zyklischForm.enddatum || null,
          prioritaet: Number(zyklischForm.prioritaet),
          karenz_tage: Number(zyklischForm.karenz_tage),
          bemerkung: zyklischForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setZyklischForm(initialZyklischForm);
      setActivePanel(null);
      await invalidatePlanning();
    }
  });

  const createEinmaligMutation = useMutation({
    mutationFn: () =>
      apiFetch<PlanungEinmalig>("/api/planung/einmalig", {
        method: "POST",
        body: JSON.stringify({
          person_id: einmaligForm.person_id,
          laborparameter_id: einmaligForm.laborparameter_id,
          status: einmaligForm.status,
          zieltermin_datum: einmaligForm.zieltermin_datum || null,
          bemerkung: einmaligForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setEinmaligForm(initialEinmaligForm);
      setActivePanel(null);
      await invalidatePlanning();
    }
  });

  const patchZyklischMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<PlanungZyklisch>(`/api/planung/zyklisch/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: invalidatePlanning
  });

  const patchEinmaligMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<PlanungEinmalig>(`/api/planung/einmalig/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: invalidatePlanning
  });

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
    if (activePanel === "zyklisch-create") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Zyklische Planung anlegen</h3>
              <p>Lege wiederkehrende Kontrollen mit Intervall, Karenz und Priorität für eine Person und einen Parameter an.</p>
            </div>
            {renderPanelCloseButton("Panel Zyklische Planung schließen")}
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createZyklischMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={zyklischForm.person_id}
                onChange={(event) => setZyklischForm((current) => ({ ...current, person_id: event.target.value }))}
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
              <span>Parameter</span>
              <select
                required
                value={zyklischForm.laborparameter_id}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, laborparameter_id: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {parameterQuery.data?.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Intervallwert</span>
              <input
                required
                type="number"
                min="1"
                value={zyklischForm.intervall_wert}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, intervall_wert: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Intervalltyp</span>
              <select
                value={zyklischForm.intervall_typ}
                onChange={(event) =>
                  setZyklischForm((current) => ({
                    ...current,
                    intervall_typ: event.target.value as ZyklischFormState["intervall_typ"]
                  }))
                }
              >
                <option value="tage">Tage</option>
                <option value="wochen">Wochen</option>
                <option value="monate">Monate</option>
                <option value="jahre">Jahre</option>
              </select>
            </label>

            <label className="field">
              <span>Startdatum</span>
              <input
                required
                type="date"
                value={zyklischForm.startdatum}
                onChange={(event) => setZyklischForm((current) => ({ ...current, startdatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Enddatum</span>
              <input
                type="date"
                value={zyklischForm.enddatum}
                onChange={(event) => setZyklischForm((current) => ({ ...current, enddatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Priorität</span>
              <input
                type="number"
                value={zyklischForm.prioritaet}
                onChange={(event) => setZyklischForm((current) => ({ ...current, prioritaet: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Karenz in Tagen</span>
              <input
                type="number"
                min="0"
                value={zyklischForm.karenz_tage}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, karenz_tage: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={zyklischForm.bemerkung}
                onChange={(event) => setZyklischForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createZyklischMutation.isPending}>
                {createZyklischMutation.isPending ? "Speichert..." : "Zyklische Planung anlegen"}
              </button>
              {createZyklischMutation.isError ? (
                <p className="form-error">{createZyklischMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "einmalig-create") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Einmalvormerkung anlegen</h3>
              <p>Lege eine einmalige Aufgabe oder einen nächsten Termin für eine Person und einen Parameter an.</p>
            </div>
            {renderPanelCloseButton("Panel Einmalvormerkung schließen")}
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createEinmaligMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={einmaligForm.person_id}
                onChange={(event) => setEinmaligForm((current) => ({ ...current, person_id: event.target.value }))}
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
              <span>Parameter</span>
              <select
                required
                value={einmaligForm.laborparameter_id}
                onChange={(event) =>
                  setEinmaligForm((current) => ({ ...current, laborparameter_id: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {parameterQuery.data?.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={einmaligForm.status}
                onChange={(event) =>
                  setEinmaligForm((current) => ({
                    ...current,
                    status: event.target.value as EinmaligFormState["status"]
                  }))
                }
              >
                <option value="offen">Offen</option>
                <option value="naechster_termin">Nächster Termin</option>
              </select>
            </label>

            <label className="field">
              <span>Zieltermin</span>
              <input
                type="date"
                value={einmaligForm.zieltermin_datum}
                onChange={(event) =>
                  setEinmaligForm((current) => ({ ...current, zieltermin_datum: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={einmaligForm.bemerkung}
                onChange={(event) => setEinmaligForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createEinmaligMutation.isPending}>
                {createEinmaligMutation.isPending ? "Speichert..." : "Einmalvormerkung anlegen"}
              </button>
              {createEinmaligMutation.isError ? (
                <p className="form-error">{createEinmaligMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    return null;
  };

  const renderPrimaryAction = () => {
    if (!selectedPlan) {
      return null;
    }

    if (selectedPlan.typ === "zyklisch") {
      const nextStatus = selectedPlan.zyklisch.status === "aktiv" ? "pausiert" : "aktiv";
      return (
        <button
          type="button"
          className="parameter-toolrail__button"
          onClick={() => patchZyklischMutation.mutate({ id: selectedPlan.zyklisch.id, status: nextStatus })}
        >
          {selectedPlan.zyklisch.status === "aktiv" ? "Pausieren" : "Aktivieren"}
        </button>
      );
    }

    const nextStatus = selectedPlan.einmalig.status !== "erledigt" ? "erledigt" : "offen";
    return (
      <button
        type="button"
        className="parameter-toolrail__button"
        onClick={() => patchEinmaligMutation.mutate({ id: selectedPlan.einmalig.id, status: nextStatus })}
      >
        {selectedPlan.einmalig.status !== "erledigt" ? "Erledigt" : "Wieder öffnen"}
      </button>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Planung</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Planungsseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du wiederkehrende Kontrollen, Einmalvormerkungen und die aktuelle Fälligkeitslage.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Planungen</h3>
              <p>{planningCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Person</span>
            <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
              <option value="">Alle Personen</option>
              {personenQuery.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.anzeigename}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={planningSearchQuery}
                onChange={(event) => setPlanningSearchQuery(event.target.value)}
                placeholder="Person, Parameter, Status oder Hinweis"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setPlanningSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!planningSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          <div className="parameter-list">
            {filteredPlans.map((item) => {
              const person = personById.get(item.person_id);
              const parameter = parameterById.get(item.laborparameter_id);

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`parameter-list__item ${selectedPlanKey === item.key ? "parameter-list__item--selected" : ""}`}
                  onClick={() => setSelectedPlanKey(item.key)}
                >
                  <div className="parameter-list__title-row">
                    <strong>{person?.anzeigename || item.person_id}</strong>
                  </div>
                  <p>{parameter?.anzeigename || item.laborparameter_id}</p>
                  <div className="parameter-list__meta">
                    <span className="parameter-pill">{formatPlanungstyp(item.typ)}</span>
                    <span className="parameter-pill">{summarizePlanningItem(item)}</span>
                  </div>
                </button>
              );
            })}
            {!filteredPlans.length ? (
              <div className="parameter-list__empty">
                <p>Keine Planungen passen zur aktuellen Filterung.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            {!selectedPlan ? (
              <p>Noch keine Planungen vorhanden. Lege über die Werkzeugleiste die erste Planung an.</p>
            ) : (
              <>
                <div className="parameter-detail__header">
                  <div>
                    <h3 className="parameter-detail__title">
                      {selectedPerson?.anzeigename || selectedPlan.person_id} • {selectedParameter?.anzeigename || selectedPlan.laborparameter_id}
                    </h3>
                    <p>
                      {selectedPlan.typ === "zyklisch"
                        ? `Wiederkehrende Kontrolle mit ${formatIntervall(
                            selectedPlan.zyklisch.intervall_wert,
                            selectedPlan.zyklisch.intervall_typ
                          )}.`
                        : "Einmalige Vormerkung oder Aufgabenposition für diesen Parameter."}
                    </p>
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

                <div className="parameter-toolrail">
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "zyklisch-create" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => setActivePanel((current) => (current === "zyklisch-create" ? null : "zyklisch-create"))}
                  >
                    Zyklisch anlegen
                  </button>
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "einmalig-create" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => setActivePanel((current) => (current === "einmalig-create" ? null : "einmalig-create"))}
                  >
                    Einmalig anlegen
                  </button>
                  {renderPrimaryAction()}
                </div>

                {renderActionPanel()}

                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Person</span>
                    <strong>{selectedPerson?.anzeigename || selectedPlan.person_id}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Parameter</span>
                    <strong>{selectedParameter?.anzeigename || selectedPlan.laborparameter_id}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Typ</span>
                    <strong>{formatPlanungstyp(selectedPlan.typ)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Status</span>
                    <strong>
                      {selectedPlan.typ === "zyklisch"
                        ? formatPlanungsstatus(selectedPlan.zyklisch.faelligkeitsstatus)
                        : formatPlanungsstatus(selectedPlan.einmalig.status)}
                    </strong>
                  </div>
                </div>

                <div className="detail-grid detail-grid--metrics">
                  {selectedPlan.typ === "zyklisch" ? (
                    <>
                      <div className="detail-grid__item">
                        <span>Letzte Messung</span>
                        <strong>{formatDate(selectedPlan.zyklisch.letzte_relevante_messung_datum)}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Nächste Fälligkeit</span>
                        <strong>{formatDate(selectedPlan.zyklisch.naechste_faelligkeit)}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Priorität</span>
                        <strong>{selectedPlan.zyklisch.prioritaet}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Karenz</span>
                        <strong>{selectedPlan.zyklisch.karenz_tage} Tage</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="detail-grid__item">
                        <span>Zieltermin</span>
                        <strong>{formatDate(selectedPlan.einmalig.zieltermin_datum)}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Erledigt durch</span>
                        <strong>{selectedPlan.einmalig.erledigt_durch_messwert_id ? "Messwert verknüpft" : "Nicht verknüpft"}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="detail-grid">
                  <div className="detail-grid__item detail-grid__item--full">
                    <span>Bemerkung</span>
                    <strong>
                      {selectedPlan.typ === "zyklisch"
                        ? selectedPlan.zyklisch.bemerkung || "Keine Bemerkung hinterlegt."
                        : selectedPlan.einmalig.bemerkung || "Keine Bemerkung hinterlegt."}
                    </strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    {selectedPlan.typ === "zyklisch" ? (
                      <>
                        <div className="detail-grid__item">
                          <span>Intervall</span>
                          <strong>{formatIntervall(selectedPlan.zyklisch.intervall_wert, selectedPlan.zyklisch.intervall_typ)}</strong>
                        </div>
                        <div className="detail-grid__item">
                          <span>Startdatum</span>
                          <strong>{formatDate(selectedPlan.zyklisch.startdatum)}</strong>
                        </div>
                        <div className="detail-grid__item">
                          <span>Enddatum</span>
                          <strong>{formatDate(selectedPlan.zyklisch.enddatum)}</strong>
                        </div>
                      </>
                    ) : null}
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>
                        {formatDateTime(
                          selectedPlan.typ === "zyklisch"
                            ? selectedPlan.zyklisch.erstellt_am
                            : selectedPlan.einmalig.erstellt_am
                        )}
                      </strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>
                        {formatDateTime(
                          selectedPlan.typ === "zyklisch"
                            ? selectedPlan.zyklisch.geaendert_am
                            : selectedPlan.einmalig.geaendert_am
                        )}
                      </strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Interne ID</span>
                      <strong className="detail-grid__value--break">
                        {selectedPlan.typ === "zyklisch" ? selectedPlan.zyklisch.id : selectedPlan.einmalig.id}
                      </strong>
                    </div>
                  </div>
                ) : null}

                <section className="card card--soft parameter-related">
                  <div className="parameter-related__header">
                    <div>
                      <h3>Zugeordnete Daten</h3>
                    </div>
                  </div>

                  <div className="parameter-related__list">
                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${showRelatedFaelligkeiten ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedFaelligkeiten((current) => !current)}
                        aria-expanded={showRelatedFaelligkeiten}
                      >
                        <span>
                          <strong>Fälligkeiten und Vorschläge</strong>
                          <small>{faelligkeitenQuery.data?.length ?? 0} Einträge</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedFaelligkeiten ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Typ</th>
                                  <th>Person</th>
                                  <th>Parameter</th>
                                  <th>Status</th>
                                  <th>Fällig / Zieltermin</th>
                                  <th>Hinweis</th>
                                </tr>
                              </thead>
                              <tbody>
                                {faelligkeitenQuery.data?.map((item) => (
                                  <tr key={`${item.planung_typ}-${item.planung_id}`}>
                                    <td>{formatPlanungstyp(item.planung_typ as "zyklisch" | "einmalig")}</td>
                                    <td>{personById.get(item.person_id)?.anzeigename ?? item.person_id}</td>
                                    <td>{parameterById.get(item.laborparameter_id)?.anzeigename ?? item.laborparameter_id}</td>
                                    <td>{formatPlanungsstatus(item.status)}</td>
                                    <td>{formatDate(item.naechste_faelligkeit || item.zieltermin_datum)}</td>
                                    <td>{item.bemerkung || item.intervall_label || "—"}</td>
                                  </tr>
                                ))}
                                {!faelligkeitenQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={6}>Aktuell gibt es keine fälligen oder vorgemerkten Positionen.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>

                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${showRelatedPersonPlans ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedPersonPlans((current) => !current)}
                        aria-expanded={showRelatedPersonPlans}
                      >
                        <span>
                          <strong>Weitere Planungen dieser Person</strong>
                          <small>{relatedPlansForPerson.length} Einträge</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedPersonPlans ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Parameter</th>
                                  <th>Typ</th>
                                  <th>Status</th>
                                  <th>Termin</th>
                                  <th>Bemerkung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {relatedPlansForPerson.map((item) => (
                                  <tr key={item.key}>
                                    <td>{parameterById.get(item.laborparameter_id)?.anzeigename ?? item.laborparameter_id}</td>
                                    <td>{formatPlanungstyp(item.typ)}</td>
                                    <td>
                                      {item.typ === "zyklisch"
                                        ? formatPlanungsstatus(item.zyklisch.faelligkeitsstatus)
                                        : formatPlanungsstatus(item.einmalig.status)}
                                    </td>
                                    <td>
                                      {item.typ === "zyklisch"
                                        ? formatDate(item.zyklisch.naechste_faelligkeit)
                                        : formatDate(item.einmalig.zieltermin_datum)}
                                    </td>
                                    <td>
                                      {item.typ === "zyklisch"
                                        ? item.zyklisch.bemerkung || "—"
                                        : item.einmalig.bemerkung || "—"}
                                    </td>
                                  </tr>
                                ))}
                                {!relatedPlansForPerson.length ? (
                                  <tr>
                                    <td colSpan={5}>Für diese Person gibt es keine weiteren Planungen.</td>
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
            {patchZyklischMutation.isError ? <p className="form-error">{patchZyklischMutation.error.message}</p> : null}
            {patchEinmaligMutation.isError ? <p className="form-error">{patchEinmaligMutation.error.message}</p> : null}
          </article>
        </div>
      </div>
    </section>
  );
}
