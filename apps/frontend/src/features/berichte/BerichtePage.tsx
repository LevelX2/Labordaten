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
  BerichtSortierung,
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
  include_referenzgrafik: boolean;
  include_labor: boolean;
  include_befundbemerkung: boolean;
  include_messwertbemerkung: boolean;
  sortierung: BerichtSortierung;
  auffaelligkeiten_zuerst: boolean;
};

type BerichtAnsichtKey = "arztbericht" | "verlauf";
type BerichtPanelKey = "filters" | "templates" | "settings";
type BerichtPreviewItem = {
  person_anzeigename: string;
  parameter_anzeigename: string;
  datum?: string | null;
  primaere_berichtsgruppe?: string | null;
  sortierung_in_gruppe?: number | null;
  ausserhalb_referenzbereich?: boolean | null;
};

const initialForm: BerichtFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  klassifikationen: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  include_referenzbereich: true,
  include_referenzgrafik: false,
  include_labor: true,
  include_befundbemerkung: true,
  include_messwertbemerkung: true,
  sortierung: "person_entnahmezeitpunkt",
  auffaelligkeiten_zuerst: false
};

const REPORT_SORT_OPTIONS: Array<{ value: BerichtSortierung; label: string }> = [
  { value: "person_entnahmezeitpunkt", label: "Person alphabetisch, Entnahmezeitpunkt" },
  {
    value: "person_berichtsgruppe_sortierung_entnahmezeitpunkt",
    label: "Person, primäre Berichtsgruppe, Gruppensortierung, Entnahmezeitpunkt"
  }
];

const REPORT_VIEW_OPTIONS: Array<{ key: BerichtAnsichtKey; title: string; description: string }> = [
  {
    key: "arztbericht",
    title: "Arztbericht Liste",
    description: "Übersicht der passenden Messwerte und ausgewählten Zusatzangaben für den Arztbericht."
  },
  {
    key: "verlauf",
    title: "Verlaufsbericht Zeitachse",
    description: "Zeitliche Übersicht der ausgewählten Parameter mit den aktuellen Berichtsfiltern."
  }
];

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

