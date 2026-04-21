import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch, apiFetchBlob } from "../../shared/api/client";
import { MesswertDetailCard } from "../../shared/components/MesswertDetailCard";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import type {
  ArztberichtResponse,
  Gruppe,
  Labor,
  Parameter,
  Person,
  VerlaufsberichtResponse
} from "../../shared/types/api";

const defaultDateRange = getDefaultDateRange();

type BerichtFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  include_referenzbereich: boolean;
  include_labor: boolean;
  include_befundbemerkung: boolean;
  include_messwertbemerkung: boolean;
  einheit_auswahl: Record<string, string>;
};

const initialForm: BerichtFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  include_referenzbereich: true,
  include_labor: true,
  include_befundbemerkung: true,
  include_messwertbemerkung: true,
  einheit_auswahl: {}
};

type BerichtEinheitenOption = {
  laborparameter_id: string;
  parameter_anzeigename: string;
  original_einheiten: string[];
  verfuegbare_ziel_einheiten: string[];
  empfohlene_einheit?: string | null;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function formatCount(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildReportDescription(
  items: Array<{ gruppen_namen: string[]; labor_name?: string | null }>,
  totalValues: number
): string {
  if (!items.length) {
    return "Noch keine Werte für diese Auswahl.";
  }

  const groupCounts = new Map<string, number>();
  items.forEach((item) =>
    item.gruppen_namen.forEach((groupName) => {
      groupCounts.set(groupName, (groupCounts.get(groupName) ?? 0) + 1);
    })
  );

  const topGroups = Array.from(groupCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "de"))
    .slice(0, 2)
    .map(([name]) => name);
  const uniqueLabCount = new Set(items.map((item) => item.labor_name).filter(Boolean)).size;
  const baseDescription = topGroups.length
    ? `Schwerpunkt auf ${topGroups.join(" und ")}`
    : "Breiter Laborüberblick";

  return `${baseDescription} mit ${formatCount(totalValues, "Wert", "Werten")}${
    uniqueLabCount ? ` aus ${formatCount(uniqueLabCount, "Labor", "Laboren")}` : ""
  }.`;
}

function collectPointUnits(
  point: Pick<
    VerlaufsberichtResponse["punkte"][number],
    "wert_typ" | "wert_original_num" | "einheit_original" | "wert_normiert_num" | "einheit_normiert"
  >
): Set<string> {
  const units = new Set<string>();
  if (point.wert_typ !== "numerisch") {
    return units;
  }
  if (point.wert_original_num !== null && point.wert_original_num !== undefined && point.einheit_original) {
    units.add(point.einheit_original);
  }
  if (point.wert_normiert_num !== null && point.wert_normiert_num !== undefined && point.einheit_normiert) {
    units.add(point.einheit_normiert);
  }
  return units;
}

export function BerichtePage() {
  const [form, setForm] = useState<BerichtFormState>(initialForm);
  const [selectedMesswertId, setSelectedMesswertId] = useState<string | null>(null);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const gruppenQuery = useQuery({
    queryKey: ["gruppen"],
    queryFn: () => apiFetch<Gruppe[]>("/api/gruppen")
  });
  const laboreQuery = useQuery({
    queryKey: ["labore"],
    queryFn: () => apiFetch<Labor[]>("/api/labore")
  });

  const doctorPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    include_referenzbereich: form.include_referenzbereich,
    include_labor: form.include_labor,
    include_befundbemerkung: form.include_befundbemerkung,
    include_messwertbemerkung: form.include_messwertbemerkung,
    einheit_auswahl: form.einheit_auswahl
  };

  const trendPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    einheit_auswahl: form.einheit_auswahl
  };

  const doctorReportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ArztberichtResponse>("/api/berichte/arztbericht-vorschau", {
        method: "POST",
        body: JSON.stringify(doctorPayload)
      })
  });

  const trendReportMutation = useMutation({
    mutationFn: () =>
      apiFetch<VerlaufsberichtResponse>("/api/berichte/verlauf-vorschau", {
        method: "POST",
        body: JSON.stringify(trendPayload)
      })
  });

  const doctorPdfMutation = useMutation({
    mutationFn: async () => {
      const result = await apiFetchBlob("/api/berichte/arztbericht-pdf", {
        method: "POST",
        body: JSON.stringify(doctorPayload)
      });
      downloadBlob(result.blob, result.filename ?? "arztbericht.pdf");
    }
  });

  const trendPdfMutation = useMutation({
    mutationFn: async () => {
      const result = await apiFetchBlob("/api/berichte/verlauf-pdf", {
        method: "POST",
        body: JSON.stringify(trendPayload)
      });
      downloadBlob(result.blob, result.filename ?? "verlauf.pdf");
    }
  });

  const previewPending = doctorReportMutation.isPending || trendReportMutation.isPending;
  const doctorSummary = useMemo(() => {
    const items = doctorReportMutation.data?.eintraege ?? [];
    const outsideCount = items.filter((item) => item.ausserhalb_referenzbereich).length;
    const assessableCount = items.filter(
      (item) => item.ausserhalb_referenzbereich !== null && item.ausserhalb_referenzbereich !== undefined
    ).length;
    const parameterCount = new Set(items.map((item) => item.laborparameter_id)).size;
    return {
      totalValues: items.length,
      outsideCount,
      assessableCount,
      parameterCount,
      description: buildReportDescription(items, items.length)
    };
  }, [doctorReportMutation.data]);
  const trendSummary = useMemo(() => {
    const items = trendReportMutation.data?.punkte ?? [];
    const outsideCount = items.filter((item) => item.ausserhalb_referenzbereich).length;
    const assessableCount = items.filter(
      (item) => item.ausserhalb_referenzbereich !== null && item.ausserhalb_referenzbereich !== undefined
    ).length;
    const parameterCount = new Set(items.map((item) => item.laborparameter_id)).size;
    return {
      totalValues: items.length,
      outsideCount,
      assessableCount,
      parameterCount,
      description: buildReportDescription(items, items.length)
    };
  }, [trendReportMutation.data]);
  const unitSelectionOptions = useMemo<BerichtEinheitenOption[]>(() => {
    const points = trendReportMutation.data?.punkte ?? [];
    const grouped = new Map<
      string,
      {
        parameterName: string;
        unitSets: Set<string>[];
        originalUnits: Set<string>;
      }
    >();

    points.forEach((point) => {
      const availableUnits = collectPointUnits(point);
      if (!availableUnits.size) {
        return;
      }

      const current = grouped.get(point.laborparameter_id) ?? {
        parameterName: point.parameter_anzeigename,
        unitSets: [],
        originalUnits: new Set<string>()
      };
      current.unitSets.push(availableUnits);
      if (point.einheit_original) {
        current.originalUnits.add(point.einheit_original);
      }
      grouped.set(point.laborparameter_id, current);
    });

    return Array.from(grouped.entries())
      .map(([laborparameter_id, entry]) => {
        const [firstSet, ...restSets] = entry.unitSets;
        const commonUnits = new Set(firstSet);
        restSets.forEach((unitSet) => {
          Array.from(commonUnits).forEach((unit) => {
            if (!unitSet.has(unit)) {
              commonUnits.delete(unit);
            }
          });
        });

        const standardEinheit =
          parameterQuery.data?.find((parameter) => parameter.id === laborparameter_id)?.standard_einheit ?? null;
        const verfuegbareZielEinheiten = Array.from(commonUnits).sort((left, right) => left.localeCompare(right, "de"));
        const originalEinheiten = Array.from(entry.originalUnits).sort((left, right) => left.localeCompare(right, "de"));

        return {
          laborparameter_id,
          parameter_anzeigename: entry.parameterName,
          original_einheiten: originalEinheiten,
          verfuegbare_ziel_einheiten: verfuegbareZielEinheiten,
          empfohlene_einheit:
            standardEinheit && commonUnits.has(standardEinheit)
              ? standardEinheit
              : verfuegbareZielEinheiten[0] ?? null
        };
      })
      .filter(
        (entry) =>
          entry.original_einheiten.length > 1 ||
          entry.verfuegbare_ziel_einheiten.some((unit) => !entry.original_einheiten.includes(unit))
      )
      .sort((left, right) => left.parameter_anzeigename.localeCompare(right.parameter_anzeigename, "de"));
  }, [parameterQuery.data, trendReportMutation.data]);

  useEffect(() => {
    const availableIds = new Set([
      ...(doctorReportMutation.data?.eintraege.map((item) => item.messwert_id) ?? []),
      ...(trendReportMutation.data?.punkte.map((item) => item.messwert_id) ?? [])
    ]);
    if (selectedMesswertId && !availableIds.has(selectedMesswertId)) {
      setSelectedMesswertId(null);
    }
  }, [doctorReportMutation.data, selectedMesswertId, trendReportMutation.data]);

  useEffect(() => {
    const allowedParameterIds = new Set(unitSelectionOptions.map((option) => option.laborparameter_id));
    setForm((current) => {
      const nextUnitSelection = Object.fromEntries(
        Object.entries(current.einheit_auswahl).filter(([parameterId]) => allowedParameterIds.has(parameterId))
      );
      if (Object.keys(nextUnitSelection).length === Object.keys(current.einheit_auswahl).length) {
        return current;
      }
      return { ...current, einheit_auswahl: nextUnitSelection };
    });
  }, [unitSelectionOptions]);

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Berichte</span>
        <h2>Berichte</h2>
        <p>
          Arztberichte und Verlaufsberichte lassen sich jetzt auch personenübergreifend sowie nach Gruppen, Laboren und
          Zeitraum filtern.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Berichtsfilter</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              doctorReportMutation.mutate();
              trendReportMutation.mutate();
            }}
          >
            <SelectionChecklist
              label="Personen"
              options={(personenQuery.data ?? []).map((person) => ({
                id: person.id,
                label: person.anzeigename
              }))}
              selectedIds={form.person_ids}
              onChange={(person_ids) => setForm((current) => ({ ...current, person_ids }))}
              emptyText="Noch keine Personen vorhanden."
            />

            <label className="field">
              <span>Datum von</span>
              <input
                type="date"
                value={form.datum_von}
                onChange={(event) => setForm((current) => ({ ...current, datum_von: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Datum bis</span>
              <input
                type="date"
                value={form.datum_bis}
                onChange={(event) => setForm((current) => ({ ...current, datum_bis: event.target.value }))}
              />
            </label>

            <SelectionChecklist
              label="Gruppen"
              options={(gruppenQuery.data ?? []).map((gruppe) => ({
                id: gruppe.id,
                label: gruppe.name,
                meta: gruppe.beschreibung
              }))}
              selectedIds={form.gruppen_ids}
              onChange={(gruppen_ids) => setForm((current) => ({ ...current, gruppen_ids }))}
              emptyText="Noch keine Gruppen vorhanden."
            />

            <SelectionChecklist
              label="Parameter"
              options={(parameterQuery.data ?? []).map((parameter) => ({
                id: parameter.id,
                label: parameter.anzeigename,
                meta: parameter.standard_einheit
              }))}
              selectedIds={form.laborparameter_ids}
              onChange={(laborparameter_ids) => setForm((current) => ({ ...current, laborparameter_ids }))}
              emptyText="Noch keine Parameter vorhanden."
              collapsible
              defaultExpanded={false}
            />

            <SelectionChecklist
              label="Labore"
              options={(laboreQuery.data ?? []).map((labor) => ({
                id: labor.id,
                label: labor.name
              }))}
              selectedIds={form.labor_ids}
              onChange={(labor_ids) => setForm((current) => ({ ...current, labor_ids }))}
              emptyText="Noch keine Labore vorhanden."
            />

            <label className="field">
              <span>Referenzbereich</span>
              <input
                type="checkbox"
                checked={form.include_referenzbereich}
                onChange={(event) => setForm((current) => ({ ...current, include_referenzbereich: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Labor</span>
              <input
                type="checkbox"
                checked={form.include_labor}
                onChange={(event) => setForm((current) => ({ ...current, include_labor: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Befundbemerkung</span>
              <input
                type="checkbox"
                checked={form.include_befundbemerkung}
                onChange={(event) => setForm((current) => ({ ...current, include_befundbemerkung: event.target.checked }))}
              />
            </label>

            <label className="field">
              <span>Messwertbemerkung</span>
              <input
                type="checkbox"
                checked={form.include_messwertbemerkung}
                onChange={(event) => setForm((current) => ({ ...current, include_messwertbemerkung: event.target.checked }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={previewPending || !form.person_ids.length}>
                {previewPending ? "Lädt..." : "Vorschau laden"}
              </button>
              <button
                type="button"
                disabled={doctorPdfMutation.isPending || !form.person_ids.length}
                onClick={() => doctorPdfMutation.mutate()}
              >
                {doctorPdfMutation.isPending ? "PDF wird erstellt..." : "Arztbericht als PDF"}
              </button>
              <button
                type="button"
                disabled={trendPdfMutation.isPending || !form.person_ids.length}
                onClick={() => trendPdfMutation.mutate()}
              >
                {trendPdfMutation.isPending ? "PDF wird erstellt..." : "Verlaufsbericht als PDF"}
              </button>
            </div>
          </form>
        </article>

        <article className="card card--wide">
          <h3>Darstellungseinheiten</h3>
          <p>
            Wenn ein Parameter in mehreren Einheiten vorkommt und für alle betroffenen numerischen Werte eine gemeinsame
            Zieldarstellung möglich ist, kannst du sie hier festlegen. Die Auswahl wirkt auf die nächste Vorschau und
            auf den PDF-Export.
          </p>
          {!unitSelectionOptions.length ? (
            <p>Nach dem Laden der Vorschau erscheinen hier nur Parameter mit sinnvoller Einheitenwahl.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Beobachtete Originaleinheiten</th>
                    <th>Darstellung im Bericht</th>
                  </tr>
                </thead>
                <tbody>
                  {unitSelectionOptions.map((option) => (
                    <tr key={option.laborparameter_id}>
                      <td>{option.parameter_anzeigename}</td>
                      <td>{option.original_einheiten.join(", ")}</td>
                      <td>
                        <select
                          value={form.einheit_auswahl[option.laborparameter_id] ?? "original"}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              einheit_auswahl: {
                                ...current.einheit_auswahl,
                                [option.laborparameter_id]: event.target.value
                              }
                            }))
                          }
                        >
                          <option value="original">Originaleinheiten beibehalten</option>
                          {option.verfuegbare_ziel_einheiten.map((unit) => (
                            <option key={unit} value={unit}>
                              {option.empfohlene_einheit === unit ? `${unit} (empfohlen)` : unit}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card card--wide">
          <h3>Arztbericht Liste</h3>
          <p>Die Vorschau zeigt die jeweils neuesten passenden Werte. Zeilen können für Details angeklickt werden.</p>
          {doctorReportMutation.isError ? <p className="form-error">{doctorReportMutation.error.message}</p> : null}
          {doctorPdfMutation.isError ? <p className="form-error">{doctorPdfMutation.error.message}</p> : null}
          <div className="report-summary-grid">
            <article className="stat-card">
              <span className="stat-card__label">Enthaltene Werte</span>
              <strong>{doctorSummary.totalValues}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Parameter</span>
              <strong>{doctorSummary.parameterCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Außerhalb Referenz</span>
              <strong>
                {doctorSummary.assessableCount
                  ? `${doctorSummary.outsideCount} von ${doctorSummary.assessableCount}`
                  : "nicht beurteilbar"}
              </strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Kurzbeschreibung</span>
              <strong>{doctorSummary.description}</strong>
            </article>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Referenz</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {doctorReportMutation.data?.eintraege.map((item) => (
                  <tr
                    key={item.messwert_id}
                    onClick={() => setSelectedMesswertId(item.messwert_id)}
                    className={item.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                  >
                    <td>{item.person_anzeigename}</td>
                    <td>{item.parameter_anzeigename}</td>
                    <td>{formatDate(item.datum)}</td>
                    <td>{[item.wert_anzeige, item.einheit].filter(Boolean).join(" ")}</td>
                    <td>{item.referenzbereich || "—"}</td>
                    <td>{item.labor_name || "—"}</td>
                  </tr>
                ))}
                {doctorReportMutation.data && !doctorReportMutation.data.eintraege.length ? (
                  <tr>
                    <td colSpan={6}>Für die aktuelle Auswahl gibt es noch keine passenden Werte.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Verlaufsbericht Vorschau</h3>
          <p>Hier siehst du alle passenden Verlaufspunkte. Auch hier öffnen Zeilen die Messwertdetails darunter.</p>
          {trendReportMutation.isError ? <p className="form-error">{trendReportMutation.error.message}</p> : null}
          {trendPdfMutation.isError ? <p className="form-error">{trendPdfMutation.error.message}</p> : null}
          <div className="report-summary-grid">
            <article className="stat-card">
              <span className="stat-card__label">Verlaufspunkte</span>
              <strong>{trendSummary.totalValues}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Parameter</span>
              <strong>{trendSummary.parameterCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Außerhalb Referenz</span>
              <strong>
                {trendSummary.assessableCount
                  ? `${trendSummary.outsideCount} von ${trendSummary.assessableCount}`
                  : "nicht beurteilbar"}
              </strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Kurzbeschreibung</span>
              <strong>{trendSummary.description}</strong>
            </article>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Wert</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {trendReportMutation.data?.punkte.map((punkt) => (
                  <tr
                    key={punkt.messwert_id}
                    onClick={() => setSelectedMesswertId(punkt.messwert_id)}
                    className={punkt.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                  >
                    <td>{punkt.person_anzeigename}</td>
                    <td>{punkt.parameter_anzeigename}</td>
                    <td>{formatDate(punkt.datum)}</td>
                    <td>{punkt.wert_typ}</td>
                    <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                    <td>{punkt.labor_name || "—"}</td>
                  </tr>
                ))}
                {trendReportMutation.data && !trendReportMutation.data.punkte.length ? (
                  <tr>
                    <td colSpan={6}>Für die aktuelle Auswahl gibt es noch keinen Verlauf.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <MesswertDetailCard
          messwertId={selectedMesswertId}
          title="Ausgewählter Messwert mit Referenzen"
          emptyText="Bitte in einer Berichtsvorschau einen Messwert auswählen."
        />
      </div>
    </section>
  );
}
