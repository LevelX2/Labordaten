import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { buildZielbereichCreatePayload } from "../../shared/api/payloadBuilders";
import {
  KONTEXT_GESCHLECHT_OPTIONS,
  WERT_TYP_OPTIONS,
  formatGeschlechtCode,
  formatWertTyp
} from "../../shared/constants/fieldOptions";
import type {
  Parameter,
  ParameterAlias,
  ParameterAliasSuggestion,
  ParameterDuplicateSuggestion,
  ParameterMergeResult,
  ParameterRenameResult,
  ParameterUsageSummary,
  WertTyp,
  Zielbereich
} from "../../shared/types/api";

type ParameterFormState = {
  anzeigename: string;
  standard_einheit: string;
  wert_typ_standard: WertTyp;
  beschreibung: string;
};

const initialForm: ParameterFormState = {
  anzeigename: "",
  standard_einheit: "",
  wert_typ_standard: "numerisch",
  beschreibung: ""
};

type ParameterAliasFormState = {
  laborparameter_id: string;
  alias_text: string;
  bemerkung: string;
};

const initialAliasForm: ParameterAliasFormState = {
  laborparameter_id: "",
  alias_text: "",
  bemerkung: ""
};

type ParameterRenameFormState = {
  parameter_id: string;
  neuer_name: string;
  alten_namen_als_alias_anlegen: boolean;
};

