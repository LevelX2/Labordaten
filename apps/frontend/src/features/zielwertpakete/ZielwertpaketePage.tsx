import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import {
  formatZielbereichTyp,
  formatZielrichtung
} from "../../shared/constants/fieldOptions";
import type {
  ZielwertPaket,
  ZielwertPaketInstallationPayload,
  ZielwertPaketInstallationResult,
  ZielwertPaketKatalogEintrag,
  ZielwertPaketUpdatePayload,
  ZielwertPaketVorschau
} from "../../shared/types/api";

const defaultInstallOptions: ZielwertPaketInstallationPayload = {
  fehlende_parameter_anlegen: true,
  fehlende_einheiten_anlegen: true,
  prueffaelle_anlegen: false
};

function formatPackageSource(packageEntry: ZielwertPaketKatalogEintrag): string {
  const source = packageEntry.quelle;
  const details = [source.titel, source.jahr?.toString(), source.version].filter(Boolean);
  return details.length ? `${source.name} · ${details.join(" · ")}` : source.name;
}

function formatTargetValue(entry: ZielwertPaketVorschau["eintraege"][number]): string {
  if (entry.soll_text) {
    return entry.soll_text;
  }
  if (entry.untere_grenze_num != null && entry.obere_grenze_num != null) {
    return `${entry.untere_grenze_num} bis ${entry.obere_grenze_num}`;
  }
  if (entry.untere_grenze_num != null) {
    return `ab ${entry.untere_grenze_num}`;
  }
  if (entry.obere_grenze_num != null) {
    return `unter ${entry.obere_grenze_num}`;
  }
  return "—";
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    anlegen: "Anlegen",
    reaktivieren: "Reaktivieren",
    bestehend: "Bereits vorhanden",
    parameter_fehlt: "Parameter fehlt",
    einheit_fehlt: "Einheit fehlt",
    pruefung_erforderlich: "Prüfung erforderlich"
  };
  return labels[action] ?? action;
}

function buildDeactivatePayload(packageRecord: ZielwertPaket): ZielwertPaketUpdatePayload {
  return {
    paket_schluessel: packageRecord.paket_schluessel,
    name: packageRecord.name,
    zielbereich_quelle_id: packageRecord.zielbereich_quelle_id,
    version: packageRecord.version,
    jahr: packageRecord.jahr,
    beschreibung: packageRecord.beschreibung,
    bemerkung: packageRecord.bemerkung,
    aktiv: false
  };
}

