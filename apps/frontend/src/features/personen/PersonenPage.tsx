import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { buildPersonCreatePayload } from "../../shared/api/payloadBuilders";
import {
  PERSON_GESCHLECHT_OPTIONS,
  formatGeschlechtCode
} from "../../shared/constants/fieldOptions";
import type { Parameter, Person, WertTyp, Zielbereich, ZielbereichOverride } from "../../shared/types/api";

type PersonFormState = {
  anzeigename: string;
  vollname: string;
  geburtsdatum: string;
  geschlecht_code: string;
  hinweise_allgemein: string;
};

type OverrideFormState = {
  person_id: string;
  parameter_id: string;
  zielbereich_id: string;
  wert_typ: WertTyp;
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  bemerkung: string;
};

type PersonenPanelKey = "create" | "override";

const initialForm: PersonFormState = {
  anzeigename: "",
  vollname: "",
  geburtsdatum: "",
  geschlecht_code: "",
  hinweise_allgemein: ""
};

const initialOverrideForm: OverrideFormState = {
  person_id: "",
  parameter_id: "",
  zielbereich_id: "",
  wert_typ: "numerisch",
  untere_grenze_num: "",
  obere_grenze_num: "",
  einheit: "",
  soll_text: "",
  bemerkung: ""
};

