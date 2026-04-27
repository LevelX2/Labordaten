import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../../shared/api/client";
import { buildZielbereichCreatePayload, buildZielbereichUpdatePayload } from "../../shared/api/payloadBuilders";
import { LoeschAktionPanel } from "../../shared/components/LoeschAktionPanel";
import {
  KONTEXT_GESCHLECHT_OPTIONS,
  PARAMETER_KLASSIFIKATION_FILTER_OPTIONS,
  PARAMETER_KLASSIFIKATION_OPTIONS,
  WERT_TYP_OPTIONS,
  ZIELBEREICH_QUELLE_TYP_OPTIONS,
  ZIELBEREICH_TYP_OPTIONS,
  ZIELRICHTUNG_OPTIONS,
  formatGeschlechtCode,
  formatParameterKlassifikation,
  formatZielbereichQuelleTyp,
  formatZielbereichTyp,
  formatZielrichtung,
  formatWertTyp
} from "../../shared/constants/fieldOptions";
import type {
  Einheit,
  Parameter,
  ParameterAlias,
  ParameterAliasSuggestion,
  ParameterKlassifikation,
  ParameterKlassifikationCode,
  ParameterKlassifikationCreatePayload,
  ParameterKlassifikationDeleteResult,
  ParameterDuplicateSuppression,
  ParameterDuplicateSuggestion,
  ParameterGruppenzuordnung,
  ParameterMergeResult,
  ParameterPrimaereKlassifikationUpdatePayload,
  ParameterPrimaereKlassifikationUpdateResult,
  ParameterRenameResult,
  ParameterStandardEinheitUpdatePayload,
  ParameterStandardEinheitUpdateResult,
  ParameterUmrechnungsregel,
  ParameterUmrechnungsregelCreatePayload,
  ParameterUsageSummary,
  ParameterWissensseiteUpdatePayload,
  ParameterWissensseiteUpdateResult,
  UmrechnungsregelTyp,
  WertTyp,
  WissensseiteListItem,
  ZielbereichQuelle,
  ZielbereichQuelleCreatePayload,
  ZielbereichQuelleTyp,
  Zielrichtung,
  ZielbereichTyp,
  ZielbereichUpdatePayload,
  ZielwertPaket,
  ZielwertPaketCreatePayload,
  ZielwertPaketUpdatePayload,
  Zielbereich
} from "../../shared/types/api";

type ParameterFormState = {
  anzeigename: string;
  standard_einheit: string;
  wert_typ_standard: WertTyp;
  primaere_klassifikation: string;
  beschreibung: string;
};

type ParameterAliasFormState = {
  laborparameter_id: string;
  alias_text: string;
  bemerkung: string;
};

type ParameterRenameFormState = {
  parameter_id: string;
  neuer_name: string;
  alten_namen_als_alias_anlegen: boolean;
};

type ParameterStandardEinheitFormState = {
  parameter_id: string;
  standard_einheit: string;
};

type ParameterWissensseiteFormState = {
  parameter_id: string;
  pfad_relativ: string;
};

type ParameterKlassifikationFormState = {
  parameter_id: string;
  primaere_klassifikation: string;
  zusatz_klassifikation: ParameterKlassifikationCode;
  kontext_beschreibung: string;
  begruendung: string;
};

type ZielbereichFormState = {
  parameter_id: string;
  wert_typ: WertTyp;
  zielbereich_typ: ZielbereichTyp;
  zielrichtung: Zielrichtung;
  zielbereich_quelle_id: string;
  zielwert_paket_id: string;
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  quelle_original_text: string;
  quelle_stelle: string;
  bemerkung: string;
};

type ZielbereichQuelleFormState = {
  name: string;
  quellen_typ: ZielbereichQuelleTyp;
  titel: string;
  jahr: string;
  version: string;
  bemerkung: string;
};

type ZielwertPaketFormState = {
  paket_schluessel: string;
  name: string;
  version: string;
  jahr: string;
  beschreibung: string;
  bemerkung: string;
};

type ParameterUmrechnungsregelFormState = {
  laborparameter_id: string;
  von_einheit: string;
  nach_einheit: string;
  regel_typ: UmrechnungsregelTyp;
  faktor: string;
  offset: string;
  formel_text: string;
  rundung_stellen: string;
  quelle_beschreibung: string;
  bemerkung: string;
};

type ManualMergeFormState = {
  ziel_parameter_id: string;
  gemeinsamer_name: string;
};

type MergeConfirmationState = {
  ziel_parameter_id: string;
  quell_parameter_id: string;
  ziel_parameter_anzeigename: string;
  quell_parameter_anzeigename: string;
  gemeinsamer_name: string;
};

type ParameterPanelKey =
  | "create"
  | "standardUnit"
  | "classification"
  | "knowledge"
  | "rename"
  | "alias"
  | "conversion"
  | "zielbereich"
  | "aliasSuggestions"
  | "duplicates"
  | "delete";

type RelatedDataSectionKey = "classifications" | "aliases" | "conversions" | "ranges" | "groups";
type DuplicateViewScope = "all" | "selected";
type DuplicateCheckSensitivity = "sicher" | "ausgewogen" | "grosszuegig";

const initialForm: ParameterFormState = {
  anzeigename: "",
  standard_einheit: "",
  wert_typ_standard: "numerisch",
  primaere_klassifikation: "",
  beschreibung: ""
};

const initialAliasForm: ParameterAliasFormState = {
  laborparameter_id: "",
  alias_text: "",
  bemerkung: ""
};

const initialRenameForm: ParameterRenameFormState = {
  parameter_id: "",
  neuer_name: "",
  alten_namen_als_alias_anlegen: true
};

const initialStandardEinheitForm: ParameterStandardEinheitFormState = {
  parameter_id: "",
  standard_einheit: ""
};

const initialWissensseiteForm: ParameterWissensseiteFormState = {
  parameter_id: "",
  pfad_relativ: ""
};

const initialKlassifikationForm: ParameterKlassifikationFormState = {
  parameter_id: "",
  primaere_klassifikation: "",
  zusatz_klassifikation: "krankwert",
  kontext_beschreibung: "",
  begruendung: ""
};

const initialZielbereichForm: ZielbereichFormState = {
  parameter_id: "",
  wert_typ: "numerisch",
  zielbereich_typ: "optimalbereich",
  zielrichtung: "innerhalb_bereich",
  zielbereich_quelle_id: "",
  zielwert_paket_id: "",
  untere_grenze_num: "",
  obere_grenze_num: "",
  einheit: "",
  soll_text: "",
  geschlecht_code: "",
  quelle_original_text: "",
  quelle_stelle: "",
  bemerkung: ""
};

const initialZielbereichQuelleForm: ZielbereichQuelleFormState = {
  name: "",
  quellen_typ: "experte",
  titel: "",
  jahr: "",
  version: "",
  bemerkung: ""
};

const initialZielwertPaketForm: ZielwertPaketFormState = {
  paket_schluessel: "",
  name: "",
  version: "",
  jahr: "",
  beschreibung: "",
  bemerkung: ""
};

const initialUmrechnungsregelForm: ParameterUmrechnungsregelFormState = {
  laborparameter_id: "",
  von_einheit: "",
  nach_einheit: "",
  regel_typ: "faktor",
  faktor: "",
  offset: "",
  formel_text: "",
  rundung_stellen: "",
  quelle_beschreibung: "",
  bemerkung: ""
};

const initialManualMergeForm: ManualMergeFormState = {
  ziel_parameter_id: "",
  gemeinsamer_name: ""
};

const UMRECHNUNGSREGEL_TYP_OPTIONS: Array<{ value: UmrechnungsregelTyp; label: string }> = [
  { value: "faktor", label: "Faktor" },
  { value: "faktor_plus_offset", label: "Faktor + Offset" },
  { value: "formel", label: "Formel" }
];

const DUPLICATE_CHECK_SENSITIVITY_OPTIONS: Array<{
  value: DuplicateCheckSensitivity;
  label: string;
  description: string;
}> = [
  {
    value: "sicher",
    label: "Sicher",
    description: "Zeigt nur sehr belastbare Paare mit klarer Namens- oder Kontextnähe."
  },
  {
    value: "ausgewogen",
    label: "Ausgewogen",
    description: "Der Standard. Gute Balance zwischen verpassten und zu großzügigen Vorschlägen."
  },
  {
    value: "grosszuegig",
    label: "Großzügig",
    description: "Zeigt auch weichere Namensvarianten wie enthaltene Zusatzbegriffe zur manuellen Prüfung."
  }
];

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatUsageSummary(summary: ParameterUsageSummary): string {
  const parts = [
    `${summary.messwerte_anzahl} Messwerte`,
    `${summary.zielbereiche_anzahl} Zielbereiche`,
    `${summary.gruppen_anzahl} Parametergruppen`,
    `${summary.planung_zyklisch_anzahl + summary.planung_einmalig_anzahl} Planungen`
  ];
  return parts.join(" • ");
}

function summarizeDescription(description?: string | null): string {
  const text = description?.trim();
  if (!text) {
    return "Noch keine Erläuterung hinterlegt.";
  }

  if (text.length <= 140) {
    return text;
  }

  return `${text.slice(0, 137).trimEnd()}...`;
}

function formatZielbereichValue(zielbereich: Zielbereich): string {
  if (zielbereich.wert_typ === "numerisch") {
    return `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`;
  }

  return zielbereich.soll_text || "—";
}

function formatZielbereichQuelle(quelle?: ZielbereichQuelle | null): string {
  if (!quelle) {
    return "Keine Quelle";
  }

  const details = [quelle.titel, quelle.jahr?.toString(), quelle.version].filter(Boolean);
  return details.length ? `${quelle.name} · ${details.join(" · ")}` : quelle.name;
}

function formatZielwertPaket(paket?: ZielwertPaket | null): string {
  if (!paket) {
    return "Kein Paket";
  }

  const details = [paket.version, paket.jahr?.toString()].filter(Boolean);
  return details.length ? `${paket.name} · ${details.join(" · ")}` : paket.name;
}

