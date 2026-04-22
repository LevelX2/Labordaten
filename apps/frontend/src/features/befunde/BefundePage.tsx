import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { formatBefundQuelleTyp } from "../../shared/constants/fieldOptions";
import type { Befund, Labor, Messwert, Person } from "../../shared/types/api";

type BefundFormState = {
  person_id: string;
  labor_id: string;
  entnahmedatum: string;
  befunddatum: string;
  bemerkung: string;
};

type BefundePanelKey = "create";

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

function toFileUrl(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("/") ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
}

function summarizeBefund(befund: Befund): string {
  const details = [
    befund.labor_name?.trim() || "",
    befund.befunddatum ? `Befund ${formatDate(befund.befunddatum)}` : "",
    formatBefundQuelleTyp(befund.quelle_typ)
  ].filter(Boolean);

  return details.join(" • ") || "Noch keine ergänzenden Angaben vorhanden.";
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatMesswertAnzeige(messwert: Messwert): string {
  const value = messwert.wert_roh_text?.trim();
  if (value) {
    return value;
  }

  if (messwert.wert_typ === "numerisch") {
    return messwert.wert_num?.toString() ?? "—";
  }

  return messwert.wert_text || "—";
}

export function BefundePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BefundFormState>(initialForm);
  const [selectedBefundId, setSelectedBefundId] = useState<string | null>(null);
  const [befundSearchQuery, setBefundSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<BefundePanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [showRelatedMesswerte, setShowRelatedMesswerte] = useState(true);

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

  const messwerteQuery = useQuery({
    queryKey: ["messwerte", "befund", selectedBefundId],
    queryFn: () => apiFetch<Messwert[]>(`/api/messwerte?befund_ids=${selectedBefundId}`),
    enabled: Boolean(selectedBefundId)
  });

  const sortedBefunde = useMemo(() => befundeQuery.data ?? [], [befundeQuery.data]);

  useEffect(() => {
    if (!sortedBefunde.length) {
      setSelectedBefundId(null);
      return;
    }

    const selectionStillExists = sortedBefunde.some((befund) => befund.id === selectedBefundId);
    if (!selectedBefundId || !selectionStillExists) {
      setSelectedBefundId(sortedBefunde[0].id);
    }
  }, [selectedBefundId, sortedBefunde]);

  const filteredBefunde = useMemo(() => {
    const normalizedSearchQuery = befundSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return sortedBefunde;
    }

    return sortedBefunde.filter((befund) =>
      [
        befund.person_anzeigename ?? "",
        befund.labor_name ?? "",
        befund.bemerkung ?? "",
        befund.dokument_dateiname ?? "",
        befund.entnahmedatum ?? "",
        befund.befunddatum ?? ""
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery)
    );
  }, [befundSearchQuery, sortedBefunde]);

  const selectedBefund = useMemo(
    () => sortedBefunde.find((befund) => befund.id === selectedBefundId) ?? null,
    [selectedBefundId, sortedBefunde]
  );

  const hasActiveBefundFilter = befundSearchQuery.trim().length > 0;
  const befundCountLabel = hasActiveBefundFilter
    ? `${filteredBefunde.length} von ${sortedBefunde.length} Befunden`
    : `${sortedBefunde.length} Befunde`;

  useEffect(() => {
    setShowRelatedMesswerte(true);
  }, [selectedBefundId]);

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
      setActivePanel(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["befunde"] }),
        queryClient.invalidateQueries({ queryKey: ["messwerte"] })
      ]);
    }
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
    if (activePanel !== "create") {
      return null;
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Neuer Befund</h3>
            <p>Lege einen neuen Befund an und ordne ihn einer Person sowie bei Bedarf einem Labor zu.</p>
          </div>
          {renderPanelCloseButton("Panel Neuer Befund schließen")}
        </div>

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
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Befunde</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Befundeseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du Befunde, legst neue Einträge an und prüfst die zugehörigen Messwerte des gewählten
              Befunds.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Befunde</h3>
              <p>{befundCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={befundSearchQuery}
                onChange={(event) => setBefundSearchQuery(event.target.value)}
                placeholder="Person, Labor, Datum oder Dokument"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setBefundSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!befundSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          <div className="parameter-list">
            {filteredBefunde.map((befund) => (
              <button
                key={befund.id}
                type="button"
                className={`parameter-list__item ${selectedBefundId === befund.id ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedBefundId(befund.id)}
              >
                <div className="parameter-list__title-row">
                  <strong>{befund.person_anzeigename || "Unbekannte Person"}</strong>
                </div>
                <p>{summarizeBefund(befund)}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">Entnahme {formatDate(befund.entnahmedatum)}</span>
                  <span className="parameter-pill">
                    {formatCountLabel(befund.messwerte_anzahl, "Messwert", "Messwerte")}
                  </span>
                  {befund.dokument_dateiname ? <span className="parameter-pill">Dokument</span> : null}
                </div>
              </button>
            ))}
            {!filteredBefunde.length ? (
              <div className="parameter-list__empty">
                <p>Keine Befunde passen zur aktuellen Suche.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            {!selectedBefund ? (
              <p>Noch keine Befunde vorhanden. Lege über die Werkzeugleiste den ersten Befund an.</p>
            ) : (
              <>
                <div className="parameter-toolrail">
                  <button
                    type="button"
                    className={`parameter-toolrail__button ${activePanel === "create" ? "parameter-toolrail__button--active" : ""}`}
                    onClick={() => setActivePanel((current) => (current === "create" ? null : "create"))}
                  >
                    Neuer Befund
                  </button>
                  {selectedBefund.dokument_pfad ? (
                    <a
                      className="parameter-toolrail__button"
                      href={toFileUrl(selectedBefund.dokument_pfad)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Dokument öffnen
                    </a>
                  ) : null}
                </div>

                {renderActionPanel()}

                <div className="parameter-detail__header">
                  <div>
                    <h3 className="parameter-detail__title">
                      {selectedBefund.person_anzeigename || "Unbekannte Person"} • {formatDate(selectedBefund.entnahmedatum)}
                    </h3>
                    <p>{selectedBefund.bemerkung?.trim() || "Zu diesem Befund ist noch keine Bemerkung hinterlegt."}</p>
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
                    <span>Person</span>
                    <strong>{selectedBefund.person_anzeigename || selectedBefund.person_id}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Labor</span>
                    <strong>{selectedBefund.labor_name || "Nicht zugeordnet"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Entnahmedatum</span>
                    <strong>{formatDate(selectedBefund.entnahmedatum)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Befunddatum</span>
                    <strong>{formatDate(selectedBefund.befunddatum)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Quelle</span>
                    <strong>{formatBefundQuelleTyp(selectedBefund.quelle_typ)}</strong>
                  </div>
                </div>

                <div className="detail-grid detail-grid--metrics">
                  <div className="detail-grid__item">
                    <span>Messwerte</span>
                    <strong>{selectedBefund.messwerte_anzahl}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Dokument</span>
                    <strong>{selectedBefund.dokument_dateiname || "Nicht verknüpft"}</strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    <div className="detail-grid__item">
                      <span>Eingangsdatum</span>
                      <strong>{formatDate(selectedBefund.eingangsdatum)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Duplikatwarnung</span>
                      <strong>{selectedBefund.duplikat_warnung ? "Ja" : "Nein"}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>{formatDateTime(selectedBefund.erstellt_am)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>{formatDateTime(selectedBefund.geaendert_am)}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Interne ID</span>
                      <strong className="detail-grid__value--break">{selectedBefund.id}</strong>
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
                        className={`parameter-related__toggle ${showRelatedMesswerte ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedMesswerte((current) => !current)}
                        aria-expanded={showRelatedMesswerte}
                      >
                        <span>
                          <strong>Messwerte</strong>
                          <small>{formatCountLabel(messwerteQuery.data?.length ?? 0, "Eintrag", "Einträge")}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedMesswerte ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Parameter</th>
                                  <th>Wert</th>
                                  <th>Einheit</th>
                                  <th>Gruppen</th>
                                  <th>Hinweis</th>
                                </tr>
                              </thead>
                              <tbody>
                                {messwerteQuery.data?.map((messwert) => (
                                  <tr key={messwert.id}>
                                    <td>{messwert.parameter_anzeigename || messwert.original_parametername}</td>
                                    <td>{formatMesswertAnzeige(messwert)}</td>
                                    <td>{messwert.einheit_original || "—"}</td>
                                    <td>{messwert.gruppen_namen.join(", ") || "—"}</td>
                                    <td>{messwert.bemerkung_kurz || "—"}</td>
                                  </tr>
                                ))}
                                {!messwerteQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={5}>Noch keine Messwerte für diesen Befund vorhanden.</td>
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
