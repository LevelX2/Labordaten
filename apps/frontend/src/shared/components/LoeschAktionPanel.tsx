import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api/client";
import type { Loeschaktion, LoeschAusfuehrung, LoeschPruefung } from "../types/api";

type LoeschAktionPanelProps = {
  entitaetTyp: string;
  entitaetId: string | null;
  title?: string;
  emptyText?: string;
  className?: string;
  onClose?: () => void;
  invalidateQueryKeys?: QueryKey[];
};

function formatAktionLabel(value: Loeschaktion): string {
  return value === "deaktivieren" ? "Deaktivieren" : "Löschen";
}

function formatEmpfehlungLabel(value: LoeschPruefung["empfehlung"]): string {
  if (value === "deaktivieren") {
    return "Deaktivieren empfohlen";
  }
  if (value === "loeschen") {
    return "Löschen empfohlen";
  }
  return "Nicht löschen";
}

function formatModusLabel(value: LoeschPruefung["modus"]): string {
  if (value === "direkt") {
    return "Direkt möglich";
  }
  if (value === "kaskade") {
    return "Mit Folgeeffekten";
  }
  return "Blockiert";
}

function formatObjektTyp(value: string): string {
  return value.replace(/_/g, " ");
}

function summarizeObjects(items: LoeschAusfuehrung["geloeschte_objekte"]): string {
  if (!items.length) {
    return "Keine Folgeobjekte betroffen.";
  }

  return items.map((item) => `${item.anzahl} ${formatObjektTyp(item.objekt_typ)}`).join(" · ");
}

