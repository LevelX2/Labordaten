import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import { formatBefundQuelleTyp } from "../constants/fieldOptions";
import type { Befund } from "../types/api";

type BefundDetailCardProps = {
  befundId: string | null;
  title?: string;
  emptyText?: string;
  className?: string;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function toFileUrl(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath.startsWith("/") ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
}

export function BefundDetailCard({
  befundId,
  title = "Befunddetails",
  emptyText = "Bitte zuerst einen Befund auswählen.",
  className = "card"
}: BefundDetailCardProps) {
  const befundQuery = useQuery({
    queryKey: ["befund", befundId],
    queryFn: () => apiFetch<Befund>(`/api/befunde/${befundId}`),
    enabled: Boolean(befundId)
  });

  const befund = befundQuery.data;

  return (
    <article className={className}>
      <h3>{title}</h3>
      {!befundId ? <p>{emptyText}</p> : null}
      {befundQuery.isError ? <p className="form-error">{befundQuery.error.message}</p> : null}

      {befund ? (
        <>
          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>Person</span>
              <strong>{befund.person_anzeigename || befund.person_id}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Labor</span>
              <strong>{befund.labor_name || "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Entnahmedatum</span>
              <strong>{formatDate(befund.entnahmedatum)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Befunddatum</span>
              <strong>{formatDate(befund.befunddatum)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Messwerte</span>
              <strong>{befund.messwerte_anzahl}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Quelle</span>
              <strong>{formatBefundQuelleTyp(befund.quelle_typ)}</strong>
            </div>
            <div className="detail-grid__item detail-grid__item--full">
              <span>Bemerkung</span>
              <strong>{befund.bemerkung || "—"}</strong>
            </div>
          </div>

          <div className="inline-actions">
            <span className="inline-actions__label">
              Dokument: <strong>{befund.dokument_dateiname || "nicht verknüpft"}</strong>
            </span>
            {befund.dokument_pfad ? (
              <a
                className="inline-button"
                href={toFileUrl(befund.dokument_pfad)}
                target="_blank"
                rel="noreferrer"
              >
                Dokument öffnen
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </article>
  );
}
