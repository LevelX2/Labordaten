import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiFetch, apiFetchBlob } from "../../shared/api/client";
import { DateRangeFilterFields, isInvalidDateRange } from "../../shared/components/DateRangeFilterFields";
import { MesswertDetailCard } from "../../shared/components/MesswertDetailCard";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { ViewTemplateBar } from "../../shared/components/ViewTemplateBar";
import {
  PARAMETER_KLASSIFIKATION_OPTIONS,
  formatParameterKlassifikation
} from "../../shared/constants/fieldOptions";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import { formatDisplayDate as formatDate } from "../../shared/utils/dateFormatting";
import { applySharedFilterSearchParams } from "../../shared/utils/filterNavigation";
import type {
  AnsichtVorlage,
  AnsichtVorlageCreatePayload,
  AnsichtVorlageDeleteResult,
  AnsichtVorlageKonfiguration,
  AnsichtVorlageTyp,
  AnsichtVorlageUpdatePayload,
  ArztberichtResponse,
  Gruppe,
  Labor,
  Parameter,
  ParameterKlassifikationCode,
  Person,
  VerlaufsberichtResponse
} from "../../shared/types/api";

const defaultDateRange = getDefaultDateRange();

type BerichtFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  klassifikationen: ParameterKlassifikationCode[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  include_referenzbereich: boolean;
  include_labor: boolean;
  include_befundbemerkung: boolean;
  include_messwertbemerkung: boolean;
};

type BerichtAnsichtKey = "arztbericht" | "verlauf";
type BerichtPanelKey = "filters" | "templates";

const initialForm: BerichtFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  klassifikationen: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  include_referenzbereich: true,
  include_labor: true,
  include_befundbemerkung: true,
  include_messwertbemerkung: true
};

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readKlassifikationen(value: unknown): ParameterKlassifikationCode[] {
  const validValues = new Set<string>(PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => option.value));
  return readStringArray(value).filter((item): item is ParameterKlassifikationCode => validValues.has(item));
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function viewKeyToTemplateType(viewKey: BerichtAnsichtKey): AnsichtVorlageTyp {
  return viewKey === "arztbericht" ? "arztbericht_liste" : "verlaufsbericht_zeitachse";
}

function templateTypeToViewKey(templateType: AnsichtVorlageTyp): BerichtAnsichtKey {
  return templateType === "verlaufsbericht_zeitachse" ? "verlauf" : "arztbericht";
}

function buildBerichtVorlageConfig(form: BerichtFormState, viewKey: BerichtAnsichtKey): AnsichtVorlageKonfiguration {
  return {
    filter: {
      person_ids: form.person_ids,
      laborparameter_ids: form.laborparameter_ids,
      gruppen_ids: form.gruppen_ids,
      klassifikationen: form.klassifikationen,
      labor_ids: form.labor_ids,
      datum_von: form.datum_von || null,
      datum_bis: form.datum_bis || null
    },
    optionen:
      viewKey === "arztbericht"
        ? {
            include_referenzbereich: form.include_referenzbereich,
            include_labor: form.include_labor,
            include_befundbemerkung: form.include_befundbemerkung,
            include_messwertbemerkung: form.include_messwertbemerkung,
            einheit_auswahl: {}
          }
        : {
            einheit_auswahl: {}
          }
  };
}

function applyBerichtVorlageConfig(config: AnsichtVorlageKonfiguration): BerichtFormState {
  const filter = config.filter ?? initialForm;
  const optionen = config.optionen ?? {};

  return {
    ...initialForm,
    person_ids: readStringArray(filter.person_ids),
    laborparameter_ids: readStringArray(filter.laborparameter_ids),
    gruppen_ids: readStringArray(filter.gruppen_ids),
    klassifikationen: readKlassifikationen(filter.klassifikationen),
    labor_ids: readStringArray(filter.labor_ids),
    datum_von: typeof filter.datum_von === "string" ? filter.datum_von : filter.datum_von === null ? "" : initialForm.datum_von,
    datum_bis: typeof filter.datum_bis === "string" ? filter.datum_bis : filter.datum_bis === null ? "" : initialForm.datum_bis,
    include_referenzbereich: readBoolean(optionen.include_referenzbereich, initialForm.include_referenzbereich),
    include_labor: readBoolean(optionen.include_labor, initialForm.include_labor),
    include_befundbemerkung: readBoolean(optionen.include_befundbemerkung, initialForm.include_befundbemerkung),
    include_messwertbemerkung: readBoolean(optionen.include_messwertbemerkung, initialForm.include_messwertbemerkung)
  };
}

