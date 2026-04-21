import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import { formatGeschlechtCode, formatWertTyp } from "../constants/fieldOptions";
import { BefundDetailCard } from "./BefundDetailCard";
import type { Messwert, MesswertReferenz } from "../types/api";

type MesswertDetailCardProps = {
  messwertId: string | null;
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

function formatReference(referenz: MesswertReferenz): string {
  if (referenz.wert_typ === "text") {
    return referenz.soll_text || referenz.referenz_text_original || "—";
  }

  const lower = referenz.untere_grenze_num ?? "—";
  const upper = referenz.obere_grenze_num ?? "—";
  return `${lower} bis ${upper}`;
}

function formatValue(messwert: Messwert): string {
  if (messwert.wert_typ === "text") {
    return messwert.wert_text || messwert.wert_roh_text;
  }
  return messwert.wert_num !== null && messwert.wert_num !== undefined
    ? String(messwert.wert_num)
    : messwert.wert_roh_text;
}

export function MesswertDetailCard({
  messwertId,
  title = "Messwertdetails",
  emptyText = "Bitte zuerst einen Messwert auswählen.",
  className = "card card--wide"
}: MesswertDetailCardProps) {
  const [showBefund, setShowBefund] = useState(false);
  const messwertQuery = useQuery({
    queryKey: ["messwert", messwertId],
    queryFn: () => apiFetch<Messwert>(`/api/messwerte/${messwertId}`),
    enabled: Boolean(messwertId)
  });

  const referenzenQuery = useQuery({
    queryKey: ["messwert-referenzen", messwertId],
    queryFn: () => apiFetch<MesswertReferenz[]>(`/api/messwerte/${messwertId}/referenzen`),
    enabled: Boolean(messwertId)
  });

  const messwert = messwertQuery.data;

  return (
    <article className={className}>
      <h3>{title}</h3>
      {!messwertId ? <p>{emptyText}</p> : null}
      {messwertQuery.isError ? <p className="form-error">{messwertQuery.error.message}</p> : null}
      {referenzenQuery.isError ? <p className="form-error">{referenzenQuery.error.message}</p> : null}

      {messwert ? (
        <>
          <div className="detail-grid">
            <div className="detail-grid__item">
              <span>Person</span>
              <strong>{messwert.person_anzeigename || messwert.person_id}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Parameter</span>
              <strong>{messwert.parameter_anzeigename || messwert.original_parametername}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Entnahmedatum</span>
              <strong>{formatDate(messwert.entnahmedatum)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Labor</span>
              <strong>{messwert.labor_name || "—"}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Wert</span>
              <strong>{[formatValue(messwert), messwert.einheit_original].filter(Boolean).join(" ")}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Typ</span>
              <strong>{formatWertTyp(messwert.wert_typ)}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Originalname</span>
              <strong>{messwert.original_parametername}</strong>
            </div>
            <div className="detail-grid__item">
              <span>Gruppen</span>
              <strong>{messwert.gruppen_namen.length ? messwert.gruppen_namen.join(", ") : "—"}</strong>
            </div>
            <div className="detail-grid__item detail-grid__item--full">
              <span>Bemerkung kurz</span>
              <strong>{messwert.bemerkung_kurz || "—"}</strong>
            </div>
            <div className="detail-grid__item detail-grid__item--full">
              <span>Bemerkung lang</span>
              <strong>{messwert.bemerkung_lang || "—"}</strong>
            </div>
            <div className="detail-grid__item detail-grid__item--full">
              <span>Status</span>
              <strong>
                {[
                  messwert.unsicher_flag ? "unsicher" : null,
                  messwert.pruefbedarf_flag ? "prüfbedürftig" : null
                ]
                  .filter(Boolean)
                  .join(", ") || "ohne Markierung"}
              </strong>
            </div>
          </div>

          <div className="inline-actions">
            <span className="inline-actions__label">
              Befund: <strong>{messwert.befund_id.slice(0, 8)}</strong>
            </span>
            <button type="button" className="inline-button" onClick={() => setShowBefund((current) => !current)}>
              {showBefund ? "Befund ausblenden" : "Befund anzeigen"}
            </button>
          </div>

          {showBefund ? (
            <BefundDetailCard
              befundId={messwert.befund_id}
              title="Zugehöriger Befund"
              emptyText="Kein Befund ausgewählt."
              className="card card--soft"
            />
          ) : null}

          <h4>Referenzwerte</h4>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Referenz</th>
                  <th>Einheit</th>
                  <th>Geschlecht</th>
                  <th>Alter</th>
                  <th>Bemerkung</th>
                </tr>
              </thead>
              <tbody>
                {referenzenQuery.data?.map((referenz) => (
                  <tr key={referenz.id}>
                    <td>{formatWertTyp(referenz.wert_typ)}</td>
                    <td>{formatReference(referenz)}</td>
                    <td>{referenz.einheit || "—"}</td>
                    <td>{formatGeschlechtCode(referenz.geschlecht_code, "Alle Geschlechter")}</td>
                    <td>
                      {referenz.alter_min_tage !== null && referenz.alter_min_tage !== undefined
                        ? `${(referenz.alter_min_tage / 365.25).toFixed(1)} bis ${
                            referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined
                              ? (referenz.alter_max_tage / 365.25).toFixed(1)
                              : "—"
                          } Jahre`
                        : referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined
                          ? `bis ${(referenz.alter_max_tage / 365.25).toFixed(1)} Jahre`
                          : "—"}
                    </td>
                    <td>{referenz.bemerkung || referenz.referenz_text_original || "—"}</td>
                  </tr>
                ))}
                {messwertId && !referenzenQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Für diesen Messwert sind noch keine Referenzen hinterlegt.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </article>
  );
}
