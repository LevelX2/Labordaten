import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { LoeschAktionPanel } from "../../shared/components/LoeschAktionPanel";
import { formatGeschlechtCode, formatWertTyp } from "../../shared/constants/fieldOptions";
import { getDocumentContentUrl } from "../../shared/utils/documents";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type {
  Gruppe,
  ImportGruppenvorschlaegeAnwendenResponse,
  ImportKomplettEntfernenResponse,
  ImportPromptPayload,
  ImportPromptResponse,
  ImportPruefpunkt,
  ImportVorgangDetail,
  ImportMesswertPreview,
  ImportVorgangListItem,
  Labor,
  Parameter,
  Person
} from "../../shared/types/api";

type ImportFormState = {
  payload_json: string;
  person_id_override: string;
  bemerkung: string;
  dokument_file: File | null;
  dokument_name: string;
};

type GruppenVorschlagAktion = "neu" | "vorhanden" | "ignorieren";
type ImportMode = "ki" | "json" | "pruefen" | "historie";

type GruppenVorschlagState = {
  aktion: GruppenVorschlagAktion;
  gruppe_id: string;
  gruppenname: string;
};

const NEW_PARAMETER_MAPPING_VALUE = "__new_parameter__";

const examplePayload = `{
  "schemaVersion": "1.0",
  "quelleTyp": "json",
  "befund": {
    "entnahmedatum": "2026-04-20"
  },
  "messwerte": [
    {
      "originalParametername": "Ferritin",
      "wertTyp": "numerisch",
      "wertRohText": "41",
      "wertNum": 41,
      "einheitOriginal": "ng/ml"
    }
  ]
}`;

const jsonInterfaceGuide = `Ziel: Erzeuge ein JSON-Objekt für den Import in die Anwendung "Labordaten".
Quelle kann ein Laborbericht, PDF, Bild, CSV, Excel, eine kopierte Tabelle oder ein anderes strukturiertes Dokument sein.

Ausgabe:
- Gib ausschließlich valides JSON aus, wenn das Ergebnis direkt importiert werden soll.
- Wenn Du zusätzlich erklärenden Text ausgibst, muss das JSON in genau einem Markdown-Codeblock mit Sprache json stehen.
- Keine zusätzlichen Felder verwenden.
- Keine Platzhalter wie "unbekannt" setzen.
- Datumsformat: YYYY-MM-DD.
- Zahlen im JSON mit Dezimalpunkt schreiben.

Wurzelstruktur:
{
  "schemaVersion": "1.0",
  "quelleTyp": "ki_json",
  "personHinweis": "optional erkannte Person als Text",
  "befund": {
    "personId": "optional, wenn von der Anwendung oder vom Nutzer vorgegeben",
    "laborId": "optional, nur bei eindeutigem Match",
    "laborName": "optional, wenn kein sicherer laborId-Match möglich ist",
    "entnahmedatum": "YYYY-MM-DD",
    "befunddatum": "YYYY-MM-DD",
    "bemerkung": "optional"
  },
  "messwerte": [
    {
      "parameterId": "optional, nur bei eindeutigem Match",
      "originalParametername": "Name exakt aus der Quelle",
      "wertTyp": "numerisch",
      "wertOperator": "exakt",
      "wertRohText": "41",
      "wertNum": 41,
      "einheitOriginal": "ng/ml",
      "referenzTextOriginal": "30-400 ng/ml",
      "untereGrenzeNum": 30,
      "obereGrenzeNum": 400,
      "referenzEinheit": "ng/ml",
      "bemerkungKurz": "optional",
      "bemerkungLang": "optional",
      "aliasUebernehmen": false,
      "unsicherFlag": false,
      "pruefbedarfFlag": false
    }
  ],
  "gruppenVorschlaege": [
    {
      "name": "Berichtsabschnitt",
      "beschreibung": "optional",
      "messwertIndizes": [0]
    }
  ],
  "parameterVorschlaege": [
    {
      "anzeigename": "Gut lesbarer Parametername",
      "wertTypStandard": "numerisch",
      "standardEinheit": "optionale Einheit",
      "beschreibungKurz": "Allgemeine, berichtsunabhängige Fachbeschreibung des Parameters",
      "moeglicheAliase": ["Name aus der Quelle"],
      "begruendungAusDokument": "Warum der Vorschlag zu den Messwerten passt",
      "unsicherFlag": false,
      "messwertIndizes": [0]
    }
  ]
}

Regeln:
- Wenn die Quelle CSV, Excel oder eine Tabelle ist, erkenne Spalten wie Parameter, Wert, Einheit, Referenz und Datum und überführe sie in dieselbe JSON-Struktur.
- "messwerte" enthält alle erkannten Laborwerte.
- "originalParametername" und "wertRohText" bleiben nah an der Quelle.
- "parameterId" nur setzen, wenn ein vorhandener Parameter eindeutig bekannt ist.
- Bei unsicheren Zuordnungen "parameterId" weglassen und "pruefbedarfFlag": true setzen.
- Qualitative Werte wie "positiv", "negativ" oder "nicht nachweisbar" mit "wertTyp": "text" und "wertText" abbilden.
- Referenzbereiche als Originaltext erhalten; strukturierte Grenzen nur setzen, wenn sie eindeutig sind.
- "beschreibungKurz" bei Parameter-Vorschlägen darf keine konkrete Befundbewertung enthalten und muss unabhängig vom konkreten Import verständlich sein.
- Berichtsspezifische Hinweise zu einem Parameter-Vorschlag gehören in "begruendungAusDokument".`;

