import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiFetch } from "../../shared/api/client";
import { queryKeys } from "../../shared/api/queryKeys";
import { isInvalidDateRange } from "../../shared/components/DateRangeFilterFields";
import { buildSharedFilterSearchParams } from "../../shared/utils/filterNavigation";
import type {
  AnsichtVorlage,
  AnsichtVorlageCreatePayload,
  AnsichtVorlageDeleteResult,
  AnsichtVorlageUpdatePayload,
  AuswertungGesamtzahlen,
  AuswertungResponse,
  Gruppe,
  Labor,
  Messwert,
  Parameter,
  Person
} from "../../shared/types/api";
import {
  diagrammDarstellungOptions,
  auswertungFilterStorageKey,
  initialForm,
  maxAuswertungParameter,
  vertikalachsenModusOptions
} from "./auswertungConfig";
import {
  applyAuswertungVorlageConfig,
  buildAuswertungPreviewCounts,
  buildAuswertungVorlageConfig,
  buildFilterPeriodLabel,
  buildFilterSummary,
  buildInitialAuswertungForm,
  buildMissingTemplateWarning,
  buildQualitativeEvents,
  buildStatistikCards
} from "./auswertungFilter";
import { AuswertungFiltersPanel, AuswertungDisplayPanel, AuswertungTemplatesPanel } from "./AuswertungPanels";
import { AuswertungQualitativeEventsTable } from "./AuswertungQualitativeEventsTable";
import { AuswertungResultCard } from "./AuswertungResultCard";
import type { AuswertungFormState, AuswertungPanelKey } from "./auswertungTypes";

const auswertungGesamtzahlenQueryKey = queryKeys.auswertungGesamtzahlen ?? (["auswertung", "gesamtzahlen"] as const);
const auswertungVorlagenQueryKey = queryKeys.auswertungVorlagen ?? (["vorlagen", "auswertung_verlauf"] as const);

