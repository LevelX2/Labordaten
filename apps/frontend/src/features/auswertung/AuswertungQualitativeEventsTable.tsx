import { formatParameterKlassifikation } from "../../shared/constants/fieldOptions";
import { formatDisplayDate as formatDate } from "../../shared/utils/dateFormatting";
import type { QualitativeAuswertungEvent } from "./auswertungTypes";

export function AuswertungQualitativeEventsTable({ events }: { events: QualitativeAuswertungEvent[] }) {
  return (
    <article className="card">
      <h3>Qualitative Ereignisse</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Person</th>
              <th>Parameter</th>
              <th>KSG</th>
              <th>Wert</th>
              <th>Bemerkung</th>
              <th>Labor</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.messwert_id}>
                <td>{formatDate(event.datum)}</td>
                <td>{event.person_anzeigename}</td>
                <td>{event.parameter_anzeigename}</td>
                <td>{formatParameterKlassifikation(event.parameter_primaere_klassifikation)}</td>
                <td>{[event.wert_anzeige, event.einheit].filter(Boolean).join(" ")}</td>
                <td>{event.messwertbemerkung || event.befundbemerkung || "—"}</td>
                <td>{event.labor_name || "—"}</td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td colSpan={7}>Noch keine qualitativen Ereignisse für die aktuelle Auswahl.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}