const initialForm: ImportFormState = {
  payload_json: examplePayload,
  person_id_override: "",
  bemerkung: "",
  dokument_file: null,
  dokument_name: ""
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function formatAgeRange(minDays?: number | null, maxDays?: number | null): string {
  const minYears = minDays !== null && minDays !== undefined ? (minDays / 365.25).toFixed(1) : null;
  const maxYears = maxDays !== null && maxDays !== undefined ? (maxDays / 365.25).toFixed(1) : null;
  if (minYears && maxYears) {
    return `${minYears} bis ${maxYears} Jahre`;
  }
  if (minYears) {
    return `ab ${minYears} Jahre`;
  }
  if (maxYears) {
    return `bis ${maxYears} Jahre`;
  }
  return "â€”";
}

function formatImportReference(messwert: ImportMesswertPreview): string {
  if (messwert.wert_typ === "text") {
    return messwert.referenz_text_original || "â€”";
  }

  const lower = messwert.untere_grenze_num ?? null;
  const upper = messwert.obere_grenze_num ?? null;
  const unit = messwert.referenz_einheit || messwert.einheit_original || "";
  const range =
    lower !== null || upper !== null
      ? `${lower ?? "â€”"} bis ${upper ?? "â€”"}${unit ? ` ${unit}` : ""}`
      : null;

  if (range && messwert.referenz_text_original) {
    return `${range} (${messwert.referenz_text_original})`;
  }
  return range || messwert.referenz_text_original || "â€”";
}

function formatMappingInfo(messwert: ImportMesswertPreview, currentParameterId?: string): string {
  if (currentParameterId === NEW_PARAMETER_MAPPING_VALUE) {
    return "Neuanlage vorgesehen";
  }
  if (currentParameterId && currentParameterId !== (messwert.parameter_id ?? "")) {
    return "Manuell angepasst";
  }

  const source = messwert.parameter_mapping_herkunft;
  const hint = messwert.parameter_mapping_hinweis;
  if (source === "alias") {
    return hint ? `Automatisch über Alias: ${hint}` : "Automatisch über Alias";
  }
  if (source === "anzeigename") {
    return hint ? `Automatisch über Anzeigenamen: ${hint}` : "Automatisch über Anzeigenamen";
  }
  if (source === "schluessel") {
    return hint ? `Automatisch über Schlüssel: ${hint}` : "Automatisch über Schlüssel";
  }
  if (source === "explizit") {
    return "Im Import bereits zugeordnet";
  }
  if (source === "manuell") {
    return "Manuell zugeordnet";
  }
  if (source === "uebernommen") {
    return hint ? `Bereits übernommen: ${hint}` : "Bereits übernommen";
  }
  return "Noch offen";
}

function normalizeAliasCandidate(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

function getAliasRecommendation(args: {
  messwert: ImportMesswertPreview;
  parameterId?: string;
  parameterById: Map<string, Parameter>;
}): { recommended: boolean; note: string | null } {
  const { messwert, parameterId, parameterById } = args;
  if (!parameterId || parameterId === NEW_PARAMETER_MAPPING_VALUE) {
    return { recommended: false, note: null };
  }

  const parameter = parameterById.get(parameterId);
  if (!parameter) {
    return { recommended: false, note: null };
  }

  if (messwert.parameter_mapping_herkunft === "alias") {
    return {
      recommended: false,
      note: "Alias bereits vorhanden. Eine zusätzliche Alias-Anlage ist nicht nötig."
    };
  }

  const original = normalizeAliasCandidate(messwert.original_parametername);
  const display = normalizeAliasCandidate(parameter.anzeigename);
  const key = normalizeAliasCandidate(parameter.interner_schluessel);
  if (!original || original === display || original === key) {
    return { recommended: false, note: null };
  }

  return {
    recommended: true,
    note: `Empfohlen, wenn '${messwert.original_parametername}' wirklich nur eine andere Schreibweise von '${parameter.anzeigename}' ist.`
  };
}

function getGruppenVorschlagDefault(args: {
  suggestionName: string;
  gruppen: Gruppe[];
}): GruppenVorschlagState {
  const normalizedSuggestion = normalizeAliasCandidate(args.suggestionName);
  const exactMatch = args.gruppen.find(
    (gruppe) => normalizeAliasCandidate(gruppe.name) === normalizedSuggestion
  );
  if (exactMatch) {
    return {
      aktion: "vorhanden",
      gruppe_id: exactMatch.id,
      gruppenname: exactMatch.name
    };
  }

  return {
    aktion: "neu",
    gruppe_id: "",
    gruppenname: args.suggestionName
  };
}

function getMesswertIndexFromCheck(item: ImportPruefpunkt): number | null {
  const match = item.objekt_schluessel_temp?.match(/^messwert:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isResolvedMissingParameterCheck(item: ImportPruefpunkt, mappingState: Record<number, string>): boolean {
  if (item.objekt_typ !== "messwert" || item.pruefart !== "parameter_mapping") {
    return false;
  }
  const messwertIndex = getMesswertIndexFromCheck(item);
  return messwertIndex !== null && Boolean(mappingState[messwertIndex]);
}

function getVisibleImportChecks(
  importDetail: ImportVorgangDetail | undefined | null,
  mappingState: Record<number, string>
): ImportPruefpunkt[] {
  if (!importDetail || !Array.isArray(importDetail.pruefpunkte)) {
    return [];
  }
  return importDetail.pruefpunkte.filter((item) => !isResolvedMissingParameterCheck(item, mappingState));
}

function getImportChecksBySeverity(items: ImportPruefpunkt[]): {
  errors: number;
  warnings: number;
} {
  if (!Array.isArray(items)) {
    return { errors: 0, warnings: 0 };
  }
  return items.reduce(
    (counts, item) => ({
      errors: counts.errors + (item.status === "fehler" ? 1 : 0),
      warnings: counts.warnings + (item.status === "warnung" ? 1 : 0)
    }),
    { errors: 0, warnings: 0 }
  );
}

function getOpenMappingCount(importDetail: ImportVorgangDetail | undefined, mappingState: Record<number, string>): number {
  if (!importDetail || importDetail.status === "uebernommen" || !Array.isArray(importDetail.messwerte)) {
    return 0;
  }
  return importDetail.messwerte.filter((messwert) => !(mappingState[messwert.messwert_index] || messwert.parameter_id))
    .length;
}

function shouldPreselectNewParameter(messwert: ImportMesswertPreview): boolean {
  return !messwert.parameter_id && !messwert.parameter_mapping_hinweis;
}

function formatImportReferenceResolved(messwert: ImportMesswertPreview): string {
  const range = formatReferenzAnzeige({
    wert_typ: messwert.wert_typ,
    soll_text: messwert.referenz_text_original,
    referenz_text_original: messwert.referenz_text_original,
    untere_grenze_num: messwert.untere_grenze_num,
    untere_grenze_operator: messwert.untere_grenze_operator,
    obere_grenze_num: messwert.obere_grenze_num,
    obere_grenze_operator: messwert.obere_grenze_operator,
    einheit: messwert.referenz_einheit || messwert.einheit_original
  });

  if (
    range !== "—" &&
    messwert.referenz_text_original &&
    !range.includes(messwert.referenz_text_original)
  ) {
    return `${range} (${messwert.referenz_text_original})`;
  }
  return range;
}

function formatPruefpunktStatus(status: string): string {
  if (status === "warnung") {
    return "Hinweis";
  }
  if (status === "fehler") {
    return "Fehler";
  }
  return status;
}

export function ImportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ImportFormState>(initialForm);
  const [promptText, setPromptText] = useState("");
  const [promptSummary, setPromptSummary] = useState("");
  const [promptKind, setPromptKind] = useState<"laborbericht" | "tabelle">("laborbericht");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [interfaceCopyStatus, setInterfaceCopyStatus] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("ki");
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [mappingState, setMappingState] = useState<Record<number, string>>({});
  const [aliasState, setAliasState] = useState<Record<number, boolean>>({});
  const [gruppenState, setGruppenState] = useState<Record<number, GruppenVorschlagState>>({});
  const [gruppenResult, setGruppenResult] = useState<ImportGruppenvorschlaegeAnwendenResponse | null>(null);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [showDiscardPanel, setShowDiscardPanel] = useState(false);
  const [removeLinkedDocument, setRemoveLinkedDocument] = useState(false);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
  const importsQuery = useQuery({
    queryKey: ["importe"],
    queryFn: () => apiFetch<ImportVorgangListItem[]>("/api/importe")
  });
  const selectedImportQuery = useQuery({
    queryKey: ["importe", selectedImportId],
    queryFn: () => apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}`),
    enabled: Boolean(selectedImportId)
  });

  useEffect(() => {
    if (!selectedImportId && importsQuery.data?.length) {
      setSelectedImportId(importsQuery.data.find((item) => item.status === "in_pruefung")?.id ?? importsQuery.data[0].id);
    }
  }, [importsQuery.data, selectedImportId]);

  useEffect(() => {
    setShowDeletePanel(false);
    setShowDiscardPanel(false);
    setRemoveLinkedDocument(false);
    setGruppenResult(null);
  }, [selectedImportId]);

  const personById = useMemo(
    () => new Map((personenQuery.data ?? []).map((person) => [person.id, person])),
    [personenQuery.data]
  );
  const parameterById = useMemo(
    () => new Map((parameterQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parameterQuery.data]
  );
  const laborById = useMemo(
    () => new Map((laboreQuery.data ?? []).map((labor) => [labor.id, labor])),
    [laboreQuery.data]
  );
  useEffect(() => {
    const nextMappings: Record<number, string> = {};
    const nextAliases: Record<number, boolean> = {};
    const nextGruppen: Record<number, GruppenVorschlagState> = {};
    selectedImportQuery.data?.messwerte.forEach((messwert) => {
      if (messwert.parameter_id) {
        nextMappings[messwert.messwert_index] = messwert.parameter_id;
      } else if (shouldPreselectNewParameter(messwert)) {
        nextMappings[messwert.messwert_index] = NEW_PARAMETER_MAPPING_VALUE;
      }
      const resolvedParameterId = messwert.parameter_id ?? undefined;
      const recommendation = getAliasRecommendation({
        messwert,
        parameterId: resolvedParameterId,
        parameterById
      });
      nextAliases[messwert.messwert_index] = messwert.alias_uebernehmen || recommendation.recommended;
    });
    selectedImportQuery.data?.gruppenvorschlaege.forEach((vorschlag) => {
      nextGruppen[vorschlag.index] = getGruppenVorschlagDefault({
        suggestionName: vorschlag.name,
        gruppen: gruppenQuery.data ?? []
      });
    });
    setMappingState(nextMappings);
    setAliasState(nextAliases);
    setGruppenState(nextGruppen);
    setWarningsConfirmed(false);
  }, [selectedImportQuery.data, parameterById, gruppenQuery.data]);

  const createDraftMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("payload_json", form.payload_json);
      if (form.person_id_override) {
        formData.append("person_id_override", form.person_id_override);
      }
      if (form.bemerkung) {
        formData.append("import_bemerkung", form.bemerkung);
      }
      if (form.dokument_name) {
        formData.append("dokument_name", form.dokument_name);
      }
      if (form.dokument_file) {
        formData.append("dokument", form.dokument_file);
      }
      return apiFetch<ImportVorgangDetail>("/api/importe/json-entwurf", {
        method: "POST",
        body: formData
      });
    },
    onSuccess: async (detail) => {
      setSelectedImportId(detail.id);
      setImportMode("pruefen");
      await queryClient.invalidateQueries({ queryKey: ["importe"] });
      await queryClient.invalidateQueries({ queryKey: ["importe", detail.id] });
    }
  });

  const createPromptMutation = useMutation({
    mutationFn: (promptTyp: "laborbericht" | "tabelle") => {
      const payload: ImportPromptPayload = {
        promptTyp
      };
      return apiFetch<ImportPromptResponse>("/api/importe/prompt", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (response) => {
      setPromptText(response.promptText);
      setPromptSummary(response.kontextZusammenfassung);
      setCopyStatus(null);
      setPromptExpanded(false);
    }
  });

  const uebernehmenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}/uebernehmen`, {
        method: "POST",
        body: JSON.stringify({
          bestaetige_warnungen: warningsConfirmed,
          parameter_mappings: Object.entries(mappingState)
            .filter(([, mappingValue]) => Boolean(mappingValue))
            .map(([messwert_index, mappingValue]) =>
              mappingValue === NEW_PARAMETER_MAPPING_VALUE
                ? {
                    messwert_index: Number(messwert_index),
                    aktion: "neu",
                    neuerParameterName:
                      selectedImportQuery.data?.messwerte.find(
                        (messwert) => messwert.messwert_index === Number(messwert_index)
                      )?.parameter_vorschlag?.anzeigename,
                    alias_uebernehmen: false
                  }
                : {
                    messwert_index: Number(messwert_index),
                    aktion: "vorhanden",
                    laborparameter_id: mappingValue,
                    alias_uebernehmen: Boolean(aliasState[Number(messwert_index)])
                  }
            )
        })
      }),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", detail.id] }),
        queryClient.invalidateQueries({ queryKey: ["befunde"] }),
        queryClient.invalidateQueries({ queryKey: ["messwerte"] })
      ]);
    }
  });

  const verwerfenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}/verwerfen`, {
        method: "POST"
      }),
    onSuccess: async (detail) => {
      setShowDiscardPanel(false);
      setRemoveLinkedDocument(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", detail.id] })
      ]);
    }
  });

  const komplettEntfernenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportKomplettEntfernenResponse>(`/api/importe/${selectedImportId}/komplett-entfernen`, {
        method: "POST",
        body: JSON.stringify({
          dokument_entfernen: removeLinkedDocument
        })
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData<ImportVorgangListItem[]>(["importe"], (current) =>
        current?.filter((item) => item.id !== response.import_id) ?? current
      );
      queryClient.removeQueries({ queryKey: ["importe", response.import_id] });
      setShowDiscardPanel(false);
      setRemoveLinkedDocument(false);
      setSelectedImportId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["befunde"] }),
        queryClient.invalidateQueries({ queryKey: ["messwerte"] })
      ]);
    }
  });

  const gruppenVorschlaegeMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportGruppenvorschlaegeAnwendenResponse>(
        `/api/importe/${selectedImportId}/gruppenvorschlaege/anwenden`,
        {
          method: "POST",
          body: JSON.stringify({
            vorschlaege: (selectedImportQuery.data?.gruppenvorschlaege ?? []).map((vorschlag) => {
              const currentState = gruppenState[vorschlag.index] ?? getGruppenVorschlagDefault({
                suggestionName: vorschlag.name,
                gruppen: gruppenQuery.data ?? []
              });
              return {
                vorschlag_index: vorschlag.index,
                aktion: currentState.aktion,
                gruppe_id: currentState.aktion === "vorhanden" ? currentState.gruppe_id || null : null,
                gruppenname: currentState.aktion === "neu" ? currentState.gruppenname || vorschlag.name : null
              };
            })
          })
        }
      ),
    onSuccess: async (response) => {
      setGruppenResult(response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gruppen"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", selectedImportId] })
      ]);
    }
  });

  const selectedImport = selectedImportQuery.data;
  const visibleImportChecks = useMemo(
    () => getVisibleImportChecks(selectedImport, mappingState),
    [selectedImport, mappingState]
  );
  const selectedImportChecks = getImportChecksBySeverity(visibleImportChecks);
  const hasWarnings = selectedImportChecks.warnings > 0;
  const openImports = useMemo(
    () => (importsQuery.data ?? []).filter((item) => item.status === "in_pruefung"),
    [importsQuery.data]
  );
  const openImportCount = openImports.length;
  const isStartMode = importMode === "ki" || importMode === "json";
  const selectedImportDocumentId = selectedImport?.befund.dokument_id ?? selectedImport?.dokument_id ?? null;
  const selectedImportDocumentName =
    selectedImport?.dokument_dateiname ?? selectedImport?.befund.dokument_dateiname ?? null;
  const openMappingCount = getOpenMappingCount(selectedImport, mappingState);
  const groupsAvailable = Boolean(selectedImport?.gruppenvorschlaege.length);
  const groupsDone = Boolean(groupsAvailable && gruppenResult);
  const openBefundSection = Boolean(selectedImport && selectedImportChecks.errors > 0);
  const openMesswerteSection = Boolean(selectedImport && selectedImport.status !== "uebernommen" && openMappingCount > 0);
  const openUebernahmeSection = Boolean(
    selectedImport && selectedImport.status !== "uebernommen"
  );
  const importTakeoverBlocked = Boolean(
    selectedImportChecks.errors > 0 || openMappingCount > 0 || (hasWarnings && !warningsConfirmed)
  );
  const openGruppenSection = Boolean(
    selectedImport && selectedImport.status === "uebernommen" && groupsAvailable && !groupsDone
  );
  const openAbschlussSection = Boolean(
    selectedImport && selectedImport.status === "uebernommen" && (!groupsAvailable || groupsDone)
  );

  async function copyPromptToClipboard(): Promise<void> {
    if (!promptText) {
      return;
    }
    const copyWithTemporaryTextarea = (): boolean => {
      const textarea = document.createElement("textarea");
      textarea.value = promptText;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
      return copied;
    };

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API nicht verfügbar.");
      }
      await navigator.clipboard.writeText(promptText);
      setCopyStatus("Prompt wurde kopiert.");
    } catch {
      if (copyWithTemporaryTextarea()) {
        setCopyStatus("Prompt wurde kopiert.");
        return;
      }

      setPromptExpanded(true);
      window.setTimeout(() => {
        promptTextareaRef.current?.focus();
        promptTextareaRef.current?.select();
      }, 0);
      setCopyStatus("Der Browser blockiert direktes Kopieren. Der Prompt ist markiert und kann mit Strg+C kopiert werden.");
    }
  }

  async function copyInterfaceGuideToClipboard(): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API nicht verfügbar.");
      }
      await navigator.clipboard.writeText(jsonInterfaceGuide);
      setInterfaceCopyStatus("Schnittstellenbeschreibung wurde kopiert.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = jsonInterfaceGuide;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      setInterfaceCopyStatus(
        copied
          ? "Schnittstellenbeschreibung wurde kopiert."
          : "Kopieren nicht möglich. Bitte den Text aus der Anzeige manuell markieren."
      );
    }
  }

  function getImportModeTabClass(mode: ImportMode): string {
    return importMode === mode ? "import-mode-tab import-mode-tab--active" : "import-mode-tab";
  }

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Importprüfung</span>
        <h2>Import</h2>
        <p>
          Bereite eine KI-Extraktion vor oder importiere ein KI-/JSON-Ergebnis. Angelegte Importe werden anschließend
          im Tab <strong>Import prüfen</strong> kontrolliert.
        </p>
      </header>

      <article className="card card--wide import-mode-panel" aria-label="Importbereich">
        <h3>Importbereich</h3>
        <div className="import-mode-groups">
          <div className="import-mode-group">
            <span className="import-mode-group__label">KI und JSON</span>
            <div className="import-mode-tabs">
              <button type="button" className={getImportModeTabClass("ki")} onClick={() => setImportMode("ki")}>
                KI-Prompt
              </button>
              <button type="button" className={getImportModeTabClass("json")} onClick={() => setImportMode("json")}>
                KI-Ergebnis / JSON
              </button>
            </div>
          </div>
          <div className="import-mode-group">
            <span className="import-mode-group__label">Importe bearbeiten</span>
            <div className="import-mode-tabs">
              <button type="button" className={getImportModeTabClass("pruefen")} onClick={() => setImportMode("pruefen")}>
                <span>Import prüfen</span>
                {openImportCount ? <span className="import-mode-tab__badge">{openImportCount}</span> : null}
              </button>
              <button type="button" className={getImportModeTabClass("historie")} onClick={() => setImportMode("historie")}>
                Historie
              </button>
            </div>
          </div>
        </div>
      </article>

      {isStartMode && openImportCount ? (
        <aside className="import-open-notice">
          <span>
            {openImportCount === 1
              ? "1 offener Import wartet auf Prüfung."
              : `${openImportCount} offene Importe warten auf Prüfung.`}
          </span>
          <button type="button" className="inline-button" onClick={() => setImportMode("pruefen")}>
            Importe prüfen
          </button>
        </aside>
      ) : null}

      <div className="workspace-grid">
        {importMode === "ki" ? (
        <article className="card card--wide">
          <h3>KI-Prompt vorbereiten</h3>
          <p>
            Dieser Bereich legt noch keinen Import an. Er exportiert Arbeitsanweisungen und Importregeln für eine
            externe KI oder ein anderes Extraktionswerkzeug. Das kann für Laborberichte, PDF/Bilder, CSV, Excel oder
            kopierte Tabellen genutzt werden. Das erzeugte Ergebnis wird danach im Tab{" "}
            <strong>KI-Ergebnis / JSON</strong> eingefügt.
          </p>
          <details className="import-review-section" open>
            <summary>1. Promptvariante wählen</summary>
            <div className="prompt-help">
              <p>
                Beide Varianten enthalten denselben technischen Importvertrag und dieselben vorhandenen Stammdaten für
                Labore, Parameter, Aliasse, Einheiten und Gruppen. Sie unterscheiden sich nur in der Eingangs-Anweisung
                für die Quelle.
              </p>
              <div className="import-prompt-choice">
                <button
                  type="button"
                  className={promptKind === "laborbericht" ? "import-prompt-choice__button import-prompt-choice__button--active" : "import-prompt-choice__button"}
                  onClick={() => setPromptKind("laborbericht")}
                >
                  <strong>Laborbericht, PDF oder Bild</strong>
                  <span>Für einzelne Laborberichte, Scans oder Fotos.</span>
                </button>
                <button
                  type="button"
                  className={promptKind === "tabelle" ? "import-prompt-choice__button import-prompt-choice__button--active" : "import-prompt-choice__button"}
                  onClick={() => setPromptKind("tabelle")}
                >
                  <strong>Tabelle, CSV oder Excel</strong>
                  <span>Für strukturierte Tabellen, Arbeitsblätter oder kopierte Spalten.</span>
                </button>
              </div>
            <div className="form-actions">
              <button type="button" onClick={() => createPromptMutation.mutate(promptKind)} disabled={createPromptMutation.isPending}>
                {createPromptMutation.isPending ? "Erzeugt..." : "Prompt erzeugen"}
              </button>
              {createPromptMutation.isError ? (
                <p className="form-error">{createPromptMutation.error.message}</p>
              ) : null}
            </div>
            </div>
          </details>

          {promptText ? (
            <details className="import-review-section" open>
              <summary>2. Prompt im KI-Chat verwenden</summary>
              <div className="prompt-ready field--full">
                <strong>Prompt liegt bereit.</strong>
                <span>{promptSummary || "Kopiere ihn und füge ihn zusammen mit dem Laborbericht im externen KI-Chat ein."}</span>
              </div>
              <div className="form-actions">
              {promptText ? (
                <button type="button" onClick={() => void copyPromptToClipboard()}>
                  Prompt kopieren
                </button>
              ) : null}
              {promptText ? (
                <button type="button" className="button--secondary" onClick={() => setPromptExpanded((current) => !current)}>
                  {promptExpanded ? "Prompt ausblenden" : "Prompt anzeigen"}
                </button>
              ) : null}
              {copyStatus ? <p>{copyStatus}</p> : null}
              </div>

            {promptText && promptExpanded ? (
              <label className="field field--full">
                <span>Prompt für den externen KI-Chat</span>
                <textarea
                  ref={promptTextareaRef}
                  className="prompt-copy-field"
                  rows={16}
                  value={promptText}
                  readOnly
                />
              </label>
            ) : null}
            </details>
          ) : null}

          {promptText ? (
            <details className="import-review-section" open>
              <summary>3. Ergebnis in die Anwendung übernehmen</summary>
              <p>
                Wenn der externe KI-Chat fertig ist, gehe zum Tab <strong>KI-Ergebnis / JSON</strong>. Dort fügst Du die
                komplette Chat-Antwort oder nur den JSON-Codeblock ein. Falls vorhanden, lädst Du dort auch das
                analysierte Dokument hoch.
              </p>
              <div className="form-actions">
                <button type="button" onClick={() => setImportMode("json")}>
                  Zu KI-Ergebnis / JSON
                </button>
              </div>
            </details>
          ) : null}

          <details className="import-review-section">
            <summary>Technische JSON-Struktur anzeigen</summary>
            <div className="prompt-help">
              <p>
                Nutze diese Beschreibung, wenn nicht der konkrete Personen-Prompt benötigt wird, sondern eine allgemeine
                Anleitung für eine KI, ein Skript oder eine andere Quelle. Damit kann zum Beispiel auch eine CSV-,
                Excel- oder Tabellenquelle in Import-JSON umgewandelt werden. Die Beschreibung legt fest, wie Daten
                aufgebaut sein müssen, damit sie im Tab <strong>KI-Ergebnis / JSON</strong> importiert werden können.
              </p>
              <div className="form-actions">
                <button type="button" className="button--secondary" onClick={() => void copyInterfaceGuideToClipboard()}>
                  JSON-Schnittstelle kopieren
                </button>
                {interfaceCopyStatus ? <p>{interfaceCopyStatus}</p> : null}
              </div>
              <textarea className="prompt-copy-field interface-guide-preview" rows={10} value={jsonInterfaceGuide} readOnly />
            </div>
          </details>

          <details className="import-review-section">
            <summary>Ablauf</summary>
            <div className="prompt-help">
              <p>
                Der Prompt erzeugt noch keinen Import. Er beschreibt einer externen KI, wie sie eine Quelle analysieren
                und in das gemeinsame Import-JSON überführen soll. Die vorhandenen Stammdaten werden mitgegeben, damit
                die KI vorhandene Labore, Parameter, Aliasse, Einheiten und Gruppen konservativ erkennen kann.
              </p>
              <p>
                Die Person wird nicht im Prompt ausgewählt. Beim Einfügen des KI-Ergebnisses wählst oder überschreibst
                Du die Person in der Anwendung. Danach prüfst Du Befund, Messwerte, neue Parameter, Prüfhinweise und
                Gruppen vor der Übernahme.
              </p>
            </div>
          </details>
        </article>
        ) : null}

        {importMode === "json" ? (
        <article className="card card--wide">
          <h3>KI-Ergebnis oder JSON einfügen</h3>
          <div className="import-flow-note">
            <strong>Weiter nach dem KI-Chat</strong>
            <p>
              Wenn Du den Prompt im Tab <strong>KI-Prompt</strong> verwendet hast, ist dies der nächste Schritt: Antwort
              aus dem externen Chat einfügen, optional das analysierte Dokument hochladen und daraus einen Import zur
              Prüfung anlegen.
            </p>
          </div>
          <p>
            Dieser Bereich ist der eigentliche JSON-Import. Er verarbeitet Ergebnisse aus dem KI-Prompt, aber auch JSON
            aus anderen Quellen, wenn es dem Importformat entspricht. Wenn die Antwort einen <code>json</code>-Codeblock
            enthält, übernimmt die Anwendung automatisch diesen Block. Das analysierte Dokument kannst Du hier direkt
            mit hochladen; es wird mit dem Import und später mit dem übernommenen Befund verknüpft.
          </p>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createDraftMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person überschreiben</span>
              <select
                value={form.person_id_override}
                onChange={(event) => setForm((current) => ({ ...current, person_id_override: event.target.value }))}
              >
                <option value="">Keine Überschreibung</option>
                {personenQuery.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <input
                value={form.bemerkung}
                onChange={(event) => setForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <label className="field field--full">
              <span>KI-Ergebnis oder Import-JSON</span>
              <textarea
                rows={18}
                value={form.payload_json}
                placeholder="Komplette KI-Antwort mit json-Codeblock oder reines Import-JSON einfügen"
                onChange={(event) => setForm((current) => ({ ...current, payload_json: event.target.value }))}
              />
            </label>

            <details className="import-review-section field--full" open>
              <summary>Analysiertes Dokument zuordnen</summary>
              <div className="form-grid">
                <label className="field field--full">
                  <span>Dokumentdatei (optional)</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dokument_file: event.target.files?.[0] ?? null }))
                    }
                  />
                </label>

                <label className="field field--full">
                  <span>Dokumentname (optional)</span>
                  <input
                    value={form.dokument_name}
                    onChange={(event) => setForm((current) => ({ ...current, dokument_name: event.target.value }))}
                    placeholder="Leer lassen, dann wird aus Person, Labor und Datum ein Name vorgeschlagen"
                  />
                </label>
              </div>
            </details>

            <div className="form-actions">
              <button type="submit" disabled={createDraftMutation.isPending}>
                {createDraftMutation.isPending ? "Prüft..." : "Import prüfen"}
              </button>
              {createDraftMutation.isError ? <p className="form-error">{createDraftMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
        ) : null}

        {importMode === "historie" ? (
        <article className="card card--wide">
          <h3>Import-Historie</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Quelle</th>
                  <th>Person</th>
                  <th>Datei</th>
                  <th>Messwerte</th>
                  <th>Fehler</th>
                  <th>Warnungen</th>
                </tr>
              </thead>
              <tbody>
                {importsQuery.data?.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedImportId(item.id);
                      setImportMode("pruefen");
                    }}
                    className={item.id === selectedImportId ? "row-selected" : undefined}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{item.status}</td>
                    <td>{item.quelle_typ}</td>
                    <td>{personById.get(item.person_id_vorschlag || "")?.anzeigename ?? "—"}</td>
                    <td>
                      {item.dokument_id && item.dokument_dateiname ? (
                        <a
                          className="text-link"
                          href={getDocumentContentUrl(item.dokument_id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {item.dokument_dateiname}
                        </a>
                      ) : (
                        item.dokument_dateiname ?? "—"
                      )}
                    </td>
                    <td>{item.messwerte_anzahl}</td>
                    <td>{item.fehler_anzahl}</td>
                    <td>{item.warnung_anzahl}</td>
                  </tr>
                ))}
                {!importsQuery.data?.length ? (
                  <tr>
                    <td colSpan={7}>Noch keine Importe vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
        ) : null}

        {importMode === "pruefen" ? (
        <article className="card card--wide">
          <h3>Import prüfen</h3>
          {!selectedImport ? (
            <div className="empty-state">
              <p>Bitte lege zuerst einen Import an oder wähle einen Eintrag aus der Historie.</p>
              <div className="inline-actions">
                <button type="button" className="inline-button" onClick={() => setImportMode("ki")}>
                  KI-Prompt vorbereiten
                </button>
                <button type="button" className="inline-button" onClick={() => setImportMode("json")}>
                  KI-Ergebnis / JSON einfügen
                </button>
                <button type="button" className="inline-button" onClick={() => setImportMode("historie")}>
                  Historie öffnen
                </button>
              </div>
            </div>
          ) : null}
          {selectedImport ? (
            <>
              {openImports.length > 1 || (openImports.length === 1 && selectedImport.status !== "in_pruefung") ? (
                <label className="field import-open-select">
                  <span>Offene Importe</span>
                  <select value={selectedImportId ?? ""} onChange={(event) => setSelectedImportId(event.target.value)}>
                    {selectedImport.status !== "in_pruefung" ? (
                      <option value={selectedImport.id}>Aktuell gewählter Historieneintrag</option>
                    ) : null}
                    {openImports.map((item) => (
                      <option key={item.id} value={item.id}>
                        {personById.get(item.person_id_vorschlag || "")?.anzeigename ?? "Unbekannte Person"} ·{" "}
                        {item.quelle_typ} · {item.dokument_dateiname ?? item.bemerkung ?? formatDate(item.erstellt_am)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {openImports.length && selectedImport.status !== "in_pruefung" ? (
                <aside className="import-open-notice import-open-notice--compact">
                  <span>
                    Du siehst gerade einen abgeschlossenen Historieneintrag. Es gibt noch{" "}
                    {openImports.length === 1 ? "einen offenen Import" : `${openImports.length} offene Importe`}.
                  </span>
                  <button type="button" className="inline-button" onClick={() => setSelectedImportId(openImports[0].id)}>
                    Offenen Import prüfen
                  </button>
                </aside>
              ) : null}
              <h4>Aktueller Import</h4>
              <div className="import-review-summary">
                <span className="parameter-pill">{selectedImport.status}</span>
                <span className="parameter-pill">{selectedImport.quelle_typ}</span>
                <span className="parameter-pill">
                  {personById.get(selectedImport.befund.person_id || selectedImport.person_id_vorschlag || "")?.anzeigename ??
                    "Person offen"}
                </span>
                <span className="parameter-pill">{selectedImport.messwerte_anzahl} Messwerte</span>
                <span className={selectedImportChecks.errors ? "parameter-pill parameter-pill--danger" : "parameter-pill"}>
                  {selectedImportChecks.errors} Fehler
                </span>
                <span className={selectedImportChecks.warnings ? "parameter-pill parameter-pill--warning" : "parameter-pill"}>
                  {selectedImportChecks.warnings} Prüfhinweise
                </span>
                <span className={openMappingCount ? "parameter-pill parameter-pill--warning" : "parameter-pill"}>
                  {openMappingCount} offene Zuordnungen
                </span>
              </div>

              <details className="import-review-section" open={openBefundSection}>
                <summary>Befund prüfen</summary>
              <p>
                Befund für{" "}
                <strong>{personById.get(selectedImport.befund.person_id || "")?.anzeigename ?? "nicht zugeordnet"}</strong>
                {" · "}
                Entnahme {formatDate(selectedImport.befund.entnahmedatum)}
              </p>
              <p>
                Labor:{" "}
                <strong>
                  {laborById.get(selectedImport.befund.labor_id || "")?.name ??
                    selectedImport.befund.labor_name ??
                    selectedImport.befund.labor_id ??
                    "—"}
                </strong>
              </p>
              <p>
                Quelldatei:{" "}
                <strong>
                  {selectedImportDocumentId && selectedImportDocumentName ? (
                    <a
                      className="text-link"
                      href={getDocumentContentUrl(selectedImportDocumentId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedImportDocumentName}
                    </a>
                  ) : (
                    selectedImportDocumentName ?? "—"
                  )}
                </strong>
              </p>
              <p>
                Dokumentpfad: <strong>{selectedImport.befund.dokument_pfad ?? "—"}</strong>
              </p>
              {selectedImportDocumentId ? (
                <div className="inline-actions">
                  <a
                    className="inline-button"
                    href={getDocumentContentUrl(selectedImportDocumentId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Dokument öffnen
                  </a>
                  <a
                    className="inline-button"
                    href={getDocumentContentUrl(selectedImportDocumentId, { download: true })}
                  >
                    Dokument herunterladen
                  </a>
                </div>
              ) : null}
              </details>

              <details className="import-review-section" open={openMesswerteSection}>
                <summary>Messwerte klären</summary>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Originalname</th>
                      <th>Rohwert</th>
                      <th>Typ</th>
                      <th>Einheit</th>
                      <th>Referenz</th>
                      <th>Kontext</th>
                      <th>Zuordnungsweg</th>
                      <th>Parameter-Zuordnung</th>
                      <th>Alias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedImport.messwerte.map((messwert) => {
                      const resolvedParameterId =
                        mappingState[messwert.messwert_index] ?? messwert.parameter_id ?? undefined;
                      const aliasRecommendation = getAliasRecommendation({
                        messwert,
                        parameterId: resolvedParameterId,
                        parameterById
                      });
                      return (
                      <tr key={messwert.messwert_index}>
                        <td>{messwert.original_parametername}</td>
                        <td>{messwert.wert_roh_text}</td>
                        <td>{formatWertTyp(messwert.wert_typ)}</td>
                        <td>{messwert.einheit_original ?? "—"}</td>
                        <td>{formatImportReferenceResolved(messwert)}</td>
                        <td>
                          {[
                            messwert.referenz_geschlecht_code
                              ? `Geschlecht: ${formatGeschlechtCode(messwert.referenz_geschlecht_code)}`
                              : null,
                            messwert.referenz_alter_min_tage || messwert.referenz_alter_max_tage
                              ? `Alter: ${formatAgeRange(messwert.referenz_alter_min_tage, messwert.referenz_alter_max_tage)}`
                              : null,
                            messwert.referenz_bemerkung ?? null
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td>{formatMappingInfo(messwert, mappingState[messwert.messwert_index])}</td>
                        <td>
                          <select
                            value={mappingState[messwert.messwert_index] ?? ""}
                            onChange={(event) =>
                              {
                                const nextValue = event.target.value;
                                setMappingState((current) => ({
                                  ...current,
                                  [messwert.messwert_index]: nextValue
                                }));
                                setAliasState((current) => {
                                  if (!nextValue || nextValue === NEW_PARAMETER_MAPPING_VALUE) {
                                    return { ...current, [messwert.messwert_index]: false };
                                  }
                                  const nextRecommendation = getAliasRecommendation({
                                    messwert,
                                    parameterId: nextValue,
                                    parameterById
                                  });
                                  if (current[messwert.messwert_index] !== undefined) {
                                    return current;
                                  }
                                  return {
                                    ...current,
                                    [messwert.messwert_index]: nextRecommendation.recommended
                                  };
                                });
                              }
                            }
                          >
                            <option value="">Bitte wählen</option>
                            <option value={NEW_PARAMETER_MAPPING_VALUE}>
                              Neuen Parameter anlegen:{" "}
                              {messwert.parameter_vorschlag?.anzeigename ?? messwert.original_parametername}
                            </option>
                            {parameterQuery.data?.map((parameter) => (
                              <option key={parameter.id} value={parameter.id}>
                                {parameter.anzeigename}
                              </option>
                            ))}
                          </select>
                          {mappingState[messwert.messwert_index] === NEW_PARAMETER_MAPPING_VALUE
                            ? ` (wird neu angelegt, ${formatWertTyp(
                                messwert.parameter_vorschlag?.wert_typ_standard ?? messwert.wert_typ
                              )}${
                                messwert.parameter_vorschlag?.standard_einheit || messwert.einheit_original
                                  ? `, ${messwert.parameter_vorschlag?.standard_einheit ?? messwert.einheit_original}`
                                  : ""
                              })`
                            : mappingState[messwert.messwert_index]
                            ? ` (${parameterById.get(mappingState[messwert.messwert_index])?.anzeigename ?? "zugeordnet"})`
                            : ""}
                          {messwert.parameter_vorschlag ? (
                            <div className="import-parameter-suggestion">
                              <strong>Vorschlag: {messwert.parameter_vorschlag.anzeigename}</strong>
                              {messwert.parameter_vorschlag.unsicher_flag ? <span>Prüfbedarf</span> : null}
                              {messwert.parameter_vorschlag.beschreibung_kurz ? (
                                <p>
                                  <strong>Fachbeschreibung:</strong> {messwert.parameter_vorschlag.beschreibung_kurz}
                                </p>
                              ) : null}
                              {messwert.parameter_vorschlag.begruendung_aus_dokument ? (
                                <p>
                                  <strong>Anmerkung aus dem Bericht:</strong>{" "}
                                  {messwert.parameter_vorschlag.begruendung_aus_dokument}
                                </p>
                              ) : null}
                              {messwert.parameter_vorschlag.moegliche_aliase.length ? (
                                <p>Alias-Vorschläge: {messwert.parameter_vorschlag.moegliche_aliase.join(", ")}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <label className="field" style={{ minWidth: 0 }}>
                            <span>Als Alias übernehmen</span>
                            <input
                              type="checkbox"
                              checked={Boolean(aliasState[messwert.messwert_index])}
                              disabled={
                                !mappingState[messwert.messwert_index] ||
                                mappingState[messwert.messwert_index] === NEW_PARAMETER_MAPPING_VALUE
                              }
                              onChange={(event) =>
                                setAliasState((current) => ({
                                  ...current,
                                  [messwert.messwert_index]: event.target.checked
                                }))
                              }
                            />
                          </label>
                          {aliasRecommendation.note ? (
                            <p style={{ marginTop: 6, fontSize: 12, color: "#6a5f52" }}>{aliasRecommendation.note}</p>
                          ) : null}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
              </details>

              {selectedImport.status === "uebernommen" && selectedImport.gruppenvorschlaege.length ? (
                <details className="import-review-section" open={openGruppenSection}>
                  <summary>Gruppen entscheiden</summary>
                  <p>
                    Berichtsblöcke können nach der Importübernahme als Gruppen angelegt oder mit vorhandenen Gruppen
                    zusammengeführt werden.
                  </p>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Vorschlag</th>
                          <th>Parameter</th>
                          <th>Ähnliche Gruppen</th>
                          <th>Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedImport.gruppenvorschlaege.map((vorschlag) => {
                          const currentState =
                            gruppenState[vorschlag.index] ??
                            getGruppenVorschlagDefault({
                              suggestionName: vorschlag.name,
                              gruppen: gruppenQuery.data ?? []
                            });
                          return (
                            <tr key={`gruppe-${vorschlag.index}`}>
                              <td>
                                <strong>{vorschlag.name}</strong>
                                {vorschlag.beschreibung ? <p>{vorschlag.beschreibung}</p> : null}
                                {vorschlag.fehlende_messwert_indizes.length ? (
                                  <p className="form-error">
                                    Noch nicht anwendbar. Für Messwerte {vorschlag.fehlende_messwert_indizes.join(", ")} fehlen
                                    noch Parameterzuordnungen.
                                  </p>
                                ) : null}
                              </td>
                              <td>{vorschlag.parameter_namen.length ? vorschlag.parameter_namen.join(", ") : "—"}</td>
                              <td>
                                {vorschlag.aehnliche_gruppen.length ? (
                                  vorschlag.aehnliche_gruppen.map((gruppe) => (
                                    <p key={gruppe.gruppe_id}>
                                      <strong>{gruppe.name}</strong>
                                      {` · gemeinsame Parameter: ${gruppe.gemeinsame_parameter_anzahl}/${gruppe.parameter_anzahl}`}
                                      {gruppe.namensaehnlich ? " · ähnlicher Name" : ""}
                                    </p>
                                  ))
                                ) : (
                                  "Keine ähnliche Gruppe gefunden."
                                )}
                              </td>
                              <td>
                                <label className="field">
                                  <span>Aktion</span>
                                  <select
                                    value={currentState.aktion}
                                    onChange={(event) =>
                                      setGruppenState((current) => ({
                                        ...current,
                                        [vorschlag.index]: {
                                          ...currentState,
                                          aktion: event.target.value as GruppenVorschlagAktion
                                        }
                                      }))
                                    }
                                  >
                                    <option value="neu">Neue Gruppe anlegen</option>
                                    <option value="vorhanden">Vorhandene Gruppe verwenden</option>
                                    <option value="ignorieren">Ignorieren</option>
                                  </select>
                                </label>
                                {currentState.aktion === "neu" ? (
                                  <label className="field">
                                    <span>Gruppenname</span>
                                    <input
                                      value={currentState.gruppenname}
                                      onChange={(event) =>
                                        setGruppenState((current) => ({
                                          ...current,
                                          [vorschlag.index]: {
                                            ...currentState,
                                            gruppenname: event.target.value
                                          }
                                        }))
                                      }
                                    />
                                  </label>
                                ) : null}
                                {currentState.aktion === "vorhanden" ? (
                                  <label className="field">
                                    <span>Zielgruppe</span>
                                    <select
                                      value={currentState.gruppe_id}
                                      onChange={(event) =>
                                        setGruppenState((current) => ({
                                          ...current,
                                          [vorschlag.index]: {
                                            ...currentState,
                                            gruppe_id: event.target.value
                                          }
                                        }))
                                      }
                                    >
                                      <option value="">Bitte wählen</option>
                                      {gruppenQuery.data?.map((gruppe) => (
                                        <option key={gruppe.id} value={gruppe.id}>
                                          {gruppe.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                {selectedImport.status !== "uebernommen" ? (
                                  <p>Wird nach der Importübernahme anwendbar.</p>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => gruppenVorschlaegeMutation.mutate()}
                      disabled={gruppenVorschlaegeMutation.isPending || selectedImport.status !== "uebernommen"}
                    >
                      {gruppenVorschlaegeMutation.isPending ? "Wendet an..." : "Gruppenvorschläge anwenden"}
                    </button>
                    {gruppenVorschlaegeMutation.isError ? (
                      <p className="form-error">{gruppenVorschlaegeMutation.error.message}</p>
                    ) : null}
                    {gruppenResult ? (
                      <p>
                        Gruppenentscheidungen verarbeitet:{" "}
                        {gruppenResult.ergebnisse
                          .map((item) => item.gruppenname || item.gruppe_id || item.aktion)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}

              {selectedImport.status === "in_pruefung" ? (
              <details className="import-review-section" open={openUebernahmeSection}>
                <summary>Übernahme</summary>
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => uebernehmenMutation.mutate()}
                    disabled={uebernehmenMutation.isPending || !selectedImportId || importTakeoverBlocked}
                  >
                    {uebernehmenMutation.isPending ? "Übernimmt..." : "Import übernehmen"}
                  </button>
                  <button
                    type="button"
                    className="button--secondary"
                    onClick={() => setShowDiscardPanel((current) => !current)}
                    disabled={
                      verwerfenMutation.isPending || komplettEntfernenMutation.isPending || !selectedImportId
                    }
                  >
                    {showDiscardPanel ? "Verwerfen ausblenden" : "Import verwerfen"}
                  </button>
                </div>
                {showDiscardPanel ? (
                  <div className="import-discard-panel">
                    <h5>Was soll mit dem Importversuch passieren?</h5>
                    <p>
                      Du kannst den Versuch dokumentiert verwerfen oder komplett entfernen. Dokumentiert verworfene
                      Versuche bleiben in der Historie nachvollziehbar. Komplett entfernte Versuche werden aus der
                      Importliste gelöscht.
                    </p>
                    {selectedImportDocumentId ? (
                      <label className="field field--full">
                        <span>Verknüpftes Dokument ebenfalls entfernen</span>
                        <input
                          type="checkbox"
                          checked={removeLinkedDocument}
                          onChange={(event) => setRemoveLinkedDocument(event.target.checked)}
                        />
                      </label>
                    ) : null}
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button--secondary"
                        onClick={() => verwerfenMutation.mutate()}
                        disabled={verwerfenMutation.isPending || komplettEntfernenMutation.isPending}
                      >
                        {verwerfenMutation.isPending ? "Verwirft..." : "Dokumentiert verwerfen"}
                      </button>
                      <button
                        type="button"
                        className="button--danger"
                        onClick={() => komplettEntfernenMutation.mutate()}
                        disabled={verwerfenMutation.isPending || komplettEntfernenMutation.isPending}
                      >
                        {komplettEntfernenMutation.isPending ? "Entfernt..." : "Komplett entfernen"}
                      </button>
                    </div>
                  </div>
                ) : null}
                {openMappingCount > 0 ? (
                  <p className="form-hint">
                    Übernahme ist möglich, sobald alle Messwerte einem vorhandenen oder neuen Parameter zugeordnet sind.
                  </p>
                ) : null}
                {selectedImportChecks.errors > 0 ? (
                  <p className="form-error">Fehler blockieren die Übernahme.</p>
                ) : null}
                {hasWarnings && !warningsConfirmed ? (
                  <p className="form-hint">Bitte bestätige die offenen Prüfhinweise vor der Übernahme.</p>
                ) : null}
                {uebernehmenMutation.isError ? <p className="form-error">{uebernehmenMutation.error.message}</p> : null}
                {verwerfenMutation.isError ? <p className="form-error">{verwerfenMutation.error.message}</p> : null}
                {komplettEntfernenMutation.isError ? (
                  <p className="form-error">{komplettEntfernenMutation.error.message}</p>
                ) : null}

                <h5>Prüfhinweise</h5>
                <ul>
                  {visibleImportChecks.map((item) => (
                    <li key={item.id}>
                      <strong>{formatPruefpunktStatus(item.status)}</strong>: {item.meldung}
                    </li>
                  ))}
                </ul>
                {!visibleImportChecks.length ? <p>Keine offenen Prüfpunkte vorhanden.</p> : null}

                {hasWarnings ? (
                  <label className="field field--full">
                    <span>Prüfhinweise bewusst bestätigen</span>
                    <input
                      type="checkbox"
                      checked={warningsConfirmed}
                      onChange={(event) => setWarningsConfirmed(event.target.checked)}
                    />
                  </label>
                ) : null}
              </details>
              ) : null}

              {selectedImport.status === "uebernommen" ? (
                <details className="import-review-section" open={openAbschlussSection}>
                  <summary>Abschluss</summary>
                  <p>
                    Der Import ist übernommen. Prüfe bei vorhandenen Gruppenvorschlägen noch, ob neue Gruppen angelegt,
                    vorhandene Gruppen verwendet oder Vorschläge ignoriert werden sollen.
                  </p>
                </details>
              ) : null}

              <div className="inline-actions">
                <button type="button" className="inline-button" onClick={() => setShowDeletePanel((current) => !current)}>
                  {showDeletePanel ? "Löschprüfung ausblenden" : "Löschprüfung öffnen"}
                </button>
              </div>

              {showDeletePanel ? (
                <LoeschAktionPanel
                  entitaetTyp="importvorgang"
                  entitaetId={selectedImportId}
                  title="Importvorgang prüfen oder löschen"
                  emptyText="Bitte zuerst einen Import auswählen."
                  invalidateQueryKeys={[["importe"], ["importe", selectedImportId], ["befunde"], ["messwerte"]]}
                />
              ) : null}
            </>
          ) : null}
        </article>
        ) : null}
      </div>
    </section>
  );
}