export function LoeschAktionPanel({
  entitaetTyp,
  entitaetId,
  title = "Löschprüfung",
  emptyText = "Bitte zuerst ein Objekt auswählen.",
  className = "card card--soft parameter-action-panel",
  onClose,
  invalidateQueryKeys = []
}: LoeschAktionPanelProps) {
  const queryClient = useQueryClient();
  const [aktion, setAktion] = useState<Loeschaktion>("loeschen");
  const [leerenBefundMitloeschen, setLeerenBefundMitloeschen] = useState(true);
  const [dokumentEntfernen, setDokumentEntfernen] = useState(false);
  const [ausfuehrung, setAusfuehrung] = useState<LoeschAusfuehrung | null>(null);

  const pruefungQuery = useQuery({
    queryKey: ["loeschpruefung", entitaetTyp, entitaetId],
    queryFn: () => apiFetch<LoeschPruefung>(`/api/loeschpruefung/${entitaetTyp}/${entitaetId}`),
    enabled: Boolean(entitaetId)
  });

  const pruefung = pruefungQuery.data;

  useEffect(() => {
    setAusfuehrung(null);
  }, [entitaetTyp, entitaetId]);

  useEffect(() => {
    if (!pruefung) {
      return;
    }

    setAktion(pruefung.standard_aktion ?? (pruefung.optionen.deaktivieren_verfuegbar ? "deaktivieren" : "loeschen"));
    setLeerenBefundMitloeschen(pruefung.optionen.leeren_befund_mitloeschen_standard);
    setDokumentEntfernen(pruefung.optionen.dokument_entfernen_standard);
  }, [pruefung]);

  const ausfuehrenMutation = useMutation({
    mutationFn: () =>
      apiFetch<LoeschAusfuehrung>(`/api/loeschpruefung/${entitaetTyp}/${entitaetId}/ausfuehren`, {
        method: "POST",
        body: JSON.stringify({
          aktion,
          leeren_befund_mitloeschen: leerenBefundMitloeschen,
          dokument_entfernen: dokumentEntfernen
        })
      }),
    onSuccess: async (result) => {
      setAusfuehrung(result);
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["loeschpruefung", entitaetTyp, entitaetId] }),
        ...invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      ];
      await Promise.all(invalidations);
    }
  });

  const pillClassName = useMemo(() => {
    if (!pruefung) {
      return "parameter-pill";
    }
    if (pruefung.modus === "blockiert") {
      return "parameter-pill parameter-pill--danger";
    }
    if (pruefung.modus === "kaskade") {
      return "parameter-pill parameter-pill--warning";
    }
    return "parameter-pill parameter-pill--accent";
  }, [pruefung]);

  return (
    <article className={className}>
      <div className="parameter-panel__header">
        <div>
          <h3>{title}</h3>
          <p>
            Die Oberfläche zeigt zuerst die serverseitige Prüfung und führt die empfohlene Aktion erst im zweiten
            Schritt aus.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Löschprüfung schließen"
            title="Löschprüfung schließen"
          >
            ×
          </button>
        ) : null}
      </div>

      {!entitaetId ? <p>{emptyText}</p> : null}
      {pruefungQuery.isLoading && entitaetId ? <p>Prüfung wird geladen…</p> : null}
      {pruefungQuery.isError ? <p className="form-error">{pruefungQuery.error.message}</p> : null}

      {pruefung ? (
        <>
          <div className="loesch-panel__summary">
            <div className="detail-grid">
              <div className="detail-grid__item">
                <span>Objekt</span>
                <strong>{pruefung.anzeige_name}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Modus</span>
                <strong>{formatModusLabel(pruefung.modus)}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Empfehlung</span>
                <strong>{formatEmpfehlungLabel(pruefung.empfehlung)}</strong>
              </div>
            </div>

            <div className="parameter-panel__actions">
              <span className={pillClassName}>{formatModusLabel(pruefung.modus)}</span>
              <span className="parameter-pill">{formatEmpfehlungLabel(pruefung.empfehlung)}</span>
            </div>
          </div>

          {pruefung.abhaengigkeiten.length ? (
            <section className="loesch-panel__section">
              <h4>Abhängigkeiten und Folgeeffekte</h4>
              <ul className="loesch-panel__list">
                {pruefung.abhaengigkeiten.map((item) => (
                  <li key={`${item.objekt_typ}-${item.kategorie}`}>
                    <strong>
                      {item.anzahl} {formatObjektTyp(item.objekt_typ)}
                    </strong>
                    {item.beschreibung ? ` · ${item.beschreibung}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {pruefung.blockierungsgruende.length ? (
            <section className="loesch-panel__section loesch-panel__section--danger">
              <h4>Blockierungsgründe</h4>
              <ul className="loesch-panel__list">
                {pruefung.blockierungsgruende.map((grund) => (
                  <li key={grund}>{grund}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {pruefung.hinweise.length ? (
            <section className="loesch-panel__section">
              <h4>Hinweise</h4>
              <ul className="loesch-panel__list">
                {pruefung.hinweise.map((hinweis) => (
                  <li key={hinweis}>{hinweis}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              ausfuehrenMutation.mutate();
            }}
          >
            <label className="field">
              <span>Aktion</span>
              <select
                value={aktion}
                onChange={(event) => setAktion(event.target.value as Loeschaktion)}
                disabled={ausfuehrenMutation.isPending}
              >
                <option value="loeschen">Löschen</option>
                {pruefung.optionen.deaktivieren_verfuegbar ? (
                  <option value="deaktivieren">Deaktivieren</option>
                ) : null}
              </select>
            </label>

            {pruefung.optionen.leeren_befund_mitloeschen_standard ? (
              <label className="field field--full">
                <span>Leeren Befund mitlöschen</span>
                <input
                  type="checkbox"
                  checked={leerenBefundMitloeschen}
                  onChange={(event) => setLeerenBefundMitloeschen(event.target.checked)}
                  disabled={ausfuehrenMutation.isPending}
                />
              </label>
            ) : null}

            {pruefung.optionen.dokument_entfernen_verfuegbar ? (
              <label className="field field--full">
                <span>Verknüpftes Dokument mitlöschen</span>
                <input
                  type="checkbox"
                  checked={dokumentEntfernen}
                  onChange={(event) => setDokumentEntfernen(event.target.checked)}
                  disabled={ausfuehrenMutation.isPending || aktion !== "loeschen"}
                />
              </label>
            ) : null}

            <div className="form-actions">
              <button
                type="submit"
                className={aktion === "loeschen" ? "button--danger" : "button--secondary"}
                disabled={ausfuehrenMutation.isPending || (pruefung.modus === "blockiert" && aktion === "loeschen")}
              >
                {ausfuehrenMutation.isPending ? "Führt aus..." : `${formatAktionLabel(aktion)} ausführen`}
              </button>
              {ausfuehrenMutation.isError ? <p className="form-error">{ausfuehrenMutation.error.message}</p> : null}
            </div>
          </form>

          {ausfuehrung ? (
            <section className="loesch-panel__section loesch-panel__section--success">
              <h4>Ergebnis</h4>
              <p>
                {formatAktionLabel(ausfuehrung.aktion)} abgeschlossen. Betroffene Objekte:{" "}
                <strong>{summarizeObjects(ausfuehrung.geloeschte_objekte)}</strong>
              </p>
              {ausfuehrung.aktualisierte_objekte.length ? (
                <ul className="loesch-panel__list">
                  {ausfuehrung.aktualisierte_objekte.map((item) => (
                    <li key={`${item.objekt_typ}-${item.kategorie}-aktualisiert`}>
                      {item.anzahl} {formatObjektTyp(item.objekt_typ)} aktualisiert
                      {item.beschreibung ? ` · ${item.beschreibung}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {ausfuehrung.hinweise.length ? (
                <ul className="loesch-panel__list">
                  {ausfuehrung.hinweise.map((hinweis) => (
                    <li key={hinweis}>{hinweis}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
