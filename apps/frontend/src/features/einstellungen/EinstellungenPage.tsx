import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { EinheitenPflegeCard } from "../../shared/components/EinheitenPflegeCard";
import { LaborePflegeCard } from "../../shared/components/LaborePflegeCard";
import {
  colorDesigns,
  getStoredColorDesignKey,
  storeAndApplyColorDesign,
  type ColorDesignKey
} from "../../shared/theme/colorDesigns";
import type { LockStatus, RuntimeSettings, SystemHealth } from "../../shared/types/api";

type EinstellungenAnsichtKey =
  | "uebersicht"
  | "sperre"
  | "pfade"
  | "standards"
  | "design"
  | "labore"
  | "einheiten"
  | "technik";

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatBoolean(value: boolean): string {
  return value ? "Ja" : "Nein";
}

function getSectionMeta(section: EinstellungenAnsichtKey): { title: string; description: string; badge: string } {
  if (section === "uebersicht") {
    return {
      title: "Übersicht",
      description: "Hier siehst Du den aktuellen Betriebszustand der lokalen Instanz in verdichteter Form.",
      badge: "Status und Zusammenfassung"
    };
  }
  if (section === "sperre") {
    return {
      title: "Datenbasis-Sperre",
      description: "Hier prüfst Du Besitz, Heartbeat und Sperrpfad und kannst die Sperre kontrolliert zurücksetzen.",
      badge: "Sperre und Wiederherstellung"
    };
  }
  if (section === "pfade") {
    return {
      title: "Pfade und Speicherorte",
      description: "Hier pflegst Du die lokalen Zielorte für Daten, Dokumente, Laborwissen und Berichtsvorlagen.",
      badge: "Laufzeit-Pfade"
    };
  }
  if (section === "standards") {
    return {
      title: "Standardvorgaben",
      description: "Hier legst Du die typischen Voreinstellungen für Import, Berichte und technische Freigaben fest.",
      badge: "Vorgaben für neue Abläufe"
    };
  }
  if (section === "einheiten") {
    return {
      title: "Einheiten",
      description: "Hier legst Du die führende Schreibweise einer Einheit fest und ordnest abweichende Labor-Schreibweisen als Aliase zu.",
      badge: "Zentrale Fachstammdaten"
    };
  }
  if (section === "labore") {
    return {
      title: "Labore",
      description: "Hier pflegst Du Laborstammdaten, die in Befunden, Filtern, Auswertungen und Berichten verwendet werden.",
      badge: "Zentrale Fachstammdaten"
    };
  }
  if (section === "design") {
    return {
      title: "Farbdesign",
      description: "Hier wählst Du ein harmonisches Farbdesign für die lokale Oberfläche.",
      badge: "Darstellung"
    };
  }
  return {
    title: "Technischer Zugang",
    description: "Hier erreichst Du die technischen Backend-Schnittstellen für Prüfungen und Diagnosezwecke.",
    badge: "API und Schema"
  };
}

