import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiFetch } from "../../shared/api/client";
import {
  buildMesswertCreatePayload,
  buildMesswertReferenzCreatePayload
} from "../../shared/api/payloadBuilders";
import { DateRangeFilterFields } from "../../shared/components/DateRangeFilterFields";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { BefundDetailCard } from "../../shared/components/BefundDetailCard";
import {
  KONTEXT_GESCHLECHT_OPTIONS,
  REFERENZ_GRENZ_OPERATOR_OPTIONS,
  WERT_OPERATOR_OPTIONS,
  WERT_TYP_OPTIONS,
  formatGeschlechtCode,
  formatWertOperator,
  formatWertTyp
} from "../../shared/constants/fieldOptions";
import { formatMesswertAnzeige, formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import {
  applySharedFilterSearchParams,
  buildSharedFilterSearchParams
} from "../../shared/utils/filterNavigation";
import type {
  Befund,
  Einheit,
  Gruppe,
  Labor,
  Messwert,
  MesswertReferenz,
  Parameter,
  Person,
  WertTyp
} from "../../shared/types/api";

const defaultDateRange = getDefaultDateRange();

type MesswertFormState = {
  person_id: string;
  befund_id: string;
  laborparameter_id: string;
  original_parametername: string;
  wert_typ: WertTyp;
  wert_operator: string;
  wert_roh_text: string;
  wert_num: string;
  wert_text: string;
  einheit_original: string;
  bemerkung_kurz: string;
};

type ListenFilterState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
};

type ReferenzFormState = {
  wert_typ: WertTyp;
  referenz_text_original: string;
  untere_grenze_num: string;
  untere_grenze_operator: string;
  obere_grenze_num: string;
  obere_grenze_operator: string;
  einheit: string;
  soll_text: string;
  geschlecht_code: string;
  bemerkung: string;
};

type MesswertePanelKey = "create" | "filters" | "reference";

const initialForm: MesswertFormState = {
  person_id: "",
  befund_id: "",
  laborparameter_id: "",
  original_parametername: "",
  wert_typ: "numerisch",
  wert_operator: "exakt",
  wert_roh_text: "",
  wert_num: "",
  wert_text: "",
  einheit_original: "",
  bemerkung_kurz: ""
};

const initialFilter: ListenFilterState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis
};

const initialReferenzForm: ReferenzFormState = {
  wert_typ: "numerisch",
  referenz_text_original: "",
  untere_grenze_num: "",
  untere_grenze_operator: "groesser_gleich",
  obere_grenze_num: "",
  obere_grenze_operator: "kleiner_gleich",
  einheit: "",
  soll_text: "",
  geschlecht_code: "",
  bemerkung: ""
};