const initialRenameForm: ParameterRenameFormState = {
  parameter_id: "",
  neuer_name: "",
  alten_namen_als_alias_anlegen: true
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

export function ParameterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ParameterFormState>(initialForm);
  const [aliasForm, setAliasForm] = useState<ParameterAliasFormState>(initialAliasForm);
  const [renameForm, setRenameForm] = useState<ParameterRenameFormState>(initialRenameForm);
  const [zielbereichForm, setZielbereichForm] = useState<ZielbereichFormState>(initialZielbereichForm);
  const [mergeNameBySuggestion, setMergeNameBySuggestion] = useState<Record<string, string>>({});
  const [lastMergeResult, setLastMergeResult] = useState<ParameterMergeResult | null>(null);
  const [lastRenameResult, setLastRenameResult] = useState<ParameterRenameResult | null>(null);
  const [parameterSearchQuery, setParameterSearchQuery] = useState("");

  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });

  const selectedParameter = useMemo(
    () => parameterQuery.data?.find((parameter) => parameter.id === zielbereichForm.parameter_id) ?? null,
    [parameterQuery.data, zielbereichForm.parameter_id]
  );
  const selectedRenameParameter = useMemo(
    () => parameterQuery.data?.find((parameter) => parameter.id === renameForm.parameter_id) ?? null,
    [parameterQuery.data, renameForm.parameter_id]
  );
  const filteredParameters = useMemo(() => {
    const normalizedSearchQuery = parameterSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return parameterQuery.data ?? [];
    }

    return (parameterQuery.data ?? []).filter((parameter) =>
      parameter.anzeigename.toLocaleLowerCase("de-DE").includes(normalizedSearchQuery)
    );
  }, [parameterQuery.data, parameterSearchQuery]);

  const zielbereicheQuery = useQuery({
    queryKey: ["zielbereiche", zielbereichForm.parameter_id],
    queryFn: () => apiFetch<Zielbereich[]>(`/api/parameter/${zielbereichForm.parameter_id}/zielbereiche`),
    enabled: Boolean(zielbereichForm.parameter_id)
  });

  const parameterAliaseQuery = useQuery({
    queryKey: ["parameter-aliase", aliasForm.laborparameter_id],
    queryFn: () => apiFetch<ParameterAlias[]>(`/api/parameter/${aliasForm.laborparameter_id}/aliase`),
    enabled: Boolean(aliasForm.laborparameter_id)
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

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Parameter>("/api/parameter", {
        method: "POST",
        body: JSON.stringify(form)
      }),
    onSuccess: async () => {
      setForm(initialForm);
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
        parameter_id: current.parameter_id
      }));
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
      await queryClient.invalidateQueries({ queryKey: ["parameter-aliase", aliasForm.laborparameter_id] });
      await queryClient.invalidateQueries({ queryKey: ["parameter-alias-vorschlaege"] });
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
      setAliasForm((current) => ({
        ...current,
        laborparameter_id: current.laborparameter_id || result.parameter_id
      }));
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
      setAliasForm((current) => ({
        ...current,
        laborparameter_id:
          current.laborparameter_id === payload.quell_parameter_id ? payload.ziel_parameter_id : current.laborparameter_id
      }));
      setZielbereichForm((current) => ({
        ...current,
        parameter_id: current.parameter_id === payload.quell_parameter_id ? payload.ziel_parameter_id : current.parameter_id
      }));
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

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Erster Durchstich</span>
        <h2>Parameter</h2>
        <p>Parameter-Stammdaten sind die Basis, damit Messwerte sauber intern zugeordnet werden können.</p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neuer Parameter</h3>
          <p>Der interne Schlüssel wird beim Anlegen automatisch aus dem Anzeigenamen erzeugt.</p>
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
              <input
                value={form.standard_einheit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, standard_einheit: event.target.value }))
                }
              />
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

        <article className="card">
          <h3>Vorhandene Parameter</h3>
          <label className="field">
            <span>Suche im Anzeigenamen</span>
            <input
              value={parameterSearchQuery}
              onChange={(event) => setParameterSearchQuery(event.target.value)}
              placeholder="z. B. Vitamin D"
            />
          </label>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schlüssel</th>
                  <th>Name</th>
                  <th>Typ</th>
                  <th>Einheit</th>
                </tr>
              </thead>
              <tbody>
                {filteredParameters.map((parameter) => (
                  <tr key={parameter.id}>
                    <td>{parameter.interner_schluessel}</td>
                    <td>{parameter.anzeigename}</td>
                    <td>{formatWertTyp(parameter.wert_typ_standard)}</td>
                    <td>{parameter.standard_einheit || "—"}</td>
                  </tr>
                ))}
                {parameterQuery.data?.length && !filteredParameters.length ? (
                  <tr>
                    <td colSpan={4}>Keine Parameter passen zur aktuellen Suche.</td>
                  </tr>
                ) : null}
                {!parameterQuery.data?.length ? (
                  <tr>
                    <td colSpan={4}>Noch keine Parameter vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Parameter umbenennen</h3>
          <p>
            Ein vorhandener Parameter kann umbenannt werden. Der bisherige Name wird auf Wunsch direkt als Alias
            hinterlegt, damit spätere Importe weiterhin sauber auf denselben Parameter laufen.
          </p>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              renameParameterMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <select
                required
                value={renameForm.parameter_id}
                onChange={(event) => {
                  const parameterId = event.target.value;
                  const parameter = parameterQuery.data?.find((item) => item.id === parameterId) ?? null;
                  setRenameForm((current) => ({
                    ...current,
                    parameter_id: parameterId,
                    neuer_name: parameter?.anzeigename ?? ""
                  }));
                }}
              >
                <option value="">Bitte wählen</option>
                {parameterQuery.data?.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Neuer Name</span>
              <input
                required
                value={renameForm.neuer_name}
                onChange={(event) =>
                  setRenameForm((current) => ({ ...current, neuer_name: event.target.value }))
                }
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

            {selectedRenameParameter ? (
              <p>
                Aktueller Name: <strong>{selectedRenameParameter.anzeigename}</strong>
              </p>
            ) : null}
            {lastRenameResult ? (
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
              {renameParameterMutation.isError ? (
                <p className="form-error">{renameParameterMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Alias pflegen</h3>
          <p>
            Aliasnamen helfen beim Import, wenn Labore denselben Wert unterschiedlich benennen, etwa mit anderer
            Schreibweise oder Zusatz wie LCMS.
          </p>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createAliasMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <select
                required
                value={aliasForm.laborparameter_id}
                onChange={(event) =>
                  setAliasForm((current) => ({ ...current, laborparameter_id: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {parameterQuery.data?.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.anzeigename}
                  </option>
                ))}
              </select>
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

        <article className="card">
          <h3>Aliase zum gewählten Parameter</h3>
          {!aliasForm.laborparameter_id ? <p>Bitte zuerst einen Parameter für die Aliaspflege wählen.</p> : null}
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
                {aliasForm.laborparameter_id && !parameterAliaseQuery.data?.length ? (
                  <tr>
                    <td colSpan={3}>Noch keine Aliase für diesen Parameter vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Alias-Vorschläge aus vorhandenen Messwerten</h3>
          <p>
            Die Vorschlagsliste sucht nach bereits bestätigten Originalnamen aus importierten oder gespeicherten
            Messwerten, die noch nicht als Alias hinterlegt sind.
          </p>
          <div className="inline-actions">
            <span className="inline-actions__label">Alias-Kandidaten prüfen</span>
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
          {confirmAliasSuggestionMutation.isError ? (
            <p className="form-error">{confirmAliasSuggestionMutation.error.message}</p>
          ) : null}
          {!aliasSuggestionsQuery.isFetched ? (
            <p>Die Vorschläge werden nur bei Bedarf geladen, damit die Pflegeoberfläche kompakt bleibt.</p>
          ) : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Vorgeschlagener Alias</th>
                  <th>Normalisiert</th>
                  <th>Beobachtet</th>
                  <th>Letzte Verwendung</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {aliasSuggestionsQuery.data?.map((suggestion) => (
                  <tr key={`${suggestion.laborparameter_id}-${suggestion.alias_normalisiert}`}>
                    <td>{suggestion.parameter_anzeigename}</td>
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
                {aliasSuggestionsQuery.isFetched && !aliasSuggestionsQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Aktuell wurden keine zusätzlichen Alias-Vorschläge gefunden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>DublettenprÃ¼fung und ZusammenfÃ¼hrung</h3>
          <p>
            Diese Liste prÃ¼ft vorhandene Parameter auf wahrscheinliche Dubletten. Nach BestÃ¤tigung werden alle
            Verwendungen auf den Zielparameter umgehÃ¤ngt, der gemeinsame Name gesetzt und nicht mehr verwendete Namen
            nach MÃ¶glichkeit als Alias Ã¼bernommen.
          </p>
          <div className="inline-actions">
            <span className="inline-actions__label">Vorhandene Parameter prÃ¼fen</span>
            <button
              type="button"
              className="inline-button"
              onClick={() => duplicateSuggestionsQuery.refetch()}
              disabled={duplicateSuggestionsQuery.isFetching}
            >
              {duplicateSuggestionsQuery.isFetching ? "PrÃ¼ft..." : "Dubletten suchen"}
            </button>
          </div>
          {duplicateSuggestionsQuery.isError ? (
            <p className="form-error">{duplicateSuggestionsQuery.error.message}</p>
          ) : null}
          {mergeDuplicateMutation.isError ? <p className="form-error">{mergeDuplicateMutation.error.message}</p> : null}
          {lastMergeResult ? (
            <p>
              ZusammengefÃ¼hrt zu <strong>{lastMergeResult.gemeinsamer_name}</strong>. Verschoben:{" "}
              {lastMergeResult.verschobene_messwerte} Messwerte, {lastMergeResult.verschobene_zielbereiche} Zielbereiche,{" "}
              {lastMergeResult.verschobene_planung_zyklisch + lastMergeResult.verschobene_planung_einmalig} Planungen.
              Neue Aliase: {lastMergeResult.angelegte_aliase.join(", ") || "keine"}.
            </p>
          ) : null}
          {!duplicateSuggestionsQuery.isFetched ? (
            <p>Die DublettenprÃ¼fung wird nur auf Abruf geladen.</p>
          ) : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Behalten</th>
                  <th>AuflÃ¶sen</th>
                  <th>BegrÃ¼ndung</th>
                  <th>Gemeinsamer Name</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {duplicateSuggestionsQuery.data?.map((suggestion) => {
                  const suggestionKey = `${suggestion.ziel_parameter_id}:${suggestion.quell_parameter_id}`;
                  const mergeName =
                    mergeNameBySuggestion[suggestionKey] ?? suggestion.gemeinsamer_name_vorschlag;
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
                              `Soll '${suggestion.quell_parameter_anzeigename}' in '${suggestion.ziel_parameter_anzeigename}' Ã¼berfÃ¼hrt werden?`
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
                          {mergeDuplicateMutation.isPending ? "FÃ¼hrt zusammen..." : "ZusammenfÃ¼hren"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {duplicateSuggestionsQuery.isFetched && !duplicateSuggestionsQuery.data?.length ? (
                  <tr>
                    <td colSpan={5}>Aktuell wurden keine passenden DublettenvorschlÃ¤ge gefunden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Allgemeiner Zielbereich</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createZielbereichMutation.mutate();
            }}
          >
            <label className="field">
              <span>Parameter</span>
              <select
                required
                value={zielbereichForm.parameter_id}
                onChange={(event) =>
                  setZielbereichForm((current) => ({
                    ...current,
                    parameter_id: event.target.value,
                    einheit:
                      parameterQuery.data?.find((item) => item.id === event.target.value)?.standard_einheit ?? ""
                  }))
                }
              >
                <option value="">Bitte wählen</option>
                {parameterQuery.data?.map((parameter) => (
                  <option key={parameter.id} value={parameter.id}>
                    {parameter.anzeigename}
                  </option>
                ))}
              </select>
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
                  <input
                    value={zielbereichForm.einheit}
                    onChange={(event) =>
                      setZielbereichForm((current) => ({ ...current, einheit: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : (
              <label className="field field--full">
                <span>Solltext</span>
                <input
                  value={zielbereichForm.soll_text}
                  onChange={(event) =>
                    setZielbereichForm((current) => ({ ...current, soll_text: event.target.value }))
                  }
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
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, bemerkung: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                disabled={createZielbereichMutation.isPending || !zielbereichForm.parameter_id}
              >
                {createZielbereichMutation.isPending ? "Speichert..." : "Zielbereich anlegen"}
              </button>
              {createZielbereichMutation.isError ? (
                <p className="form-error">{createZielbereichMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Zielbereiche zum gewählten Parameter</h3>
          {!zielbereichForm.parameter_id ? <p>Bitte zuerst einen Parameter auswählen.</p> : null}
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
                    <td>
                      {zielbereich.wert_typ === "numerisch"
                        ? `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`
                        : zielbereich.soll_text || "—"}
                    </td>
                    <td>{zielbereich.einheit || "—"}</td>
                    <td>{formatGeschlechtCode(zielbereich.geschlecht_code, "Alle Geschlechter")}</td>
                  </tr>
                ))}
                {zielbereichForm.parameter_id && !zielbereicheQuery.data?.length ? (
                  <tr>
                    <td colSpan={4}>Noch keine Zielbereiche für diesen Parameter vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