function readBerichtSortierung(value: unknown): BerichtSortierung {
  return REPORT_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as BerichtSortierung)
    : initialForm.sortierung;
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
            include_referenzgrafik: form.include_referenzgrafik,
            include_labor: form.include_labor,
            include_befundbemerkung: form.include_befundbemerkung,
            include_messwertbemerkung: form.include_messwertbemerkung,
            sortierung: form.sortierung,
            auffaelligkeiten_zuerst: form.auffaelligkeiten_zuerst,
            einheit_auswahl: {}
          }
        : {
            sortierung: form.sortierung,
            auffaelligkeiten_zuerst: form.auffaelligkeiten_zuerst,
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
    include_referenzgrafik: readBoolean(optionen.include_referenzgrafik, initialForm.include_referenzgrafik),
    include_labor: readBoolean(optionen.include_labor, initialForm.include_labor),
    include_befundbemerkung: readBoolean(optionen.include_befundbemerkung, initialForm.include_befundbemerkung),
    include_messwertbemerkung: readBoolean(optionen.include_messwertbemerkung, initialForm.include_messwertbemerkung),
    sortierung: readBerichtSortierung(optionen.sortierung),
    auffaelligkeiten_zuerst: readBoolean(optionen.auffaelligkeiten_zuerst, initialForm.auffaelligkeiten_zuerst)
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

function formatSelectionSummary<TItem>(
  selectedIds: string[],
  items: TItem[],
  getId: (item: TItem) => string,
  getLabel: (item: TItem) => string,
  emptyLabel: string,
  fallbackSingular: string,
  fallbackPlural: string
): string {
  if (!selectedIds.length) {
    return emptyLabel;
  }

  const labelsById = new Map(items.map((item) => [getId(item), getLabel(item)]));
  const labels = selectedIds.map((id) => labelsById.get(id)).filter((label): label is string => Boolean(label));
  if (!labels.length) {
    return formatCount(selectedIds.length, fallbackSingular, fallbackPlural);
  }

  const visibleLabels = labels.slice(0, 3);
  const remainingCount = selectedIds.length - visibleLabels.length;
  return remainingCount > 0 ? `${visibleLabels.join(", ")} + ${remainingCount} weitere` : visibleLabels.join(", ");
}

function formatTemplateSummary(selectedTemplate: AnsichtVorlage | null, templates: AnsichtVorlage[]): string {
  if (selectedTemplate) {
    return selectedTemplate.name;
  }
  if (!templates.length) {
    return "Keine Vorlage vorhanden";
  }

  const names = templates.slice(0, 2).map((template) => template.name);
  const remainingCount = templates.length - names.length;
  const suffix = remainingCount > 0 ? ` + ${remainingCount} weitere` : "";
  return `${names.join(", ")}${suffix}`;
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
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

function buildDoctorOptionSummary(form: BerichtFormState): string {
  const options = [
    form.include_referenzbereich ? "Referenzbereich" : null,
    form.include_referenzgrafik ? "Referenzgrafik" : null,
    form.include_labor ? "Labor" : null,
    form.include_befundbemerkung ? "Befundbemerkung" : null,
    form.include_messwertbemerkung ? "Messwertbemerkung" : null
  ].filter(Boolean);

  return options.length ? options.join(" • ") : "Nur Pflichtfelder";
}

function renderReferenceGraphic(item: ArztberichtResponse["eintraege"][number]) {
  const lower = item.referenz_untere_num;
  const upper = item.referenz_obere_num;
  const value = item.wert_num;
  if (
    value === null ||
    value === undefined ||
    ((lower === null || lower === undefined) && (upper === null || upper === undefined))
  ) {
    return <span className="reference-graphic reference-graphic--empty">—</span>;
  }

  let referenceMin: number | null | undefined;
  let referenceMax: number | null | undefined;
  let scaleMin: number;
  let scaleMax: number;
  if (lower !== null && lower !== undefined && upper !== null && upper !== undefined && lower < upper) {
    const referenceSpan = upper - lower;
    referenceMin = lower;
    referenceMax = upper;
    scaleMin = lower - referenceSpan * 0.5;
    scaleMax = upper + referenceSpan * 0.5;
  } else if (upper !== null && upper !== undefined) {
    referenceMin = Math.min(value, upper) - Math.max(Math.abs(upper) * 0.5, 1);
    referenceMax = upper;
    scaleMin = referenceMin;
    scaleMax = Math.max(value, upper) + Math.max(Math.abs(upper) * 0.25, 1);
  } else if (lower !== null && lower !== undefined) {
    referenceMin = lower;
    referenceMax = Math.max(value, lower) + Math.max(Math.abs(lower) * 0.5, 1);
    scaleMin = Math.min(value, lower) - Math.max(Math.abs(lower) * 0.25, 1);
    scaleMax = referenceMax;
  } else {
    return <span className="reference-graphic reference-graphic--empty">—</span>;
  }

  if (referenceMin === null || referenceMin === undefined || referenceMax === null || referenceMax === undefined || scaleMin >= scaleMax) {
    return <span className="reference-graphic reference-graphic--empty">—</span>;
  }

  const toPercent = (number: number) => Math.min(Math.max(((number - scaleMin) / (scaleMax - scaleMin)) * 100, 0), 100);
  const rangeLeft = toPercent(referenceMin);
  const rangeRight = toPercent(referenceMax);
  const pointLeft = toPercent(value);

  return (
    <span
      className={`reference-graphic ${item.ausserhalb_referenzbereich ? "reference-graphic--outside" : ""}`}
      aria-label={`Messwert ${item.wert_anzeige} im Verhältnis zum Referenzbereich ${lower} bis ${upper}`}
    >
      <span className="reference-graphic__track" />
      <span
        className="reference-graphic__range"
        style={{ left: `${rangeLeft}%`, width: `${Math.max(rangeRight - rangeLeft, 2)}%` }}
      />
      <span className="reference-graphic__point" style={{ left: `${pointLeft}%` }} />
    </span>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("PDF-Vorschau konnte nicht gelesen werden.")));
    reader.readAsDataURL(blob);
  });
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "de", { sensitivity: "base" });
}