function countMissingIds(ids: string[], knownIds: string[]): number {
  const known = new Set(knownIds);
  return ids.filter((id) => !known.has(id)).length;
}

function buildMissingTemplateWarning(
  form: BerichtFormState,
  data: {
    personen: Person[];
    gruppen: Gruppe[];
    parameter: Parameter[];
    labore: Labor[];
  }
): string | null {
  const missingCount =
    countMissingIds(form.person_ids, data.personen.map((person) => person.id)) +
    countMissingIds(form.gruppen_ids, data.gruppen.map((gruppe) => gruppe.id)) +
    countMissingIds(form.laborparameter_ids, data.parameter.map((parameter) => parameter.id)) +
    countMissingIds(form.labor_ids, data.labore.map((labor) => labor.id));

  return missingCount ? `Diese Vorlage enthält ${missingCount} nicht mehr verfügbare Auswahlwerte.` : null;
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

function buildFilterSummary(form: BerichtFormState): string[] {
  const summary: string[] = [];

  summary.push(
    form.person_ids.length
      ? `${formatCount(form.person_ids.length, "Person", "Personen")} ausgewählt`
      : "Noch keine Person ausgewählt"
  );

  if (form.gruppen_ids.length) {
    summary.push(formatCount(form.gruppen_ids.length, "Parametergruppe", "Parametergruppen"));
  }
  if (form.laborparameter_ids.length) {
    summary.push(formatCount(form.laborparameter_ids.length, "Parameter", "Parameter"));
  }
  if (form.klassifikationen.length) {
    summary.push(formatCount(form.klassifikationen.length, "KSG-Klasse", "KSG-Klassen"));
  }
  if (form.labor_ids.length) {
    summary.push(formatCount(form.labor_ids.length, "Labor", "Labore"));
  }

  if (form.datum_von || form.datum_bis) {
    summary.push(
      `Zeitraum ${form.datum_von ? formatDate(form.datum_von) : "offen"} bis ${form.datum_bis ? formatDate(form.datum_bis) : "offen"}`
    );
  }

  return summary;
}

function buildDoctorOptionSummary(form: BerichtFormState): string {
  const options = [
    form.include_referenzbereich ? "Referenzbereich" : null,
    form.include_labor ? "Labor" : null,
    form.include_befundbemerkung ? "Befundbemerkung" : null,
    form.include_messwertbemerkung ? "Messwertbemerkung" : null
  ].filter(Boolean);

  return options.length ? options.join(" • ") : "Nur Pflichtfelder";
}

export function BerichtePage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<BerichtFormState>(() =>
    applySharedFilterSearchParams(initialForm, searchParams)
  );
  const [selectedMesswertId, setSelectedMesswertId] = useState<string | null>(null);
  const [selectedAnsicht, setSelectedAnsicht] = useState<BerichtAnsichtKey>("arztbericht");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateBaseline, setTemplateBaseline] = useState("");
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BerichtPanelKey | null>(() =>
    form.person_ids.length ? null : "filters"
  );
  const [showPageInfo, setShowPageInfo] = useState(false);
  const selectedTemplateType = viewKeyToTemplateType(selectedAnsicht);
  const currentTemplateConfig = useMemo(
    () => buildBerichtVorlageConfig(form, selectedAnsicht),
    [form, selectedAnsicht]
  );
  const currentTemplateSignature = useMemo(() => JSON.stringify(currentTemplateConfig), [currentTemplateConfig]);
  const isDateRangeInvalid = isInvalidDateRange(form.datum_von, form.datum_bis);

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
  const templatesQuery = useQuery({
    queryKey: ["vorlagen", "bericht"],
    queryFn: () => apiFetch<AnsichtVorlage[]>("/api/vorlagen?bereich=bericht")
  });

  const doctorPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    klassifikationen: form.klassifikationen,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    include_referenzbereich: form.include_referenzbereich,
    include_labor: form.include_labor,
    include_befundbemerkung: form.include_befundbemerkung,
    include_messwertbemerkung: form.include_messwertbemerkung
  };

  const trendPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    klassifikationen: form.klassifikationen,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null
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
  const createTemplateMutation = useMutation({
    mutationFn: (payload: AnsichtVorlageCreatePayload) =>
      apiFetch<AnsichtVorlage>("/api/vorlagen", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "bericht"] });
      setSelectedAnsicht(templateTypeToViewKey(template.vorlage_typ));
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnsichtVorlageUpdatePayload }) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "bericht"] });
      setSelectedTemplateId(template.id);
      setTemplateBaseline(JSON.stringify(template.konfiguration_json));
      setTemplateWarning(null);
    }
  });
  const applyTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlage>(`/api/vorlagen/${id}/anwenden`, {
        method: "POST"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vorlagen", "bericht"] })
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<AnsichtVorlageDeleteResult>(`/api/vorlagen/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vorlagen", "bericht"] });
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
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

  const filterSummary = useMemo(() => buildFilterSummary(form), [form]);
  const doctorOptionSummary = useMemo(() => buildDoctorOptionSummary(form), [form]);

  const reportEntries = useMemo(
    () => [
      {
        key: "arztbericht" as const,
        title: "Arztbericht Liste",
        description: "Kompakte Berichtssicht mit den neuesten passenden Werten und auswählbaren Zusatzfeldern.",
        previewLabel: doctorReportMutation.data
          ? formatCount(doctorSummary.totalValues, "Wert", "Werte")
          : "Noch keine Vorschau",
        metaLabel: doctorReportMutation.data
          ? formatCount(doctorSummary.parameterCount, "Parameter", "Parameter")
          : "PDF und Vorschau verfügbar"
      },
      {
        key: "verlauf" as const,
        title: "Verlaufsbericht Zeitachse",
        description: "Alle passenden Verlaufspunkte für Zeitachsen, PDF-Ausgabe und Detailprüfung in einer Sicht.",
        previewLabel: trendReportMutation.data
          ? formatCount(trendSummary.totalValues, "Punkt", "Punkte")
          : "Noch keine Vorschau",
        metaLabel: trendReportMutation.data
          ? formatCount(trendSummary.parameterCount, "Parameter", "Parameter")
          : "Verlaufs-PDF verfügbar"
      }
    ],
    [doctorReportMutation.data, doctorSummary, trendReportMutation.data, trendSummary]
  );

  const selectedEntry = reportEntries.find((entry) => entry.key === selectedAnsicht) ?? reportEntries[0];
  const templatesForSelectedType = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.vorlage_typ === selectedTemplateType),
    [selectedTemplateType, templatesQuery.data]
  );
  const selectedTemplate = templatesForSelectedType.find((template) => template.id === selectedTemplateId) ?? null;
  const templateActionPending =
    createTemplateMutation.isPending ||
    updateTemplateMutation.isPending ||
    applyTemplateMutation.isPending ||
    deleteTemplateMutation.isPending;
  const templateError =
    createTemplateMutation.error ??
    updateTemplateMutation.error ??
    applyTemplateMutation.error ??
    deleteTemplateMutation.error ??
    null;
  const hasUnsavedTemplateChanges = Boolean(selectedTemplateId && templateBaseline !== currentTemplateSignature);

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
    if (selectedTemplateId && !templatesForSelectedType.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
    }
  }, [selectedTemplateId, templatesForSelectedType]);

  const handlePreviewLoad = () => {
    if (isDateRangeInvalid || !form.person_ids.length) {
      return;
    }
    doctorReportMutation.mutate();
    trendReportMutation.mutate();
    setActivePanel(null);
  };

  const handlePdfExport = () => {
    if (isDateRangeInvalid || !form.person_ids.length) {
      return;
    }
    if (selectedAnsicht === "arztbericht") {
      doctorPdfMutation.mutate();
      return;
    }
    trendPdfMutation.mutate();
  };
  const handleSelectTemplate = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId("");
      setTemplateBaseline("");
      setTemplateWarning(null);
      return;
    }

    const template = (templatesQuery.data ?? []).find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const nextForm = applyBerichtVorlageConfig(template.konfiguration_json);
    setSelectedAnsicht(templateTypeToViewKey(template.vorlage_typ));
    setForm(nextForm);
    setSelectedTemplateId(template.id);
    setTemplateBaseline(JSON.stringify(template.konfiguration_json));
    setTemplateWarning(
      buildMissingTemplateWarning(nextForm, {
        personen: personenQuery.data ?? [],
        gruppen: gruppenQuery.data ?? [],
        parameter: parameterQuery.data ?? [],
        labore: laboreQuery.data ?? []
      })
    );
    applyTemplateMutation.mutate(template.id);
  };
  const handleSaveTemplate = () => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name: selectedTemplate.name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleSaveTemplateAs = (name: string) => {
    createTemplateMutation.mutate({
      name,
      bereich: "bericht",
      vorlage_typ: selectedTemplateType,
      beschreibung: null,
      konfiguration_json: currentTemplateConfig
    });
  };
  const handleRenameTemplate = (name: string) => {
    if (!selectedTemplate) {
      return;
    }
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      payload: {
        name,
        beschreibung: selectedTemplate.beschreibung,
        konfiguration_json: currentTemplateConfig,
        sortierung: selectedTemplate.sortierung
      }
    });
  };
  const handleDeleteTemplate = () => {
    if (selectedTemplateId) {
      deleteTemplateMutation.mutate(selectedTemplateId);
    }
  };

  const renderSelectedPreview = () => {
    if (selectedAnsicht === "arztbericht") {
      if (doctorReportMutation.isError) {
        return <p className="form-error">{doctorReportMutation.error.message}</p>;
      }

      if (!doctorReportMutation.data) {
        return (
          <p>
            Lade zuerst eine Vorschau, damit Du die aktuellen Berichtsinhalte, Kennzahlen und auswählbaren Messwerte
            prüfen kannst.
          </p>
        );
      }

      return (
        <>
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
                  <th>KSG</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  <th>Referenz</th>
                  <th>Labor</th>
                </tr>
              </thead>
              <tbody>
                {doctorReportMutation.data.eintraege.map((item) => (
                  <tr
                    key={item.messwert_id}
                    onClick={() => setSelectedMesswertId(item.messwert_id)}
                    className={item.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                  >
                    <td>{item.person_anzeigename}</td>
                    <td>{item.parameter_anzeigename}</td>
                    <td>{formatParameterKlassifikation(item.parameter_primaere_klassifikation)}</td>
                    <td>{formatDate(item.datum)}</td>
                    <td>{[item.wert_anzeige, item.einheit].filter(Boolean).join(" ")}</td>
                    <td>{item.referenzbereich || "—"}</td>
                    <td>{item.labor_name || "—"}</td>
                  </tr>
                ))}
                {!doctorReportMutation.data.eintraege.length ? (
                  <tr>
                    <td colSpan={7}>Für die aktuelle Auswahl gibt es noch keine passenden Werte.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (trendReportMutation.isError) {
      return <p className="form-error">{trendReportMutation.error.message}</p>;
    }

    if (!trendReportMutation.data) {
      return (
        <p>
          Lade zuerst eine Vorschau, damit Du die Verlaufspunkte, die spätere PDF-Ausgabe und die Messwertdetails
          entlang der aktuellen Auswahl prüfen kannst.
        </p>
      );
    }

    return (
      <>
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
                <th>KSG</th>
                <th>Datum</th>
                <th>Typ</th>
                <th>Wert</th>
                <th>Labor</th>
              </tr>
            </thead>
            <tbody>
              {trendReportMutation.data.punkte.map((punkt) => (
                <tr
                  key={punkt.messwert_id}
                  onClick={() => setSelectedMesswertId(punkt.messwert_id)}
                  className={punkt.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                >
                  <td>{punkt.person_anzeigename}</td>
                  <td>{punkt.parameter_anzeigename}</td>
                  <td>{formatParameterKlassifikation(punkt.parameter_primaere_klassifikation)}</td>
                  <td>{formatDate(punkt.datum)}</td>
                  <td>{punkt.wert_typ}</td>
                  <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                  <td>{punkt.labor_name || "—"}</td>
                </tr>
              ))}
              {!trendReportMutation.data.punkte.length ? (
                <tr>
                  <td colSpan={7}>Für die aktuelle Auswahl gibt es noch keinen Verlauf.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Berichte</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Berichtsseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier stellst Du Berichtsauswahl, Filter und Ausgabeoptionen zusammen und prüfst die Vorschau direkt vor
              dem PDF-Export.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Berichtsansichten</h3>
              <p>{filterSummary.join(" • ")}</p>
            </div>
          </div>

          <div className="parameter-list">
            {reportEntries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`parameter-list__item ${selectedAnsicht === entry.key ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedAnsicht(entry.key)}
              >
                <div className="parameter-list__title-row">
                  <strong>{entry.title}</strong>
                </div>
                <p>{entry.description}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">{entry.previewLabel}</span>
                  <span className="parameter-pill">{entry.metaLabel}</span>
                </div>
              </button>
            ))}
            <button
              type="button"
              className={`parameter-list__item ${activePanel === "templates" ? "parameter-list__item--selected" : ""}`}
              onClick={() => setActivePanel("templates")}
            >
              <div className="parameter-list__title-row">
                <strong>Vorlagen</strong>
              </div>
              <p>{selectedTemplate?.name ?? "Keine Vorlage gewählt"}</p>
              <div className="parameter-list__meta">
                <span className="parameter-pill">{templatesForSelectedType.length} Vorlagen</span>
                {hasUnsavedTemplateChanges ? <span className="parameter-pill">Geändert</span> : null}
              </div>
            </button>
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            <div className="parameter-detail__header">
              <div>
                <h3 className="parameter-detail__title">{selectedEntry.title}</h3>
                <p>{selectedEntry.description}</p>
              </div>
              <div className="parameter-header-controls">
                <span className="parameter-pill parameter-pill--accent">
                  {selectedAnsicht === "arztbericht"
                    ? doctorReportMutation.data
                      ? "Arztbericht geladen"
                      : "Arztbericht bereit"
                    : trendReportMutation.data
                      ? "Verlauf geladen"
                      : "Verlauf bereit"}
                </span>
              </div>
            </div>

            <div className="parameter-toolrail">
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "filters" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "filters" ? null : "filters"))}
              >
                Filter bearbeiten
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "templates" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "templates" ? null : "templates"))}
              >
                Vorlagen
              </button>
              <button
                type="button"
                className="parameter-toolrail__button"
                onClick={handlePreviewLoad}
                disabled={previewPending || !form.person_ids.length || isDateRangeInvalid}
              >
                {previewPending ? "Lädt..." : "Vorschau laden"}
              </button>
              <button
                type="button"
                className="parameter-toolrail__button"
                onClick={handlePdfExport}
                disabled={
                  selectedAnsicht === "arztbericht"
                    ? doctorPdfMutation.isPending || !form.person_ids.length || isDateRangeInvalid
                    : trendPdfMutation.isPending || !form.person_ids.length || isDateRangeInvalid
                }
              >
                {selectedAnsicht === "arztbericht"
                  ? doctorPdfMutation.isPending
                    ? "PDF wird erstellt..."
                    : "Arztbericht als PDF"
                  : trendPdfMutation.isPending
                    ? "PDF wird erstellt..."
                    : "Verlaufsbericht als PDF"}
              </button>
            </div>

            {activePanel === "templates" ? (
              <article className="card card--soft parameter-action-panel">
                <div className="parameter-panel__header">
                  <div>
                    <h3>Berichtsvorlagen</h3>
                    <p>{selectedTemplate?.name ?? "Keine Vorlage gewählt"}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setActivePanel(null)}
                    aria-label="Panel Berichtsvorlagen schließen"
                    title="Panel Berichtsvorlagen schließen"
                  >
                    ×
                  </button>
                </div>
                <ViewTemplateBar
                  templates={templatesForSelectedType}
                  selectedTemplateId={selectedTemplateId}
                  hasUnsavedChanges={hasUnsavedTemplateChanges}
                  isPending={templateActionPending}
                  onSelect={handleSelectTemplate}
                  onSave={handleSaveTemplate}
                  onSaveAs={handleSaveTemplateAs}
                  onRename={handleRenameTemplate}
                  onDelete={handleDeleteTemplate}
                />
                {templateWarning ? <p className="form-hint">{templateWarning}</p> : null}
                {templateError ? <p className="form-error">{templateError.message}</p> : null}
              </article>
            ) : null}

            {activePanel === "filters" ? (
              <article className="card card--soft parameter-action-panel">
                <div className="parameter-panel__header">
                  <div>
                    <h3>Berichtsfilter</h3>
                    <p>Die Auswahl wirkt gemeinsam auf Arztbericht, Verlaufsbericht und die Messwertdetails darunter.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setActivePanel(null)}
                    aria-label="Panel Berichtsfilter schließen"
                    title="Panel Berichtsfilter schließen"
                  >
                    ×
                  </button>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handlePreviewLoad();
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
                    collapsible
                  />

                  <SelectionChecklist
                    label="Parametergruppen"
                    options={(gruppenQuery.data ?? []).map((gruppe) => ({
                      id: gruppe.id,
                      label: gruppe.name,
                      meta: gruppe.beschreibung
                    }))}
                    selectedIds={form.gruppen_ids}
                    onChange={(gruppen_ids) => setForm((current) => ({ ...current, gruppen_ids }))}
                    emptyText="Noch keine Parametergruppen vorhanden."
                    collapsible
                    defaultExpanded={false}
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
                    label="KSG-Klassen"
                    options={PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => ({
                      id: option.value,
                      label: option.label
                    }))}
                    selectedIds={form.klassifikationen}
                    onChange={(klassifikationen) =>
                      setForm((current) => ({
                        ...current,
                        klassifikationen: klassifikationen as ParameterKlassifikationCode[]
                      }))
                    }
                    emptyText="Keine KSG-Klassen verfügbar."
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
                    collapsible
                    defaultExpanded={false}
                  />

                  <DateRangeFilterFields
                    fromValue={form.datum_von}
                    toValue={form.datum_bis}
                    fallbackFromValue={initialForm.datum_von}
                    fallbackToValue={initialForm.datum_bis}
                    onFromChange={(datum_von) => setForm((current) => ({ ...current, datum_von }))}
                    onToChange={(datum_bis) => setForm((current) => ({ ...current, datum_bis }))}
                  />

                  <div className="field field--full">
                    <span>Arztbericht-Inhalte</span>
                    <div className="checkbox-grid">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.include_referenzbereich}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, include_referenzbereich: event.target.checked }))
                          }
                        />
                        <span>Referenzbereich</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.include_labor}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, include_labor: event.target.checked }))
                          }
                        />
                        <span>Labor</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.include_befundbemerkung}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, include_befundbemerkung: event.target.checked }))
                          }
                        />
                        <span>Befundbemerkung</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.include_messwertbemerkung}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, include_messwertbemerkung: event.target.checked }))
                          }
                        />
                        <span>Messwertbemerkung</span>
                      </label>
                    </div>
                    <p className="form-hint">Diese Optionen wirken auf den Arztbericht und dessen PDF-Ausgabe.</p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(initialForm);
                        setSelectedTemplateId("");
                        setTemplateBaseline("");
                        setTemplateWarning(null);
                      }}
                    >
                      Filter zurücksetzen
                    </button>
                    <button type="submit" disabled={previewPending || !form.person_ids.length || isDateRangeInvalid}>
                      {previewPending ? "Lädt..." : "Vorschau laden"}
                    </button>
                  </div>
                </form>
              </article>
            ) : null}

            <div className="detail-grid">
              <div className="detail-grid__item">
                <span>Personen</span>
                <strong>{formatCount(form.person_ids.length, "Person", "Personen")}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Parametergruppen und Parameter</span>
                <strong>
                  {formatCount(form.gruppen_ids.length, "Parametergruppe", "Parametergruppen")} •{" "}
                  {formatCount(form.laborparameter_ids.length, "Parameter", "Parameter")} •{" "}
                  {formatCount(form.klassifikationen.length, "KSG-Klasse", "KSG-Klassen")}
                </strong>
              </div>
              <div className="detail-grid__item">
                <span>Labore und Zeitraum</span>
                <strong>
                  {formatCount(form.labor_ids.length, "Labor", "Labore")} • {formatDate(form.datum_von)} bis{" "}
                  {formatDate(form.datum_bis)}
                </strong>
              </div>
              <div className="detail-grid__item">
                <span>Ausgabeoptionen</span>
                <strong>
                  {selectedAnsicht === "arztbericht"
                    ? doctorOptionSummary
                    : "Verlaufspunkte mit Messwerttyp, Datum und Labor"}
                </strong>
              </div>
            </div>

            {isDateRangeInvalid && activePanel !== "filters" ? (
              <p className="form-error">Das Bis-Datum darf nicht vor dem Von-Datum liegen.</p>
            ) : null}
            {selectedAnsicht === "arztbericht" && doctorPdfMutation.isError ? (
              <p className="form-error">{doctorPdfMutation.error.message}</p>
            ) : null}
            {selectedAnsicht === "verlauf" && trendPdfMutation.isError ? (
              <p className="form-error">{trendPdfMutation.error.message}</p>
            ) : null}

            {renderSelectedPreview()}
          </article>

          <MesswertDetailCard
            messwertId={selectedMesswertId}
            title="Ausgewählter Messwert mit Referenzen"
            emptyText="Bitte in einer Berichtsvorschau einen Messwert auswählen."
          />
        </div>
      </div>
    </section>
  );
}
