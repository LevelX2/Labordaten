import { useEffect, useState } from "react";

import { formatParameterKlassifikation } from "../../shared/constants/fieldOptions";
import { formatDisplayDate as formatDate } from "../../shared/utils/dateFormatting";
import type { AuswertungsSerie } from "../../shared/types/api";
import { AuswertungChart } from "./AuswertungChart";
import { formatNumber, formatTargetRange, formatTrend } from "./auswertungFormatting";
import type { DiagrammDarstellung, VertikalachsenModus, ZeitraumDarstellung } from "./auswertungTypes";

export function AuswertungResultCard({
  serie,
  diagrammDarstellung,
  zeitraumDarstellung,
  vertikalachsenModus,
  datumVon,
  datumBis,
  includeLaborreferenz,
  includeZielbereich,
  defaultTableOpen
}: {
  serie: AuswertungsSerie;
  diagrammDarstellung: DiagrammDarstellung;
  zeitraumDarstellung: ZeitraumDarstellung;
  vertikalachsenModus: VertikalachsenModus;
  datumVon: string;
  datumBis: string;
  includeLaborreferenz: boolean;
  includeZielbereich: boolean;
  defaultTableOpen: boolean;
}) {
  const [isTableOpen, setIsTableOpen] = useState(defaultTableOpen);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const parameterDescription = serie.parameter_beschreibung?.trim() ?? "";

  useEffect(() => {
    setIsTableOpen(defaultTableOpen);
  }, [defaultTableOpen, serie.laborparameter_id]);

  useEffect(() => {
    setIsDescriptionOpen(false);
  }, [serie.laborparameter_id]);

  return (
    <article className="card card--wide">
      <div className="trend-card__header">
        <div>
          <h3>{serie.parameter_anzeigename}</h3>
          <p>
            {serie.standard_einheit ? `Standardeinheit: ${serie.standard_einheit}` : "Ohne definierte Standardeinheit"}
            {" · "}
            {formatParameterKlassifikation(serie.parameter_primaere_klassifikation)}
          </p>
          {parameterDescription ? (
            <div className={`trend-description${isDescriptionOpen ? " trend-description--open" : ""}`}>
              <p>{parameterDescription}</p>
              <button
                type="button"
                className={`trend-description__toggle${isDescriptionOpen ? " trend-description__toggle--open" : ""}`}
                onClick={() => setIsDescriptionOpen((current) => !current)}
                aria-expanded={isDescriptionOpen}
                aria-label={isDescriptionOpen ? "Parameterbeschreibung einklappen" : "Parameterbeschreibung ausklappen"}
                title={isDescriptionOpen ? "Parameterbeschreibung einklappen" : "Parameterbeschreibung ausklappen"}
              >
                <span aria-hidden="true">▾</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="trend-badges">
          <span className="trend-badge">Messungen: {serie.statistik.anzahl_messungen}</span>
          <span className="trend-badge">Personen: {serie.statistik.personen_anzahl}</span>
          <span className="trend-badge">Trend: {formatTrend(serie.statistik.trendrichtung)}</span>
        </div>
      </div>

      <div className="trend-meta">
        <span>
          Zeitraum: {formatDate(serie.statistik.zeitraum_von)} bis {formatDate(serie.statistik.zeitraum_bis)}
        </span>
        <span>Minimum: {formatNumber(serie.statistik.minimum_num)}</span>
        <span>Maximum: {formatNumber(serie.statistik.maximum_num)}</span>
        <span>Letzter Wert: {serie.statistik.letzter_wert_anzeige ?? "—"}</span>
      </div>

      <AuswertungChart
        serie={serie}
        diagrammDarstellung={diagrammDarstellung}
        zeitraumDarstellung={zeitraumDarstellung}
        vertikalachsenModus={vertikalachsenModus}
        datumVon={datumVon}
        datumBis={datumBis}
        includeLaborreferenz={includeLaborreferenz}
        includeZielbereich={includeZielbereich}
      />

      <div className="trend-table-panel">
        <div className="trend-table-panel__header">
          <span>Werte</span>
          <button
            type="button"
            className={`trend-table-toggle${isTableOpen ? " trend-table-toggle--open" : ""}`}
            onClick={() => setIsTableOpen((current) => !current)}
            aria-expanded={isTableOpen}
            aria-label={isTableOpen ? "Wertetabelle einklappen" : "Wertetabelle ausklappen"}
            title={isTableOpen ? "Wertetabelle einklappen" : "Wertetabelle ausklappen"}
          >
            <span aria-hidden="true">▾</span>
          </button>
        </div>
        {isTableOpen ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>KSG</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Laborreferenz</th>
                  <th>Zielbereich</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {serie.punkte.map((punkt) => (
                  <tr key={punkt.messwert_id}>
                    <td>{punkt.person_anzeigename}</td>
                    <td>{formatParameterKlassifikation(punkt.parameter_primaere_klassifikation)}</td>
                    <td>{formatDate(punkt.datum)}</td>
                    <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                    <td>{punkt.laborreferenz_text || "—"}</td>
                    <td>{formatTargetRange(punkt)}</td>
                    <td>{punkt.labor_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </article>
  );
}