function compareReportPreviewItems(
  left: BerichtPreviewItem,
  right: BerichtPreviewItem,
  sortierung: BerichtSortierung,
  auffaelligkeiten_zuerst: boolean
): number {
  const leftIsAbnormal = left.ausserhalb_referenzbereich === true;
  const rightIsAbnormal = right.ausserhalb_referenzbereich === true;
  if (auffaelligkeiten_zuerst && leftIsAbnormal !== rightIsAbnormal) {
    return leftIsAbnormal ? -1 : 1;
  }

  const personCompare = compareText(left.person_anzeigename, right.person_anzeigename);
  if (personCompare) {
    return personCompare;
  }

  if (sortierung === "person_berichtsgruppe_sortierung_entnahmezeitpunkt") {
    const leftHasNoGroup = left.primaere_berichtsgruppe ? 0 : 1;
    const rightHasNoGroup = right.primaere_berichtsgruppe ? 0 : 1;
    if (leftHasNoGroup !== rightHasNoGroup) {
      return leftHasNoGroup - rightHasNoGroup;
    }

    const groupCompare = compareText(left.primaere_berichtsgruppe ?? "", right.primaere_berichtsgruppe ?? "");
    if (groupCompare) {
      return groupCompare;
    }

    const leftHasNoGroupSort = left.sortierung_in_gruppe === null || left.sortierung_in_gruppe === undefined ? 1 : 0;
    const rightHasNoGroupSort = right.sortierung_in_gruppe === null || right.sortierung_in_gruppe === undefined ? 1 : 0;
    if (leftHasNoGroupSort !== rightHasNoGroupSort) {
      return leftHasNoGroupSort - rightHasNoGroupSort;
    }

    const groupSortCompare = (left.sortierung_in_gruppe ?? 0) - (right.sortierung_in_gruppe ?? 0);
    if (groupSortCompare) {
      return groupSortCompare;
    }

    const parameterCompare = compareText(left.parameter_anzeigename, right.parameter_anzeigename);
    if (parameterCompare) {
      return parameterCompare;
    }

    return (left.datum ?? "").localeCompare(right.datum ?? "");
  }

  const dateCompare = (left.datum ?? "").localeCompare(right.datum ?? "");
  if (dateCompare) {
    return dateCompare;
  }

  return compareText(left.parameter_anzeigename, right.parameter_anzeigename);
}

function sortReportPreviewItems<TItem extends BerichtPreviewItem>(
  items: TItem[],
  sortierung: BerichtSortierung,
  auffaelligkeiten_zuerst: boolean
): TItem[] {
  return [...items].sort((left, right) => compareReportPreviewItems(left, right, sortierung, auffaelligkeiten_zuerst));
}

