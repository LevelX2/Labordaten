import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import type { InitialdatenApplyResult, InitialdatenStatus } from "../types/api";

type InitialdatenPanelProps = {
  mode?: "settings" | "startup";
  onApplied?: () => void;
  onSkip?: () => void;
};

const tableLabels: Record<string, string> = {
  wissensseite: "Laborwissen-Verweise",
  einheit: "Einheiten",
  einheit_alias: "Einheiten-Aliase",
  laborparameter: "Parameter",
  laborparameter_alias: "Parameter-Aliase",
  parameter_gruppe: "Parametergruppen",
  gruppen_parameter: "Gruppenzuordnungen",
  parameter_klassifikation: "KSG-Klassifikationen",
  parameter_umrechnungsregel: "Umrechnungsregeln",
  zielbereich: "Zielbereiche",
  parameter_dublettenausschluss: "Dublettenausschlüsse"
};

const displayedTables = Object.keys(tableLabels);

function sumValues(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function formatResult(result: InitialdatenApplyResult): string {
  const created = sumValues(result.angelegt);
  const updated = sumValues(result.aktualisiert);
  const skipped = sumValues(result.uebersprungen);
  return `${created} angelegt, ${updated} aktualisiert, ${skipped} übersprungen.`;
}

export function InitialdatenPanel({ mode = "settings", onApplied, onSkip }: InitialdatenPanelProps) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["system", "initialdaten", "status"],
    queryFn: () => apiFetch<InitialdatenStatus>("/api/system/initialdaten/status")
  });

  const applyMutation = useMutation({
    mutationFn: (aktualisieren: boolean) =>
      apiFetch<InitialdatenApplyResult>("/api/system/initialdaten/anwenden", {
        method: "POST",
        body: JSON.stringify({ aktualisieren })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onApplied?.();
    }
  });

  const status = statusQuery.data;
  const isStartup = mode === "startup";
  const canApply = Boolean(status?.snapshot_verfuegbar);
  const title = isStartup ? "Mitgelieferte Standardparameter laden" : "Mitgelieferte Messstammdaten";

  return (
    <div className={isStartup ? "initialdaten-panel initialdaten-panel--startup" : "initialdaten-panel"}>
      <div className="initialdaten-panel__intro">
        <div>
          <h3>{title}</h3>
          <p>
            Diese Grunddaten machen eine neue Installation direkt nutzbar: gängige Laborparameter,
            Parametergruppen, Aliase, Einheiten, Umrechnungsregeln, Zielbereiche, KSG-Einordnungen und
            Verweise auf Laborwissen-Seiten. Personen, Befunde, Messwerte, Dokumente, Planung und
            Importhistorie werden nicht übernommen.
          </p>
          {isStartup ? (
            <details className="initialdaten-panel__details">
              <summary>Warum wird das empfohlen?</summary>
              <p>
                Ohne diesen Grundbestand müsstest Du Parameter, Einheiten und Umrechnungen einzeln manuell anlegen.
                Das ist für den schnellen Start unpraktisch und würde den Import von Laborberichten deutlich
                erschweren.
              </p>
            </details>
          ) : null}
        </div>
        {status?.snapshot_version ? (
          <span className="parameter-pill parameter-pill--accent">Stand {status.snapshot_version}</span>
        ) : null}
      </div>

      {statusQuery.isError ? <p className="form-error">{statusQuery.error.message}</p> : null}
      {statusQuery.isLoading ? <p>Initialdaten-Status wird geprüft...</p> : null}

      {status ? (
        <>
          <div className="detail-grid initialdaten-panel__status">
            <div className="detail-grid__item">
              <span>Snapshot verfügbar</span>
              <strong>{status.snapshot_verfuegbar ? "Ja" : "Nein"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Standardparameter</span>
              <strong>{(status.tabellen.laborparameter ?? 0) > 0 ? "Vorhanden" : "Fehlen"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Umrechnungen</span>
              <strong>{(status.tabellen.parameter_umrechnungsregel ?? 0) > 0 ? "Vorhanden" : "Fehlen"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Empfehlung</span>
              <strong>{status.initialimport_empfohlen ? "Jetzt laden" : "Optional"}</strong>
            </div>
          </div>

          <div className="initialdaten-table-grid">
            {displayedTables.map((tableName) => (
              <div key={tableName} className="initialdaten-table-grid__item">
                <span>{tableLabels[tableName]}</span>
                <strong>{status.tabellen[tableName] ?? 0}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {applyMutation.data ? <p className="form-success">{formatResult(applyMutation.data)}</p> : null}
      {applyMutation.isError ? <p className="form-error">{applyMutation.error.message}</p> : null}

      <div className="form-actions initialdaten-panel__actions">
        <button type="button" disabled={!canApply || applyMutation.isPending} onClick={() => applyMutation.mutate(false)}>
          {applyMutation.isPending ? "Lädt..." : isStartup ? "Standardparameter jetzt laden" : "Messstammdaten laden"}
        </button>
        {!isStartup && status?.stammdaten_vorhanden ? (
          <button
            type="button"
            className="button--secondary"
            disabled={!canApply || applyMutation.isPending}
            onClick={() => applyMutation.mutate(true)}
          >
            Vorgaben aktualisieren
          </button>
        ) : null}
        {isStartup && onSkip ? (
          <button type="button" className="button--secondary" onClick={onSkip} disabled={applyMutation.isPending}>
            Ohne Grunddaten fortfahren
          </button>
        ) : null}
      </div>
    </div>
  );
}