export function EinstellungenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RuntimeSettings | null>(null);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [selectedAnsicht, setSelectedAnsicht] = useState<EinstellungenAnsichtKey>("uebersicht");
  const [selectedColorDesign, setSelectedColorDesign] = useState<ColorDesignKey>(() => getStoredColorDesignKey());
  const backendDocsUrl = "/api/docs";
  const backendOpenApiUrl = "/api/openapi.json";

  const healthQuery = useQuery({
    queryKey: ["system", "health"],
    queryFn: () => apiFetch<SystemHealth>("/api/system/health")
  });
  const settingsQuery = useQuery({
    queryKey: ["system", "settings"],
    queryFn: () => apiFetch<RuntimeSettings>("/api/system/settings")
  });
  const lockQuery = useQuery({
    queryKey: ["system", "lock"],
    queryFn: () => apiFetch<LockStatus>("/api/system/lock")
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<RuntimeSettings>("/api/system/settings", {
        method: "PUT",
        body: JSON.stringify(form)
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system", "settings"] }),
        queryClient.invalidateQueries({ queryKey: ["system", "health"] }),
        queryClient.invalidateQueries({ queryKey: ["system", "lock"] })
      ]);
    }
  });

  const resetLockMutation = useMutation({
    mutationFn: () =>
      apiFetch<LockStatus>("/api/system/lock/reset", {
        method: "POST"
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system", "health"] }),
        queryClient.invalidateQueries({ queryKey: ["system", "lock"] })
      ]);
    }
  });

  const sectionMeta = getSectionMeta(selectedAnsicht);

  const handleColorDesignChange = (key: ColorDesignKey) => {
    setSelectedColorDesign(key);
    storeAndApplyColorDesign(key);
  };

  const renderSection = () => {
    if (selectedAnsicht === "uebersicht") {
      return (
        <>
          {healthQuery.isError ? <p className="form-error">{healthQuery.error.message}</p> : null}
          {settingsQuery.isError ? <p className="form-error">{settingsQuery.error.message}</p> : null}
          {lockQuery.isError ? <p className="form-error">{lockQuery.error.message}</p> : null}

          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>Anwendung</span>
              <strong>{healthQuery.data?.app ?? "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Umgebung</span>
              <strong>{healthQuery.data?.environment ?? "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Sperrstatus</span>
              <strong>{healthQuery.data?.lock_status ?? "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Sperrzustand</span>
              <strong>{lockQuery.data?.stale ? "Veraltet" : "Aktiv"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Berichte mit Laborangabe</span>
              <strong>{form ? formatBoolean(form.report_include_labor_default) : "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Normierte Darstellung</span>
              <strong>{form ? formatBoolean(form.darstellung_normierte_vergleiche) : "—"}</strong>
            </div>
          </div>

          <article className="card card--soft parameter-action-panel">
            <div className="parameter-panel__header">
              <div>
                <h3>Betriebslage</h3>
                <p>{healthQuery.data?.lock_message ?? "Kein Status verfügbar."}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-grid__item">
                <span>Besitzer</span>
                <strong>{lockQuery.data?.owner_hostname ?? "—"}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Letzter Heartbeat</span>
                <strong>{formatDate(lockQuery.data?.heartbeat_at)}</strong>
              </div>
              <div className="detail-grid__item detail-grid__item--full">
                <span>Sperrdatei</span>
                <strong className="detail-grid__value--break">{lockQuery.data?.lock_path ?? "—"}</strong>
              </div>
            </div>
          </article>
        </>
      );
    }

    if (selectedAnsicht === "sperre") {
      return (
        <>
          {lockQuery.isError ? <p className="form-error">{lockQuery.error.message}</p> : null}
          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>Besitzer</span>
              <strong>{lockQuery.data?.owner_hostname ?? "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>PID</span>
              <strong>{lockQuery.data?.owner_pid ?? "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Aktiv seit</span>
              <strong>{formatDate(lockQuery.data?.acquired_at)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Letzter Heartbeat</span>
              <strong>{formatDate(lockQuery.data?.heartbeat_at)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Zustand</span>
              <strong>{lockQuery.data?.stale ? "Veraltet" : "Aktiv"}</strong>
            </div>
            <div className="detail-grid__item detail-grid__item--full">
              <span>Sperrdatei</span>
              <strong className="detail-grid__value--break">{lockQuery.data?.lock_path ?? "—"}</strong>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => resetLockMutation.mutate()} disabled={resetLockMutation.isPending}>
              {resetLockMutation.isPending ? "Setzt zurück..." : "Sperre kontrolliert zurücksetzen"}
            </button>
          </div>
          {resetLockMutation.isError ? <p className="form-error">{resetLockMutation.error.message}</p> : null}
        </>
      );
    }

    if (selectedAnsicht === "pfade") {
      return (
        <>
          {settingsQuery.isError ? <p className="form-error">{settingsQuery.error.message}</p> : null}
          {!form ? <p>Einstellungen werden geladen…</p> : null}
          {form ? (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              <label className="field field--full">
                <span>Datenpfad</span>
                <input
                  value={form.data_path}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, data_path: event.target.value } : current))
                  }
                />
              </label>

              <label className="field field--full">
                <span>Dokumentenpfad</span>
                <input
                  value={form.documents_path}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, documents_path: event.target.value } : current))
                  }
                />
              </label>

              <label className="field field--full">
                <span>Laborwissen-Ordner</span>
                <input
                  value={form.knowledge_path}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, knowledge_path: event.target.value } : current))
                  }
                />
              </label>

              <label className="field field--full">
                <span>Bericht-Standardvorlage</span>
                <input
                  value={form.bericht_standardvorlage ?? ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bericht_standardvorlage: event.target.value || null } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>Bemerkung</span>
                <input
                  value={form.bemerkung ?? ""}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, bemerkung: event.target.value || null } : current))
                  }
                />
              </label>

              <div className="form-actions">
                <button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Speichert..." : "Pfade speichern"}
                </button>
              </div>
              {saveMutation.isError ? <p className="form-error">{saveMutation.error.message}</p> : null}
            </form>
          ) : null}
        </>
      );
    }

    if (selectedAnsicht === "standards") {
      return (
        <>
          {settingsQuery.isError ? <p className="form-error">{settingsQuery.error.message}</p> : null}
          {!form ? <p>Einstellungen werden geladen…</p> : null}
          {form ? (
            <>
              <div className="detail-grid">
                <div className="detail-grid__item">
                  <span>Quelldateien ablegen</span>
                  <strong>{formatBoolean(form.import_store_source_files_default)}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>Labore automatisch anlegen</span>
                  <strong>{formatBoolean(form.import_auto_create_lab_default)}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>Berichte mit Laborangabe</span>
                  <strong>{formatBoolean(form.report_include_labor_default)}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>Berichte mit Referenzangabe</span>
                  <strong>{formatBoolean(form.report_include_reference_default)}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>Normierte Vergleichsdarstellung</span>
                  <strong>{formatBoolean(form.darstellung_normierte_vergleiche)}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>API-Key-Nutzung erlaubt</span>
                  <strong>{formatBoolean(form.allow_api_key_usage)}</strong>
                </div>
              </div>

              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveMutation.mutate();
                }}
              >
                <div className="field field--full">
                  <span>Standardvorgaben</span>
                  <div className="checkbox-grid">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.import_store_source_files_default}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, import_store_source_files_default: event.target.checked } : current
                          )
                        }
                      />
                      <span>Quelldateien standardmäßig ablegen</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.import_auto_create_lab_default}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, import_auto_create_lab_default: event.target.checked } : current
                          )
                        }
                      />
                      <span>Labore beim Import standardmäßig automatisch anlegen</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.report_include_labor_default}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, report_include_labor_default: event.target.checked } : current
                          )
                        }
                      />
                      <span>Berichte standardmäßig mit Laborangabe</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.report_include_reference_default}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, report_include_reference_default: event.target.checked } : current
                          )
                        }
                      />
                      <span>Berichte standardmäßig mit Referenzangabe</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.darstellung_normierte_vergleiche}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, darstellung_normierte_vergleiche: event.target.checked } : current
                          )
                        }
                      />
                      <span>Normierte Vergleichsdarstellung bevorzugen</span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={form.allow_api_key_usage}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, allow_api_key_usage: event.target.checked } : current
                          )
                        }
                      />
                      <span>API-Key-Nutzung grundsätzlich erlauben</span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Speichert..." : "Vorgaben speichern"}
                  </button>
                </div>
                {saveMutation.isError ? <p className="form-error">{saveMutation.error.message}</p> : null}
              </form>
            </>
          ) : null}
        </>
      );
    }

    if (selectedAnsicht === "einheiten") {
      return <EinheitenPflegeCard className="card card--soft" />;
    }

    if (selectedAnsicht === "labore") {
      return <LaborePflegeCard className="card card--soft" />;
    }

    if (selectedAnsicht === "design") {
      return (
        <div className="color-design-grid" role="radiogroup" aria-label="Farbdesign auswählen">
          {colorDesigns.map((design) => {
            const isSelected = selectedColorDesign === design.key;
            return (
              <button
                key={design.key}
                type="button"
                className={`color-design-card ${isSelected ? "color-design-card--selected" : ""}`}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleColorDesignChange(design.key)}
                style={
                  {
                    "--design-swatch-a": design.swatches[0],
                    "--design-swatch-b": design.swatches[1],
                    "--design-swatch-c": design.swatches[2]
                  } as CSSProperties
                }
              >
                <span className="color-design-card__swatches" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="color-design-card__copy">
                  <strong>{design.name}</strong>
                  <span>{design.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Backend-Zugänge</h3>
            <p>Die eigentliche Pflegeoberfläche ist diese Anwendung. Für technische Prüfungen stehen hier die Rohzugänge bereit.</p>
          </div>
        </div>

        <div className="parameter-panel__actions">
          <a className="inline-button" href={backendDocsUrl} target="_blank" rel="noreferrer">
            Backend-API öffnen
          </a>
          <a className="inline-button" href={backendOpenApiUrl} target="_blank" rel="noreferrer">
            OpenAPI-JSON öffnen
          </a>
        </div>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Einstellungen</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Einstellungsseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier prüfst Du Betriebszustand, Datenbasis-Sperre, zentrale Laufzeitvorgaben und technische Zugänge der
              lokalen Anwendung.
            </div>
          ) : null}
        </div>
      </header>

      <article className="card">
        <div className="parameter-detail__header">
          <div>
            <h3 className="parameter-detail__title">{sectionMeta.title}</h3>
            <p>{sectionMeta.description}</p>
          </div>
          <div className="parameter-header-controls">
            <span className="parameter-pill parameter-pill--accent">{sectionMeta.badge}</span>
          </div>
        </div>

        <div className="parameter-toolrail">
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "uebersicht" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("uebersicht")}
          >
            Übersicht
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "sperre" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("sperre")}
          >
            Sperre
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "pfade" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("pfade")}
          >
            Pfade
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "standards" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("standards")}
          >
            Standards
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "design" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("design")}
          >
            Farbdesign
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "einheiten" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("einheiten")}
          >
            Einheiten
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "labore" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("labore")}
          >
            Labore
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${selectedAnsicht === "technik" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setSelectedAnsicht("technik")}
          >
            Technik
          </button>
        </div>

        {renderSection()}
      </article>
    </section>
  );
}