function appendMany(searchParams: URLSearchParams, key: string, values: string[]) {
  values.forEach((value) => searchParams.append(key, value));
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatStatus(messwert: Messwert): string {
  const parts = [
    messwert.unsicher_flag ? "Unsicher" : null,
    messwert.pruefbedarf_flag ? "Prüfbedarf" : null
  ].filter(Boolean);

  return parts.join(" • ") || "Ohne Markierung";
}

function summarizeMesswert(messwert: Messwert): string {
  const parts = [
    messwert.labor_name?.trim() || "",
    messwert.entnahmedatum ? `Entnahme ${formatDate(messwert.entnahmedatum)}` : "",
    messwert.gruppen_namen.length ? messwert.gruppen_namen.join(", ") : ""
  ].filter(Boolean);

  return parts.join(" • ") || "Noch keine ergänzenden Angaben vorhanden.";
}

function summarizeBefund(befund: Befund): string {
  const parts = [
    befund.person_anzeigename?.trim() || "",
    befund.entnahmedatum ? `Entnahme ${formatDate(befund.entnahmedatum)}` : "",
    befund.labor_name?.trim() || ""
  ].filter(Boolean);

  return parts.join(" • ") || `Befund ${befund.id.slice(0, 8)}`;
}

function buildListItemSearchText(messwert: Messwert): string {
  return [
    messwert.person_anzeigename ?? "",
    messwert.parameter_anzeigename ?? "",
    messwert.original_parametername,
    messwert.labor_name ?? "",
    messwert.gruppen_namen.join(" "),
    messwert.wert_roh_text,
    messwert.bemerkung_kurz ?? "",
    messwert.entnahmedatum ?? ""
  ]
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

function formatReferenceAge(referenz: MesswertReferenz): string {
  if (referenz.alter_min_tage !== null && referenz.alter_min_tage !== undefined) {
    return `${(referenz.alter_min_tage / 365.25).toFixed(1)} bis ${
      referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined
        ? (referenz.alter_max_tage / 365.25).toFixed(1)
        : "—"
    } Jahre`;
  }

  if (referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined) {
    return `bis ${(referenz.alter_max_tage / 365.25).toFixed(1)} Jahre`;
  }

  return "—";
}

export function MesswertePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<MesswertFormState>(initialForm);
  const [filter, setFilter] = useState<ListenFilterState>(() =>
    applySharedFilterSearchParams(initialFilter, searchParams)
  );
  const [referenzForm, setReferenzForm] = useState<ReferenzFormState>(initialReferenzForm);
  const [selectedMesswertId, setSelectedMesswertId] = useState<string | null>(null);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<MesswertePanelKey | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showPageInfo, setShowPageInfo] = useState(false);
  const [showRelatedReferences, setShowRelatedReferences] = useState(true);
  const [showRelatedBefund, setShowRelatedBefund] = useState(false);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const befundeQuery = useQuery({
    queryKey: ["befunde"],
    queryFn: () => apiFetch<Befund[]>("/api/befunde")
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
  const einheitenQuery = useQuery({
    queryKey: ["einheiten"],
    queryFn: () => apiFetch<Einheit[]>("/api/einheiten")
  });
  const messwerteQuery = useQuery({
    queryKey: ["messwerte", filter],
    queryFn: () => {
      const nextSearchParams = new URLSearchParams();
      appendMany(nextSearchParams, "person_ids", filter.person_ids);
      appendMany(nextSearchParams, "laborparameter_ids", filter.laborparameter_ids);
      appendMany(nextSearchParams, "gruppen_ids", filter.gruppen_ids);
      appendMany(nextSearchParams, "labor_ids", filter.labor_ids);
      if (filter.datum_von) {
        nextSearchParams.set("datum_von", filter.datum_von);
      }
      if (filter.datum_bis) {
        nextSearchParams.set("datum_bis", filter.datum_bis);
      }

      const queryString = nextSearchParams.toString();
      return apiFetch<Messwert[]>(`/api/messwerte${queryString ? `?${queryString}` : ""}`);
    }
  });
  const selectedMesswertQuery = useQuery({
    queryKey: ["messwert", selectedMesswertId],
    queryFn: () => apiFetch<Messwert>(`/api/messwerte/${selectedMesswertId}`),
    enabled: Boolean(selectedMesswertId)
  });
  const referenzenQuery = useQuery({
    queryKey: ["messwert-referenzen", selectedMesswertId],
    queryFn: () => apiFetch<MesswertReferenz[]>(`/api/messwerte/${selectedMesswertId}/referenzen`),
    enabled: Boolean(selectedMesswertId)
  });

  const filteredBefunde = useMemo(
    () => befundeQuery.data?.filter((befund) => !form.person_id || befund.person_id === form.person_id) ?? [],
    [befundeQuery.data, form.person_id]
  );
  const personenById = useMemo(
    () => new Map((personenQuery.data ?? []).map((person) => [person.id, person])),
    [personenQuery.data]
  );
  const parameterById = useMemo(
    () => new Map((parameterQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parameterQuery.data]
  );
  const befundeById = useMemo(
    () => new Map((befundeQuery.data ?? []).map((befund) => [befund.id, befund])),
    [befundeQuery.data]
  );
  const einheiten = einheitenQuery.data ?? [];

  const availableMesswerte = useMemo(
    () =>
      [...(messwerteQuery.data ?? [])].sort((left, right) => {
        const leftTimestamp = left.entnahmedatum ? new Date(left.entnahmedatum).getTime() : 0;
        const rightTimestamp = right.entnahmedatum ? new Date(right.entnahmedatum).getTime() : 0;
        if (leftTimestamp !== rightTimestamp) {
          return rightTimestamp - leftTimestamp;
        }

        const byPerson = (left.person_anzeigename ?? "").localeCompare(right.person_anzeigename ?? "", "de-DE", {
          sensitivity: "base"
        });
        if (byPerson !== 0) {
          return byPerson;
        }

        return (left.parameter_anzeigename ?? left.original_parametername).localeCompare(
          right.parameter_anzeigename ?? right.original_parametername,
          "de-DE",
          { sensitivity: "base" }
        );
      }),
    [messwerteQuery.data]
  );

  const filteredMesswerte = useMemo(() => {
    const normalizedSearchQuery = listSearchQuery.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearchQuery) {
      return availableMesswerte;
    }

    return availableMesswerte.filter((messwert) => buildListItemSearchText(messwert).includes(normalizedSearchQuery));
  }, [availableMesswerte, listSearchQuery]);

  useEffect(() => {
    if (!filteredMesswerte.length) {
      setSelectedMesswertId(null);
      return;
    }

    const selectionStillExists = filteredMesswerte.some((messwert) => messwert.id === selectedMesswertId);
    if (!selectedMesswertId || !selectionStillExists) {
      setSelectedMesswertId(filteredMesswerte[0].id);
    }
  }, [filteredMesswerte, selectedMesswertId]);

  const selectedMesswert = useMemo(
    () =>
      selectedMesswertQuery.data ??
      availableMesswerte.find((messwert) => messwert.id === selectedMesswertId) ??
      null,
    [availableMesswerte, selectedMesswertId, selectedMesswertQuery.data]
  );

  useEffect(() => {
    setSearchParams(buildSharedFilterSearchParams(filter), { replace: true });
  }, [filter, setSearchParams]);

  useEffect(() => {
    if (!selectedMesswert) {
      setReferenzForm(initialReferenzForm);
      return;
    }

    setReferenzForm({
      ...initialReferenzForm,
      wert_typ: selectedMesswert.wert_typ,
      einheit: selectedMesswert.einheit_original ?? ""
    });
  }, [selectedMesswertId, selectedMesswert]);

  useEffect(() => {
    setShowRelatedReferences(true);
    setShowRelatedBefund(false);
  }, [selectedMesswertId]);

  const hasActiveListSearch = listSearchQuery.trim().length > 0;
  const messwertCountLabel = hasActiveListSearch
    ? `${filteredMesswerte.length} von ${availableMesswerte.length} Messwerten`
    : `${availableMesswerte.length} Messwerte`;
  const selectedMesswertValue = selectedMesswert ? formatMesswertAnzeige(selectedMesswert) : "—";
  const selectedMesswertQueryString = buildSharedFilterSearchParams(filter).toString();
  const selectedPersonLabel = selectedMesswert
    ? selectedMesswert.person_anzeigename || personenById.get(selectedMesswert.person_id)?.anzeigename || selectedMesswert.person_id
    : "—";
  const selectedParameterLabel = selectedMesswert
    ? selectedMesswert.parameter_anzeigename ||
      parameterById.get(selectedMesswert.laborparameter_id)?.anzeigename ||
      selectedMesswert.original_parametername
    : "—";
  const selectedBefund = selectedMesswert ? befundeById.get(selectedMesswert.befund_id) ?? null : null;
  const selectedBefundLabel = selectedBefund
    ? summarizeBefund(selectedBefund)
    : selectedMesswert
      ? `Befund ${selectedMesswert.befund_id.slice(0, 8)}`
      : "—";

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Messwert>("/api/messwerte", {
        method: "POST",
        body: JSON.stringify(buildMesswertCreatePayload(form))
      }),
    onSuccess: async (createdMesswert) => {
      setForm(initialForm);
      setSelectedMesswertId(createdMesswert.id);
      setActivePanel(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messwerte"] }),
        queryClient.invalidateQueries({ queryKey: ["befunde"] })
      ]);
    }
  });

  const createReferenzMutation = useMutation({
    mutationFn: () =>
      apiFetch<MesswertReferenz>(`/api/messwerte/${selectedMesswertId}/referenzen`, {
        method: "POST",
        body: JSON.stringify(
          buildMesswertReferenzCreatePayload(referenzForm, selectedMesswert?.einheit_original)
        )
      }),
    onSuccess: async () => {
      setReferenzForm({
        ...initialReferenzForm,
        wert_typ: selectedMesswert?.wert_typ ?? "numerisch",
        einheit: selectedMesswert?.einheit_original ?? ""
      });
      setActivePanel(null);
      await queryClient.invalidateQueries({ queryKey: ["messwert-referenzen", selectedMesswertId] });
    }
  });

  const handleOpenPanel = (panel: MesswertePanelKey) => {
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
              <h3>Neuer Messwert</h3>
              <p>Lege einen einzelnen Messwert an und ordne ihn einer Person, einem Befund und einem Parameter zu.</p>
            </div>
            {renderPanelCloseButton("Panel Neuer Messwert schließen")}
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={form.person_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    person_id: event.target.value,
                    befund_id: ""
                  }))
                }
              >
                <option value="">Bitte wählen</option>
                {personenQuery.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Befund</span>
              <select
                required
                value={form.befund_id}
                onChange={(event) => setForm((current) => ({ ...current, befund_id: event.target.value }))}
              >
                <option value="">Bitte wählen</option>
                {filteredBefunde.map((befund) => (
                  <option key={befund.id} value={befund.id}>
                    {(befund.entnahmedatum || "ohne Datum") + " • " + befund.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Parameter</span>
              <select
                required
                value={form.laborparameter_id}
                onChange={(event) => {
                  const selectedParameter = parameterQuery.data?.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    laborparameter_id: event.target.value,
                    original_parametername: selectedParameter?.anzeigename ?? current.original_parametername,
                    wert_typ: selectedParameter?.wert_typ_standard ?? current.wert_typ,
                    einheit_original: selectedParameter?.standard_einheit ?? current.einheit_original
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
              <span>Originalname im Befund</span>
              <input
                required
                value={form.original_parametername}
                onChange={(event) =>
                  setForm((current) => ({ ...current, original_parametername: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Werttyp</span>
              <select
                value={form.wert_typ}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    wert_typ: event.target.value as WertTyp,
                    wert_operator: "exakt",
                    wert_num: "",
                    wert_text: ""
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

            {form.wert_typ === "numerisch" ? (
              <label className="field">
                <span>Wertoperator</span>
                <select
                  value={form.wert_operator}
                  onChange={(event) => setForm((current) => ({ ...current, wert_operator: event.target.value }))}
                >
                  {WERT_OPERATOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field">
              <span>Rohwert</span>
              <input
                required
                value={form.wert_roh_text}
                onChange={(event) => setForm((current) => ({ ...current, wert_roh_text: event.target.value }))}
              />
            </label>

            {form.wert_typ === "numerisch" ? (
              <>
                <label className="field">
                  <span>Zahlenwert</span>
                  <input
                    type="number"
                    step="any"
                    value={form.wert_num}
                    onChange={(event) => setForm((current) => ({ ...current, wert_num: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Einheit</span>
                  <select
                    value={form.einheit_original}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, einheit_original: event.target.value }))
                    }
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
                <span>Textwert</span>
                <input
                  value={form.wert_text}
                  onChange={(event) => setForm((current) => ({ ...current, wert_text: event.target.value }))}
                />
              </label>
            )}

            <label className="field field--full">
              <span>Kurzbemerkung</span>
              <input
                value={form.bemerkung_kurz}
                onChange={(event) => setForm((current) => ({ ...current, bemerkung_kurz: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Speichert..." : "Messwert anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>
      );
    }

    if (activePanel === "filters") {
      return (
        <article className="card card--soft parameter-action-panel">
          <div className="parameter-panel__header">
            <div>
              <h3>Listenfilter</h3>
              <p>Die Filter wirken direkt auf Messwertliste, Detailauswahl, Berichte und Auswertung.</p>
            </div>
            {renderPanelCloseButton("Panel Listenfilter schließen")}
          </div>

          <div className="form-grid">
            <SelectionChecklist
              label="Personen"
              options={(personenQuery.data ?? []).map((person) => ({
                id: person.id,
                label: person.anzeigename
              }))}
              selectedIds={filter.person_ids}
              onChange={(person_ids) => setFilter((current) => ({ ...current, person_ids }))}
              emptyText="Noch keine Personen vorhanden."
              collapsible
            />

            <SelectionChecklist
              label="Gruppen"
              options={(gruppenQuery.data ?? []).map((gruppe) => ({
                id: gruppe.id,
                label: gruppe.name,
                meta: gruppe.beschreibung
              }))}
              selectedIds={filter.gruppen_ids}
              onChange={(gruppen_ids) => setFilter((current) => ({ ...current, gruppen_ids }))}
              emptyText="Noch keine Gruppen vorhanden."
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
              selectedIds={filter.laborparameter_ids}
              onChange={(laborparameter_ids) => setFilter((current) => ({ ...current, laborparameter_ids }))}
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
              selectedIds={filter.labor_ids}
              onChange={(labor_ids) => setFilter((current) => ({ ...current, labor_ids }))}
              emptyText="Noch keine Labore vorhanden."
              collapsible
              defaultExpanded={false}
            />

            <DateRangeFilterFields
              fromValue={filter.datum_von}
              toValue={filter.datum_bis}
              fallbackFromValue={initialFilter.datum_von}
              fallbackToValue={initialFilter.datum_bis}
              onFromChange={(datum_von) => setFilter((current) => ({ ...current, datum_von }))}
              onToChange={(datum_bis) => setFilter((current) => ({ ...current, datum_bis }))}
            />

            <div className="form-actions">
              <button type="button" onClick={() => setFilter(initialFilter)}>
                Filter zurücksetzen
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(selectedMesswertQueryString ? `/berichte?${selectedMesswertQueryString}` : "/berichte")
                }
              >
                Zu Berichten
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(selectedMesswertQueryString ? `/auswertung?${selectedMesswertQueryString}` : "/auswertung")
                }
              >
                Zur Auswertung
              </button>
            </div>
          </div>
        </article>
      );
    }

    if (!selectedMesswertId || !selectedMesswert) {
      return (
        <article className="card card--soft">
          <h3>Laborreferenz pflegen</h3>
          <p>Bitte wähle zuerst links einen Messwert aus.</p>
        </article>
      );
    }

    return (
      <article className="card card--soft parameter-action-panel">
        <div className="parameter-panel__header">
          <div>
            <h3>Laborreferenz pflegen</h3>
            <p>Hinterlege zum ausgewählten Messwert einen konkreten Laborreferenzbereich oder einen Solltext.</p>
          </div>
          {renderPanelCloseButton("Panel Laborreferenz schließen")}
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            createReferenzMutation.mutate();
          }}
        >
          <label className="field">
            <span>Messwert</span>
            <input
              value={`${selectedParameterLabel} • ${selectedMesswertValue}`}
              disabled
            />
          </label>

          <label className="field">
            <span>Person</span>
            <input value={selectedPersonLabel} disabled />
          </label>

          <label className="field">
            <span>Entnahmedatum</span>
            <input value={formatDate(selectedMesswert.entnahmedatum)} disabled />
          </label>

          <label className="field">
            <span>Werttyp</span>
            <select
              value={referenzForm.wert_typ}
              onChange={(event) =>
                setReferenzForm((current) => ({
                  ...current,
                  wert_typ: event.target.value as WertTyp,
                  untere_grenze_num: "",
                  untere_grenze_operator: "groesser_gleich",
                  obere_grenze_num: "",
                  obere_grenze_operator: "kleiner_gleich",
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

          <label className="field field--full">
            <span>Originaltext</span>
            <input
              value={referenzForm.referenz_text_original}
              onChange={(event) =>
                setReferenzForm((current) => ({
                  ...current,
                  referenz_text_original: event.target.value
                }))
              }
            />
          </label>

          {referenzForm.wert_typ === "numerisch" ? (
            <>
              <label className="field">
                <span>Untere Grenze</span>
                <input
                  type="number"
                  step="any"
                  value={referenzForm.untere_grenze_num}
                  onChange={(event) =>
                    setReferenzForm((current) => ({ ...current, untere_grenze_num: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Operator unten</span>
                <select
                  value={referenzForm.untere_grenze_operator}
                  onChange={(event) =>
                    setReferenzForm((current) => ({
                      ...current,
                      untere_grenze_operator: event.target.value
                    }))
                  }
                >
                  {REFERENZ_GRENZ_OPERATOR_OPTIONS.filter((option) => option.value.startsWith("groesser")).map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="field">
                <span>Obere Grenze</span>
                <input
                  type="number"
                  step="any"
                  value={referenzForm.obere_grenze_num}
                  onChange={(event) =>
                    setReferenzForm((current) => ({ ...current, obere_grenze_num: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Operator oben</span>
                <select
                  value={referenzForm.obere_grenze_operator}
                  onChange={(event) =>
                    setReferenzForm((current) => ({
                      ...current,
                      obere_grenze_operator: event.target.value
                    }))
                  }
                >
                  {REFERENZ_GRENZ_OPERATOR_OPTIONS.filter((option) => option.value.startsWith("kleiner")).map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="field">
                <span>Einheit</span>
                <select
                  value={referenzForm.einheit}
                  onChange={(event) => setReferenzForm((current) => ({ ...current, einheit: event.target.value }))}
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
                value={referenzForm.soll_text}
                onChange={(event) => setReferenzForm((current) => ({ ...current, soll_text: event.target.value }))}
              />
            </label>
          )}

          <label className="field">
            <span>Geschlecht</span>
            <select
              value={referenzForm.geschlecht_code}
              onChange={(event) =>
                setReferenzForm((current) => ({ ...current, geschlecht_code: event.target.value }))
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
              value={referenzForm.bemerkung}
              onChange={(event) => setReferenzForm((current) => ({ ...current, bemerkung: event.target.value }))}
            />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={createReferenzMutation.isPending || !selectedMesswertId}>
              {createReferenzMutation.isPending ? "Speichert..." : "Referenz anlegen"}
            </button>
            {createReferenzMutation.isError ? <p className="form-error">{createReferenzMutation.error.message}</p> : null}
          </div>
        </form>
      </article>
    );
  };

  return (
    <section className="page">
      <header className="page__header page__header--compact">
        <h2>Messwerte</h2>
        <div className="page__info">
          <button
            type="button"
            className="icon-button page__info-button"
            aria-label="Hinweis zur Messwertseite"
            aria-expanded={showPageInfo}
            onClick={() => setShowPageInfo((current) => !current)}
          >
            i
          </button>
          {showPageInfo ? (
            <div className="page__info-popover">
              Hier verwaltest Du Messwerte als Arbeitsbereich mit Auswahl, Detailprüfung, Filterlogik und
              Laborreferenzen.
            </div>
          ) : null}
        </div>
      </header>

      <div className="parameter-workspace">
        <aside className="card parameter-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Gefilterte Messwerte</h3>
              <p>{messwertCountLabel}</p>
            </div>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <div className="clearable-field">
              <input
                className="clearable-field__input"
                value={listSearchQuery}
                onChange={(event) => setListSearchQuery(event.target.value)}
                placeholder="Person, Parameter, Labor, Gruppe oder Wert"
              />
              <button
                type="button"
                className="clearable-field__clear"
                onClick={() => setListSearchQuery("")}
                aria-label="Suche löschen"
                title="Suche löschen"
                disabled={!listSearchQuery}
              >
                ×
              </button>
            </div>
          </label>

          {messwerteQuery.isError ? <p className="form-error">{messwerteQuery.error.message}</p> : null}

          <div className="parameter-list">
            {filteredMesswerte.map((messwert) => (
              <button
                key={messwert.id}
                type="button"
                className={`parameter-list__item ${selectedMesswertId === messwert.id ? "parameter-list__item--selected" : ""}`}
                onClick={() => setSelectedMesswertId(messwert.id)}
              >
                <div className="parameter-list__title-row">
                  <strong>{messwert.parameter_anzeigename || messwert.original_parametername}</strong>
                </div>
                <p>{summarizeMesswert(messwert)}</p>
                <div className="parameter-list__meta">
                  <span className="parameter-pill">{messwert.person_anzeigename || "Unbekannte Person"}</span>
                  <span className="parameter-pill">{formatMesswertAnzeige(messwert)}</span>
                  <span className="parameter-pill">{messwert.einheit_original || formatWertTyp(messwert.wert_typ)}</span>
                </div>
              </button>
            ))}
            {!filteredMesswerte.length ? (
              <div className="parameter-list__empty">
                <p>Keine Messwerte passen zur aktuellen Filter- und Suchkombination.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="parameter-main">
          <article className="card">
            <div className="parameter-toolrail">
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "create" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => handleOpenPanel("create")}
              >
                Neuer Messwert
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "filters" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => handleOpenPanel("filters")}
              >
                Filter bearbeiten
              </button>
              <button
                type="button"
                className={`parameter-toolrail__button ${activePanel === "reference" ? "parameter-toolrail__button--active" : ""}`}
                onClick={() => handleOpenPanel("reference")}
                disabled={!selectedMesswert}
              >
                Laborreferenz
              </button>
              <button
                type="button"
                className="parameter-toolrail__button"
                onClick={() =>
                  navigate(selectedMesswertQueryString ? `/berichte?${selectedMesswertQueryString}` : "/berichte")
                }
              >
                Zu Berichten
              </button>
              <button
                type="button"
                className="parameter-toolrail__button"
                onClick={() =>
                  navigate(selectedMesswertQueryString ? `/auswertung?${selectedMesswertQueryString}` : "/auswertung")
                }
              >
                Zur Auswertung
              </button>
            </div>

            {renderActionPanel()}

            <div className="parameter-detail__header">
              <div>
                <h3 className="parameter-detail__title">
                  {selectedMesswert
                    ? `${selectedPersonLabel} • ${selectedParameterLabel}`
                    : "Messwert auswählen"}
                </h3>
                <p>
                  {selectedMesswert
                    ? selectedMesswert.bemerkung_kurz?.trim() || summarizeMesswert(selectedMesswert)
                    : "Wähle links einen Messwert oder öffne die Werkzeuge für Erfassung und Filterung."}
                </p>
              </div>
              <div className="parameter-header-controls">
                <button
                  type="button"
                  className={`parameter-mode-toggle ${showAdvancedDetails ? "parameter-mode-toggle--advanced" : ""}`}
                  onClick={() => setShowAdvancedDetails((current) => !current)}
                  aria-pressed={showAdvancedDetails}
                  title={showAdvancedDetails ? "Zur einfachen Ansicht wechseln" : "Zur Expertenansicht wechseln"}
                  disabled={!selectedMesswert}
                >
                  <span className="parameter-mode-toggle__icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="parameter-mode-toggle__text">{showAdvancedDetails ? "Experte" : "Einfach"}</span>
                </button>
              </div>
            </div>

            {selectedMesswertQuery.isError ? <p className="form-error">{selectedMesswertQuery.error.message}</p> : null}
            {referenzenQuery.isError ? <p className="form-error">{referenzenQuery.error.message}</p> : null}

            {!selectedMesswert ? (
              <p>Für die aktuelle Auswahl ist noch kein Messwert aktiv. Passe bei Bedarf die Filter an oder lege einen neuen Messwert an.</p>
            ) : (
              <>
                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Person</span>
                    <strong>{selectedPersonLabel}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Befund</span>
                    <strong>{selectedBefundLabel}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Parameter</span>
                    <strong>{selectedParameterLabel}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Entnahmedatum</span>
                    <strong>{formatDate(selectedMesswert.entnahmedatum)}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Labor</span>
                    <strong>{selectedMesswert.labor_name || "Nicht zugeordnet"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Wert</span>
                    <strong>{selectedMesswertValue}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Einheit</span>
                    <strong>{selectedMesswert.einheit_original || "Keine Einheit"}</strong>
                  </div>
                </div>

                <div className="detail-grid detail-grid--metrics">
                  <div className="detail-grid__item">
                    <span>Referenzen</span>
                    <strong>{referenzenQuery.data?.length ?? 0}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Gruppen</span>
                    <strong>{selectedMesswert.gruppen_namen.length}</strong>
                  </div>
                </div>

                {showAdvancedDetails ? (
                  <div className="detail-grid">
                    <div className="detail-grid__item">
                      <span>Werttyp</span>
                      <strong>{formatWertTyp(selectedMesswert.wert_typ)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Operator</span>
                      <strong>{formatWertOperator(selectedMesswert.wert_operator)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Originalname</span>
                      <strong>{selectedMesswert.original_parametername}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Status</span>
                      <strong>{formatStatus(selectedMesswert)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Normierter Wert</span>
                      <strong>
                        {selectedMesswert.wert_normiert_num !== null && selectedMesswert.wert_normiert_num !== undefined
                          ? `${selectedMesswert.wert_normiert_num}${selectedMesswert.einheit_normiert ? ` ${selectedMesswert.einheit_normiert}` : ""}`
                          : "—"}
                      </strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Erstellt</span>
                      <strong>{formatDateTime(selectedMesswert.erstellt_am)}</strong>
                    </div>
                    <div className="detail-grid__item">
                      <span>Geändert</span>
                      <strong>{formatDateTime(selectedMesswert.geaendert_am)}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Bemerkung lang</span>
                      <strong>{selectedMesswert.bemerkung_lang || "—"}</strong>
                    </div>
                    <div className="detail-grid__item detail-grid__item--full">
                      <span>Interne ID</span>
                      <strong className="detail-grid__value--break">{selectedMesswert.id}</strong>
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
                        className={`parameter-related__toggle ${showRelatedReferences ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedReferences((current) => !current)}
                        aria-expanded={showRelatedReferences}
                      >
                        <span>
                          <strong>Laborreferenzen</strong>
                          <small>{formatCountLabel(referenzenQuery.data?.length ?? 0, "Eintrag", "Einträge")}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedReferences ? (
                        <div className="parameter-related__content">
                          <div className="table-wrap">
                            <table className="data-table parameter-summary-table">
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
                                    <td>{formatReferenzAnzeige(referenz)}</td>
                                    <td>{referenz.einheit || "—"}</td>
                                    <td>{formatGeschlechtCode(referenz.geschlecht_code, "Alle Geschlechter")}</td>
                                    <td>{formatReferenceAge(referenz)}</td>
                                    <td>{referenz.bemerkung || referenz.referenz_text_original || "—"}</td>
                                  </tr>
                                ))}
                                {!referenzenQuery.data?.length ? (
                                  <tr>
                                    <td colSpan={6}>Für diesen Messwert sind noch keine Laborreferenzen hinterlegt.</td>
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
                        className={`parameter-related__toggle ${showRelatedBefund ? "parameter-related__toggle--open" : ""}`}
                        onClick={() => setShowRelatedBefund((current) => !current)}
                        aria-expanded={showRelatedBefund}
                      >
                        <span>
                          <strong>Zugehöriger Befund</strong>
                          <small>{selectedBefundLabel}</small>
                        </span>
                        <span className="parameter-related__chevron" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {showRelatedBefund ? (
                        <div className="parameter-related__content">
                          <BefundDetailCard
                            befundId={selectedMesswert.befund_id}
                            title={`Befunddetails • ${selectedBefundLabel}`}
                            emptyText="Kein Befund ausgewählt."
                            className="card card--soft"
                          />
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
    </section>
  );
}
