import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { EinheitenPflegeCard } from "../../shared/components/EinheitenPflegeCard";
import type { LockStatus, RuntimeSettings, SystemHealth } from "../../shared/types/api";

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function EinstellungenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RuntimeSettings | null>(null);
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

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Betrieb</span>
        <h2>Einstellungen</h2>
        <p>
          Lokale Pfade, Importvorgaben und der Status der Datenbasis-Sperre lassen sich hier prüfen und steuern.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Systemstatus</h3>
          <p>
            Anwendung: <strong>{healthQuery.data?.app ?? "—"}</strong>
          </p>
          <p>
            Umgebung: <strong>{healthQuery.data?.environment ?? "—"}</strong>
          </p>
          <p>
            Sperrstatus: <strong>{healthQuery.data?.lock_status ?? "—"}</strong>
          </p>
          <p>{healthQuery.data?.lock_message ?? "Kein Status verfügbar."}</p>
        </article>

        <article className="card">
          <h3>Datenbasis-Sperre</h3>
          <p>
            Besitzer: <strong>{lockQuery.data?.owner_hostname ?? "—"}</strong>
            {lockQuery.data?.owner_pid ? ` · PID ${lockQuery.data.owner_pid}` : ""}
          </p>
          <p>
            Aktiv seit: <strong>{formatDate(lockQuery.data?.acquired_at)}</strong>
          </p>
          <p>
            Letzter Heartbeat: <strong>{formatDate(lockQuery.data?.heartbeat_at)}</strong>
          </p>
          <p>
            Sperrdatei: <strong>{lockQuery.data?.lock_path ?? "—"}</strong>
          </p>
          <div className="form-actions">
            <button type="button" onClick={() => resetLockMutation.mutate()} disabled={resetLockMutation.isPending}>
              {resetLockMutation.isPending ? "Setzt zurück..." : "Sperre kontrolliert zurücksetzen"}
            </button>
          </div>
          {resetLockMutation.isError ? <p className="form-error">{resetLockMutation.error.message}</p> : null}
        </article>

        <article className="card">
          <h3>Technischer Zugang</h3>
          <p>
            Die eigentliche Pflegeoberfläche ist diese Anwendung. Für technische Prüfungen kannst du hier direkt die
            Backend-API-Doku öffnen, ohne die Adresse separat aufzurufen.
          </p>
          <div className="form-actions">
            <a className="card__link" href={backendDocsUrl} target="_blank" rel="noreferrer">
              Backend-API öffnen
            </a>
            <a className="card__link" href={backendOpenApiUrl} target="_blank" rel="noreferrer">
              OpenAPI-JSON öffnen
            </a>
          </div>
        </article>

        <EinheitenPflegeCard className="card card--wide" />

        <article className="card card--wide">
          <h3>Laufzeit-Einstellungen</h3>
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
                  onChange={(event) => setForm((current) => (current ? { ...current, data_path: event.target.value } : current))}
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
                <span>Wissensordner</span>
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

              <label className="field field--full">
                <span>Quelldateien standardmäßig ablegen</span>
                <input
                  type="checkbox"
                  checked={form.import_store_source_files_default}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, import_store_source_files_default: event.target.checked } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>Labore beim Import standardmäßig automatisch anlegen</span>
                <input
                  type="checkbox"
                  checked={form.import_auto_create_lab_default}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, import_auto_create_lab_default: event.target.checked } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>Berichte standardmäßig mit Laborangabe</span>
                <input
                  type="checkbox"
                  checked={form.report_include_labor_default}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, report_include_labor_default: event.target.checked } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>Berichte standardmäßig mit Referenzangabe</span>
                <input
                  type="checkbox"
                  checked={form.report_include_reference_default}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, report_include_reference_default: event.target.checked } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>Normierte Vergleichsdarstellung bevorzugen</span>
                <input
                  type="checkbox"
                  checked={form.darstellung_normierte_vergleiche}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, darstellung_normierte_vergleiche: event.target.checked } : current
                    )
                  }
                />
              </label>

              <label className="field field--full">
                <span>API-Key-Nutzung grundsätzlich erlauben</span>
                <input
                  type="checkbox"
                  checked={form.allow_api_key_usage}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, allow_api_key_usage: event.target.checked } : current))
                  }
                />
              </label>

              <div className="form-actions">
                <button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Speichert..." : "Einstellungen speichern"}
                </button>
              </div>
              {saveMutation.isError ? <p className="form-error">{saveMutation.error.message}</p> : null}
            </form>
          ) : null}
        </article>
      </div>
    </section>
  );
}
