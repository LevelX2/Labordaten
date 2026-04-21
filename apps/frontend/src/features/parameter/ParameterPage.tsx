import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { Parameter, ParameterAlias, Zielbereich } from "../../shared/types/api";

type ParameterFormState = {
  interner_schluessel: string;
  anzeigename: string;
  standard_einheit: string;
  wert_typ_standard: string;
  beschreibung: string;
};

const initialForm: ParameterFormState = {
  interner_schluessel: "",
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

type ZielbereichFormState = {
  parameter_id: string;
  wert_typ: "numerisch" | "text";
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

export function ParameterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ParameterFormState>(initialForm);
  const [aliasForm, setAliasForm] = useState<ParameterAliasFormState>(initialAliasForm);
  const [zielbereichForm, setZielbereichForm] = useState<ZielbereichFormState>(initialZielbereichForm);

  const parameterQuery = useQuery({
    queryKey: ["parameter"],
    queryFn: () => apiFetch<Parameter[]>("/api/parameter")
  });

  const selectedParameter = useMemo(
    () => parameterQuery.data?.find((parameter) => parameter.id === zielbereichForm.parameter_id) ?? null,
    [parameterQuery.data, zielbereichForm.parameter_id]
  );

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
        body: JSON.stringify({
          wert_typ: zielbereichForm.wert_typ,
          untere_grenze_num:
            zielbereichForm.wert_typ === "numerisch" && zielbereichForm.untere_grenze_num
              ? Number(zielbereichForm.untere_grenze_num)
              : null,
          obere_grenze_num:
            zielbereichForm.wert_typ === "numerisch" && zielbereichForm.obere_grenze_num
              ? Number(zielbereichForm.obere_grenze_num)
              : null,
          einheit:
            zielbereichForm.wert_typ === "numerisch"
              ? zielbereichForm.einheit || selectedParameter?.standard_einheit || null
              : null,
          soll_text: zielbereichForm.wert_typ === "text" ? zielbereichForm.soll_text || null : null,
          geschlecht_code: zielbereichForm.geschlecht_code || null,
          bemerkung: zielbereichForm.bemerkung || null
        })
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
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="field">
              <span>Interner Schlüssel</span>
              <input
                required
                value={form.interner_schluessel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, interner_schluessel: event.target.value }))
                }
              />
            </label>

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
                  setForm((current) => ({ ...current, wert_typ_standard: event.target.value }))
                }
              >
                <option value="numerisch">numerisch</option>
                <option value="text">text</option>
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
                {parameterQuery.data?.map((parameter) => (
                  <tr key={parameter.id}>
                    <td>{parameter.interner_schluessel}</td>
                    <td>{parameter.anzeigename}</td>
                    <td>{parameter.wert_typ_standard}</td>
                    <td>{parameter.standard_einheit || "—"}</td>
                  </tr>
                ))}
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
                    wert_typ: event.target.value as "numerisch" | "text",
                    untere_grenze_num: "",
                    obere_grenze_num: "",
                    soll_text: ""
                  }))
                }
              >
                <option value="numerisch">numerisch</option>
                <option value="text">text</option>
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
              <input
                value={zielbereichForm.geschlecht_code}
                onChange={(event) =>
                  setZielbereichForm((current) => ({ ...current, geschlecht_code: event.target.value }))
                }
              />
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
                    <td>{zielbereich.wert_typ}</td>
                    <td>
                      {zielbereich.wert_typ === "numerisch"
                        ? `${zielbereich.untere_grenze_num ?? "—"} bis ${zielbereich.obere_grenze_num ?? "—"}`
                        : zielbereich.soll_text || "—"}
                    </td>
                    <td>{zielbereich.einheit || "—"}</td>
                    <td>{zielbereich.geschlecht_code || "alle"}</td>
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