function formatUmrechnungsregel(regel: ParameterUmrechnungsregel): string {
  if (regel.regel_typ === "faktor") {
    return `x * ${regel.faktor ?? "?"}`;
  }
  if (regel.regel_typ === "faktor_plus_offset") {
    return `x * ${regel.faktor ?? "?"} + ${regel.offset ?? 0}`;
  }
  return regel.formel_text || "â€”";
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildDuplicateSuggestionKey(zielParameterId: string, quellParameterId: string): string {
  return `${zielParameterId}:${quellParameterId}`;
}

function normalizeUnitForComparison(value?: string | null): string {
  return (value ?? "").trim().toLocaleLowerCase("de-DE");
}

export function ParameterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ParameterFormState>(initialForm);
  const [aliasForm, setAliasForm] = useState<ParameterAliasFormState>(initialAliasForm);
  const [renameForm, setRenameForm] = useState<ParameterRenameFormState>(initialRenameForm);
  const [standardEinheitForm, setStandardEinheitForm] =
    useState<ParameterStandardEinheitFormState>(initialStandardEinheitForm);
  const [wissensseiteForm, setWissensseiteForm] =
    useState<ParameterWissensseiteFormState>(initialWissensseiteForm);
  const [klassifikationForm, setKlassifikationForm] =
    useState<ParameterKlassifikationFormState>(initialKlassifikationForm);
  const [zielbereichForm, setZielbereichForm] = useState<ZielbereichFormState>(initialZielbereichForm);
  const [zielbereichQuelleForm, setZielbereichQuelleForm] =
    useState<ZielbereichQuelleFormState>(initialZielbereichQuelleForm);
  const [zielwertPaketForm, setZielwertPaketForm] = useState<ZielwertPaketFormState>(initialZielwertPaketForm);
  const [editingZielbereichId, setEditingZielbereichId] = useState<string | null>(null);
  const [umrechnungsregelForm, setUmrechnungsregelForm] =
    useState<ParameterUmrechnungsregelFormState>(initialUmrechnungsregelForm);
  const [manualMergeForm, setManualMergeForm] = useState<ManualMergeFormState>(initialManualMergeForm);
  const [mergeConfirmation, setMergeConfirmation] = useState<MergeConfirmationState | null>(null);
  const [mergeNameBySuggestion, setMergeNameBySuggestion] = useState<Record<string, string>>({});
  const [pendingDuplicateSuppressionKey, setPendingDuplicateSuppressionKey] = useState<string | null>(null);
  const [lastMergeResult, setLastMergeResult] = useState<ParameterMergeResult | null>(null);
  const [lastRenameResult, setLastRenameResult] = useState<ParameterRenameResult | null>(null);
  const [lastStandardEinheitResult, setLastStandardEinheitResult] =
    useState<ParameterStandardEinheitUpdateResult | null>(null);
  const [lastKlassifikationResult, setLastKlassifikationResult] =
    useState<ParameterPrimaereKlassifikationUpdateResult | null>(null);
  const [parameterSearchQuery, setParameterSearchQuery] = useState("");
  const [klassifikationFilter, setKlassifikationFilter] = useState("");
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ParameterPanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [expandedRelatedSections, setExpandedRelatedSections] = useState<Record<RelatedDataSectionKey, boolean>>({
    classifications: true,
    aliases: true,
    conversions: false,
    ranges: false,
    groups: false
  });
  const [duplicateViewScope, setDuplicateViewScope] = useState<DuplicateViewScope>("all");
  const [duplicateSensitivity, setDuplicateSensitivity] = useState<DuplicateCheckSensitivity>("ausgewogen");

  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const einheitenQuery = useQuery({
    queryKey: ["einheiten"],
    queryFn: () => apiFetch<Einheit[]>("/api/einheiten")
  });
  const wissensseitenQuery = useQuery({
    queryKey: ["wissensbasis", "seiten", "parameter-link"],
    queryFn: () => apiFetch<WissensseiteListItem[]>("/api/wissensbasis/seiten"),
    enabled: activePanel === "knowledge"
  });

  const sortedParameters = useMemo(
    () =>
      [...(parameterQuery.data ?? [])].sort((left, right) =>
        left.anzeigename.localeCompare(right.anzeigename, "de-DE", { sensitivity: "base" })
      ),
    [parameterQuery.data]
  );

  useEffect(() => {
    if (!sortedParameters.length) {
      setSelectedParameterId(null);
      return;
    }

    const selectionStillExists = sortedParameters.some((parameter) => parameter.id === selectedParameterId);
    if (!selectedParameterId || !selectionStillExists) {
      setSelectedParameterId(sortedParameters[0].id);
    }
  }, [sortedParameters, selectedParameterId]);

  const selectedParameter = useMemo(
    () => sortedParameters.find((parameter) => parameter.id === selectedParameterId) ?? null,
    [selectedParameterId, sortedParameters]
  );

  const manualMergeTargets = useMemo(() => {
    if (!selectedParameter) {
      return [];
    }
    const selectedUnit = normalizeUnitForComparison(selectedParameter.standard_einheit);
    return sortedParameters.filter(
      (parameter) =>
        parameter.id !== selectedParameter.id &&
        parameter.aktiv &&
        parameter.wert_typ_standard === selectedParameter.wert_typ_standard &&
        normalizeUnitForComparison(parameter.standard_einheit) === selectedUnit
    );
  }, [selectedParameter, sortedParameters]);

  useEffect(() => {
    if (!selectedParameter) {
      setAliasForm(initialAliasForm);
      setRenameForm(initialRenameForm);
      setStandardEinheitForm(initialStandardEinheitForm);
      setWissensseiteForm(initialWissensseiteForm);
      setKlassifikationForm(initialKlassifikationForm);
      setZielbereichForm(initialZielbereichForm);
      setZielbereichQuelleForm(initialZielbereichQuelleForm);
      setZielwertPaketForm(initialZielwertPaketForm);
      setEditingZielbereichId(null);
      setUmrechnungsregelForm(initialUmrechnungsregelForm);
      setManualMergeForm(initialManualMergeForm);
      setMergeConfirmation(null);
      return;
    }

    setAliasForm((current) =>
      current.laborparameter_id === selectedParameter.id
        ? current
        : {
            ...initialAliasForm,
            laborparameter_id: selectedParameter.id
          }
    );
    setRenameForm((current) =>
      current.parameter_id === selectedParameter.id
        ? current
        : {
            parameter_id: selectedParameter.id,
            neuer_name: selectedParameter.anzeigename,
            alten_namen_als_alias_anlegen: true
          }
    );
    setStandardEinheitForm((current) =>
      current.parameter_id === selectedParameter.id
        ? current
        : {
            parameter_id: selectedParameter.id,
            standard_einheit: selectedParameter.standard_einheit ?? ""
          }
    );
    setWissensseiteForm((current) =>
      current.parameter_id === selectedParameter.id
        ? current
        : {
            parameter_id: selectedParameter.id,
            pfad_relativ: selectedParameter.wissensseite_pfad_relativ ?? ""
          }
    );
    setKlassifikationForm((current) =>
      current.parameter_id === selectedParameter.id
        ? current
        : {
            ...initialKlassifikationForm,
            parameter_id: selectedParameter.id,
            primaere_klassifikation: selectedParameter.primaere_klassifikation ?? ""
          }
    );
    setZielbereichForm((current) =>
      current.parameter_id === selectedParameter.id
        ? current
        : {
            ...initialZielbereichForm,
            parameter_id: selectedParameter.id,
            einheit: selectedParameter.standard_einheit ?? ""
          }
    );
    setUmrechnungsregelForm((current) =>
      current.laborparameter_id === selectedParameter.id
        ? current
        : {
            ...initialUmrechnungsregelForm,
            laborparameter_id: selectedParameter.id,
            nach_einheit: selectedParameter.standard_einheit ?? ""
          }
    );
    setManualMergeForm((current) => {
      const selectedTarget = current.ziel_parameter_id
        ? manualMergeTargets.find((parameter) => parameter.id === current.ziel_parameter_id)
        : null;
      if (selectedTarget) {
        return current;
      }
      return initialManualMergeForm;
    });
  }, [manualMergeTargets, selectedParameter]);

  useEffect(() => {
    setExpandedRelatedSections({
      classifications: true,
      aliases: true,
      conversions: false,
      ranges: false,
      groups: false
    });
  }, [selectedParameterId]);

  const filteredParameters = useMemo(() => {
    const normalizedSearchQuery = parameterSearchQuery.trim().toLocaleLowerCase("de-DE");
    return sortedParameters.filter((parameter) => {
      if (klassifikationFilter && parameter.primaere_klassifikation !== klassifikationFilter) {
        return false;
      }
      if (!normalizedSearchQuery) {
        return true;
      }
      return [parameter.anzeigename, parameter.interner_schluessel, parameter.beschreibung ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery);
    });
  }, [klassifikationFilter, parameterSearchQuery, sortedParameters]);

  const hasActiveParameterFilter = parameterSearchQuery.trim().length > 0 || klassifikationFilter.length > 0;
  const parameterCountLabel = hasActiveParameterFilter
    ? `${filteredParameters.length} von ${sortedParameters.length} Parametern`
    : `${sortedParameters.length} Parameter`;

  const einheiten = einheitenQuery.data ?? [];

  const zielbereicheQuery = useQuery({
    queryKey: ["zielbereiche", selectedParameterId],
    queryFn: () => apiFetch<Zielbereich[]>(`/api/parameter/${selectedParameterId}/zielbereiche`),
    enabled: Boolean(selectedParameterId)
  });

  const zielbereichQuellenQuery = useQuery({
    queryKey: ["zielbereich-quellen"],
    queryFn: () => apiFetch<ZielbereichQuelle[]>("/api/zielbereich-quellen"),
    enabled: activePanel === "zielbereich" || expandedRelatedSections.ranges
  });

  const zielbereichQuellenById = useMemo(
    () => new Map((zielbereichQuellenQuery.data ?? []).map((quelle) => [quelle.id, quelle])),
    [zielbereichQuellenQuery.data]
  );

  const zielwertPaketeQuery = useQuery({
    queryKey: ["zielwert-pakete"],
    queryFn: () => apiFetch<ZielwertPaket[]>("/api/zielwert-pakete"),
    enabled: activePanel === "zielbereich" || expandedRelatedSections.ranges
  });

  const zielwertPaketeById = useMemo(
    () => new Map((zielwertPaketeQuery.data ?? []).map((paket) => [paket.id, paket])),
    [zielwertPaketeQuery.data]
  );

  const parameterAliaseQuery = useQuery({
    queryKey: ["parameter-aliase", selectedParameterId],
    queryFn: () => apiFetch<ParameterAlias[]>(`/api/parameter/${selectedParameterId}/aliase`),
    enabled: Boolean(selectedParameterId)
  });

  const parameterKlassifikationenQuery = useQuery({
    queryKey: ["parameter-klassifikationen", selectedParameterId],
    queryFn: () => apiFetch<ParameterKlassifikation[]>(`/api/parameter/${selectedParameterId}/klassifikationen`),
    enabled: Boolean(selectedParameterId)
  });

  const umrechnungsregelnQuery = useQuery({
    queryKey: ["parameter-umrechnungsregeln", selectedParameterId],
    queryFn: () => apiFetch<ParameterUmrechnungsregel[]>(`/api/parameter/${selectedParameterId}/umrechnungsregeln`),
    enabled: Boolean(selectedParameterId)
  });
  const parameterGruppenQuery = useQuery({
    queryKey: ["parameter-gruppen", selectedParameterId],
    queryFn: () => apiFetch<ParameterGruppenzuordnung[]>(`/api/parameter/${selectedParameterId}/gruppen`),
    enabled: Boolean(selectedParameterId)
  });

  const aliasSuggestionsQuery = useQuery({
    queryKey: ["parameter-alias-vorschlaege"],
    queryFn: () => apiFetch<ParameterAliasSuggestion[]>("/api/parameter/alias-vorschlaege"),
    enabled: false
  });

  const duplicateSuggestionsQuery = useQuery({
    queryKey: ["parameter-dublettenvorschlaege", duplicateSensitivity],
    queryFn: () =>
      apiFetch<ParameterDuplicateSuggestion[]>(
        `/api/parameter/dublettenvorschlaege?pruefschaerfe=${encodeURIComponent(duplicateSensitivity)}`
      ),
    enabled: false
  });
  const duplicateSuppressionsQuery = useQuery({
    queryKey: ["parameter-dublettenausschluesse", selectedParameterId],
    queryFn: () =>
      apiFetch<ParameterDuplicateSuppression[]>(`/api/parameter/${selectedParameterId}/dublettenausschluesse`),
    enabled: Boolean(selectedParameterId && activePanel === "duplicates")
  });

  const selectedAliasSuggestions = useMemo(
    () =>
      (aliasSuggestionsQuery.data ?? []).filter((suggestion) =>
        selectedParameterId ? suggestion.laborparameter_id === selectedParameterId : true
      ),
    [aliasSuggestionsQuery.data, selectedParameterId]
  );

  const visibleDuplicateSuggestions = useMemo(
    () =>
      (duplicateSuggestionsQuery.data ?? []).filter((suggestion) => {
        if (duplicateViewScope === "all") {
          return true;
        }
        return selectedParameterId
          ? suggestion.ziel_parameter_id === selectedParameterId || suggestion.quell_parameter_id === selectedParameterId
          : true;
      }),
    [duplicateSuggestionsQuery.data, duplicateViewScope, selectedParameterId]
  );

  const visibleDuplicateSuppressions = useMemo(
    () =>
      (duplicateSuppressionsQuery.data ?? []).map((suppression) => {
        const selectedIsFirst = suppression.erster_parameter_id === selectedParameterId;
        return {
          ...suppression,
          anderer_parameter_id: selectedIsFirst ? suppression.zweiter_parameter_id : suppression.erster_parameter_id,
          anderer_parameter_anzeigename: selectedIsFirst
            ? suppression.zweiter_parameter_anzeigename
            : suppression.erster_parameter_anzeigename
        };
      }),
    [duplicateSuppressionsQuery.data, selectedParameterId]
  );

  const activeDuplicateSensitivityOption =
    DUPLICATE_CHECK_SENSITIVITY_OPTIONS.find((option) => option.value === duplicateSensitivity) ??
    DUPLICATE_CHECK_SENSITIVITY_OPTIONS[1];

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Parameter>("/api/parameter", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          primaere_klassifikation: form.primaere_klassifikation || null
        })
      }),
    onSuccess: async (createdParameter) => {
      setForm(initialForm);
      setSelectedParameterId(createdParameter.id);
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
    }
  });

  const createZielbereichMutation = useMutation({
    mutationFn: () =>
      apiFetch<Zielbereich>(`/api/parameter/${zielbereichForm.parameter_id}/zielbereiche`, {
        method: "POST",
        body: JSON.stringify(buildZielbereichCreatePayload(zielbereichForm, selectedParameter?.standard_einheit))
      }),
    onSuccess: async () => {
      setZielbereichForm((current) => ({
        ...initialZielbereichForm,
        parameter_id: current.parameter_id,
        einheit: selectedParameter?.standard_einheit ?? ""
      }));
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["zielbereiche", zielbereichForm.parameter_id] });
    }
  });

  const createZielbereichQuelleMutation = useMutation({
    mutationFn: () =>
      apiFetch<ZielbereichQuelle>("/api/zielbereich-quellen", {
        method: "POST",
        body: JSON.stringify({
          name: zielbereichQuelleForm.name,
          quellen_typ: zielbereichQuelleForm.quellen_typ,
          titel: zielbereichQuelleForm.titel || null,
          jahr: zielbereichQuelleForm.jahr ? Number(zielbereichQuelleForm.jahr) : null,
          version: zielbereichQuelleForm.version || null,
          bemerkung: zielbereichQuelleForm.bemerkung || null
        } satisfies ZielbereichQuelleCreatePayload)
      }),
    onSuccess: async (createdQuelle) => {
      setZielbereichQuelleForm(initialZielbereichQuelleForm);
      setZielbereichForm((current) => ({
        ...current,
        zielbereich_quelle_id: createdQuelle.id
      }));
      await queryClient.invalidateQueries({ queryKey: ["zielbereich-quellen"] });
    }
  });

  const createZielwertPaketMutation = useMutation({
    mutationFn: () =>
      apiFetch<ZielwertPaket>("/api/zielwert-pakete", {
        method: "POST",
        body: JSON.stringify({
          paket_schluessel: zielwertPaketForm.paket_schluessel,
          name: zielwertPaketForm.name,
          zielbereich_quelle_id: zielbereichForm.zielbereich_quelle_id || null,
          version: zielwertPaketForm.version || null,
          jahr: zielwertPaketForm.jahr ? Number(zielwertPaketForm.jahr) : null,
          beschreibung: zielwertPaketForm.beschreibung || null,
          bemerkung: zielwertPaketForm.bemerkung || null
        } satisfies ZielwertPaketCreatePayload)
      }),
    onSuccess: async (createdPaket) => {
      setZielwertPaketForm(initialZielwertPaketForm);
      setZielbereichForm((current) => ({
        ...current,
        zielwert_paket_id: createdPaket.id,
        zielbereich_quelle_id: createdPaket.zielbereich_quelle_id ?? current.zielbereich_quelle_id
      }));
      await queryClient.invalidateQueries({ queryKey: ["zielwert-pakete"] });
    }
  });

  const deactivateZielwertPaketMutation = useMutation({
    mutationFn: (paket: ZielwertPaket) =>
      apiFetch<ZielwertPaket>(`/api/zielwert-pakete/${paket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          paket_schluessel: paket.paket_schluessel,
          name: paket.name,
          zielbereich_quelle_id: paket.zielbereich_quelle_id ?? null,
          version: paket.version ?? null,
          jahr: paket.jahr ?? null,
          beschreibung: paket.beschreibung ?? null,
          bemerkung: paket.bemerkung ?? null,
          aktiv: false
        } satisfies ZielwertPaketUpdatePayload)
      }),
    onSuccess: async () => {
      setZielbereichForm((current) => ({ ...current, zielwert_paket_id: "" }));
      await queryClient.invalidateQueries({ queryKey: ["zielwert-pakete"] });
      await queryClient.invalidateQueries({ queryKey: ["zielbereiche", selectedParameterId] });
    }
  });

  const createAliasMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterAlias>(`/api/parameter/${aliasForm.laborparameter_id}/aliase`, {
        method: "POST",
        body: JSON.stringify({
          alias_text: aliasForm.alias_text,
          bemerkung: aliasForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setAliasForm((current) => ({
        ...initialAliasForm,
        laborparameter_id: current.laborparameter_id
      }));
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase", aliasForm.laborparameter_id] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
    }
  });

  const updateStandardEinheitMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterStandardEinheitUpdateResult>(
        `/api/parameter/${standardEinheitForm.parameter_id}/standardeinheit`,
        {
          method: "PATCH",
          body: JSON.stringify({
            standard_einheit: standardEinheitForm.standard_einheit || null
          } satisfies ParameterStandardEinheitUpdatePayload)
        }
      ),
    onSuccess: async (result) => {
      setLastStandardEinheitResult(result);
      setStandardEinheitForm({
        parameter_id: result.parameter_id,
        standard_einheit: result.standard_einheit ?? ""
      });
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-umrechnungsregeln", result.parameter_id] });
    }
  });

  const updateZielbereichMutation = useMutation({
    mutationFn: () => {
      if (!editingZielbereichId) {
        throw new Error("Bitte zuerst einen Zielbereich auswählen.");
      }
      return apiFetch<Zielbereich>(`/api/zielbereiche/${editingZielbereichId}`, {
        method: "PATCH",
        body: JSON.stringify(
          buildZielbereichUpdatePayload(zielbereichForm, selectedParameter?.standard_einheit) satisfies ZielbereichUpdatePayload
        )
      });
    },
    onSuccess: async (updatedZielbereich) => {
      setEditingZielbereichId(null);
      setZielbereichForm((current) => ({
        ...initialZielbereichForm,
        parameter_id: current.parameter_id,
        wert_typ: selectedParameter?.wert_typ_standard ?? "numerisch",
        einheit: selectedParameter?.standard_einheit ?? ""
      }));
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["zielbereiche", updatedZielbereich.laborparameter_id] });
    }
  });

  const updateWissensseiteMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterWissensseiteUpdateResult>(`/api/parameter/${wissensseiteForm.parameter_id}/wissensseite`, {
        method: "PATCH",
        body: JSON.stringify({
          pfad_relativ: wissensseiteForm.pfad_relativ || null
        } satisfies ParameterWissensseiteUpdatePayload)
      }),
    onSuccess: async (result) => {
      setWissensseiteForm({
        parameter_id: result.parameter_id,
        pfad_relativ: result.wissensseite_pfad_relativ ?? ""
      });
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
    }
  });

  const createUmrechnungsregelMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterUmrechnungsregel>(
        `/api/parameter/${umrechnungsregelForm.laborparameter_id}/umrechnungsregeln`,
        {
          method: "POST",
          body: JSON.stringify({
            von_einheit: umrechnungsregelForm.von_einheit,
            nach_einheit: umrechnungsregelForm.nach_einheit,
            regel_typ: umrechnungsregelForm.regel_typ,
            faktor: umrechnungsregelForm.faktor ? Number(umrechnungsregelForm.faktor) : null,
            offset: umrechnungsregelForm.offset ? Number(umrechnungsregelForm.offset) : null,
            formel_text: umrechnungsregelForm.formel_text || null,
            rundung_stellen: umrechnungsregelForm.rundung_stellen
              ? Number(umrechnungsregelForm.rundung_stellen)
              : null,
            quelle_beschreibung: umrechnungsregelForm.quelle_beschreibung || null,
            bemerkung: umrechnungsregelForm.bemerkung || null
          } satisfies ParameterUmrechnungsregelCreatePayload)
        }
      ),
    onSuccess: async () => {
      setUmrechnungsregelForm((current) => ({
        ...initialUmrechnungsregelForm,
        laborparameter_id: current.laborparameter_id,
        nach_einheit: selectedParameter?.standard_einheit ?? current.nach_einheit
      }));
      setActivePanel(null);
      await queryClient.invalidateQueries({
        queryKey: ["parameter-umrechnungsregeln", umrechnungsregelForm.laborparameter_id]
      });
    }
  });

  const renameParameterMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterRenameResult>(`/api/parameter/${renameForm.parameter_id}/umbenennen`, {
        method: "POST",
        body: JSON.stringify({
          neuer_name: renameForm.neuer_name,
          alten_namen_als_alias_anlegen: renameForm.alten_namen_als_alias_anlegen
        })
      }),
    onSuccess: async (result) => {
      setLastRenameResult(result);
      setRenameForm({
        parameter_id: result.parameter_id,
        neuer_name: result.neuer_name,
        alten_namen_als_alias_anlegen: true
      });
      setSelectedParameterId(result.parameter_id);
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase", result.parameter_id] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
    }
  });

  const confirmAliasSuggestionMutation = useMutation({
    mutationFn: (suggestion: ParameterAliasSuggestion) =>
      apiFetch<ParameterAlias>(`/api/parameter/${suggestion.laborparameter_id}/aliase`, {
        method: "POST",
        body: JSON.stringify({
          alias_text: suggestion.alias_text,
          bemerkung: "Aus bestätigter Beobachtung vorgeschlagen"
        })
      }),
    onSuccess: async (_, suggestion) => {
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase", suggestion.laborparameter_id] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
      await aliasSuggestionsQuery.refetch();
    }
  });

  const mergeDuplicateMutation = useMutation({
    mutationFn: (payload: {
      ziel_parameter_id: string;
      quell_parameter_id: string;
      gemeinsamer_name: string;
    }) =>
      apiFetch<ParameterMergeResult>("/api/parameter/zusammenfuehren", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: async (result, payload) => {
      setLastMergeResult(result);
      setSelectedParameterId(result.ziel_parameter_id);
      setManualMergeForm(initialManualMergeForm);
      setMergeConfirmation(null);
      setMergeNameBySuggestion((current) => {
        const next = { ...current };
        delete next[buildDuplicateSuggestionKey(payload.ziel_parameter_id, payload.quell_parameter_id)];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
      await duplicateSuggestionsQuery.refetch();
    }
  });

  const updatePrimaereKlassifikationMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterPrimaereKlassifikationUpdateResult>(
        `/api/parameter/${klassifikationForm.parameter_id}/primaere-klassifikation`,
        {
          method: "PATCH",
          body: JSON.stringify({
            primaere_klassifikation: klassifikationForm.primaere_klassifikation
              ? (klassifikationForm.primaere_klassifikation as ParameterKlassifikationCode)
              : null
          } satisfies ParameterPrimaereKlassifikationUpdatePayload)
        }
      ),
    onSuccess: async (result) => {
      setLastKlassifikationResult(result);
      setKlassifikationForm((current) => ({
        ...current,
        parameter_id: result.parameter_id,
        primaere_klassifikation: result.primaere_klassifikation ?? ""
      }));
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
    }
  });

  const createKlassifikationMutation = useMutation({
    mutationFn: () =>
      apiFetch<ParameterKlassifikation>(`/api/parameter/${klassifikationForm.parameter_id}/klassifikationen`, {
        method: "POST",
        body: JSON.stringify({
          klassifikation: klassifikationForm.zusatz_klassifikation,
          kontext_beschreibung: klassifikationForm.kontext_beschreibung || null,
          begruendung: klassifikationForm.begruendung || null
        } satisfies ParameterKlassifikationCreatePayload)
      }),
    onSuccess: async () => {
      setKlassifikationForm((current) => ({
        ...initialKlassifikationForm,
        parameter_id: current.parameter_id,
        primaere_klassifikation: current.primaere_klassifikation
      }));
      await queryClient.invalidateQueries({ queryKey: ["parameter-klassifikationen", klassifikationForm.parameter_id] });
    }
  });

  const deleteKlassifikationMutation = useMutation({
    mutationFn: (klassifikationId: string) =>
      apiFetch<ParameterKlassifikationDeleteResult>(`/api/parameter/klassifikationen/${klassifikationId}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parameter-klassifikationen", selectedParameterId] });
    }
  });
  const suppressDuplicateMutation = useMutation({
    mutationFn: (payload: { erster_parameter_id: string; zweiter_parameter_id: string }) =>
      apiFetch<ParameterDuplicateSuppression>("/api/parameter/dublettenausschluesse", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onMutate: (payload) => {
      setPendingDuplicateSuppressionKey(
        buildDuplicateSuggestionKey(payload.erster_parameter_id, payload.zweiter_parameter_id)
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenausschluesse"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
      await duplicateSuppressionsQuery.refetch();
      if (duplicateSuggestionsQuery.isFetched) {
        await duplicateSuggestionsQuery.refetch();
      }
    },
    onSettled: () => {
      setPendingDuplicateSuppressionKey(null);
    }
  });
  const deleteDuplicateSuppressionMutation = useMutation({
    mutationFn: (suppressionId: string) =>
      apiFetch<void>(`/api/parameter/dublettenausschluesse/${suppressionId}`, {
        method: "DELETE"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenausschluesse"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
      await duplicateSuppressionsQuery.refetch();
      if (duplicateSuggestionsQuery.isFetched) {
        await duplicateSuggestionsQuery.refetch();
      }
    }
  });

  const handleOpenPanel = (panel: ParameterPanelKey) => {
    if (panel !== "create" && !selectedParameter) {
      return;
    }

    if (panel === "rename" && selectedParameter) {
      setRenameForm({
        parameter_id: selectedParameter.id,
        neuer_name: selectedParameter.anzeigename,
        alten_namen_als_alias_anlegen: true
      });
    }

    if (panel === "alias" && selectedParameter) {
      setAliasForm({
        ...initialAliasForm,
        laborparameter_id: selectedParameter.id
      });
    }

    if (panel === "standardUnit" && selectedParameter) {
      setStandardEinheitForm({
        parameter_id: selectedParameter.id,
        standard_einheit: selectedParameter.standard_einheit ?? ""
      });
    }

    if (panel === "knowledge" && selectedParameter) {
      setWissensseiteForm({
        parameter_id: selectedParameter.id,
        pfad_relativ: selectedParameter.wissensseite_pfad_relativ ?? ""
      });
    }

    if (panel === "conversion" && selectedParameter) {
      setUmrechnungsregelForm({
        ...initialUmrechnungsregelForm,
        laborparameter_id: selectedParameter.id,
        nach_einheit: selectedParameter.standard_einheit ?? ""
      });
    }

    if (panel === "zielbereich" && selectedParameter) {
      setEditingZielbereichId(null);
      setZielbereichForm({
        ...initialZielbereichForm,
        parameter_id: selectedParameter.id,
        wert_typ: selectedParameter.wert_typ_standard,
        einheit: selectedParameter.standard_einheit ?? ""
      });
    }

    const nextPanel = activePanel === panel ? null : panel;
    if (panel === "duplicates" && nextPanel === "duplicates" && activePanel !== "duplicates") {
      queryClient.removeQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
    }
    setActivePanel(nextPanel);
  };

  const startZielbereichEdit = (zielbereich: Zielbereich) => {
    setEditingZielbereichId(zielbereich.id);
    setZielbereichForm({
      parameter_id: zielbereich.laborparameter_id,
      wert_typ: zielbereich.wert_typ,
      zielbereich_typ: zielbereich.zielbereich_typ,
      zielrichtung: zielbereich.zielrichtung,
      zielbereich_quelle_id: zielbereich.zielbereich_quelle_id ?? "",
      zielwert_paket_id: zielbereich.zielwert_paket_id ?? "",
      untere_grenze_num: zielbereich.untere_grenze_num?.toString() ?? "",
      obere_grenze_num: zielbereich.obere_grenze_num?.toString() ?? "",
      einheit: zielbereich.einheit ?? selectedParameter?.standard_einheit ?? "",
      soll_text: zielbereich.soll_text ?? "",
      geschlecht_code: zielbereich.geschlecht_code ?? "",
      quelle_original_text: zielbereich.quelle_original_text ?? "",
      quelle_stelle: zielbereich.quelle_stelle ?? "",
      bemerkung: zielbereich.bemerkung ?? ""
    });
    setActivePanel("zielbereich");
  };

  const requestMergeConfirmation = (confirmation: MergeConfirmationState) => {
    setMergeConfirmation(confirmation);
  };

  const confirmPendingMerge = () => {
    if (!mergeConfirmation) {
      return;
    }
    mergeDuplicateMutation.mutate({
      ziel_parameter_id: mergeConfirmation.ziel_parameter_id,
      quell_parameter_id: mergeConfirmation.quell_parameter_id,
      gemeinsamer_name: mergeConfirmation.gemeinsamer_name
    });
  };

  const renderPanelCloseButton = (label = "Werkzeug schließen") => (
    <button
      type="button"
      className="icon-button"
      onClick={() => setActivePanel(null)}
      aria-label={label}
      title={label}
    >
      ×
    </button>
  );

  const renderActionPanel = () => {
    if (!activePanel) {
      return null;
    }

    if (activePanel === "delete") {
      return (
        <LoeschAktionPanel
          entitaetTyp="laborparameter"
          entitaetId={selectedParameterId}
          title="Parameter prüfen, löschen oder deaktivieren"
          emptyText="Bitte wähle zuerst links einen Parameter aus."
          onClose={() => setActivePanel(null)}
          invalidateQueryKeys={[
            ["parameter"],
            ["parameter-aliase", selectedParameterId],
            ["parameter-umrechnungsregeln", selectedParameterId],
            ["zielbereiche", selectedParameterId],
            ["parameter-gruppen", selectedParameterId],
            ["parameter-dublettenausschluesse", selectedParameterId],
            ["gruppen"],
            ["messwerte"],
            ["planung"]
          ]}
        />
      );
    }

    if (activePanel === "create") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Parameter anlegen</h3>
              <p>
                Neue Parameter werden normalerweise beim Import eines Berichts automatisch angelegt. Diese Eingabe ist
                für die manuelle Anlage gedacht, wenn ein Parameter nachgepflegt werden muss oder die automatische
                Zuordnung nicht ausgereicht hat. Der interne Schlüssel wird dabei automatisch aus dem Anzeigenamen
                erzeugt.
              </p>
            </div>
            {renderPanelCloseButton("Panel Parameter anlegen schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="field">
              <span>Anzeigename</span>
              <input
                required
                value={form.anzeigename}
                onChange={(event) => setForm((current) => ({ ...current, anzeigename: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Standardeinheit</span>
              <select
                value={form.standard_einheit}
                onChange={(event) => setForm((current) => ({ ...current, standard_einheit: event.target.value }))}
              >
                <option value="">Keine Einheit</option>
                {einheiten.map((einheit) => (
                  <option key={einheit.id} value={einheit.kuerzel}>
                    {einheit.kuerzel}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Werttyp</span>
              <select
                value={form.wert_typ_standard}
                onChange={(event) =>
                  setForm((current) => ({ ...current, wert_typ_standard: event.target.value as WertTyp }))
                }
              >
                {WERT_TYP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Primäre KSG-Klasse</span>
              <select
                value={form.primaere_klassifikation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, primaere_klassifikation: event.target.value }))
                }
              >
                <option value="">Nicht klassifiziert</option>
                {PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Beschreibung</span>
              <textarea
                rows={4}
                value={form.beschreibung}
                onChange={(event) => setForm((current) => ({ ...current, beschreibung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Speichert..." : "Parameter anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
      );
    }

    if (!selectedParameter) {
      return (
        <article className="card card--soft">
          <h3>Werkzeuge</h3>
          <p>Es ist noch kein Parameter ausgewählt.</p>
        </article>
      );
    }

    if (activePanel === "knowledge") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Laborwissen-Seite verknüpfen</h3>
              <p>
                Verknüpfe den Parameter mit einer Markdown-Seite aus dem Laborwissen. Danach kannst Du direkt aus dem
                Parameterdetail zu dieser Seite springen.
              </p>
            </div>
            {renderPanelCloseButton("Panel Wissensseite verknüpfen schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              updateWissensseiteMutation.mutate();
            }}
          >
            <label className="field field--full">
              <span>Wissensseite</span>
              <select
                value={wissensseiteForm.pfad_relativ}
                onChange={(event) =>
                  setWissensseiteForm((current) => ({ ...current, pfad_relativ: event.target.value }))
                }
              >
                <option value="">Keine Verknüpfung</option>
                {wissensseitenQuery.data?.map((seite) => (
                  <option key={seite.pfad_relativ} value={seite.pfad_relativ}>
                    {seite.titel} · {seite.pfad_relativ}
                  </option>
                ))}
              </select>
              <small>Neue Seiten kannst Du im Bereich Laborwissen anlegen und anschließend hier auswählen.</small>
            </label>

            <div className="form-actions">
              <button type="submit" disabled={updateWissensseiteMutation.isPending}>
                {updateWissensseiteMutation.isPending ? "Speichert..." : "Verknüpfung speichern"}
              </button>
              {selectedParameter.wissensseite_pfad_relativ ? (
                <Link
                  className="inline-button"
                  to={`/wissensbasis?seite=${encodeURIComponent(selectedParameter.wissensseite_pfad_relativ)}`}
                >
                  Verknüpfte Seite öffnen
                </Link>
              ) : (
                <Link
                  className="inline-button"
                  to={`/wissensbasis?suche=${encodeURIComponent(selectedParameter.anzeigename)}`}
                >
                  Passende Seite suchen
                </Link>
              )}
              {updateWissensseiteMutation.isError ? (
                <p className="form-error">{updateWissensseiteMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "rename") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Parameter umbenennen</h3>
              <p>
                Hier änderst Du den sichtbaren Namen des ausgewählten Parameters, ohne seine Messwerte, Zielbereiche
                oder Planungen zu verlieren. Wenn Du den alten Namen als Alias behältst, bleiben frühere
                Bezeichnungen und bestehende Importe weiterhin sauber zuordenbar.
              </p>
            </div>
            {renderPanelCloseButton("Panel Parameter umbenennen schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              renameParameterMutation.mutate();
            }}
          >
            <label className="field">
              <span>Aktueller Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Neuer Name</span>
              <input
                required
                value={renameForm.neuer_name}
                onChange={(event) => setRenameForm((current) => ({ ...current, neuer_name: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Alten Namen als Alias behalten</span>
              <input
                type="checkbox"
                checked={renameForm.alten_namen_als_alias_anlegen}
                onChange={(event) =>
                  setRenameForm((current) => ({
                    ...current,
                    alten_namen_als_alias_anlegen: event.target.checked
                  }))
                }
              />
            </label>

            {lastRenameResult?.parameter_id === selectedParameter.id ? (
              <p>
                Umbenannt zu <strong>{lastRenameResult.neuer_name}</strong>.
                {lastRenameResult.alias_angelegt && lastRenameResult.alias_name
                  ? ` Alter Name als Alias übernommen: ${lastRenameResult.alias_name}.`
                  : " Kein zusätzlicher Alias war nötig oder möglich."}
              </p>
            ) : null}

            <div className="form-actions">
              <button type="submit" disabled={renameParameterMutation.isPending || !renameForm.parameter_id}>
                {renameParameterMutation.isPending ? "Benennt um..." : "Umbenennen"}
              </button>
              {renameParameterMutation.isError ? <p className="form-error">{renameParameterMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "standardUnit") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Führende Normeinheit festlegen</h3>
              <p>
                Hier legst Du fest, in welcher Einheit numerische Werte dieses Parameters bevorzugt verglichen,
                ausgewertet und in gemeinsamen Darstellungen verwendet werden sollen. Originalwerte und
                Originaleinheiten bleiben dabei unverändert erhalten.
              </p>
            </div>
            {renderPanelCloseButton("Panel Normeinheit schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              updateStandardEinheitMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Führende Normeinheit</span>
              <select
                value={standardEinheitForm.standard_einheit}
                onChange={(event) =>
                  setStandardEinheitForm((current) => ({ ...current, standard_einheit: event.target.value }))
                }
              >
                <option value="">Keine feste Normeinheit</option>
                {einheiten.map((einheit) => (
                  <option key={einheit.id} value={einheit.kuerzel}>
                    {einheit.kuerzel}
                  </option>
                ))}
              </select>
            </label>

            <p className="field field--full">
              Wenn passende Umrechnungsregeln vorhanden sind, berechnet das System vorhandene normierte Vergleichswerte
              nach dem Speichern sofort neu. So werden alte und neue Messwerte in derselben führenden Einheit
              vergleichbar.
            </p>

            {lastStandardEinheitResult?.parameter_id === selectedParameter.id ? (
              <p>
                Gespeichert für <strong>{lastStandardEinheitResult.parameter_anzeigename}</strong>.
                {` Neu berechnet: ${lastStandardEinheitResult.neu_berechnete_messwerte} Messwerte.`}
              </p>
            ) : null}

            <div className="form-actions">
              <button type="submit" disabled={updateStandardEinheitMutation.isPending || !standardEinheitForm.parameter_id}>
                {updateStandardEinheitMutation.isPending ? "Speichert..." : "Normeinheit speichern"}
              </button>
              {updateStandardEinheitMutation.isError ? (
                <p className="form-error">{updateStandardEinheitMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "classification") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>KSG-Klassifikation pflegen</h3>
              <p>
                Die Klassifikation beschreibt die typische Funktion des Parameters. Zusatzrollen erfassen begründete
                Kontextfälle, ohne den Parameter zu duplizieren.
              </p>
            </div>
            {renderPanelCloseButton("Panel KSG-Klassifikation schließen")}
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              updatePrimaereKlassifikationMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>
            <label className="field">
              <span>Primäre KSG-Klasse</span>
              <select
                value={klassifikationForm.primaere_klassifikation}
                onChange={(event) =>
                  setKlassifikationForm((current) => ({
                    ...current,
                    primaere_klassifikation: event.target.value
                  }))
                }
              >
                <option value="">Nicht klassifiziert</option>
                {PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button
                type="submit"
                disabled={updatePrimaereKlassifikationMutation.isPending || !klassifikationForm.parameter_id}
              >
                {updatePrimaereKlassifikationMutation.isPending ? "Speichert..." : "Primärklasse speichern"}
              </button>
              {updatePrimaereKlassifikationMutation.isError ? (
                <p className="form-error">{updatePrimaereKlassifikationMutation.error.message}</p>
              ) : null}
              {lastKlassifikationResult?.parameter_id === selectedParameter.id ? (
                <p>
                  Primärklasse gespeichert:{" "}
                  <strong>{formatParameterKlassifikation(lastKlassifikationResult.primaere_klassifikation)}</strong>.
                </p>
              ) : null}
            </div>
          </form>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createKlassifikationMutation.mutate();
            }}
          >
            <label className="field">
              <span>Zusatzrolle</span>
              <select
                value={klassifikationForm.zusatz_klassifikation}
                onChange={(event) =>
                  setKlassifikationForm((current) => ({
                    ...current,
                    zusatz_klassifikation: event.target.value as ParameterKlassifikationCode
                  }))
                }
              >
                {PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Kontext</span>
              <input
                value={klassifikationForm.kontext_beschreibung}
                onChange={(event) =>
                  setKlassifikationForm((current) => ({ ...current, kontext_beschreibung: event.target.value }))
                }
                placeholder="z. B. schwerer Mangel, Hormontherapie oder Verlaufskontrolle"
              />
            </label>
            <label className="field field--full">
              <span>Begründung</span>
              <textarea
                rows={3}
                value={klassifikationForm.begruendung}
                onChange={(event) =>
                  setKlassifikationForm((current) => ({ ...current, begruendung: event.target.value }))
                }
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={createKlassifikationMutation.isPending || !klassifikationForm.parameter_id}>
                {createKlassifikationMutation.isPending ? "Speichert..." : "Zusatzrolle hinzufügen"}
              </button>
              {createKlassifikationMutation.isError ? (
                <p className="form-error">{createKlassifikationMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "alias") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Alias pflegen</h3>
              <p>
                Aliasnamen helfen, unterschiedliche Laborbezeichnungen demselben bestehenden Parameter sicher
                zuzuordnen. Trage hier alternative Namen ein, unter denen dieser Wert in Berichten, Importen oder
                älteren Daten vorkommt, ohne dafür einen zweiten eigenen Parameter anzulegen.
              </p>
            </div>
            {renderPanelCloseButton("Panel Alias pflegen schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createAliasMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Aliasname</span>
              <input
                required
                value={aliasForm.alias_text}
                onChange={(event) => setAliasForm((current) => ({ ...current, alias_text: event.target.value }))}
                placeholder="z. B. Vitamin D3 (25-OH) LCMS"
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={aliasForm.bemerkung}
                onChange={(event) => setAliasForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createAliasMutation.isPending || !aliasForm.laborparameter_id}>
                {createAliasMutation.isPending ? "Speichert..." : "Alias anlegen"}
              </button>
              {createAliasMutation.isError ? <p className="form-error">{createAliasMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "conversion") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Umrechnungsregel anlegen</h3>
              <p>
                Mit Umrechnungsregeln beschreibst Du, wie Werte dieses Parameters von einer Einheit in eine andere
                überführt werden. Das ist sinnvoll, wenn derselbe Analyt je nach Labor in verschiedenen Einheiten
                vorkommt und trotzdem gemeinsam verglichen oder auf eine führende Normeinheit gebracht werden soll.
              </p>
            </div>
            {renderPanelCloseButton("Panel Umrechnungsregel schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createUmrechnungsregelMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Von-Einheit</span>
              <select
                required
                value={umrechnungsregelForm.von_einheit}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({ ...current, von_einheit: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {einheiten.map((einheit) => (
                  <option key={einheit.id} value={einheit.kuerzel}>
                    {einheit.kuerzel}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nach-Einheit</span>
              <select
                required
                value={umrechnungsregelForm.nach_einheit}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({ ...current, nach_einheit: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {einheiten.map((einheit) => (
                  <option key={einheit.id} value={einheit.kuerzel}>
                    {einheit.kuerzel}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Regeltyp</span>
              <select
                value={umrechnungsregelForm.regel_typ}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({
                    ...current,
                    regel_typ: event.target.value as UmrechnungsregelTyp,
                    faktor: "",
                    offset: "",
                    formel_text: ""
                  }))
                }
              >
                {UMRECHNUNGSREGEL_TYP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {umrechnungsregelForm.regel_typ !== "formel" ? (
              <label className="field">
                <span>Faktor</span>
                <input
                  type="number"
                  step="any"
                  value={umrechnungsregelForm.faktor}
                  onChange={(event) =>
                    setUmrechnungsregelForm((current) => ({ ...current, faktor: event.target.value }))
                  }
                />
              </label>
            ) : null}

            {umrechnungsregelForm.regel_typ === "faktor_plus_offset" ? (
              <label className="field">
                <span>Offset</span>
                <input
                  type="number"
                  step="any"
                  value={umrechnungsregelForm.offset}
                  onChange={(event) =>
                    setUmrechnungsregelForm((current) => ({ ...current, offset: event.target.value }))
                  }
                />
              </label>
            ) : null}

            {umrechnungsregelForm.regel_typ === "formel" ? (
              <label className="field field--full">
                <span>Formel mit x</span>
                <input
                  value={umrechnungsregelForm.formel_text}
                  onChange={(event) =>
                    setUmrechnungsregelForm((current) => ({ ...current, formel_text: event.target.value }))
                  }
                  placeholder="z. B. x * 100"
                />
              </label>
            ) : null}

            <label className="field">
              <span>Rundung</span>
              <input
                type="number"
                min="0"
                max="12"
                value={umrechnungsregelForm.rundung_stellen}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({ ...current, rundung_stellen: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Quelle</span>
              <input
                value={umrechnungsregelForm.quelle_beschreibung}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({
                    ...current,
                    quelle_beschreibung: event.target.value
                  }))
                }
                placeholder="z. B. Laborstandard oder Fachliteratur"
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={umrechnungsregelForm.bemerkung}
                onChange={(event) =>
                  setUmrechnungsregelForm((current) => ({ ...current, bemerkung: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  createUmrechnungsregelMutation.isPending ||
                  !umrechnungsregelForm.laborparameter_id ||
                  !umrechnungsregelForm.von_einheit ||
                  !umrechnungsregelForm.nach_einheit
                }
              >
                {createUmrechnungsregelMutation.isPending ? "Speichert..." : "Umrechnungsregel anlegen"}
              </button>
              {createUmrechnungsregelMutation.isError ? (
                <p className="form-error">{createUmrechnungsregelMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "zielbereich") {
      const isEditMode = Boolean(editingZielbereichId);
      const selectedZielwertPaket = zielwertPaketeById.get(zielbereichForm.zielwert_paket_id);
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>{isEditMode ? "Allgemeinen Zielbereich bearbeiten" : "Allgemeinen Zielbereich anlegen"}</h3>
              <p>
                {isEditMode
                  ? "Passe hier fachliche Grenzen, Zielbereichstyp, Kontext und Bemerkung an. Parameterbezug, technische ID und Werttyp bleiben stabil."
                  : "Hier hinterlegst Du einen allgemeinen Zielbereich für den ausgewählten Parameter. Dieser Bereich dient als fachliche Orientierung für Auswertung, Berichte und Planung und kann später bei Bedarf noch personenspezifisch überschrieben werden."}
              </p>
            </div>
            {renderPanelCloseButton("Panel Zielbereich schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (isEditMode) {
                updateZielbereichMutation.mutate();
              } else {
                createZielbereichMutation.mutate();
              }
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Werttyp</span>
              <input value={formatWertTyp(selectedParameter.wert_typ_standard)} disabled />
            </label>

            <label className="field">
              <span>Zielbereichstyp</span>
              <select
                value={zielbereichForm.zielbereich_typ}
                onChange={(event) =>
                  setZielbereichForm((current) => ({
                    ...current,
                    zielbereich_typ: event.target.value as ZielbereichTyp
                  }))
                }
              >
                {ZIELBEREICH_TYP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Zielrichtung</span>
              <select
                value={zielbereichForm.zielrichtung}
                onChange={(event) =>
                  setZielbereichForm((current) => ({
                    ...current,
                    zielrichtung: event.target.value as Zielrichtung
                  }))
                }
              >
                {ZIELRICHTUNG_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Zielwertquelle</span>
              <select
                value={zielbereichForm.zielbereich_quelle_id}
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, zielbereich_quelle_id: event.target.value }))
                }
              >
                <option value="">Keine Quelle</option>
                {zielbereichQuellenQuery.data?.map((quelle) => (
                  <option key={quelle.id} value={quelle.id}>
                    {formatZielbereichQuelle(quelle)} · {formatZielbereichQuelleTyp(quelle.quellen_typ)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Zielwertpaket</span>
              <select
                value={zielbereichForm.zielwert_paket_id}
                onChange={(event) => {
                  const paket = zielwertPaketeById.get(event.target.value);
                  setZielbereichForm((current) => ({
                    ...current,
                    zielwert_paket_id: event.target.value,
                    zielbereich_quelle_id: paket?.zielbereich_quelle_id ?? current.zielbereich_quelle_id
                  }));
                }}
              >
                <option value="">Kein Paket</option>
                {zielwertPaketeQuery.data?.map((paket) => (
                  <option key={paket.id} value={paket.id}>
                    {formatZielwertPaket(paket)} · {paket.aktive_zielbereiche_anzahl} aktive Zielbereiche
                  </option>
                ))}
              </select>
              <small>
                Zielbereiche können manuell gepflegt oder als kuratiertes Paket eingespielt werden.{" "}
                <Link className="text-link" to="/einstellungen?ansicht=datenpakete">
                  Zielwertpakete prüfen und einspielen
                </Link>
              </small>
            </label>

            {selectedZielwertPaket ? (
              <div className="field field--full inline-info">
                <span>
                  Paket `{selectedZielwertPaket.paket_schluessel}` bündelt aktuell{" "}
                  {selectedZielwertPaket.aktive_zielbereiche_anzahl} aktive Zielbereiche.
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={deactivateZielwertPaketMutation.isPending}
                  onClick={() => deactivateZielwertPaketMutation.mutate(selectedZielwertPaket)}
                >
                  Paket deaktivieren
                </button>
                {deactivateZielwertPaketMutation.isError ? (
                  <p className="form-error">{deactivateZielwertPaketMutation.error.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="field field--full">
              <span>Neues Zielwertpaket</span>
              <div className="form-grid form-grid--compact">
                <label className="field">
                  <span>Paketschlüssel</span>
                  <input
                    value={zielwertPaketForm.paket_schluessel}
                    onChange={(event) =>
                      setZielwertPaketForm((current) => ({ ...current, paket_schluessel: event.target.value }))
                    }
                    placeholder="z. B. orfanos_boeckel_ksg_2026"
                  />
                </label>
                <label className="field">
                  <span>Paketname</span>
                  <input
                    value={zielwertPaketForm.name}
                    onChange={(event) => setZielwertPaketForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="z. B. Optimalbereiche nach Orfanos-Boeckel"
                  />
                </label>
                <label className="field">
                  <span>Version</span>
                  <input
                    value={zielwertPaketForm.version}
                    onChange={(event) =>
                      setZielwertPaketForm((current) => ({ ...current, version: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Jahr</span>
                  <input
                    type="number"
                    value={zielwertPaketForm.jahr}
                    onChange={(event) => setZielwertPaketForm((current) => ({ ...current, jahr: event.target.value }))}
                  />
                </label>
                <label className="field field--full">
                  <span>Beschreibung</span>
                  <input
                    value={zielwertPaketForm.beschreibung}
                    onChange={(event) =>
                      setZielwertPaketForm((current) => ({ ...current, beschreibung: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      !zielwertPaketForm.paket_schluessel.trim() ||
                      !zielwertPaketForm.name.trim() ||
                      createZielwertPaketMutation.isPending
                    }
                    onClick={() => createZielwertPaketMutation.mutate()}
                  >
                    {createZielwertPaketMutation.isPending ? "Speichert..." : "Paket anlegen und auswählen"}
                  </button>
                  {createZielwertPaketMutation.isError ? (
                    <p className="form-error">{createZielwertPaketMutation.error.message}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="field field--full">
              <span>Neue Zielwertquelle</span>
              <div className="form-grid form-grid--compact">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={zielbereichQuelleForm.name}
                    onChange={(event) =>
                      setZielbereichQuelleForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="z. B. Dr. med. Helena Orfanos-Boeckel"
                  />
                </label>
                <label className="field">
                  <span>Quellentyp</span>
                  <select
                    value={zielbereichQuelleForm.quellen_typ}
                    onChange={(event) =>
                      setZielbereichQuelleForm((current) => ({
                        ...current,
                        quellen_typ: event.target.value as ZielbereichQuelleTyp
                      }))
                    }
                  >
                    {ZIELBEREICH_QUELLE_TYP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Titel</span>
                  <input
                    value={zielbereichQuelleForm.titel}
                    onChange={(event) =>
                      setZielbereichQuelleForm((current) => ({ ...current, titel: event.target.value }))
                    }
                    placeholder="z. B. Nährstoff- und Hormontherapie"
                  />
                </label>
                <label className="field">
                  <span>Jahr</span>
                  <input
                    type="number"
                    value={zielbereichQuelleForm.jahr}
                    onChange={(event) =>
                      setZielbereichQuelleForm((current) => ({ ...current, jahr: event.target.value }))
                    }
                  />
                </label>
                <label className="field field--full">
                  <span>Bemerkung</span>
                  <input
                    value={zielbereichQuelleForm.bemerkung}
                    onChange={(event) =>
                      setZielbereichQuelleForm((current) => ({ ...current, bemerkung: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!zielbereichQuelleForm.name.trim() || createZielbereichQuelleMutation.isPending}
                    onClick={() => createZielbereichQuelleMutation.mutate()}
                  >
                    {createZielbereichQuelleMutation.isPending ? "Speichert..." : "Quelle anlegen und auswählen"}
                  </button>
                  {createZielbereichQuelleMutation.isError ? (
                    <p className="form-error">{createZielbereichQuelleMutation.error.message}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedParameter.wert_typ_standard === "numerisch" ? (
              <>
                <label className="field">
                  <span>Untere Grenze</span>
                  <input
                    type="number"
                    step="any"
                    value={zielbereichForm.untere_grenze_num}
                    onChange={(event) =>
                      setZielbereichForm((current) => ({ ...current, untere_grenze_num: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Obere Grenze</span>
                  <input
                    type="number"
                    step="any"
                    value={zielbereichForm.obere_grenze_num}
                    onChange={(event) =>
                      setZielbereichForm((current) => ({ ...current, obere_grenze_num: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Einheit</span>
                  <input value={selectedParameter.standard_einheit || "Keine Einheit"} disabled />
                </label>
              </>
            ) : (
              <label className="field field--full">
                <span>Solltext</span>
                <input
                  value={zielbereichForm.soll_text}
                  onChange={(event) => setZielbereichForm((current) => ({ ...current, soll_text: event.target.value }))}
                />
              </label>
            )}

            <label className="field">
              <span>Geschlecht</span>
              <select
                value={zielbereichForm.geschlecht_code}
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, geschlecht_code: event.target.value }))
                }
              >
                {KONTEXT_GESCHLECHT_OPTIONS.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Quellenstelle</span>
              <input
                value={zielbereichForm.quelle_stelle}
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, quelle_stelle: event.target.value }))
                }
                placeholder="z. B. KSG Tab S08"
              />
            </label>

            <label className="field field--full">
              <span>Originaltext aus Quelle</span>
              <textarea
                rows={2}
                value={zielbereichForm.quelle_original_text}
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, quelle_original_text: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={zielbereichForm.bemerkung}
                onChange={(event) => setZielbereichForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createZielbereichMutation.isPending || !zielbereichForm.parameter_id}>
                {createZielbereichMutation.isPending || updateZielbereichMutation.isPending
                  ? "Speichert..."
                  : isEditMode
                    ? "Zielbereich speichern"
                    : "Zielbereich anlegen"}
              </button>
              {createZielbereichMutation.isError ? (
                <p className="form-error">{createZielbereichMutation.error.message}</p>
              ) : null}
              {updateZielbereichMutation.isError ? (
                <p className="form-error">{updateZielbereichMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "aliasSuggestions") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Alias-Vorschläge prüfen</h3>
              <p>
                Hier siehst Du zusätzliche Namensvorschläge für den aktuell ausgewählten Parameter. Das System leitet
                sie aus bereits beobachteten Originalbezeichnungen ab, damit Du wiederkehrende Berichtsschreibweisen
                mit einem Klick als Alias übernehmen kannst, ohne bestehende Parameter zusammenzuführen.
              </p>
            </div>
            {renderPanelCloseButton("Panel Alias-Vorschläge prüfen schließen")}
          </div>
          <div className="parameter-panel__toolbar">
            <button
              type="button"
              className="inline-button"
              onClick={() => aliasSuggestionsQuery.refetch()}
              disabled={aliasSuggestionsQuery.isFetching}
            >
              {aliasSuggestionsQuery.isFetching ? "Sucht..." : "Vorschläge laden"}
            </button>
          </div>
          {aliasSuggestionsQuery.isError ? <p className="form-error">{aliasSuggestionsQuery.error.message}</p> : null}
          {confirmAliasSuggestionMutation.isError ? <p className="form-error">{confirmAliasSuggestionMutation.error.message}</p> : null}
          {!aliasSuggestionsQuery.isFetched ? (
            <p>Die Vorschläge werden nur bei Bedarf geladen, damit die Seite übersichtlich bleibt.</p>
          ) : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Normalisiert</th>
                  <th>Beobachtet</th>
                  <th>Letzte Verwendung</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {selectedAliasSuggestions.map((suggestion) => (
                  <tr key={`${suggestion.laborparameter_id}-${suggestion.alias_normalisiert}`}>
                    <td>{suggestion.alias_text}</td>
                    <td>{suggestion.alias_normalisiert}</td>
                    <td>{suggestion.vorkommen_anzahl}</td>
                    <td>{formatDateTime(suggestion.letzte_verwendung_am)}</td>
                    <td>
                      <button
                        type="button"
                        className="inline-button"
                        onClick={() => confirmAliasSuggestionMutation.mutate(suggestion)}
                        disabled={confirmAliasSuggestionMutation.isPending}
                      >
                        {confirmAliasSuggestionMutation.isPending ? "Bestätigt..." : "Als Alias übernehmen"}
                      </button>
                    </td>
                  </tr>
                ))}
                {aliasSuggestionsQuery.isFetched && !selectedAliasSuggestions.length ? (
                  <tr>
                    <td colSpan={5}>Für diesen Parameter wurden aktuell keine zusätzlichen Alias-Vorschläge gefunden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      );
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Dubletten prüfen und zusammenführen</h3>
            <p>
              Hier prüfst Du, ob derselbe Laborwert versehentlich mehrfach als eigener Parameter angelegt wurde. Im
              Unterschied zur Alias-Pflege geht es hier nicht nur um einen zusätzlichen Namen, sondern um zwei
              getrennte Parameterdatensätze, die möglicherweise fachlich zusammengehören. Erst nach Deiner
              Bestätigung werden Messwerte, Zielbereiche und weitere Zuordnungen auf den behaltenen Parameter
              umgestellt; der aufgelöste Name wird als Alias übernommen, solange er nicht mit einem anderen
              Parameter kollidiert.
            </p>
          </div>
          {renderPanelCloseButton("Panel Dubletten schließen")}
        </div>
        <section className="parameter-panel-section">
          <div className="parameter-panel-section__header">
            <h4>Manuelle Einzelauswahl</h4>
            <p>Der ausgewählte Parameter wird in einen kompatiblen Zielparameter überführt.</p>
          </div>
          {selectedParameter ? (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                const target = manualMergeTargets.find((parameter) => parameter.id === manualMergeForm.ziel_parameter_id);
                if (!target) {
                  return;
                }
                const mergeName = manualMergeForm.gemeinsamer_name.trim() || target.anzeigename;
                requestMergeConfirmation({
                  ziel_parameter_id: target.id,
                  quell_parameter_id: selectedParameter.id,
                  ziel_parameter_anzeigename: target.anzeigename,
                  quell_parameter_anzeigename: selectedParameter.anzeigename,
                  gemeinsamer_name: mergeName
                });
              }}
            >
              <label className="field field--full">
                <span>Diesen Parameter überführen in</span>
                <select
                  value={manualMergeForm.ziel_parameter_id}
                  onChange={(event) => {
                    const target = manualMergeTargets.find((parameter) => parameter.id === event.target.value);
                    setManualMergeForm({
                      ziel_parameter_id: event.target.value,
                      gemeinsamer_name: target?.anzeigename ?? ""
                    });
                  }}
                >
                  <option value="">Zielparameter auswählen</option>
                  {manualMergeTargets.map((parameter) => (
                    <option key={parameter.id} value={parameter.id}>
                      {parameter.anzeigename} · {formatWertTyp(parameter.wert_typ_standard)} ·{" "}
                      {parameter.standard_einheit || "Keine Einheit"}
                    </option>
                  ))}
                </select>
                <small>Nur aktive Parameter mit gleichem Werttyp und gleicher Standardeinheit.</small>
              </label>
              <label className="field field--full">
                <span>Beibehaltener Name</span>
                <input
                  value={manualMergeForm.gemeinsamer_name}
                  onChange={(event) =>
                    setManualMergeForm((current) => ({ ...current, gemeinsamer_name: event.target.value }))
                  }
                  placeholder="Name des Zielparameters"
                />
              </label>
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={!manualMergeForm.ziel_parameter_id || mergeDuplicateMutation.isPending}
                >
                  {mergeDuplicateMutation.isPending ? "Führt zusammen..." : "In Zielparameter überführen"}
                </button>
                {!manualMergeTargets.length ? (
                  <p className="form-hint">Es gibt aktuell keinen kompatiblen Zielparameter mit gleicher Einheit.</p>
                ) : null}
              </div>
            </form>
          ) : null}
        </section>
        <section className="parameter-panel-section">
          <div className="parameter-panel-section__header">
            <h4>Automatische Dublettensuche</h4>
            <p>Die Suche erzeugt Vorschläge, die Du einzeln bestätigen oder ausblenden kannst.</p>
          </div>
          <div className="parameter-panel__toolbar">
          <button
            type="button"
            className={`parameter-toolrail__button ${duplicateViewScope === "selected" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setDuplicateViewScope("selected")}
            aria-pressed={duplicateViewScope === "selected"}
          >
            Für diesen Parameter
          </button>
          <button
            type="button"
            className={`parameter-toolrail__button ${duplicateViewScope === "all" ? "parameter-toolrail__button--active" : ""}`}
            onClick={() => setDuplicateViewScope("all")}
            aria-pressed={duplicateViewScope === "all"}
          >
            Für alle Parameter
          </button>
          <button
            type="button"
            className="inline-button"
            onClick={() => duplicateSuggestionsQuery.refetch()}
            disabled={duplicateSuggestionsQuery.isFetching}
          >
            {duplicateSuggestionsQuery.isFetching ? "Prüft..." : "Dubletten suchen"}
          </button>
        </div>
          <div className="parameter-duplicate-sensitivity">
          <div className="parameter-duplicate-sensitivity__header">
            <strong>Prüfschärfe</strong>
            <span>{activeDuplicateSensitivityOption.label}</span>
          </div>
          <div className="parameter-panel__toolbar">
            {DUPLICATE_CHECK_SENSITIVITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`parameter-toolrail__button ${
                  duplicateSensitivity === option.value ? "parameter-toolrail__button--active" : ""
                }`}
                onClick={() => setDuplicateSensitivity(option.value)}
                aria-pressed={duplicateSensitivity === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="form-hint">{activeDuplicateSensitivityOption.description}</p>
        </div>
          {selectedParameter ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th colSpan={3}>Für diesen Parameter unterdrückte Paarungen</th>
                </tr>
                <tr>
                  <th>Anderer Parameter</th>
                  <th>Seit</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {visibleDuplicateSuppressions.map((suppression) => (
                  <tr key={suppression.id}>
                    <td>{suppression.anderer_parameter_anzeigename}</td>
                    <td>{formatDateTime(suppression.erstellt_am)}</td>
                    <td>
                      <button
                        type="button"
                        className="inline-button"
                        disabled={deleteDuplicateSuppressionMutation.isPending}
                        onClick={() => deleteDuplicateSuppressionMutation.mutate(suppression.id)}
                      >
                        Unterdrückung aufheben
                      </button>
                    </td>
                  </tr>
                ))}
                {!visibleDuplicateSuppressions.length ? (
                  <tr>
                    <td colSpan={3}>Für diesen Parameter sind aktuell keine Dublett-Unterdrückungen hinterlegt.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
          {duplicateSuggestionsQuery.isError ? <p className="form-error">{duplicateSuggestionsQuery.error.message}</p> : null}
          {mergeDuplicateMutation.isError ? <p className="form-error">{mergeDuplicateMutation.error.message}</p> : null}
          {duplicateSuppressionsQuery.isError ? <p className="form-error">{duplicateSuppressionsQuery.error.message}</p> : null}
          {suppressDuplicateMutation.isError ? <p className="form-error">{suppressDuplicateMutation.error.message}</p> : null}
          {deleteDuplicateSuppressionMutation.isError ? (
            <p className="form-error">{deleteDuplicateSuppressionMutation.error.message}</p>
          ) : null}
          {lastMergeResult && selectedParameterId === lastMergeResult.ziel_parameter_id ? (
            <p>
              Zusammengeführt zu <strong>{lastMergeResult.gemeinsamer_name}</strong>. Verschoben:{" "}
              {lastMergeResult.verschobene_messwerte} Messwerte, {lastMergeResult.verschobene_zielbereiche} Zielbereiche,{" "}
              {lastMergeResult.verschobene_planung_zyklisch + lastMergeResult.verschobene_planung_einmalig} Planungen.
              Neue Aliase: {lastMergeResult.angelegte_aliase.join(", ") || "keine"}.
            </p>
          ) : null}
          {!duplicateSuggestionsQuery.isFetched ? <p>Die Dublettenprüfung wird nur auf Abruf geladen.</p> : null}
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Behalten</th>
                <th>Auflösen</th>
                <th>Begründung</th>
                <th>Gemeinsamer Name</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {visibleDuplicateSuggestions.map((suggestion) => {
                const suggestionKey = buildDuplicateSuggestionKey(
                  suggestion.ziel_parameter_id,
                  suggestion.quell_parameter_id
                );
                const mergeName = mergeNameBySuggestion[suggestionKey] ?? suggestion.gemeinsamer_name_vorschlag;
                const isSuppressingThisSuggestion = pendingDuplicateSuppressionKey === suggestionKey;
                return (
                  <tr key={suggestionKey}>
                    <td>
                      <strong>{suggestion.ziel_parameter_anzeigename}</strong>
                      <br />
                      <small>{formatUsageSummary(suggestion.ziel_parameter)}</small>
                    </td>
                    <td>
                      <strong>{suggestion.quell_parameter_anzeigename}</strong>
                      <br />
                      <small>{formatUsageSummary(suggestion.quell_parameter)}</small>
                    </td>
                    <td>
                      <strong>{Math.round(suggestion.aehnlichkeit * 100)} %</strong>
                      <br />
                      <small>{suggestion.begruendung}</small>
                      {suggestion.einheiten_hinweis ? (
                        <>
                          <br />
                          <small>{suggestion.einheiten_hinweis}</small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <input
                        value={mergeName}
                        onChange={(event) =>
                          setMergeNameBySuggestion((current) => ({
                            ...current,
                            [suggestionKey]: event.target.value
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="inline-button"
                          disabled={mergeDuplicateMutation.isPending || suppressDuplicateMutation.isPending}
                          onClick={() => {
                            requestMergeConfirmation({
                              ziel_parameter_id: suggestion.ziel_parameter_id,
                              quell_parameter_id: suggestion.quell_parameter_id,
                              ziel_parameter_anzeigename: suggestion.ziel_parameter_anzeigename,
                              quell_parameter_anzeigename: suggestion.quell_parameter_anzeigename,
                              gemeinsamer_name: mergeName
                            });
                          }}
                        >
                          {mergeDuplicateMutation.isPending ? "Führt zusammen..." : "Zusammenführen"}
                        </button>
                        <button
                          type="button"
                          className="inline-button"
                          disabled={mergeDuplicateMutation.isPending || suppressDuplicateMutation.isPending}
                          onClick={() =>
                            suppressDuplicateMutation.mutate({
                              erster_parameter_id: suggestion.ziel_parameter_id,
                              zweiter_parameter_id: suggestion.quell_parameter_id
                            })
                          }
                        >
                          {isSuppressingThisSuggestion ? "Merkt..." : "Kein Dublett"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {duplicateSuggestionsQuery.isFetched && !visibleDuplicateSuggestions.length ? (
                <tr>
                  <td colSpan={5}>
                    {duplicateViewScope === "all"
                      ? "Aktuell wurden keine passenden Dublettenvorschläge für die gesamte Parameterbasis gefunden."
                      : "Für diesen Parameter wurden aktuell keine passenden Dublettenvorschläge gefunden."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </section>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Parameter</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Parameterseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du Laborparameter, Aliase, Umrechnungen und allgemeine Zielbereiche.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Parameter</h3>
              <p>{parameterCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={parameterSearchQuery}
                onChange={(event) => setParameterSearchQuery(event.target.value)}
                placeholder="Name, Schlüssel oder Beschreibung"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setParameterSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!parameterSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          <label className="field field--full">
            <span>KSG-Klasse</span>
            <select value={klassifikationFilter} onChange={(event) => setKlassifikationFilter(event.target.value)}>
              {PARAMETER_KLASSIFIKATION_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "empty"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="parameter-list">
            {filteredParameters.map((parameter) => (
              <button
                key={parameter.id}
                type="button"
                className={`parameter-list__item ${selectedParameterId === parameter.id ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedParameterId(parameter.id)}
              >
                <div className="parameter-list__title-row">
                  <strong>{parameter.anzeigename}</strong>
                </div>
                <p>{summarizeDescription(parameter.beschreibung)}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">{formatWertTyp(parameter.wert_typ_standard)}</span>
                  <span className="parameter-pill">
                    {formatParameterKlassifikation(parameter.primaere_klassifikation)}
                  </span>
                  <span className="parameter-pill">{parameter.standard_einheit || "Ohne Einheit"}</span>
                </div>
              </button>
            ))}
            {!filteredParameters.length ? (
              <div className="parameter-list__empty">
                <p>Keine Parameter passen zur aktuellen Suche.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            {!selectedParameter ? (
              <p>Noch keine Parameter vorhanden. Lege über die Werkzeugleiste den ersten Parameter an.</p>
            ) : (
              <>
                <div className="parameter-toolrail">
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "create" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("create")}
                    >
                      Neuer Parameter
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "standardUnit" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("standardUnit")}
                    >
                      Normeinheit
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "classification" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("classification")}
                    >
                      KSG-Klasse
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "knowledge" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("knowledge")}
                    >
                      Wissen
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "rename" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("rename")}
                    >
                      Umbenennen
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "alias" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("alias")}
                    >
                      Alias pflegen
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "conversion" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("conversion")}
                    >
                      Umrechnung
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "zielbereich" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("zielbereich")}
                    >
                      Zielbereich
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "aliasSuggestions" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("aliasSuggestions")}
                    >
                      Vorschläge
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "duplicates" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("duplicates")}
                    >
                      Dubletten
                    </button>
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "delete" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("delete")}
                    >
                      Löschprüfung
                    </button>
                </div>

                {renderActionPanel()}

                <div className="parameter-detail__header">
                  <div>
                    <h3 className="parameter-detail__title">{selectedParameter.anzeigename}</h3>
                    <p>{selectedParameter.beschreibung?.trim() || "Zu diesem Parameter ist noch keine Erläuterung hinterlegt."}</p>
                  </div>
                  <div className="parameter-header-controls">
                    <button
                      type="button"
                      className={`parameter-mode-toggle ${showAdvancedDetails ? "parameter-mode-toggle--advanced" : ""}`}
                      onClick={() => setShowAdvancedDetails((current) => !current)}
                      aria-pressed={showAdvancedDetails}
                      title={showAdvancedDetails ? "Zur einfachen Ansicht wechseln" : "Zur Expertenansicht wechseln"}
                    >
                      <span className="parameter-mode-toggle__icon" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="parameter-mode-toggle__text">
                        {showAdvancedDetails ? "Experte" : "Einfach"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Werttyp</span>
                    <strong>{formatWertTyp(selectedParameter.wert_typ_standard)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Primäre KSG-Klasse</span>
                    <strong>{formatParameterKlassifikation(selectedParameter.primaere_klassifikation)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Führende Normeinheit</span>
                    <strong>{selectedParameter.standard_einheit || "Keine Einheit"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Vorhandene Messwerte</span>
                    <strong>{selectedParameter.messwerte_anzahl}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Verwendet in Parametergruppen</span>
                    <strong>{parameterGruppenQuery.data?.length ?? 0}</strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    <div className="detail-grid__item">
                      <span>Interner Schlüssel</span>
                      <strong className="detail-grid__value--break">{selectedParameter.interner_schluessel}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Status</span>
                      <strong>{selectedParameter.aktiv ? "Aktiv" : "Inaktiv"}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>{formatDateTime(selectedParameter.erstellt_am)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>{formatDateTime(selectedParameter.geaendert_am)}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Laborwissen</span>
                      {selectedParameter.wissensseite_pfad_relativ ? (
                        <strong>
                          <Link
                            className="text-link"
                            to={`/wissensbasis?seite=${encodeURIComponent(selectedParameter.wissensseite_pfad_relativ)}`}
                          >
                            {selectedParameter.wissensseite_titel ?? selectedParameter.wissensseite_pfad_relativ}
                          </Link>
                        </strong>
                      ) : (
                        <strong>
                          <Link
                            className="text-link"
                            to={`/wissensbasis?suche=${encodeURIComponent(selectedParameter.anzeigename)}`}
                          >
                            Nach passender Wissensseite suchen
                          </Link>
                        </strong>
                      )}
                    </div>
                  </div>
                ) : null}

                <section className="card card--soft parameter-related">
                  <div className="parameter-related__header">
                    <div>
                      <h3>Zugeordnete Daten</h3>
                    </div>
                  </div>

                  <div className="parameter-related__list">
                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${
                          expandedRelatedSections.classifications ? "parameter-related__toggle--open" : ""
                        }`}
                        onClick={() =>
                          setExpandedRelatedSections((current) => ({
                            ...current,
                            classifications: !current.classifications
                          }))
                        }
                        aria-expanded={expandedRelatedSections.classifications}
                      >
                        <span>
                          <strong>KSG-Zusatzrollen</strong>
                          <small>
                            {formatCountLabel(
                              parameterKlassifikationenQuery.data?.length ?? 0,
                              "Eintrag",
                              "Einträge"
                            )}
                          </small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {expandedRelatedSections.classifications ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Klassifikation</th>
                                  <th>Kontext</th>
                                  <th>Begründung</th>
                                  <th>Aktion</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parameterKlassifikationenQuery.data?.map((klassifikation) => (
                                  <tr key={klassifikation.id}>
                                    <td>{formatParameterKlassifikation(klassifikation.klassifikation)}</td>
                                    <td>{klassifikation.kontext_beschreibung || "—"}</td>
                                    <td>{klassifikation.begruendung || "—"}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="inline-button"
                                        disabled={deleteKlassifikationMutation.isPending}
                                        onClick={() => deleteKlassifikationMutation.mutate(klassifikation.id)}
                                      >
                                        Entfernen
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {!parameterKlassifikationenQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={4}>Noch keine kontextabhängigen Zusatzrollen vorhanden.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                          {deleteKlassifikationMutation.isError ? (
                            <p className="form-error">{deleteKlassifikationMutation.error.message}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>

                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${
                          expandedRelatedSections.aliases ? "parameter-related__toggle--open" : ""
                        }`}
                        onClick={() =>
                          setExpandedRelatedSections((current) => ({ ...current, aliases: !current.aliases }))
                        }
                        aria-expanded={expandedRelatedSections.aliases}
                      >
                        <span>
                          <strong>Aliase</strong>
                          <small>{formatCountLabel(parameterAliaseQuery.data?.length ?? 0, "Eintrag", "Einträge")}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {expandedRelatedSections.aliases ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Alias</th>
                                  <th>Normalisiert</th>
                                  <th>Bemerkung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parameterAliaseQuery.data?.map((alias) => (
                                  <tr key={alias.id}>
                                    <td>{alias.alias_text}</td>
                                    <td>{alias.alias_normalisiert}</td>
                                    <td>{alias.bemerkung || "—"}</td>
                                  </tr>
                                ))}
                                {!parameterAliaseQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={3}>Noch keine Aliase für diesen Parameter vorhanden.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>

                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${
                          expandedRelatedSections.conversions ? "parameter-related__toggle--open" : ""
                        }`}
                        onClick={() =>
                          setExpandedRelatedSections((current) => ({ ...current, conversions: !current.conversions }))
                        }
                        aria-expanded={expandedRelatedSections.conversions}
                      >
                        <span>
                          <strong>Umrechnungsregeln</strong>
                          <small>
                            {formatCountLabel(umrechnungsregelnQuery.data?.length ?? 0, "Eintrag", "Einträge")}
                          </small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {expandedRelatedSections.conversions ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Von</th>
                                  <th>Nach</th>
                                  <th>Typ</th>
                                  <th>Berechnung</th>
                                  <th>Quelle</th>
                                </tr>
                              </thead>
                              <tbody>
                                {umrechnungsregelnQuery.data?.map((regel) => (
                                  <tr key={regel.id}>
                                    <td>{regel.von_einheit}</td>
                                    <td>{regel.nach_einheit}</td>
                                    <td>
                                      {UMRECHNUNGSREGEL_TYP_OPTIONS.find((option) => option.value === regel.regel_typ)
                                        ?.label ?? regel.regel_typ}
                                    </td>
                                    <td>{formatUmrechnungsregel(regel)}</td>
                                    <td>{regel.quelle_beschreibung || "—"}</td>
                                  </tr>
                                ))}
                                {!umrechnungsregelnQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={5}>Noch keine Umrechnungsregeln für diesen Parameter vorhanden.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>

                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${
                          expandedRelatedSections.ranges ? "parameter-related__toggle--open" : ""
                        }`}
                        onClick={() => setExpandedRelatedSections((current) => ({ ...current, ranges: !current.ranges }))}
                        aria-expanded={expandedRelatedSections.ranges}
                      >
                        <span>
                          <strong>Zielbereiche</strong>
                          <small>{formatCountLabel(zielbereicheQuery.data?.length ?? 0, "Eintrag", "Einträge")}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {expandedRelatedSections.ranges ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Zieltyp</th>
                                  <th>Paket</th>
                                  <th>Quelle</th>
                                  <th>Typ</th>
                                  <th>Zielrichtung</th>
                                  <th>Bereich</th>
                                  <th>Einheit</th>
                                  <th>Geschlecht</th>
                                  <th>Aktion</th>
                                </tr>
                              </thead>
                              <tbody>
                                {zielbereicheQuery.data?.map((zielbereich) => (
                                  <tr key={zielbereich.id}>
                                    <td>{formatZielbereichTyp(zielbereich.zielbereich_typ)}</td>
                                    <td>{formatZielwertPaket(zielwertPaketeById.get(zielbereich.zielwert_paket_id ?? ""))}</td>
                                    <td>{formatZielbereichQuelle(zielbereichQuellenById.get(zielbereich.zielbereich_quelle_id ?? ""))}</td>
                                    <td>{formatWertTyp(zielbereich.wert_typ)}</td>
                                    <td>{formatZielrichtung(zielbereich.zielrichtung)}</td>
                                    <td>{formatZielbereichValue(zielbereich)}</td>
                                    <td>{zielbereich.einheit || "—"}</td>
                                    <td>{formatGeschlechtCode(zielbereich.geschlecht_code, "Alle Geschlechter")}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="inline-button"
                                        onClick={() => startZielbereichEdit(zielbereich)}
                                      >
                                        Bearbeiten
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {!zielbereicheQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={9}>Noch keine Zielbereiche für diesen Parameter vorhanden.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>


                    <article className="parameter-related__item">
                      <button
                        type="button"
                        className={`parameter-related__toggle ${
                          expandedRelatedSections.groups ? "parameter-related__toggle--open" : ""
                        }`}
                        onClick={() => setExpandedRelatedSections((current) => ({ ...current, groups: !current.groups }))}
                        aria-expanded={expandedRelatedSections.groups}
                      >
                        <span>
                          <strong>Parametergruppen</strong>
                          <small>{formatCountLabel(parameterGruppenQuery.data?.length ?? 0, "Eintrag", "Einträge")}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {expandedRelatedSections.groups ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
                              <thead>
                                <tr>
                                  <th>Parametergruppe</th>
                                  <th>Sortierung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parameterGruppenQuery.data?.map((gruppe) => (
                                  <tr key={gruppe.id}>
                                    <td>{gruppe.gruppenname}</td>
                                    <td>{gruppe.sortierung ?? "—"}</td>
                                  </tr>
                                ))}
                                {!parameterGruppenQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={2}>Dieser Parameter ist aktuell keiner Parametergruppe zugeordnet.</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  </div>
                </section>
              </>
            )}
          </article>
        </div>
      </div>
      {mergeConfirmation ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog-panel parameter-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parameter-merge-confirm-title"
          >
            <header className="dialog-panel__header">
              <div>
                <span className="section-eyebrow">Parameter zusammenführen</span>
                <h3 id="parameter-merge-confirm-title">Überführung bestätigen</h3>
              </div>
              <button
                type="button"
                className="dialog-panel__close"
                onClick={() => setMergeConfirmation(null)}
                disabled={mergeDuplicateMutation.isPending}
              >
                Schließen
              </button>
            </header>
            <div className="parameter-confirm-dialog__body">
              <p>
                Soll <strong>{mergeConfirmation.quell_parameter_anzeigename}</strong> in{" "}
                <strong>{mergeConfirmation.ziel_parameter_anzeigename}</strong> überführt werden?
              </p>
              <dl className="detail-grid">
                <div>
                  <dt>Wird aufgelöst</dt>
                  <dd>{mergeConfirmation.quell_parameter_anzeigename}</dd>
                </div>
                <div>
                  <dt>Bleibt bestehen</dt>
                  <dd>{mergeConfirmation.ziel_parameter_anzeigename}</dd>
                </div>
                <div>
                  <dt>Beibehaltener Name</dt>
                  <dd>{mergeConfirmation.gemeinsamer_name}</dd>
                </div>
              </dl>
              <p className="form-hint">
                Messwerte, Zielbereiche, Planungen und Gruppenzuordnungen werden auf den Zielparameter übertragen.
                Der aufgelöste Name wird als Alias übernommen; nur bei Namens- oder Alias-Kollisionen wird er übersprungen.
              </p>
              {mergeDuplicateMutation.isError ? <p className="form-error">{mergeDuplicateMutation.error.message}</p> : null}
            </div>
            <footer className="dialog-panel__footer">
              <button
                type="button"
                className="button--secondary"
                onClick={() => setMergeConfirmation(null)}
                disabled={mergeDuplicateMutation.isPending}
              >
                Abbrechen
              </button>
              <button type="button" onClick={confirmPendingMerge} disabled={mergeDuplicateMutation.isPending}>
                {mergeDuplicateMutation.isPending ? "Führt zusammen..." : "Überführen"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