function summarizeDescription(person: Person): string {
  const details = [
    person.vollname?.trim() || "",
    formatGeschlechtCode(person.geschlecht_code, ""),
    person.geburtsdatum
  ].filter(Boolean);
  if (details.length) {
    return details.join(" • ");
  }
  return "Noch keine ergänzenden Angaben hinterlegt.";
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

function formatDateValue(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatOverrideValue(override: ZielbereichOverride, useBase = false): string {
  if (override.wert_typ === "numerisch") {
    const lower = useBase ? override.basis_untere_grenze_num : override.untere_grenze_num;
    const upper = useBase ? override.basis_obere_grenze_num : override.obere_grenze_num;
    const unit = useBase ? override.basis_einheit : override.einheit;
    return `${lower ?? "—"} bis ${upper ?? "—"} ${unit ?? ""}`.trim();
  }

  return (useBase ? override.basis_soll_text : override.soll_text) || "—";
}

export function PersonenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PersonFormState>(initialForm);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(initialOverrideForm);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<PersonenPanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [showRelatedOverrides, setShowRelatedOverrides] = useState(true);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const overridesQuery = useQuery({
    queryKey: ["zielbereich-overrides", selectedPersonId],
    queryFn: () => apiFetch<ZielbereichOverride[]>(`/api/personen/${selectedPersonId}/zielbereich-overrides`),
    enabled: Boolean(selectedPersonId)
  });
  const zielbereicheQuery = useQuery({
    queryKey: ["zielbereiche", overrideForm.parameter_id],
    queryFn: () => apiFetch<Zielbereich[]>(`/api/parameter/${overrideForm.parameter_id}/zielbereiche`),
    enabled: Boolean(overrideForm.parameter_id)
  });

  const sortedPersons = useMemo(
    () =>
      [...(personenQuery.data ?? [])].sort((left, right) =>
        left.anzeigename.localeCompare(right.anzeigename, "de-DE", { sensitivity: "base" })
      ),
    [personenQuery.data]
  );

  useEffect(() => {
    if (!sortedPersons.length) {
      setSelectedPersonId(null);
      return;
    }

    const selectionStillExists = sortedPersons.some((person) => person.id === selectedPersonId);
    if (!selectedPersonId || !selectionStillExists) {
      setSelectedPersonId(sortedPersons[0].id);
    }
  }, [selectedPersonId, sortedPersons]);

  const filteredPersons = useMemo(() => {
    const normalizedSearchQuery = personSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return sortedPersons;
    }

    return sortedPersons.filter((person) =>
      [person.anzeigename, person.vollname ?? "", person.hinweise_allgemein ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery)
    );
  }, [personSearchQuery, sortedPersons]);

  const selectedPerson = useMemo(
    () => sortedPersons.find((person) => person.id === selectedPersonId) ?? null,
    [selectedPersonId, sortedPersons]
  );

  useEffect(() => {
    if (!selectedPersonId) {
      setOverrideForm(initialOverrideForm);
      return;
    }

    setOverrideForm((current) =>
      current.person_id === selectedPersonId
        ? current
        : {
            ...initialOverrideForm,
            person_id: selectedPersonId
          }
    );
    setShowRelatedOverrides(true);
  }, [selectedPersonId]);

  const selectedBaseTarget = useMemo(
    () => zielbereicheQuery.data?.find((zielbereich) => zielbereich.id === overrideForm.zielbereich_id) ?? null,
    [zielbereicheQuery.data, overrideForm.zielbereich_id]
  );
  const selectedOverrideParameter = useMemo(
    () => parameterQuery.data?.find((parameter) => parameter.id === overrideForm.parameter_id) ?? null,
    [overrideForm.parameter_id, parameterQuery.data]
  );
  const hasActivePersonFilter = personSearchQuery.trim().length > 0;
  const personCountLabel = hasActivePersonFilter
    ? `${filteredPersons.length} von ${sortedPersons.length} Personen`
    : `${sortedPersons.length} Personen`;

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Person>("/api/personen", {
        method: "POST",
        body: JSON.stringify(buildPersonCreatePayload(form))
      }),
    onSuccess: async (person) => {
      setForm(initialForm);
      setSelectedPersonId(person.id);
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["personen"] });
    }
  });

  const createOverrideMutation = useMutation({
    mutationFn: () =>
      apiFetch<ZielbereichOverride>(`/api/personen/${overrideForm.person_id}/zielbereich-overrides`, {
        method: "POST",
        body: JSON.stringify({
          zielbereich_id: overrideForm.zielbereich_id,
          untere_grenze_num:
            overrideForm.wert_typ === "numerisch" && overrideForm.untere_grenze_num
              ? Number(overrideForm.untere_grenze_num)
              : null,
          obere_grenze_num:
            overrideForm.wert_typ === "numerisch" && overrideForm.obere_grenze_num
              ? Number(overrideForm.obere_grenze_num)
              : null,
          einheit:
            overrideForm.wert_typ === "numerisch"
              ? overrideForm.einheit || selectedBaseTarget?.einheit || null
              : null,
          soll_text: overrideForm.wert_typ === "text" ? overrideForm.soll_text || null : null,
          bemerkung: overrideForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setOverrideForm((current) => ({
        ...initialOverrideForm,
        person_id: current.person_id
      }));
      await queryClient.invalidateQueries({ queryKey: ["zielbereich-overrides", selectedPersonId] });
    }
  });

  const handleOpenPanel = (panel: PersonenPanelKey) => {
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
              <h3>Neue Person</h3>
              <p>Personen bilden die persönliche Ebene für Messwerte, Planung, Berichte und individuelle Zielbereiche.</p>
            </div>
            {renderPanelCloseButton("Panel Neue Person schließen")}
          </div>
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
              <select
                value={form.geschlecht_code}
                onChange={(event) => setForm((current) => ({ ...current, geschlecht_code: event.target.value }))}
              >
                {PERSON_GESCHLECHT_OPTIONS.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Hinweise</span>
              <textarea
                rows={4}
                value={form.hinweise_allgemein}
                onChange={(event) => setForm((current) => ({ ...current, hinweise_allgemein: event.target.value }))}
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
      );
    }

    if (!selectedPersonId || !selectedPerson) {
      return (
        <article className="card card--soft">
          <h3>Eigenen Zielbereich pflegen</h3>
          <p>Bitte wähle zuerst links eine Person aus.</p>
        </article>
      );
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Eigenen Zielbereich pflegen</h3>
            <p>Lege bei Bedarf eine individuelle Überschreibung für einen bestehenden allgemeinen Zielbereich an.</p>
          </div>
          {renderPanelCloseButton("Panel Eigenen Zielbereich schließen")}
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            createOverrideMutation.mutate();
          }}
        >
          <label className="field">
            <span>Person</span>
            <input value={selectedPerson.anzeigename} disabled />
          </label>

          <label className="field">
            <span>Parameter</span>
            <select
              required
              value={overrideForm.parameter_id}
              onChange={(event) =>
                setOverrideForm((current) => {
                  const nextParameter = parameterQuery.data?.find((parameter) => parameter.id === event.target.value) ?? null;
                  return {
                    ...current,
                    parameter_id: event.target.value,
                    zielbereich_id: "",
                    wert_typ: "numerisch",
                    untere_grenze_num: "",
                    obere_grenze_num: "",
                    einheit: nextParameter?.standard_einheit ?? "",
                    soll_text: ""
                  };
                })
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
            <span>Basis-Zielbereich</span>
            <select
              required
              value={overrideForm.zielbereich_id}
              onChange={(event) => {
                const selected = zielbereicheQuery.data?.find((item) => item.id === event.target.value);
                setOverrideForm((current) => ({
                  ...current,
                  zielbereich_id: event.target.value,
                  wert_typ: selected?.wert_typ ?? current.wert_typ,
                  einheit: selected?.einheit ?? selectedOverrideParameter?.standard_einheit ?? "",
                  soll_text: selected?.soll_text ?? ""
                }));
              }}
            >
              <option value="">Bitte wählen</option>
              {zielbereicheQuery.data?.map((zielbereich) => (
                <option key={zielbereich.id} value={zielbereich.id}>
                  {zielbereich.wert_typ === "numerisch"
                    ? `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`
                    : zielbereich.soll_text || "Text-Zielbereich"}
                </option>
                ))}
              </select>
              {overrideForm.parameter_id && !zielbereicheQuery.data?.length ? (
                <p className="form-hint">
                  Für den gewählten Parameter gibt es noch keinen allgemeinen Zielbereich. Lege ihn zuerst auf der
                  Parameterseite an.
                </p>
              ) : (
                <p className="form-hint">
                  Hier wählst Du den allgemeinen Zielbereich aus, den Du für diese Person individuell anpassen willst.
                </p>
              )}
          </label>

          {overrideForm.wert_typ === "numerisch" ? (
            <>
              <label className="field">
                <span>Eigene untere Grenze</span>
                <input
                  type="number"
                  step="any"
                  value={overrideForm.untere_grenze_num}
                  onChange={(event) =>
                    setOverrideForm((current) => ({ ...current, untere_grenze_num: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Eigene obere Grenze</span>
                <input
                  type="number"
                  step="any"
                  value={overrideForm.obere_grenze_num}
                  onChange={(event) =>
                    setOverrideForm((current) => ({ ...current, obere_grenze_num: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Einheit</span>
                <input value={selectedBaseTarget?.einheit || selectedOverrideParameter?.standard_einheit || "Keine Einheit"} disabled />
              </label>
            </>
          ) : (
            <label className="field field--full">
              <span>Eigener Solltext</span>
              <input
                value={overrideForm.soll_text}
                onChange={(event) => setOverrideForm((current) => ({ ...current, soll_text: event.target.value }))}
              />
            </label>
          )}

          <label className="field field--full">
            <span>Bemerkung</span>
            <textarea
              rows={3}
              value={overrideForm.bemerkung}
              onChange={(event) => setOverrideForm((current) => ({ ...current, bemerkung: event.target.value }))}
            />
          </label>

          <div className="form-actions">
            <button
              type="submit"
              disabled={createOverrideMutation.isPending || !overrideForm.person_id || !overrideForm.zielbereich_id}
            >
              {createOverrideMutation.isPending ? "Speichert..." : "Eigenen Zielbereich anlegen"}
            </button>
            {createOverrideMutation.isError ? <p className="form-error">{createOverrideMutation.error.message}</p> : null}
          </div>
        </form>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Personen</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Personenseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du Personen, pflegst Stammdaten und hinterlegst bei Bedarf individuelle Zielbereiche.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Personen</h3>
              <p>{personCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={personSearchQuery}
                onChange={(event) => setPersonSearchQuery(event.target.value)}
                placeholder="Name, Vollname oder Hinweis"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setPersonSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!personSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          <div className="parameter-list">
            {filteredPersons.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`parameter-list__item ${selectedPersonId === person.id ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedPersonId(person.id)}
              >
                <div className="parameter-list__title-row">
                  <strong>{person.anzeigename}</strong>
                </div>
                <p>{summarizeDescription(person)}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">{formatDateValue(person.geburtsdatum)}</span>
                  <span className="parameter-pill">{formatGeschlechtCode(person.geschlecht_code, "Nicht angegeben")}</span>
                </div>
              </button>
            ))}
            {!filteredPersons.length ? (
              <div className="parameter-list__empty">
                <p>Keine Personen passen zur aktuellen Suche.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            {!selectedPerson ? (
              <p>Noch keine Personen vorhanden. Lege über die Werkzeugleiste die erste Person an.</p>
            ) : (
              <>
                <div className="parameter-toolrail">
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "create" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => handleOpenPanel("create")}
                  >
                    Neue Person
                  </button>
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "override" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => handleOpenPanel("override")}
                  >
                    Zielbereich pflegen
                  </button>
                </div>

                {renderActionPanel()}

                <div className="parameter-detail__header">
                  <div>
                    <h3 className="parameter-detail__title">{selectedPerson.anzeigename}</h3>
                    <p>{selectedPerson.hinweise_allgemein?.trim() || "Zu dieser Person sind noch keine Hinweise hinterlegt."}</p>
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
                    <span>Vollname</span>
                    <strong>{selectedPerson.vollname || "Nicht hinterlegt"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Geburtsdatum</span>
                    <strong>{formatDateValue(selectedPerson.geburtsdatum)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Geschlecht</span>
                    <strong>{formatGeschlechtCode(selectedPerson.geschlecht_code, "Nicht angegeben")}</strong>
                  </div>
                </div>

                <div className="detail-grid detail-grid--metrics">
                  <div className="detail-grid__item">
                    <span>Messwerte</span>
                    <strong>{selectedPerson.messwerte_anzahl}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Eigene Zielbereiche</span>
                    <strong>{overridesQuery.data?.length ?? 0}</strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    <div className="detail-grid__item">
                      <span>Status</span>
                      <strong>{selectedPerson.aktiv ? "Aktiv" : "Inaktiv"}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>{formatDateTime(selectedPerson.erstellt_am)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>{formatDateTime(selectedPerson.geaendert_am)}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Interne ID</span>
                      <strong className="detail-grid__value--break">{selectedPerson.id}</strong>
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
                        className={`parameter-related__toggle ${showRelatedOverrides ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedOverrides((current) => !current)}
                        aria-expanded={showRelatedOverrides}
                      >
                        <span>
                          <strong>Eigene Zielbereiche</strong>
                          <small>{overridesQuery.data?.length ?? 0} Einträge</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedOverrides ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Parameter</th>
                                  <th>Allgemein</th>
                                  <th>Personenspezifisch</th>
                                  <th>Bemerkung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {overridesQuery.data?.map((override) => (
                                  <tr key={override.id}>
                                    <td>{override.parameter_anzeigename}</td>
                                    <td>{formatOverrideValue(override, true)}</td>
                                    <td>{formatOverrideValue(override)}</td>
                                    <td>{override.bemerkung || "—"}</td>
                                  </tr>
                                ))}
                                {!overridesQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={4}>Noch keine eigenen Zielbereiche für diese Person vorhanden.</td>
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
