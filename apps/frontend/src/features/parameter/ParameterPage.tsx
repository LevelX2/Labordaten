import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { buildZielbereichCreatePayload } from "../../shared/api/payloadBuilders";
import {
  KONTEXT_GESCHLECHT_OPTIONS,
  WERT_TYP_OPTIONS,
  formatGeschlechtCode,
  formatWertTyp
} from "../../shared/constants/fieldOptions";
import type {
  Einheit,
  Parameter,
  ParameterAlias,
  ParameterAliasSuggestion,
  ParameterDuplicateSuggestion,
  ParameterMergeResult,
  ParameterRenameResult,
  ParameterStandardEinheitUpdatePayload,
  ParameterStandardEinheitUpdateResult,
  ParameterUmrechnungsregel,
  ParameterUmrechnungsregelCreatePayload,
  ParameterUsageSummary,
  UmrechnungsregelTyp,
  WertTyp,
  Zielbereich
} from "../../shared/types/api";

type ParameterFormState = {
  anzeigename: string;
  standard_einheit: string;
  wert_typ_standard: WertTyp;
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

type ZielbereichFormState = {
  parameter_id: string;
  wert_typ: WertTyp;
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
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

type ParameterPanelKey =
  | "create"
  | "standardUnit"
  | "rename"
  | "alias"
  | "conversion"
  | "zielbereich"
  | "aliasSuggestions"
  | "duplicates";

const initialForm: ParameterFormState = {
  anzeigename: "",
  standard_einheit: "",
  wert_typ_standard: "numerisch",
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

const initialZielbereichForm: ZielbereichFormState = {
  parameter_id: "",
  wert_typ: "numerisch",
  untere_grenze_num: "",
  obere_grenze_num: "",
  einheit: "",
  soll_text: "",
  geschlecht_code: "",
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

const UMRECHNUNGSREGEL_TYP_OPTIONS: Array<{ value: UmrechnungsregelTyp; label: string }> = [
  { value: "faktor", label: "Faktor" },
  { value: "faktor_plus_offset", label: "Faktor + Offset" },
  { value: "formel", label: "Formel" }
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
    `${summary.gruppen_anzahl} Gruppen`,
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

function formatUmrechnungsregel(regel: ParameterUmrechnungsregel): string {
  if (regel.regel_typ === "faktor") {
    return `x * ${regel.faktor ?? "?"}`;
  }
  if (regel.regel_typ === "faktor_plus_offset") {
    return `x * ${regel.faktor ?? "?"} + ${regel.offset ?? 0}`;
  }
  return regel.formel_text || "â€”";
}

export function ParameterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ParameterFormState>(initialForm);
  const [aliasForm, setAliasForm] = useState<ParameterAliasFormState>(initialAliasForm);
  const [renameForm, setRenameForm] = useState<ParameterRenameFormState>(initialRenameForm);
  const [standardEinheitForm, setStandardEinheitForm] =
    useState<ParameterStandardEinheitFormState>(initialStandardEinheitForm);
  const [zielbereichForm, setZielbereichForm] = useState<ZielbereichFormState>(initialZielbereichForm);
  const [umrechnungsregelForm, setUmrechnungsregelForm] =
    useState<ParameterUmrechnungsregelFormState>(initialUmrechnungsregelForm);
  const [mergeNameBySuggestion, setMergeNameBySuggestion] = useState<Record<string, string>>({});
  const [lastMergeResult, setLastMergeResult] = useState<ParameterMergeResult | null>(null);
  const [lastRenameResult, setLastRenameResult] = useState<ParameterRenameResult | null>(null);
  const [lastStandardEinheitResult, setLastStandardEinheitResult] =
    useState<ParameterStandardEinheitUpdateResult | null>(null);
  const [parameterSearchQuery, setParameterSearchQuery] = useState("");
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ParameterPanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);

  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const einheitenQuery = useQuery({
    queryKey: ["einheiten"],
    queryFn: () => apiFetch<Einheit[]>("/api/einheiten")
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

  useEffect(() => {
    if (!selectedParameter) {
      setAliasForm(initialAliasForm);
      setRenameForm(initialRenameForm);
      setStandardEinheitForm(initialStandardEinheitForm);
      setZielbereichForm(initialZielbereichForm);
      setUmrechnungsregelForm(initialUmrechnungsregelForm);
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
  }, [selectedParameter]);

  const filteredParameters = useMemo(() => {
    const normalizedSearchQuery = parameterSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return sortedParameters;
    }

    return sortedParameters.filter((parameter) =>
      [parameter.anzeigename, parameter.interner_schluessel, parameter.beschreibung ?? ""]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(normalizedSearchQuery)
    );
  }, [parameterSearchQuery, sortedParameters]);

  const einheiten = einheitenQuery.data ?? [];

  const zielbereicheQuery = useQuery({
    queryKey: ["zielbereiche", selectedParameterId],
    queryFn: () => apiFetch<Zielbereich[]>(`/api/parameter/${selectedParameterId}/zielbereiche`),
    enabled: Boolean(selectedParameterId)
  });

  const parameterAliaseQuery = useQuery({
    queryKey: ["parameter-aliase", selectedParameterId],
    queryFn: () => apiFetch<ParameterAlias[]>(`/api/parameter/${selectedParameterId}/aliase`),
    enabled: Boolean(selectedParameterId)
  });

  const umrechnungsregelnQuery = useQuery({
    queryKey: ["parameter-umrechnungsregeln", selectedParameterId],
    queryFn: () => apiFetch<ParameterUmrechnungsregel[]>(`/api/parameter/${selectedParameterId}/umrechnungsregeln`),
    enabled: Boolean(selectedParameterId)
  });

  const aliasSuggestionsQuery = useQuery({
    queryKey: ["parameter-alias-vorschlaege"],
    queryFn: () => apiFetch<ParameterAliasSuggestion[]>("/api/parameter/alias-vorschlaege"),
    enabled: false
  });

  const duplicateSuggestionsQuery = useQuery({
    queryKey: ["parameter-dublettenvorschlaege"],
    queryFn: () => apiFetch<ParameterDuplicateSuggestion[]>("/api/parameter/dublettenvorschlaege"),
    enabled: false
  });

  const selectedAliasSuggestions = useMemo(
    () =>
      (aliasSuggestionsQuery.data ?? []).filter((suggestion) =>
        selectedParameterId ? suggestion.laborparameter_id === selectedParameterId : true
      ),
    [aliasSuggestionsQuery.data, selectedParameterId]
  );

  const selectedDuplicateSuggestions = useMemo(
    () =>
      (duplicateSuggestionsQuery.data ?? []).filter((suggestion) =>
        selectedParameterId
          ? suggestion.ziel_parameter_id === selectedParameterId || suggestion.quell_parameter_id === selectedParameterId
          : true
      ),
    [duplicateSuggestionsQuery.data, selectedParameterId]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Parameter>("/api/parameter", {
        method: "POST",
        body: JSON.stringify(form)
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
      setMergeNameBySuggestion((current) => {
        const next = { ...current };
        delete next[`${payload.ziel_parameter_id}:${payload.quell_parameter_id}`];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["parameter"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-dublettenvorschlaege"] });
      await duplicateSuggestionsQuery.refetch();
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

    if (panel === "conversion" && selectedParameter) {
      setUmrechnungsregelForm({
        ...initialUmrechnungsregelForm,
        laborparameter_id: selectedParameter.id,
        nach_einheit: selectedParameter.standard_einheit ?? ""
      });
    }

    if (panel === "zielbereich" && selectedParameter) {
      setZielbereichForm({
        ...initialZielbereichForm,
        parameter_id: selectedParameter.id,
        einheit: selectedParameter.standard_einheit ?? ""
      });
    }

    setActivePanel((current) => (current === panel ? null : panel));
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

    if (activePanel === "create") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Neuer Parameter</h3>
              <p>Der interne Schlüssel wird beim Anlegen automatisch aus dem Anzeigenamen erzeugt.</p>
            </div>
            {renderPanelCloseButton("Panel Neuer Parameter schließen")}
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

    if (activePanel === "rename") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Parameter umbenennen</h3>
              <p>Der bisherige Name kann direkt als Alias erhalten bleiben, damit Importe weiter sauber laufen.</p>
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
                Diese Einheit steuert, worauf numerische Werte intern bevorzugt normiert werden. Originalwerte und
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
              Wenn passende Umrechnungsregeln vorhanden sind, werden bestehende normierte Vergleichswerte nach dem
              Speichern sofort neu berechnet.
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

    if (activePanel === "alias") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Alias pflegen</h3>
              <p>Aliasnamen helfen beim Import, wenn Labore denselben Wert unterschiedlich benennen.</p>
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
                Regeln werden parameterbezogen gepflegt. Für die automatische Normierung ist die
                Standardeinheit als Zieleinheit meist der sinnvollste Zielwert.
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
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Allgemeinen Zielbereich anlegen</h3>
              <p>Der Zielbereich wird direkt dem aktuell gewählten Parameter zugeordnet.</p>
            </div>
            {renderPanelCloseButton("Panel Zielbereich schließen")}
          </div>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createZielbereichMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <input value={selectedParameter.anzeigename} disabled />
            </label>

            <label className="field">
              <span>Werttyp</span>
              <select
                value={zielbereichForm.wert_typ}
                onChange={(event) =>
                  setZielbereichForm((current) => ({
                    ...current,
                    wert_typ: event.target.value as WertTyp,
                    untere_grenze_num: "",
                    obere_grenze_num: "",
                    soll_text: ""
                  }))
                }
              >
                {WERT_TYP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {zielbereichForm.wert_typ === "numerisch" ? (
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
                  <select
                    value={zielbereichForm.einheit}
                    onChange={(event) => setZielbereichForm((current) => ({ ...current, einheit: event.target.value }))}
                  >
                    <option value="">Keine Einheit</option>
                    {einheiten.map((einheit) => (
                      <option key={einheit.id} value={einheit.kuerzel}>
                        {einheit.kuerzel}
                      </option>
                    ))}
                  </select>
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
                {createZielbereichMutation.isPending ? "Speichert..." : "Zielbereich anlegen"}
              </button>
              {createZielbereichMutation.isError ? (
                <p className="form-error">{createZielbereichMutation.error.message}</p>
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
              <h3>Alias-Vorschläge</h3>
              <p>
                Die Liste nutzt bereits bestätigte Originalnamen aus vorhandenen Messwerten und zeigt hier nur Vorschläge
                für den aktuell ausgewählten Parameter.
              </p>
            </div>
            <div className="parameter-panel__actions">
              <button
                type="button"
                className="inline-button"
                onClick={() => aliasSuggestionsQuery.refetch()}
                disabled={aliasSuggestionsQuery.isFetching}
              >
                {aliasSuggestionsQuery.isFetching ? "Sucht..." : "Vorschläge laden"}
              </button>
              {renderPanelCloseButton("Panel Alias-Vorschläge schließen")}
            </div>
          </div>
          {aliasSuggestionsQuery.isError ? <p className="form-error">{aliasSuggestionsQuery.error.message}</p> : null}
          {confirmAliasSuggestionMutation.isError ? <p className="form-error">{confirmAliasSuggestionMutation.error.message}</p> : null}
          {!aliasSuggestionsQuery.isFetched ? <p>Die Vorschläge werden nur bei Bedarf geladen.</p> : null}
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
            <h3>Dublettenprüfung und Zusammenführung</h3>
            <p>
              Es werden nur Vorschläge gezeigt, die den aktuell ausgewählten Parameter betreffen. Nach Bestätigung werden
              Verwendungen umgehängt und Namen nach Möglichkeit als Alias erhalten.
            </p>
          </div>
          <div className="parameter-panel__actions">
            <button
              type="button"
              className="inline-button"
              onClick={() => duplicateSuggestionsQuery.refetch()}
              disabled={duplicateSuggestionsQuery.isFetching}
            >
              {duplicateSuggestionsQuery.isFetching ? "Prüft..." : "Dubletten suchen"}
            </button>
            {renderPanelCloseButton("Panel Dubletten schließen")}
          </div>
        </div>
        {duplicateSuggestionsQuery.isError ? <p className="form-error">{duplicateSuggestionsQuery.error.message}</p> : null}
        {mergeDuplicateMutation.isError ? <p className="form-error">{mergeDuplicateMutation.error.message}</p> : null}
        {lastMergeResult && selectedParameterId === lastMergeResult.ziel_parameter_id ? (
          <p>
            Zusammengeführt zu <strong>{lastMergeResult.gemeinsamer_name}</strong>. Verschoben: {lastMergeResult.verschobene_messwerte}{" "}
            Messwerte, {lastMergeResult.verschobene_zielbereiche} Zielbereiche,{" "}
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
              {selectedDuplicateSuggestions.map((suggestion) => {
                const suggestionKey = `${suggestion.ziel_parameter_id}:${suggestion.quell_parameter_id}`;
                const mergeName = mergeNameBySuggestion[suggestionKey] ?? suggestion.gemeinsamer_name_vorschlag;
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
                      <button
                        type="button"
                        className="inline-button"
                        disabled={mergeDuplicateMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Soll '${suggestion.quell_parameter_anzeigename}' in '${suggestion.ziel_parameter_anzeigename}' überführt werden?`
                          );
                          if (!confirmed) {
                            return;
                          }
                          mergeDuplicateMutation.mutate({
                            ziel_parameter_id: suggestion.ziel_parameter_id,
                            quell_parameter_id: suggestion.quell_parameter_id,
                            gemeinsamer_name: mergeName
                          });
                        }}
                      >
                        {mergeDuplicateMutation.isPending ? "Führt zusammen..." : "Zusammenführen"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {duplicateSuggestionsQuery.isFetched && !selectedDuplicateSuggestions.length ? (
                <tr>
                  <td colSpan={5}>Für diesen Parameter wurden aktuell keine passenden Dublettenvorschläge gefunden.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Parameter</h2>
        <button
          type="button"
          className="icon-button page__info-button"
          aria-label="Hinweis zur Parameterseite"
          title="Hier verwaltest Du Laborparameter, Aliase, Umrechnungen und allgemeine Zielbereiche."
        >
          ?
        </button>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Vorhandene Parameter</h3>
              <p>{filteredParameters.length} sichtbar • {sortedParameters.length} gesamt</p>
            </div>
            <button type="button" className="inline-button" onClick={() => handleOpenPanel("create")}>
              Neuer Parameter
            </button>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <input
              value={parameterSearchQuery}
              onChange={(event) => setParameterSearchQuery(event.target.value)}
              placeholder="Name, Schlüssel oder Beschreibung"
            />
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
              <p>Noch keine Parameter vorhanden. Legen Sie links über den Aktionsknopf den ersten Parameter an.</p>
            ) : (
              <>
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

                <div className="parameter-toolrail">
                    <button
                      type="button"
                      className={`parameter-toolrail__button ${activePanel === "standardUnit" ? "parameter-toolrail__button--active" : ""}`}
                      onClick={() => handleOpenPanel("standardUnit")}
                    >
                      Normeinheit
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
                </div>

                {renderActionPanel()}

                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Werttyp</span>
                    <strong>{formatWertTyp(selectedParameter.wert_typ_standard)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Führende Normeinheit</span>
                    <strong>{selectedParameter.standard_einheit || "Keine Einheit"}</strong>
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
                      <span>Wissensbasis</span>
                      <strong>Für diesen Detailbereich ist noch keine Zusatzinformation verknüpft.</strong>
                    </div>
                  </div>
                ) : null}

                <div className="parameter-section-grid">
                  <article className="card card--soft">
                    <div className="parameter-card__header">
                      <div>
                        <h3>
                          Aliase <span className="parameter-count-badge">{parameterAliaseQuery.data?.length ?? 0}</span>
                        </h3>
                        <p>Direkt sichtbare Zuordnungen für den aktuell gewählten Parameter.</p>
                      </div>
                      <button type="button" className="inline-button" onClick={() => handleOpenPanel("alias")}>
                        Neuer Alias
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
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
                  </article>

                  <article className="card card--soft">
                    <div className="parameter-card__header">
                      <div>
                        <h3>
                          Umrechnungsregeln{" "}
                          <span className="parameter-count-badge">{umrechnungsregelnQuery.data?.length ?? 0}</span>
                        </h3>
                        <p>Parameterbezogene Regeln für normierte Vergleichswerte und gemischte Berichtseinheiten.</p>
                      </div>
                      <button type="button" className="inline-button" onClick={() => handleOpenPanel("conversion")}>
                        Neue Regel
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
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
                                {UMRECHNUNGSREGEL_TYP_OPTIONS.find((option) => option.value === regel.regel_typ)?.label ??
                                  regel.regel_typ}
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
                  </article>

                  <article className="card card--soft">
                    <div className="parameter-card__header">
                      <div>
                        <h3>
                          Zielbereiche <span className="parameter-count-badge">{zielbereicheQuery.data?.length ?? 0}</span>
                        </h3>
                        <p>Allgemeine Zielbereiche bleiben direkt am ausgewählten Parameter sichtbar.</p>
                      </div>
                      <button type="button" className="inline-button" onClick={() => handleOpenPanel("zielbereich")}>
                        Neuer Zielbereich
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Typ</th>
                            <th>Bereich</th>
                            <th>Einheit</th>
                            <th>Geschlecht</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zielbereicheQuery.data?.map((zielbereich) => (
                            <tr key={zielbereich.id}>
                              <td>{formatWertTyp(zielbereich.wert_typ)}</td>
                              <td>{formatZielbereichValue(zielbereich)}</td>
                              <td>{zielbereich.einheit || "—"}</td>
                              <td>{formatGeschlechtCode(zielbereich.geschlecht_code, "Alle Geschlechter")}</td>
                            </tr>
                          ))}
                          {!zielbereicheQuery.data?.length ? (
                            <tr>
                              <td colSpan={4}>Noch keine Zielbereiche für diesen Parameter vorhanden.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
