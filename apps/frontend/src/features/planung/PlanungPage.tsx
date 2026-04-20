import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type {
  Parameter,
  Person,
  PlanungEinmalig,
  PlanungFaelligkeit,
  PlanungZyklisch
} from "../../shared/types/api";

type ZyklischFormState = {
  person_id: string;
  laborparameter_id: string;
  intervall_wert: string;
  intervall_typ: "tage" | "wochen" | "monate" | "jahre";
  startdatum: string;
  enddatum: string;
  prioritaet: string;
  karenz_tage: string;
  bemerkung: string;
};

type EinmaligFormState = {
  person_id: string;
  laborparameter_id: string;
  status: "offen" | "naechster_termin";
  zieltermin_datum: string;
  bemerkung: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialZyklischForm: ZyklischFormState = {
  person_id: "",
  laborparameter_id: "",
  intervall_wert: "6",
  intervall_typ: "monate",
  startdatum: today,
  enddatum: "",
  prioritaet: "0",
  karenz_tage: "30",
  bemerkung: ""
};

const initialEinmaligForm: EinmaligFormState = {
  person_id: "",
  laborparameter_id: "",
  status: "offen",
  zieltermin_datum: "",
  bemerkung: ""
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

export function PlanungPage() {
  const queryClient = useQueryClient();
  const [zyklischForm, setZyklischForm] = useState<ZyklischFormState>(initialZyklischForm);
  const [einmaligForm, setEinmaligForm] = useState<EinmaligFormState>(initialEinmaligForm);
  const [personFilter, setPersonFilter] = useState("");

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });
  const zyklischQuery = useQuery({
    queryKey: ["planung", "zyklisch", personFilter],
    queryFn: () =>
      apiFetch<PlanungZyklisch[]>(`/api/planung/zyklisch${personFilter ? `?person_id=${personFilter}` : ""}`)
  });
  const einmaligQuery = useQuery({
    queryKey: ["planung", "einmalig", personFilter],
    queryFn: () =>
      apiFetch<PlanungEinmalig[]>(`/api/planung/einmalig${personFilter ? `?person_id=${personFilter}` : ""}`)
  });
  const faelligkeitenQuery = useQuery({
    queryKey: ["planung", "faelligkeiten", personFilter],
    queryFn: () =>
      apiFetch<PlanungFaelligkeit[]>(
        `/api/planung/faelligkeiten${personFilter ? `?person_id=${personFilter}` : ""}`
      )
  });

  const personById = useMemo(
    () => new Map((personenQuery.data ?? []).map((person) => [person.id, person])),
    [personenQuery.data]
  );
  const parameterById = useMemo(
    () => new Map((parameterQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parameterQuery.data]
  );

  const invalidatePlanning = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["planung", "zyklisch"] }),
      queryClient.invalidateQueries({ queryKey: ["planung", "einmalig"] }),
      queryClient.invalidateQueries({ queryKey: ["planung", "faelligkeiten"] })
    ]);
  };

  const createZyklischMutation = useMutation({
    mutationFn: () =>
      apiFetch<PlanungZyklisch>("/api/planung/zyklisch", {
        method: "POST",
        body: JSON.stringify({
          person_id: zyklischForm.person_id,
          laborparameter_id: zyklischForm.laborparameter_id,
          intervall_wert: Number(zyklischForm.intervall_wert),
          intervall_typ: zyklischForm.intervall_typ,
          startdatum: zyklischForm.startdatum,
          enddatum: zyklischForm.enddatum || null,
          prioritaet: Number(zyklischForm.prioritaet),
          karenz_tage: Number(zyklischForm.karenz_tage),
          bemerkung: zyklischForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setZyklischForm(initialZyklischForm);
      await invalidatePlanning();
    }
  });

  const createEinmaligMutation = useMutation({
    mutationFn: () =>
      apiFetch<PlanungEinmalig>("/api/planung/einmalig", {
        method: "POST",
        body: JSON.stringify({
          person_id: einmaligForm.person_id,
          laborparameter_id: einmaligForm.laborparameter_id,
          status: einmaligForm.status,
          zieltermin_datum: einmaligForm.zieltermin_datum || null,
          bemerkung: einmaligForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setEinmaligForm(initialEinmaligForm);
      await invalidatePlanning();
    }
  });

  const patchZyklischMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<PlanungZyklisch>(`/api/planung/zyklisch/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: invalidatePlanning
  });

  const patchEinmaligMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<PlanungEinmalig>(`/api/planung/einmalig/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: invalidatePlanning
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Planung und Monitoring</span>
        <h2>Planung</h2>
        <p>
          Zyklische Kontrollen, Einmalvormerkungen und eine konsolidierte Vorschlagsliste greifen jetzt auf die
          vorhandenen Messwerte zurück.
        </p>
      </header>

      <div className="card">
        <div className="form-grid">
          <label className="field">
            <span>Personenfilter</span>
            <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
              <option value="">Alle Personen</option>
              {personenQuery.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.anzeigename}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="workspace-grid">
        <article className="card">
          <h3>Zyklische Planung anlegen</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createZyklischMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={zyklischForm.person_id}
                onChange={(event) => setZyklischForm((current) => ({ ...current, person_id: event.target.value }))}
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
              <span>Parameter</span>
              <select
                required
                value={zyklischForm.laborparameter_id}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, laborparameter_id: event.target.value }))
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
              <span>Intervallwert</span>
              <input
                required
                type="number"
                min="1"
                value={zyklischForm.intervall_wert}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, intervall_wert: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Intervalltyp</span>
              <select
                value={zyklischForm.intervall_typ}
                onChange={(event) =>
                  setZyklischForm((current) => ({
                    ...current,
                    intervall_typ: event.target.value as ZyklischFormState["intervall_typ"]
                  }))
                }
              >
                <option value="tage">Tage</option>
                <option value="wochen">Wochen</option>
                <option value="monate">Monate</option>
                <option value="jahre">Jahre</option>
              </select>
            </label>

            <label className="field">
              <span>Startdatum</span>
              <input
                required
                type="date"
                value={zyklischForm.startdatum}
                onChange={(event) => setZyklischForm((current) => ({ ...current, startdatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Enddatum</span>
              <input
                type="date"
                value={zyklischForm.enddatum}
                onChange={(event) => setZyklischForm((current) => ({ ...current, enddatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Priorität</span>
              <input
                type="number"
                value={zyklischForm.prioritaet}
                onChange={(event) => setZyklischForm((current) => ({ ...current, prioritaet: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Karenz in Tagen</span>
              <input
                type="number"
                min="0"
                value={zyklischForm.karenz_tage}
                onChange={(event) =>
                  setZyklischForm((current) => ({ ...current, karenz_tage: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={zyklischForm.bemerkung}
                onChange={(event) => setZyklischForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createZyklischMutation.isPending}>
                {createZyklischMutation.isPending ? "Speichert..." : "Zyklische Planung anlegen"}
              </button>
              {createZyklischMutation.isError ? (
                <p className="form-error">{createZyklischMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Einmalvormerkung anlegen</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createEinmaligMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={einmaligForm.person_id}
                onChange={(event) => setEinmaligForm((current) => ({ ...current, person_id: event.target.value }))}
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
              <span>Parameter</span>
              <select
                required
                value={einmaligForm.laborparameter_id}
                onChange={(event) =>
                  setEinmaligForm((current) => ({ ...current, laborparameter_id: event.target.value }))
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
              <span>Status</span>
              <select
                value={einmaligForm.status}
                onChange={(event) =>
                  setEinmaligForm((current) => ({
                    ...current,
                    status: event.target.value as EinmaligFormState["status"]
                  }))
                }
              >
                <option value="offen">offen</option>
                <option value="naechster_termin">für den nächsten Termin</option>
              </select>
            </label>

            <label className="field">
              <span>Zieltermin</span>
              <input
                type="date"
                value={einmaligForm.zieltermin_datum}
                onChange={(event) =>
                  setEinmaligForm((current) => ({ ...current, zieltermin_datum: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={einmaligForm.bemerkung}
                onChange={(event) => setEinmaligForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createEinmaligMutation.isPending}>
                {createEinmaligMutation.isPending ? "Speichert..." : "Einmalvormerkung anlegen"}
              </button>
              {createEinmaligMutation.isError ? (
                <p className="form-error">{createEinmaligMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Zyklische Planungen</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Intervall</th>
                  <th>Letzte Messung</th>
                  <th>Nächste Fälligkeit</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {zyklischQuery.data?.map((planung) => (
                  <tr key={planung.id}>
                    <td>{personById.get(planung.person_id)?.anzeigename ?? planung.person_id}</td>
                    <td>{parameterById.get(planung.laborparameter_id)?.anzeigename ?? planung.laborparameter_id}</td>
                    <td>{`${planung.intervall_wert} ${planung.intervall_typ}`}</td>
                    <td>{formatDate(planung.letzte_relevante_messung_datum)}</td>
                    <td>{formatDate(planung.naechste_faelligkeit)}</td>
                    <td>{planung.faelligkeitsstatus}</td>
                    <td>
                      {planung.status === "aktiv" ? (
                        <button
                          type="button"
                          onClick={() => patchZyklischMutation.mutate({ id: planung.id, status: "pausiert" })}
                        >
                          Pausieren
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => patchZyklischMutation.mutate({ id: planung.id, status: "aktiv" })}
                        >
                          Aktivieren
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!zyklischQuery.data?.length ? (
                  <tr>
                    <td colSpan={7}>Noch keine zyklischen Planungen vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {patchZyklischMutation.isError ? <p className="form-error">{patchZyklischMutation.error.message}</p> : null}
        </article>

        <article className="card">
          <h3>Einmalvormerkungen</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Status</th>
                  <th>Zieltermin</th>
                  <th>Bemerkung</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {einmaligQuery.data?.map((planung) => (
                  <tr key={planung.id}>
                    <td>{personById.get(planung.person_id)?.anzeigename ?? planung.person_id}</td>
                    <td>{parameterById.get(planung.laborparameter_id)?.anzeigename ?? planung.laborparameter_id}</td>
                    <td>{planung.status}</td>
                    <td>{formatDate(planung.zieltermin_datum)}</td>
                    <td>{planung.bemerkung || "—"}</td>
                    <td>
                      {planung.status !== "erledigt" ? (
                        <button
                          type="button"
                          onClick={() => patchEinmaligMutation.mutate({ id: planung.id, status: "erledigt" })}
                        >
                          Erledigt
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => patchEinmaligMutation.mutate({ id: planung.id, status: "offen" })}
                        >
                          Wieder öffnen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!einmaligQuery.data?.length ? (
                  <tr>
                    <td colSpan={6}>Noch keine Einmalvormerkungen vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {patchEinmaligMutation.isError ? <p className="form-error">{patchEinmaligMutation.error.message}</p> : null}
        </article>

        <article className="card">
          <h3>Fälligkeiten und Vorschlagsliste</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Person</th>
                  <th>Parameter</th>
                  <th>Status</th>
                  <th>Letzte Messung</th>
                  <th>Nächste Fälligkeit / Zieltermin</th>
                  <th>Hinweis</th>
                </tr>
              </thead>
              <tbody>
                {faelligkeitenQuery.data?.map((item) => (
                  <tr key={`${item.planung_typ}-${item.planung_id}`}>
                    <td>{item.planung_typ}</td>
                    <td>{personById.get(item.person_id)?.anzeigename ?? item.person_id}</td>
                    <td>{parameterById.get(item.laborparameter_id)?.anzeigename ?? item.laborparameter_id}</td>
                    <td>{item.status}</td>
                    <td>{formatDate(item.letzte_relevante_messung_datum)}</td>
                    <td>{formatDate(item.naechste_faelligkeit || item.zieltermin_datum)}</td>
                    <td>{item.bemerkung || item.intervall_label || "—"}</td>
                  </tr>
                ))}
                {!faelligkeitenQuery.data?.length ? (
                  <tr>
                    <td colSpan={7}>Aktuell gibt es keine fälligen oder vorgemerkten Positionen.</td>
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
