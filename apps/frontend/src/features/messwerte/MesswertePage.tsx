import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiFetch } from "../../shared/api/client";
import {
  buildMesswertCreatePayload,
  buildMesswertReferenzCreatePayload
} from "../../shared/api/payloadBuilders";
import { MesswertDetailCard } from "../../shared/components/MesswertDetailCard";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import {
  KONTEXT_GESCHLECHT_OPTIONS,
  REFERENZ_GRENZ_OPERATOR_OPTIONS,
  WERT_OPERATOR_OPTIONS,
  WERT_TYP_OPTIONS,
  formatGeschlechtCode,
  formatWertTyp
} from "../../shared/constants/fieldOptions";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
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

type ReferenzFormState = {
  messwert_id: string;
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

const initialReferenzForm: ReferenzFormState = {
  messwert_id: "",
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
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

export function MesswertePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<MesswertFormState>(initialForm);
  const [filter, setFilter] = useState<ListenFilterState>(() =>
    applySharedFilterSearchParams(initialFilter, searchParams)
  );
  const [referenzForm, setReferenzForm] = useState<ReferenzFormState>(initialReferenzForm);
  const [selectedMesswertId, setSelectedMesswertId] = useState<string | null>(null);

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
  const messwerteSelectionQuery = useQuery({
    queryKey: ["messwerte", "alle"],
    queryFn: () => apiFetch<Messwert[]>("/api/messwerte")
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

  const selectedMesswert = useMemo(
    () => messwerteSelectionQuery.data?.find((messwert) => messwert.id === referenzForm.messwert_id) ?? null,
    [messwerteSelectionQuery.data, referenzForm.messwert_id]
  );

  const referenzenQuery = useQuery({
    queryKey: ["messwert-referenzen", referenzForm.messwert_id],
    queryFn: () => apiFetch<MesswertReferenz[]>(`/api/messwerte/${referenzForm.messwert_id}/referenzen`),
    enabled: Boolean(referenzForm.messwert_id)
  });

  const filteredBefunde = useMemo(
    () => befundeQuery.data?.filter((befund) => !form.person_id || befund.person_id === form.person_id) ?? [],
    [befundeQuery.data, form.person_id]
  );
  const einheiten = einheitenQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Messwert>("/api/messwerte", {
        method: "POST",
        body: JSON.stringify(buildMesswertCreatePayload(form))
      }),
    onSuccess: async () => {
      setForm(initialForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messwerte"] }),
        queryClient.invalidateQueries({ queryKey: ["befunde"] })
      ]);
    }
  });

  const createReferenzMutation = useMutation({
    mutationFn: () =>
      apiFetch<MesswertReferenz>(`/api/messwerte/${referenzForm.messwert_id}/referenzen`, {
        method: "POST",
        body: JSON.stringify(
          buildMesswertReferenzCreatePayload(referenzForm, selectedMesswert?.einheit_original)
        )
      }),
    onSuccess: async () => {
      setReferenzForm((current) => ({
        ...initialReferenzForm,
        messwert_id: current.messwert_id
      }));
      await queryClient.invalidateQueries({ queryKey: ["messwert-referenzen", referenzForm.messwert_id] });
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Laborwerte und Filter</span>
        <h2>Messwerte</h2>
        <p>
          Messwerte können jetzt nicht nur erfasst, sondern auch nach Personen, Gruppen, Laboren, Parametern und
          Zeitraum kombiniert gefiltert werden.
        </p>
      </header>

      <article className="card">
        <h3>Listenfilter</h3>
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
          />

          <label className="field">
            <span>Datum von</span>
            <input
              type="date"
              value={filter.datum_von}
              onChange={(event) => setFilter((current) => ({ ...current, datum_von: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Datum bis</span>
            <input
              type="date"
              value={filter.datum_bis}
              onChange={(event) => setFilter((current) => ({ ...current, datum_bis: event.target.value }))}
            />
          </label>

          <div className="form-actions">
            <button type="button" onClick={() => setFilter(initialFilter)}>
              Filter zurücksetzen
            </button>
          </div>
        </div>
      </article>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neuer Messwert</h3>
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
                    {(befund.entnahmedatum || "ohne Datum") + " · " + befund.id.slice(0, 8)}
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
                  const selected = parameterQuery.data?.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    laborparameter_id: event.target.value,
                    original_parametername: selected?.anzeigename ?? current.original_parametername,
                    wert_typ: selected?.wert_typ_standard ?? current.wert_typ,
                    einheit_original: selected?.standard_einheit ?? current.einheit_original
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
                  onChange={(event) =>
                    setForm((current) => ({ ...current, wert_operator: event.target.value }))
                  }
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

        <article className="card card--wide">
          <h3>Vorhandene Messwerte</h3>
          <p>Zeilen können angeklickt werden, um alle Details und Referenzwerte direkt darunter zu sehen.</p>
          <div className="inline-actions">
            <span className="inline-actions__label">Aktuelle Auswahl weiterverwenden</span>
            <button
              type="button"
              className="inline-button"
              onClick={() => navigate(`/berichte?${buildSharedFilterSearchParams(filter).toString()}`)}
            >
              Zu Berichten
            </button>
            <button
              type="button"
              className="inline-button"
              onClick={() => navigate(`/auswertung?${buildSharedFilterSearchParams(filter).toString()}`)}
            >
              Zur Auswertung
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Datum</th>
                  <th>Labor</th>
                  <th>Gruppen</th>
                  <th>Rohwert</th>
                  <th>Typ</th>
                  <th>Einheit</th>
                </tr>
              </thead>
              <tbody>
                {messwerteQuery.data?.map((messwert) => (
                  <tr
                    key={messwert.id}
                    onClick={() => setSelectedMesswertId(messwert.id)}
                    className={messwert.id === selectedMesswertId ? "row-selected" : undefined}
                  >
                    <td>{messwert.person_anzeigename || messwert.person_id}</td>
                    <td>{messwert.parameter_anzeigename || messwert.original_parametername}</td>
                    <td>{formatDate(messwert.entnahmedatum)}</td>
                    <td>{messwert.labor_name || "—"}</td>
                    <td>{messwert.gruppen_namen.length ? messwert.gruppen_namen.join(", ") : "—"}</td>
                    <td>{messwert.wert_roh_text}</td>
                    <td>{formatWertTyp(messwert.wert_typ)}</td>
                    <td>{messwert.einheit_original || "—"}</td>
                  </tr>
                ))}
                {!messwerteQuery.data?.length ? (
                  <tr>
                    <td colSpan={8}>Für die aktuelle Filterkombination wurden keine Messwerte gefunden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <MesswertDetailCard
          messwertId={selectedMesswertId}
          title="Ausgewählter Messwert"
          emptyText="Bitte in der Messwertliste einen Eintrag auswählen."
        />

        <article className="card">
          <h3>Laborreferenz zum Messwert</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createReferenzMutation.mutate();
            }}
          >
            <label className="field">
              <span>Messwert</span>
              <select
                required
                value={referenzForm.messwert_id}
                onChange={(event) => {
                  const selected = messwerteSelectionQuery.data?.find((item) => item.id === event.target.value);
                  setReferenzForm((current) => ({
                    ...current,
                    messwert_id: event.target.value,
                    wert_typ: selected?.wert_typ ?? current.wert_typ,
                    einheit: selected?.einheit_original ?? current.einheit
                  }));
                }}
              >
                <option value="">Bitte wählen</option>
                {messwerteSelectionQuery.data?.map((messwert) => (
                  <option key={messwert.id} value={messwert.id}>
                    {`${messwert.person_anzeigename || messwert.person_id} · ${messwert.original_parametername} · ${
                      messwert.wert_roh_text
                    }`}
                  </option>
                ))}
              </select>
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
                    {REFERENZ_GRENZ_OPERATOR_OPTIONS.filter((option) =>
                      option.value.startsWith("groesser")
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
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
                    {REFERENZ_GRENZ_OPERATOR_OPTIONS.filter((option) =>
                      option.value.startsWith("kleiner")
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Einheit</span>
                  <select
                    value={referenzForm.einheit}
                    onChange={(event) =>
                      setReferenzForm((current) => ({ ...current, einheit: event.target.value }))
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
                <span>Solltext</span>
                <input
                  value={referenzForm.soll_text}
                  onChange={(event) =>
                    setReferenzForm((current) => ({ ...current, soll_text: event.target.value }))
                  }
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
                onChange={(event) =>
                  setReferenzForm((current) => ({ ...current, bemerkung: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createReferenzMutation.isPending || !referenzForm.messwert_id}>
                {createReferenzMutation.isPending ? "Speichert..." : "Referenz anlegen"}
              </button>
              {createReferenzMutation.isError ? <p className="form-error">{createReferenzMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Referenzen zum gewählten Messwert</h3>
          {!referenzForm.messwert_id ? <p>Bitte zuerst einen Messwert auswählen.</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Referenz</th>
                  <th>Einheit</th>
                  <th>Geschlecht</th>
                  <th>Alter</th>
                  <th>Originaltext</th>
                </tr>
              </thead>
              <tbody>
                {referenzenQuery.data?.map((referenz) => (
                  <tr key={referenz.id}>
                    <td>{formatWertTyp(referenz.wert_typ)}</td>
                    <td>{formatReferenzAnzeige(referenz)}</td>
                    <td>{referenz.einheit || "—"}</td>
                    <td>{formatGeschlechtCode(referenz.geschlecht_code, "Alle Geschlechter")}</td>
                    <td>
                      {referenz.alter_min_tage !== null && referenz.alter_min_tage !== undefined
                        ? `${(referenz.alter_min_tage / 365.25).toFixed(1)} bis ${
                            referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined
                              ? (referenz.alter_max_tage / 365.25).toFixed(1)
                              : "—"
                          } Jahre`
                        : referenz.alter_max_tage !== null && referenz.alter_max_tage !== undefined
                          ? `bis ${(referenz.alter_max_tage / 365.25).toFixed(1)} Jahre`
                          : "—"}
                    </td>
                    <td>{referenz.referenz_text_original || "—"}</td>
                  </tr>
                ))}
                {referenzForm.messwert_id && !referenzenQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Noch keine Referenzen für diesen Messwert vorhanden.</td>
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