export function AuswertungPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuswertungFormState>(() => buildInitialAuswertungForm(searchParams));
  const autoLoadKeyRef = useRef<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateBaseline, setTemplateBaseline] = useState("");
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<AuswertungPanelKey | null>("templates");
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [loadedAuswertungSignature, setLoadedAuswertungSignature] = useState<string | null>(null);
  const previewQueryString = useMemo(() => buildSharedFilterSearchParams(form).toString(), [form]);
  const auswertungPreviewQueryKey = useMemo(
    () => ["auswertung", "treffer-vorab", previewQueryString] as const,
    [previewQueryString]
  );
  const currentTemplateConfig = useMemo(() => buildAuswertungVorlageConfig(form), [form]);
  const currentTemplateSignature = useMemo(() => JSON.stringify(currentTemplateConfig), [currentTemplateConfig]);
  const isDateRangeInvalid = isInvalidDateRange(form.datum_von, form.datum_bis);

  const personenQuery = useQuery({
    queryKey: queryKeys.personen,
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: queryKeys.parameter,
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const gruppenQuery = useQuery({
    queryKey: queryKeys.gruppen,
    queryFn: () => apiFetch<Gruppe[]>("/api/gruppen")
  });
  const laboreQuery = useQuery({
    queryKey: queryKeys.labore,
    queryFn: () => apiFetch<Labor[]>("/api/labore")
  });
  const auswertungPreviewQuery = useQuery({
    queryKey: auswertungPreviewQueryKey,
    queryFn: () => apiFetch<Messwert[]>(`/api/messwerte?${previewQueryString}`),
    enabled: form.person_ids.length > 0 && !isDateRangeInvalid
  });
  const gesamtzahlenQuery = useQuery({
    queryKey: auswertungGesamtzahlenQueryKey,
    queryFn: () => apiFetch<AuswertungGesamtzahlen>("/api/auswertung/gesamtzahlen")
  });
  const templatesQuery = useQuery({
    queryKey: auswertungVorlagenQueryKey,
    queryFn: () => apiFetch<AnsichtVorlage[]>("/api/vorlagen?bereich=auswertung&vorlage_typ=auswertung_verlauf")
  });

  const auswertungMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuswertungResponse>("/api/auswertung/verlauf", {
        method: "POST",
        body: JSON.stringify({
          person_ids: form.person_ids,
          laborparameter_ids: form.laborparameter_ids,
          gruppen_ids: form.gruppen_ids,
          klassifikationen: form.klassifikationen,
          labor_ids: form.labor_ids,
          datum_von: form.datum_von || null,
          datum_bis: form.datum_bis || null,
          include_laborreferenz: form.include_laborreferenz,
          include_zielbereich: form.include_zielbereich
        })
      }),
    onSuccess: () => setLoadedAuswertungSignature(currentTemplateSignature)
  });
  const createTemplateMutation = useMutation({
    mutationFn: (payload: AnsichtVorlageCreatePayload) =>
      apiFetch<AnsichtVorlage>("/api/vorlagen", {
        method: "POST",
        body: JSON.stringify(payload)
    }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: auswertungVorlagenQueryKey });
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnsichtVorlageUpdatePayload }) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: auswertungVorlagenQueryKey });
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const applyTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}/anwenden`, {
        method: "POST"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: auswertungVorlagenQueryKey })
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlageDeleteResult>(`/api/vorlagen/${id}`, {
        method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auswertungVorlagenQueryKey });
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
    }
  });

  useEffect(() => {
    window.localStorage.setItem(auswertungFilterStorageKey, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    const autoLoadKey = searchParams.toString();
    if (
      searchParams.get("auto_laden") === "1" &&
      form.person_ids.length > 0 &&
      autoLoadKeyRef.current !== autoLoadKey
    ) {
      autoLoadKeyRef.current = autoLoadKey;
      auswertungMutation.mutate();
    }
  }, [auswertungMutation, form.person_ids.length, searchParams]);

  const qualitativeEvents = useMemo(() => buildQualitativeEvents(auswertungMutation.data), [auswertungMutation.data]);
  const auswertungPreviewCounts = useMemo(
    () => buildAuswertungPreviewCounts(auswertungPreviewQuery.data ?? [], form.person_ids.length),
    [auswertungPreviewQuery.data, form.person_ids.length]
  );
  const filterSummary = useMemo(
    () =>
      buildFilterSummary(form, {
        personen: personenQuery.data ?? [],
        gruppen: gruppenQuery.data ?? [],
        parameter: parameterQuery.data ?? [],
        labore: laboreQuery.data ?? []
      }),
    [form, gruppenQuery.data, laboreQuery.data, parameterQuery.data, personenQuery.data]
  );
  const filterPeriodLabel = useMemo(() => buildFilterPeriodLabel(form), [form]);
  const statistikCards = useMemo(
    () =>
      buildStatistikCards({
        form,
        previewCounts: auswertungPreviewCounts,
        gesamtzahlen: gesamtzahlenQuery.data,
        isPreviewFetching: auswertungPreviewQuery.isFetching,
        hasPreviewData: Boolean(auswertungPreviewQuery.data)
      }),
    [auswertungPreviewCounts, auswertungPreviewQuery.data, auswertungPreviewQuery.isFetching, form, gesamtzahlenQuery.data]
  );

  const hasTooManyPreviewParameters = auswertungPreviewCounts.parameter > maxAuswertungParameter;
  const isLoadBlocked = auswertungMutation.isPending || !form.person_ids.length || isDateRangeInvalid;
  const selectedTemplate = (templatesQuery.data ?? []).find((template) => template.id === selectedTemplateId) ?? null;
  const templateActionPending =
    createTemplateMutation.isPending ||
    updateTemplateMutation.isPending ||
    applyTemplateMutation.isPending ||
    deleteTemplateMutation.isPending;
  const templateError =
    createTemplateMutation.error ??
    updateTemplateMutation.error ??
    applyTemplateMutation.error ??
    deleteTemplateMutation.error ??
    null;
  const hasUnsavedTemplateChanges = Boolean(selectedTemplateId && templateBaseline !== currentTemplateSignature);
  const selectedTemplateName = selectedTemplate?.name ?? "Keine Vorlage gewählt";
  const isLoadedAuswertungOutdated = Boolean(
    auswertungMutation.data && loadedAuswertungSignature && loadedAuswertungSignature !== currentTemplateSignature
  );

  const handleLoadAuswertung = () => {
    if (isLoadBlocked) {
      return;
    }
    if (
      hasTooManyPreviewParameters &&
      !window.confirm(
        `Die aktuelle Filterauswahl umfasst ${auswertungPreviewCounts.parameter} Parameter und ${auswertungPreviewCounts.messwerte} Messwerte. Auswertung trotzdem laden?`
      )
    ) {
      return;
    }
    auswertungMutation.mutate();
  };
  const handleSelectTemplate = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
      return;
    }

    const template = (templatesQuery.data ?? []).find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const nextForm = applyAuswertungVorlageConfig(template.konfiguration_json);
    setForm(nextForm);
    setSelectedTemplateId(template.id);
    setTemplateBaseline(JSON.stringify(template.konfiguration_json));
    setTemplateWarning(
      buildMissingTemplateWarning(nextForm, {
        personen: personenQuery.data ?? [],
        gruppen: gruppenQuery.data ?? [],
        parameter: parameterQuery.data ?? [],
        labore: laboreQuery.data ?? []
      })
    );
    applyTemplateMutation.mutate(template.id);
  };
  const handleSaveTemplate = () => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name: selectedTemplate.name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleSaveTemplateAs = (name: string) => {
    createTemplateMutation.mutate({
      name,
      bereich: "auswertung",
      vorlage_typ: "auswertung_verlauf",
      beschreibung: null,
      konfiguration_json: currentTemplateConfig
    });
  };
  const handleRenameTemplate = (name: string) => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleDeleteTemplate = () => {
    if (selectedTemplateId) {
      deleteTemplateMutation.mutate(selectedTemplateId);
    }
  };
  const handleResetFilters = () => {
    setForm(initialForm);
    setSelectedTemplateId("");
    setTemplateBaseline("");
    setTemplateWarning(null);
  };
  const closeActivePanel = () => setActivePanel(null);

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Auswertung</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Auswertungsseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier vergleichst Du Verläufe über Personen, Parametergruppen, Parameter, Labore und Zeitraum und blendest
              Referenz- oder Zielbereiche bei Bedarf ein.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Auswertungsauswahl</h3>
              <p>{filterSummary.join(" • ")}</p>
            </div>
          </div>

          <div className="parameter-list">
            <button
              type="button"
              className={`parameter-list__item ${activePanel === "templates" ? "parameter-list__item--selected" : ""}`}
              onClick={() => setActivePanel("templates")}
            >
              <div className="parameter-list__title-row">
                <strong>Vorlagen</strong>
              </div>
              <p>{selectedTemplateName}</p>
              <div className="parameter-list__meta">
                <span className="parameter-pill">{templatesQuery.data?.length ?? 0} Vorlagen</span>
                {hasUnsavedTemplateChanges ? <span className="parameter-pill">Geändert</span> : null}
              </div>
            </button>

            <button
              type="button"
              className={`parameter-list__item ${activePanel === "filters" ? "parameter-list__item--selected" : ""}`}
              onClick={() => setActivePanel("filters")}
            >
              <div className="parameter-list__title-row">
                <strong>Filter</strong>
              </div>
              <p>{filterPeriodLabel}</p>
              <div className="parameter-list__meta">
                <span className="parameter-pill">{statistikCards[0].value} Personen</span>
                <span className="parameter-pill">{statistikCards[2].value} Messwerte</span>
              </div>
            </button>

            <button
              type="button"
              className={`parameter-list__item ${activePanel === "display" ? "parameter-list__item--selected" : ""}`}
              onClick={() => setActivePanel("display")}
            >
              <div className="parameter-list__title-row">
                <strong>Darstellung</strong>
              </div>
              <p>{diagrammDarstellungOptions.find((option) => option.value === form.diagramm_darstellung)?.label}</p>
              <div className="parameter-list__meta">
                <span className="parameter-pill">
                  Y: {vertikalachsenModusOptions.find((option) => option.value === form.vertikalachsen_modus)?.label}
                </span>
                <span className="parameter-pill">{form.include_laborreferenz ? "Laborreferenz" : "Ohne Laborreferenz"}</span>
                <span className="parameter-pill">{form.include_zielbereich ? "Zielbereich" : "Ohne Zielbereich"}</span>
              </div>
            </button>
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            <div className="parameter-detail__header">
              <div>
                <h3 className="parameter-detail__title">Verlaufsauswertung</h3>
                <p>Filter, Darstellung und Vorlagen werden hier wie auf den übrigen Arbeitsseiten gesteuert.</p>
              </div>
              <div className="parameter-header-controls">
                <span className="parameter-pill parameter-pill--accent">
                  {auswertungMutation.data
                    ? isLoadedAuswertungOutdated
                      ? "Aktualisierung offen"
                      : "Auswertung geladen"
                    : "Bereit"}
                </span>
              </div>
            </div>

            <div className="parameter-toolrail">
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "templates" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "templates" ? null : "templates"))}
              >
                Vorlagen
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "filters" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "filters" ? null : "filters"))}
              >
                Filter bearbeiten
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "display" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "display" ? null : "display"))}
              >
                Darstellung
              </button>
              <button type="button" className="parameter-toolrail__button" onClick={handleLoadAuswertung} disabled={isLoadBlocked}>
                {auswertungMutation.isPending
                  ? "Lädt..."
                  : isLoadedAuswertungOutdated
                    ? "Auswertung aktualisieren"
                    : "Auswertung laden"}
              </button>
            </div>

            {activePanel === "templates" ? (
              <AuswertungTemplatesPanel
                templates={templatesQuery.data ?? []}
                selectedTemplateId={selectedTemplateId}
                selectedTemplateName={selectedTemplateName}
                hasUnsavedTemplateChanges={hasUnsavedTemplateChanges}
                isPending={templateActionPending}
                templateWarning={templateWarning}
                templateError={templateError}
                onClose={closeActivePanel}
                onSelect={handleSelectTemplate}
                onSave={handleSaveTemplate}
                onSaveAs={handleSaveTemplateAs}
                onRename={handleRenameTemplate}
                onDelete={handleDeleteTemplate}
              />
            ) : null}

            {activePanel === "filters" ? (
              <AuswertungFiltersPanel
                form={form}
                setForm={setForm}
                personen={personenQuery.data ?? []}
                gruppen={gruppenQuery.data ?? []}
                parameter={parameterQuery.data ?? []}
                labore={laboreQuery.data ?? []}
                isLoadBlocked={isLoadBlocked}
                isLoading={auswertungMutation.isPending}
                onSubmit={handleLoadAuswertung}
                onReset={handleResetFilters}
                onClose={closeActivePanel}
              />
            ) : (
              <div className="selection-summary auswertung-selection-summary" aria-label="Aktive Auswertungsauswahl">
                <span className="selection-summary__label">Aktive Auswahl</span>
                <div className="selection-summary__items">
                  {filterSummary.map((summaryItem) => (
                    <span className="selection-summary__item" key={summaryItem}>
                      {summaryItem}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activePanel === "display" ? (
              <AuswertungDisplayPanel form={form} setForm={setForm} onClose={closeActivePanel} />
            ) : null}

            <div className="detail-grid detail-grid--metrics">
              {statistikCards.map((card) => (
                <div className="detail-grid__item" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.detail}</small>
                </div>
              ))}
            </div>
            <p className="auswertung-stats-context">
              Treffer der aktuellen Filterauswahl für {filterPeriodLabel}; die Gesamtzahlen dienen als Vergleich.
            </p>

            {isDateRangeInvalid && activePanel !== "filters" ? (
              <p className="form-error">Das Bis-Datum darf nicht vor dem Von-Datum liegen.</p>
            ) : null}
            {hasTooManyPreviewParameters ? (
              <p className="form-hint">
                Diese Auswahl umfasst mehr als {maxAuswertungParameter} Parameter. Beim Laden fragt die Anwendung nach.
              </p>
            ) : null}
            {auswertungPreviewQuery.isError ? <p className="form-error">{auswertungPreviewQuery.error.message}</p> : null}
            {auswertungMutation.isError ? <p className="form-error">{auswertungMutation.error.message}</p> : null}
            {isLoadedAuswertungOutdated ? (
              <p className="form-hint auswertung-update-hint">
                Die angezeigte Auswertung passt noch zur zuletzt geladenen Auswahl. Lade sie erneut, um die aktuellen
                Filter und Darstellungsoptionen zu übernehmen.
              </p>
            ) : null}
          </article>

          {auswertungMutation.data && !auswertungMutation.data.serien.length && !qualitativeEvents.length ? (
            <article className="card">
              <h3>Keine Ergebnisse</h3>
              <p>Für die aktuelle Auswahl liegen derzeit keine passenden Verlaufsdaten oder qualitativen Ereignisse vor.</p>
            </article>
          ) : null}

          {auswertungMutation.data ? (
            <div className="workspace-grid">
              {auswertungMutation.data.serien.map((serie) => (
                <AuswertungResultCard
                  key={serie.laborparameter_id}
                  serie={serie}
                  diagrammDarstellung={form.diagramm_darstellung}
                  zeitraumDarstellung={form.zeitraum_darstellung}
                  vertikalachsenModus={form.vertikalachsen_modus}
                  datumVon={form.datum_von}
                  datumBis={form.datum_bis}
                  includeLaborreferenz={form.include_laborreferenz}
                  includeZielbereich={form.include_zielbereich}
                  defaultTableOpen={form.messwerttabelle_standard_offen}
                />
              ))}
            </div>
          ) : null}

          {auswertungMutation.data ? <AuswertungQualitativeEventsTable events={qualitativeEvents} /> : null}
        </div>
      </div>
    </section>
  );
}
