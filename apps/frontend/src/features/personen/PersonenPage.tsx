import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { Parameter, Person, Zielbereich, ZielbereichOverride } from "../../shared/types/api";

type PersonFormState = {
  anzeigename: string;
  vollname: string;
  geburtsdatum: string;
  geschlecht_code: string;
  hinweise_allgemein: string;
};

const initialForm: PersonFormState = {
  anzeigename: "",
  vollname: "",
  geburtsdatum: "",
  geschlecht_code: "",
  hinweise_allgemein: ""
};

type OverrideFormState = {
  person_id: string;
  parameter_id: string;
  zielbereich_id: string;
  wert_typ: "numerisch" | "text";
  untere_grenze_num: string;
  obere_grenze_num: string;
  einheit: string;
  soll_text: string;
  bemerkung: string;
};

const initialOverrideForm: OverrideFormState = {
  person_id: "",
  parameter_id: "",
  zielbereich_id: "",
  wert_typ: "numerisch",
  untere_grenze_num: "",
  obere_grenze_num: "",
  einheit: "",
  soll_text: "",
  bemerkung: ""
};

export function PersonenPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PersonFormState>(initialForm);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(initialOverrideForm);

  const personenQuery = useQuery({
    queryKey: ["personen"],
    queryFn: () => apiFetch<Person[]>("/api/personen")
  });
  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });

  const zielbereicheQuery = useQuery({
    queryKey: ["zielbereiche", overrideForm.parameter_id],
    queryFn: () => apiFetch<Zielbereich[]>(`/api/parameter/${overrideForm.parameter_id}/zielbereiche`),
    enabled: Boolean(overrideForm.parameter_id)
  });

  const overridesQuery = useQuery({
    queryKey: ["zielbereich-overrides", overrideForm.person_id],
    queryFn: () => apiFetch<ZielbereichOverride[]>(`/api/personen/${overrideForm.person_id}/zielbereich-overrides`),
    enabled: Boolean(overrideForm.person_id)
  });

  const selectedBaseTarget = useMemo(
    () => zielbereicheQuery.data?.find((zielbereich) => zielbereich.id === overrideForm.zielbereich_id) ?? null,
    [zielbereicheQuery.data, overrideForm.zielbereich_id]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Person>("/api/personen", {
        method: "POST",
        body: JSON.stringify({
          anzeigename: form.anzeigename,
          vollname: form.vollname || null,
          geburtsdatum: form.geburtsdatum,
          geschlecht_code: form.geschlecht_code || null,
          hinweise_allgemein: form.hinweise_allgemein || null
        })
      }),
    onSuccess: async () => {
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["personen"] });
    }
  });

  const createOverrideMutation = useMutation({
    mutationFn: () =>
      apiFetch<ZielbereichOverride>(`/api/personen/${overrideForm.person_id}/zielbereich-overrides`, {
        method: "POST",
        body: JSON.stringify({
          zielbereich_id: overrideForm.zielbereich_id,
          untere_grenze_num:
            overrideForm.wert_typ === "numerisch" && overrideForm.untere_grenze_num
              ? Number(overrideForm.untere_grenze_num)
              : null,
          obere_grenze_num:
            overrideForm.wert_typ === "numerisch" && overrideForm.obere_grenze_num
              ? Number(overrideForm.obere_grenze_num)
              : null,
          einheit:
            overrideForm.wert_typ === "numerisch"
              ? overrideForm.einheit || selectedBaseTarget?.einheit || null
              : null,
          soll_text: overrideForm.wert_typ === "text" ? overrideForm.soll_text || null : null,
          bemerkung: overrideForm.bemerkung || null
        })
      }),
    onSuccess: async () => {
      setOverrideForm((current) => ({
        ...initialOverrideForm,
        person_id: current.person_id,
        parameter_id: current.parameter_id
      }));
      await queryClient.invalidateQueries({ queryKey: ["zielbereich-overrides", overrideForm.person_id] });
    }
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Erster Durchstich</span>
        <h2>Personen</h2>
        <p>Personen können jetzt tatsächlich angelegt und wieder aus der lokalen API gelesen werden.</p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Neue Person</h3>
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
              <span>Vollname</span>
              <input
                value={form.vollname}
                onChange={(event) => setForm((current) => ({ ...current, vollname: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Geburtsdatum</span>
              <input
                required
                type="date"
                value={form.geburtsdatum}
                onChange={(event) => setForm((current) => ({ ...current, geburtsdatum: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Geschlecht</span>
              <input
                value={form.geschlecht_code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, geschlecht_code: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Hinweise</span>
              <textarea
                rows={4}
                value={form.hinweise_allgemein}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hinweise_allgemein: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Speichert..." : "Person anlegen"}
              </button>
              {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Vorhandene Personen</h3>
          {personenQuery.isLoading ? <p>Lädt...</p> : null}
          {personenQuery.isError ? <p className="form-error">{personenQuery.error.message}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Anzeigename</th>
                  <th>Geburtsdatum</th>
                  <th>Geschlecht</th>
                </tr>
              </thead>
              <tbody>
                {personenQuery.data?.map((person) => (
                  <tr key={person.id}>
                    <td>{person.anzeigename}</td>
                    <td>{person.geburtsdatum}</td>
                    <td>{person.geschlecht_code || "—"}</td>
                  </tr>
                ))}
                {!personenQuery.data?.length ? (
                  <tr>
                    <td colSpan={3}>Noch keine Personen vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Personenspezifischer Zielbereich</h3>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createOverrideMutation.mutate();
            }}
          >
            <label className="field">
              <span>Person</span>
              <select
                required
                value={overrideForm.person_id}
                onChange={(event) =>
                  setOverrideForm((current) => ({
                    ...current,
                    person_id: event.target.value
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
              <span>Parameter</span>
              <select
                required
                value={overrideForm.parameter_id}
                onChange={(event) =>
                  setOverrideForm((current) => ({
                    ...current,
                    parameter_id: event.target.value,
                    zielbereich_id: "",
                    wert_typ: "numerisch",
                    untere_grenze_num: "",
                    obere_grenze_num: "",
                    einheit: "",
                    soll_text: ""
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
              <span>Allgemeiner Zielbereich</span>
              <select
                required
                value={overrideForm.zielbereich_id}
                onChange={(event) => {
                  const selected = zielbereicheQuery.data?.find((item) => item.id === event.target.value);
                  setOverrideForm((current) => ({
                    ...current,
                    zielbereich_id: event.target.value,
                    wert_typ: (selected?.wert_typ as "numerisch" | "text") ?? current.wert_typ,
                    einheit: selected?.einheit ?? "",
                    soll_text: selected?.soll_text ?? ""
                  }));
                }}
              >
                <option value="">Bitte wählen</option>
                {zielbereicheQuery.data?.map((zielbereich) => (
                  <option key={zielbereich.id} value={zielbereich.id}>
                    {zielbereich.wert_typ === "numerisch"
                      ? `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`
                      : zielbereich.soll_text || "Text-Zielbereich"}
                  </option>
                ))}
              </select>
            </label>

            {overrideForm.wert_typ === "numerisch" ? (
              <>
                <label className="field">
                  <span>Eigene untere Grenze</span>
                  <input
                    type="number"
                    step="any"
                    value={overrideForm.untere_grenze_num}
                    onChange={(event) =>
                      setOverrideForm((current) => ({ ...current, untere_grenze_num: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Eigene obere Grenze</span>
                  <input
                    type="number"
                    step="any"
                    value={overrideForm.obere_grenze_num}
                    onChange={(event) =>
                      setOverrideForm((current) => ({ ...current, obere_grenze_num: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Einheit</span>
                  <input
                    value={overrideForm.einheit}
                    onChange={(event) =>
                      setOverrideForm((current) => ({ ...current, einheit: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : (
              <label className="field field--full">
                <span>Eigener Solltext</span>
                <input
                  value={overrideForm.soll_text}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, soll_text: event.target.value }))}
                />
              </label>
            )}

            <label className="field field--full">
              <span>Bemerkung</span>
              <textarea
                rows={3}
                value={overrideForm.bemerkung}
                onChange={(event) => setOverrideForm((current) => ({ ...current, bemerkung: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  createOverrideMutation.isPending || !overrideForm.person_id || !overrideForm.zielbereich_id
                }
              >
                {createOverrideMutation.isPending ? "Speichert..." : "Override anlegen"}
              </button>
              {createOverrideMutation.isError ? (
                <p className="form-error">{createOverrideMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>Overrides zur gewählten Person</h3>
          {!overrideForm.person_id ? <p>Bitte zuerst eine Person auswählen.</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Allgemein</th>
                  <th>Personenspezifisch</th>
                  <th>Bemerkung</th>
                </tr>
              </thead>
              <tbody>
                {overridesQuery.data?.map((override) => (
                  <tr key={override.id}>
                    <td>{override.parameter_anzeigename}</td>
                    <td>
                      {override.wert_typ === "numerisch"
                        ? `${override.basis_untere_grenze_num ?? "—"} bis ${override.basis_obere_grenze_num ?? "—"} ${override.basis_einheit ?? ""}`.trim()
                        : override.basis_soll_text || "—"}
                    </td>
                    <td>
                      {override.wert_typ === "numerisch"
                        ? `${override.untere_grenze_num ?? "—"} bis ${override.obere_grenze_num ?? "—"} ${override.einheit ?? ""}`.trim()
                        : override.soll_text || "—"}
                    </td>
                    <td>{override.bemerkung || "—"}</td>
                  </tr>
                ))}
                {overrideForm.person_id && !overridesQuery.data?.length ? (
                  <tr>
                    <td colSpan={4}>Noch keine Zielbereichs-Overrides für diese Person vorhanden.</td>
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