function formatReportSortLabel(sortierung: BerichtSortierung): string {
  return REPORT_SORT_OPTIONS.find((option) => option.value === sortierung)?.label ?? REPORT_SORT_OPTIONS[0].label;
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
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);
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
    include_referenzgrafik: form.include_referenzgrafik,
    include_labor: form.include_labor,
    include_befundbemerkung: form.include_befundbemerkung,
    include_messwertbemerkung: form.include_messwertbemerkung,
    sortierung: form.sortierung,
    auffaelligkeiten_zuerst: form.auffaelligkeiten_zuerst
  };

  const trendPayload = {
    person_ids: form.person_ids,
    laborparameter_ids: form.laborparameter_ids,
    gruppen_ids: form.gruppen_ids,
    klassifikationen: form.klassifikationen,
    labor_ids: form.labor_ids,
    datum_von: form.datum_von || null,
    datum_bis: form.datum_bis || null,
    sortierung: form.sortierung,
    auffaelligkeiten_zuerst: form.auffaelligkeiten_zuerst
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
      const filename = result.filename ?? "arztbericht.pdf";
      const url = await blobToDataUrl(result.blob);
      setPdfPreview({ url, filename });
    }
  });

  const trendPdfMutation = useMutation({
    mutationFn: async () => {
      const result = await apiFetchBlob("/api/berichte/verlauf-pdf", {
        method: "POST",
        body: JSON.stringify(trendPayload)
      });
      const filename = result.filename ?? "verlauf.pdf";
      const url = await blobToDataUrl(result.blob);
      setPdfPreview({ url, filename });
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
  const sortedDoctorEntries = useMemo(
    () =>
      sortReportPreviewItems(
        doctorReportMutation.data?.eintraege ?? [],
        form.sortierung,
        form.auffaelligkeiten_zuerst
      ),
    [doctorReportMutation.data, form.auffaelligkeiten_zuerst, form.sortierung]
  );
  const sortedTrendPoints = useMemo(
    () =>
      sortReportPreviewItems(
        trendReportMutation.data?.punkte ?? [],
        form.sortierung,
        form.auffaelligkeiten_zuerst
      ),
    [form.auffaelligkeiten_zuerst, form.sortierung, trendReportMutation.data]
  );
  const doctorSummary = useMemo(() => {
    const items = sortedDoctorEntries;
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
  }, [sortedDoctorEntries]);
  const trendSummary = useMemo(() => {
    const items = sortedTrendPoints;
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
  }, [sortedTrendPoints]);

  const doctorOptionSummary = useMemo(() => buildDoctorOptionSummary(form), [form]);

  const selectedEntry = REPORT_VIEW_OPTIONS.find((entry) => entry.key === selectedAnsicht) ?? REPORT_VIEW_OPTIONS[0];
  const personSummary = useMemo(
    () =>
      formatSelectionSummary(
        form.person_ids,
        personenQuery.data ?? [],
        (person) => person.id,
        (person) => person.anzeigename,
        "Keine Person ausgewählt",
        "Person",
        "Personen"
      ),
    [form.person_ids, personenQuery.data]
  );
  const groupSummary = useMemo(
    () =>
      formatSelectionSummary(
        form.gruppen_ids,
        gruppenQuery.data ?? [],
        (gruppe) => gruppe.id,
        (gruppe) => gruppe.name,
        "Alle Gruppen",
        "Parametergruppe",
        "Parametergruppen"
      ),
    [form.gruppen_ids, gruppenQuery.data]
  );
  const parameterSummary = useMemo(
    () =>
      formatSelectionSummary(
        form.laborparameter_ids,
        parameterQuery.data ?? [],
        (parameter) => parameter.id,
        (parameter) => parameter.anzeigename,
        "Alle Parameter",
        "Parameter",
        "Parameter"
      ),
    [form.laborparameter_ids, parameterQuery.data]
  );
  const klassifikationSummary = useMemo(
    () =>
      form.klassifikationen.length
        ? form.klassifikationen.map((klassifikation) => formatParameterKlassifikation(klassifikation)).join(", ")
        : "Alle KSG-Klassen",
    [form.klassifikationen]
  );
  const laborSummary = useMemo(
    () =>
      formatSelectionSummary(
        form.labor_ids,
        laboreQuery.data ?? [],
        (labor) => labor.id,
        (labor) => labor.name,
        "Alle Labore",
        "Labor",
        "Labore"
      ),
    [form.labor_ids, laboreQuery.data]
  );
  const templatesForSelectedType = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.vorlage_typ === selectedTemplateType),
    [selectedTemplateType, templatesQuery.data]
  );
  const selectedTemplate = templatesForSelectedType.find((template) => template.id === selectedTemplateId) ?? null;
  const templateSummary = useMemo(
    () => formatTemplateSummary(selectedTemplate, templatesForSelectedType),
    [selectedTemplate, templatesForSelectedType]
  );
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

  useEffect(
    () => () => {
      if (pdfPreview && pdfPreview.url.startsWith("blob:")) {
        window.URL.revokeObjectURL(pdfPreview.url);
      }
    },
    [pdfPreview]
  );

  const closePdfPreview = () => {
    setPdfPreview(null);
  };

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
      doctorReportMutation.mutate();
      doctorPdfMutation.mutate();
      setActivePanel(null);
      return;
    }
    trendReportMutation.mutate();
    trendPdfMutation.mutate();
    setActivePanel(null);
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

  const renderPreviewActions = () => (
    <div className="report-preview-actions">
      <button
        type="button"
        onClick={handlePreviewLoad}
        disabled={previewPending || !form.person_ids.length || isDateRangeInvalid}
      >
        {previewPending ? "Lädt..." : "Vorschau laden"}
      </button>
      <button
        type="button"
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
  );

  const renderSelectedPreview = () => {
    if (selectedAnsicht === "arztbericht") {
      if (doctorReportMutation.isError) {
        return <p className="form-error">{doctorReportMutation.error.message}</p>;
      }

      if (!doctorReportMutation.data) {
        return (
          <div className="report-empty-preview">
            <p>
              Lade zuerst eine Vorschau, damit Du die aktuellen Berichtsinhalte, Kennzahlen und auswählbaren Messwerte
              prüfen kannst.
            </p>
            {renderPreviewActions()}
          </div>
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

          {renderPreviewActions()}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Gruppe</th>
                  <th>Parameter</th>
                  <th>KSG</th>
                  <th>Datum</th>
                  <th>Wert</th>
                  {form.include_referenzgrafik ? <th>Einordnung</th> : null}
                  <th>Referenz</th>
                  {form.include_labor ? <th>Labor</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedDoctorEntries.map((item) => (
                  <tr
                    key={item.messwert_id}
                    onClick={() => setSelectedMesswertId(item.messwert_id)}
                    className={item.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                  >
                    <td>{item.person_anzeigename}</td>
                    <td>{item.primaere_berichtsgruppe || "Ohne Gruppe"}</td>
                    <td>{item.parameter_anzeigename}</td>
                    <td>{formatParameterKlassifikation(item.parameter_primaere_klassifikation)}</td>
                    <td>{formatDate(item.datum)}</td>
                    <td>{[item.wert_anzeige, item.einheit].filter(Boolean).join(" ")}</td>
                    {form.include_referenzgrafik ? <td>{renderReferenceGraphic(item)}</td> : null}
                    <td>{item.referenzbereich || "—"}</td>
                    {form.include_labor ? <td>{item.labor_name || "—"}</td> : null}
                  </tr>
                ))}
                {!sortedDoctorEntries.length ? (
                  <tr>
                    <td colSpan={7 + (form.include_referenzgrafik ? 1 : 0) + (form.include_labor ? 1 : 0)}>
                      Für die aktuelle Auswahl gibt es noch keine passenden Werte.
                    </td>
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
        <div className="report-empty-preview">
          <p>
            Lade zuerst eine Vorschau, damit Du die Verlaufspunkte, die spätere PDF-Ausgabe und die Messwertdetails
            entlang der aktuellen Auswahl prüfen kannst.
          </p>
          {renderPreviewActions()}
        </div>
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

        {renderPreviewActions()}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Gruppe</th>
                <th>Parameter</th>
                <th>KSG</th>
                <th>Datum</th>
                <th>Typ</th>
                <th>Wert</th>
                <th>Labor</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrendPoints.map((punkt) => (
                <tr
                  key={punkt.messwert_id}
                  onClick={() => setSelectedMesswertId(punkt.messwert_id)}
                  className={punkt.messwert_id === selectedMesswertId ? "row-selected" : undefined}
                >
                  <td>{punkt.person_anzeigename}</td>
                  <td>{punkt.primaere_berichtsgruppe || "Ohne Gruppe"}</td>
                  <td>{punkt.parameter_anzeigename}</td>
                  <td>{formatParameterKlassifikation(punkt.parameter_primaere_klassifikation)}</td>
                  <td>{formatDate(punkt.datum)}</td>
                  <td>{punkt.wert_typ}</td>
                  <td>{[punkt.wert_anzeige, punkt.einheit].filter(Boolean).join(" ")}</td>
                  <td>{punkt.labor_name || "—"}</td>
                </tr>
              ))}
              {!sortedTrendPoints.length ? (
                <tr>
                  <td colSpan={8}>Für die aktuelle Auswahl gibt es noch keinen Verlauf.</td>
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

      <div className="parameter-workspace parameter-workspace--single">
        <div className="parameter-main">
          <article className="card">
            <div className="parameter-detail__header">
              <div>
                <h3 className="parameter-detail__title">{selectedEntry.title}</h3>
                <p>{selectedEntry.description}</p>
              </div>
            </div>

            <div className="parameter-toolrail">
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "templates" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "templates" ? null : "templates"))}
              >
                Vorlagen <span className="parameter-count-badge">{templatesForSelectedType.length}</span>
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "filters" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "filters" ? null : "filters"))}
              >
                Filter bearbeiten
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "settings" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => setActivePanel((current) => (current === "settings" ? null : "settings"))}
              >
                Einstellungen
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

            {activePanel === "settings" ? (
              <article className="card card--soft parameter-action-panel">
                <div className="parameter-panel__header">
                  <div>
                    <h3>Berichtseinstellungen</h3>
                    <p>Diese Optionen steuern Ansicht, Sortierung und Ausgabe, ohne die Messwertauswahl zu filtern.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setActivePanel(null)}
                    aria-label="Panel Berichtseinstellungen schließen"
                    title="Panel Berichtseinstellungen schließen"
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
                  <div className="field field--full">
                    <label>
                      <span>Berichtstyp</span>
                      <select
                        value={selectedAnsicht}
                        onChange={(event) => setSelectedAnsicht(event.target.value as BerichtAnsichtKey)}
                      >
                        {REPORT_VIEW_OPTIONS.map((option) => (
                          <option value={option.key} key={option.key}>
                            {option.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="field field--full">
                    <label>
                      <span>Berichtssortierung</span>
                      <select
                        value={form.sortierung}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            sortierung: event.target.value as BerichtSortierung
                          }))
                        }
                      >
                        {REPORT_SORT_OPTIONS.map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="checkbox-grid">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.auffaelligkeiten_zuerst}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, auffaelligkeiten_zuerst: event.target.checked }))
                          }
                        />
                        <span>Auffälligkeiten zuerst</span>
                      </label>
                    </div>
                  </div>

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
                          checked={form.include_referenzgrafik}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, include_referenzgrafik: event.target.checked }))
                          }
                        />
                        <span>Referenzgrafik</span>
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
                </form>
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
                  </div>
                </form>
              </article>
            ) : null}

            <div className="detail-grid">
              <div className="detail-grid__item">
                <span>Vorlage</span>
                <strong>
                  {templateSummary} •{" "}
                  {formatCount(templatesForSelectedType.length, "Vorlage", "Vorlagen")}
                  {hasUnsavedTemplateChanges ? " • geändert" : ""}
                </strong>
              </div>
              <div className="detail-grid__item">
                <span>Personen</span>
                <strong>{personSummary}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Parametergruppen</span>
                <strong>{groupSummary}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Parameter</span>
                <strong>{parameterSummary}</strong>
              </div>
              <div className="detail-grid__item">
                <span>KSG-Klassen</span>
                <strong>{klassifikationSummary}</strong>
              </div>
              <div className="detail-grid__item">
                <span>Labore und Zeitraum</span>
                <strong>
                  {laborSummary} • {formatDate(form.datum_von)} bis {formatDate(form.datum_bis)}
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
              <div className="detail-grid__item">
                <span>Sortierung</span>
                <strong>
                  {formatReportSortLabel(form.sortierung)}
                  {form.auffaelligkeiten_zuerst ? " • Auffälligkeiten zuerst" : ""}
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

          {selectedMesswertId ? (
            <MesswertDetailCard messwertId={selectedMesswertId} title="Ausgewählter Messwert mit Referenzen" />
          ) : null}
        </div>
      </div>

      {pdfPreview ? (
        <div className="dialog-backdrop report-pdf-preview-backdrop" role="presentation">
          <section
            className="dialog-panel report-pdf-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-pdf-preview-title"
          >
            <header className="dialog-panel__header report-pdf-preview-dialog__header">
              <div>
                <span className="report-pdf-preview-dialog__eyebrow">PDF-Vorschau</span>
                <h3 id="report-pdf-preview-title">{pdfPreview.filename}</h3>
              </div>
              <button
                type="button"
                className="dialog-panel__close"
                onClick={closePdfPreview}
                aria-label="PDF-Vorschau schließen"
              >
                Schließen
              </button>
            </header>
            <div className="report-pdf-preview-dialog__body">
              <embed title={pdfPreview.filename} src={pdfPreview.url} type="application/pdf" />
            </div>
            <footer className="dialog-panel__footer">
              <button type="button" className="button--secondary" onClick={() => downloadUrl(pdfPreview.url, pdfPreview.filename)}>
                PDF herunterladen
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