export function ZielwertpaketePage() {
  const queryClient = useQueryClient();
  const [selectedPackageKey, setSelectedPackageKey] = useState<string | null>(null);
  const [installOptions, setInstallOptions] = useState<ZielwertPaketInstallationPayload>(defaultInstallOptions);

  const catalogQuery = useQuery({
    queryKey: ["zielwert-paket-katalog"],
    queryFn: () => apiFetch<ZielwertPaketKatalogEintrag[]>("/api/zielwert-paket-katalog")
  });

  const installedPackagesQuery = useQuery({
    queryKey: ["zielwert-pakete"],
    queryFn: () => apiFetch<ZielwertPaket[]>("/api/zielwert-pakete")
  });

  const catalogEntries = catalogQuery.data ?? [];

  useEffect(() => {
    if (!catalogEntries.length) {
      setSelectedPackageKey(null);
      return;
    }
    if (!selectedPackageKey || !catalogEntries.some((entry) => entry.paket_schluessel === selectedPackageKey)) {
      setSelectedPackageKey(catalogEntries[0].paket_schluessel);
    }
  }, [catalogEntries, selectedPackageKey]);

  const selectedPackage = useMemo(
    () => catalogEntries.find((entry) => entry.paket_schluessel === selectedPackageKey) ?? null,
    [catalogEntries, selectedPackageKey]
  );

  const installedPackage = useMemo(
    () =>
      installedPackagesQuery.data?.find((packageRecord) => packageRecord.paket_schluessel === selectedPackageKey) ?? null,
    [installedPackagesQuery.data, selectedPackageKey]
  );

  const previewQuery = useQuery({
    queryKey: ["zielwert-paket-vorschau", selectedPackageKey, installOptions],
    queryFn: () =>
      apiFetch<ZielwertPaketVorschau>(`/api/zielwert-paket-katalog/${selectedPackageKey}/vorschau`, {
        method: "POST",
        body: JSON.stringify(installOptions)
      }),
    enabled: Boolean(selectedPackageKey)
  });

  const installMutation = useMutation({
    mutationFn: (packageKey: string) =>
      apiFetch<ZielwertPaketInstallationResult>(`/api/zielwert-paket-katalog/${packageKey}/installieren`, {
        method: "POST",
        body: JSON.stringify(installOptions)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zielwert-paket-katalog"] });
      queryClient.invalidateQueries({ queryKey: ["zielwert-pakete"] });
      queryClient.invalidateQueries({ queryKey: ["zielwert-paket-vorschau"] });
      queryClient.invalidateQueries({ queryKey: ["parameter"] });
      queryClient.invalidateQueries({ queryKey: ["einheiten"] });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (packageRecord: ZielwertPaket) =>
      apiFetch<ZielwertPaket>(`/api/zielwert-pakete/${packageRecord.id}`, {
        method: "PATCH",
        body: JSON.stringify(buildDeactivatePayload(packageRecord))
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zielwert-paket-katalog"] });
      queryClient.invalidateQueries({ queryKey: ["zielwert-pakete"] });
      queryClient.invalidateQueries({ queryKey: ["zielwert-paket-vorschau"] });
      queryClient.invalidateQueries({ queryKey: ["zielbereiche"] });
    }
  });

  const preview = previewQuery.data;
  const hasBlockingPreview =
    (preview?.parameter_fehlen_anzahl ?? 0) > 0 ||
    (preview?.einheiten_fehlen_anzahl ?? 0) > 0 ||
    (preview?.pruefung_erforderlich_anzahl ?? 0) > 0;

  return (
    <section className="page zielwertpakete-page">
      <header className="page__header">
        <span className="page__kicker">Stammdaten & Wissen</span>
        <h2>Zielwertpakete</h2>
        <p>
          Kuratierte Zielbereiche lassen sich als Paket prüfen, einspielen und später geschlossen deaktivieren.
        </p>
      </header>

      <div className="zielwertpakete-workspace">
        <aside className="zielwertpakete-sidebar">
          <section className="card card--soft">
            <div className="parameter-sidebar__header">
              <div>
                <h3>Katalog</h3>
                <p>{catalogEntries.length} verfügbare Pakete</p>
              </div>
            </div>
            <div className="zielwertpakete-list">
              {catalogEntries.map((packageEntry) => (
                <button
                  key={packageEntry.paket_schluessel}
                  type="button"
                  className={
                    packageEntry.paket_schluessel === selectedPackageKey
                      ? "zielwertpakete-list__item zielwertpakete-list__item--selected"
                      : "zielwertpakete-list__item"
                  }
                  onClick={() => setSelectedPackageKey(packageEntry.paket_schluessel)}
                >
                  <strong>{packageEntry.name}</strong>
                  <span>{packageEntry.eintraege_anzahl} Zielbereiche</span>
                  <small>
                    {packageEntry.installiert
                      ? packageEntry.installiert_aktiv
                        ? `${packageEntry.aktive_zielbereiche_anzahl} aktiv`
                        : "deaktiviert"
                      : "nicht eingespielt"}
                  </small>
                </button>
              ))}
              {!catalogEntries.length && !catalogQuery.isLoading ? (
                <div className="parameter-list__empty">
                  <p>Kein Zielwertpaket im Katalog vorhanden.</p>
                </div>
              ) : null}
            </div>
          </section>
        </aside>

        <div className="zielwertpakete-detail">
          {selectedPackage ? (
            <>
              <section className="card">
                <div className="zielwertpakete-detail__header">
                  <div>
                    <span className="section-eyebrow">Paket</span>
                    <h3>{selectedPackage.name}</h3>
                    <p>{selectedPackage.beschreibung}</p>
                  </div>
                  <div className="zielwertpakete-actions">
                    <button
                      type="button"
                      disabled={
                        installMutation.isPending ||
                        previewQuery.isLoading ||
                        hasBlockingPreview ||
                        !selectedPackageKey
                      }
                      onClick={() => selectedPackageKey && installMutation.mutate(selectedPackageKey)}
                    >
                      {installMutation.isPending ? "Spielt ein..." : "Paket einspielen"}
                    </button>
                    <button
                      type="button"
                      className="button--secondary"
                      disabled={!installedPackage || deactivateMutation.isPending}
                      onClick={() => installedPackage && deactivateMutation.mutate(installedPackage)}
                    >
                      {deactivateMutation.isPending ? "Deaktiviert..." : "Paket deaktivieren"}
                    </button>
                  </div>
                </div>

                <dl className="detail-grid detail-grid--metrics">
                  <div className="detail-grid__item">
                    <span>Quelle</span>
                    <strong>{formatPackageSource(selectedPackage)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Version</span>
                    <strong>{[selectedPackage.version, selectedPackage.jahr].filter(Boolean).join(" · ") || "—"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Status</span>
                    <strong>
                      {selectedPackage.installiert
                        ? selectedPackage.installiert_aktiv
                          ? "eingespielt"
                          : "deaktiviert"
                        : "nicht eingespielt"}
                    </strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Aktive Zielbereiche</span>
                    <strong>{selectedPackage.aktive_zielbereiche_anzahl}</strong>
                  </div>
                </dl>

                <div className="zielwertpakete-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={installOptions.fehlende_parameter_anlegen}
                      onChange={(event) =>
                        setInstallOptions((current) => ({
                          ...current,
                          fehlende_parameter_anlegen: event.target.checked
                        }))
                      }
                    />
                    Fehlende Parameter anlegen
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={installOptions.fehlende_einheiten_anlegen}
                      onChange={(event) =>
                        setInstallOptions((current) => ({
                          ...current,
                          fehlende_einheiten_anlegen: event.target.checked
                        }))
                      }
                    />
                    Fehlende Einheiten anlegen
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={installOptions.prueffaelle_anlegen}
                      onChange={(event) =>
                        setInstallOptions((current) => ({
                          ...current,
                          prueffaelle_anlegen: event.target.checked
                        }))
                      }
                    />
                    Prüffälle einspielen
                  </label>
                </div>

                {installMutation.isError ? <p className="form-error">{installMutation.error.message}</p> : null}
                {deactivateMutation.isError ? <p className="form-error">{deactivateMutation.error.message}</p> : null}
                {installMutation.isSuccess ? (
                  <p className="form-success">
                    Paket verarbeitet: {installMutation.data.angelegte_zielbereiche_anzahl} Zielbereiche angelegt,{" "}
                    {installMutation.data.reaktivierte_zielbereiche_anzahl} reaktiviert.
                  </p>
                ) : null}
              </section>

              <section className="card">
                <div className="zielwertpakete-detail__header">
                  <div>
                    <span className="section-eyebrow">Vorschau</span>
                    <h3>Einträge vor dem Einspielen</h3>
                  </div>
                  <button type="button" className="button--secondary" onClick={() => previewQuery.refetch()}>
                    Vorschau aktualisieren
                  </button>
                </div>

                {preview ? (
                  <>
                    <dl className="detail-grid">
                      <div className="detail-grid__item">
                        <span>Anzulegen</span>
                        <strong>{preview.anzulegen_anzahl}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Vorhanden</span>
                        <strong>{preview.bestehend_anzahl}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Fehlende Parameter</span>
                        <strong>{preview.parameter_fehlen_anzahl}</strong>
                      </div>
                      <div className="detail-grid__item">
                        <span>Prüfung</span>
                        <strong>{preview.pruefung_erforderlich_anzahl}</strong>
                      </div>
                    </dl>

                    <div className="table-wrap">
                      <table className="data-table zielwertpakete-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Zielwert</th>
                            <th>Einheit</th>
                            <th>Zieltyp</th>
                            <th>Zielrichtung</th>
                            <th>Aktion</th>
                            <th>Quelle / Bemerkung</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.eintraege.map((entry) => (
                            <tr key={entry.eintrag_schluessel}>
                              <td>
                                <strong>{entry.parameter_name}</strong>
                                <small>{entry.parameter_schluessel}</small>
                              </td>
                              <td>{formatTargetValue(entry)}</td>
                              <td>{entry.einheit || "—"}</td>
                              <td>{formatZielbereichTyp(entry.zielbereich_typ)}</td>
                              <td>{formatZielrichtung(entry.zielrichtung)}</td>
                              <td>{formatAction(entry.aktion)}</td>
                              <td>
                                <span>{entry.quelle_stelle || "—"}</span>
                                {entry.bemerkung ? <small>{entry.bemerkung}</small> : null}
                                {entry.hinweise.length ? <small>{entry.hinweise.join(" ")}</small> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="form-hint">
                    {previewQuery.isLoading ? "Vorschau wird geladen..." : "Für dieses Paket liegt noch keine Vorschau vor."}
                  </p>
                )}
                {previewQuery.isError ? <p className="form-error">{previewQuery.error.message}</p> : null}
              </section>
            </>
          ) : (
            <section className="card">
              <h3>Kein Paket ausgewählt</h3>
              <p>Wähle links ein Zielwertpaket aus dem Katalog.</p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
