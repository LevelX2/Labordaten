import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import { formatGeschlechtCode, formatWertTyp } from "../../shared/constants/fieldOptions";
import { formatReferenzAnzeige } from "../../shared/utils/laborFormatting";
import type {
  Gruppe,
  ImportGruppenvorschlaegeAnwendenResponse,
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
};

type DateiImportFormState = {
  file: File | null;
  person_id_override: string;
  labor_id_override: string;
  labor_name_override: string;
  entnahmedatum_override: string;
  befunddatum_override: string;
  befund_bemerkung_override: string;
  import_bemerkung: string;
  quelle_behalten: boolean;
};

type GruppenVorschlagAktion = "neu" | "vorhanden" | "ignorieren";

type GruppenVorschlagState = {
  aktion: GruppenVorschlagAktion;
  gruppe_id: string;
  gruppenname: string;
};

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

const initialForm: ImportFormState = {
  payload_json: examplePayload,
  person_id_override: "",
  bemerkung: ""
};

const initialDateiForm: DateiImportFormState = {
  file: null,
  person_id_override: "",
  labor_id_override: "",
  labor_name_override: "",
  entnahmedatum_override: "",
  befunddatum_override: "",
  befund_bemerkung_override: "",
  import_bemerkung: "",
  quelle_behalten: true
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
  if (!parameterId) {
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

function buildDefaultImportRemark(args: {
  filename?: string;
  personName?: string | null;
  laborName?: string | null;
  entnahmedatum?: string;
}): string {
  if (!args.filename) {
    return "";
  }

  const parts = [`Import aus Datei ${args.filename}`];
  if (args.personName) {
    parts.push(`für ${args.personName}`);
  }
  if (args.entnahmedatum) {
    parts.push(`mit Entnahmedatum ${args.entnahmedatum}`);
  }
  if (args.laborName) {
    parts.push(`Labor ${args.laborName}`);
  }
  return parts.join(" · ");
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

export function ImportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ImportFormState>(initialForm);
  const [dateiForm, setDateiForm] = useState<DateiImportFormState>(initialDateiForm);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [mappingState, setMappingState] = useState<Record<number, string>>({});
  const [aliasState, setAliasState] = useState<Record<number, boolean>>({});
  const [gruppenState, setGruppenState] = useState<Record<number, GruppenVorschlagState>>({});
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);

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
      setSelectedImportId(importsQuery.data[0].id);
    }
  }, [importsQuery.data, selectedImportId]);

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
  const selectedLaborName = laborById.get(dateiForm.labor_id_override)?.name ?? null;
  const manualLaborName = dateiForm.labor_name_override.trim() ? dateiForm.labor_name_override.trim() : null;
  const defaultImportRemark = buildDefaultImportRemark({
    filename: dateiForm.file?.name,
    personName: personById.get(dateiForm.person_id_override)?.anzeigename ?? null,
    laborName: selectedLaborName ?? manualLaborName,
    entnahmedatum: dateiForm.entnahmedatum_override
  });

  useEffect(() => {
    const nextMappings: Record<number, string> = {};
    const nextAliases: Record<number, boolean> = {};
    const nextGruppen: Record<number, GruppenVorschlagState> = {};
    selectedImportQuery.data?.messwerte.forEach((messwert) => {
      if (messwert.parameter_id) {
        nextMappings[messwert.messwert_index] = messwert.parameter_id;
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

  useEffect(() => {
    if (!defaultImportRemark) {
      return;
    }

    setDateiForm((current) => {
      if (current.import_bemerkung && current.import_bemerkung !== defaultImportRemark) {
        return current;
      }
      return { ...current, import_bemerkung: defaultImportRemark };
    });
  }, [defaultImportRemark]);

  const createDraftMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>("/api/importe/entwurf", {
        method: "POST",
        body: JSON.stringify({
          payload_json: form.payload_json,
          person_id_override: form.person_id_override || null,
          bemerkung: form.bemerkung || null
        })
      }),
    onSuccess: async (detail) => {
      setSelectedImportId(detail.id);
      await queryClient.invalidateQueries({ queryKey: ["importe"] });
      await queryClient.invalidateQueries({ queryKey: ["importe", detail.id] });
    }
  });

  const createFileDraftMutation = useMutation({
    mutationFn: async () => {
      if (!dateiForm.file) {
        throw new Error("Bitte eine CSV- oder Excel-Datei auswählen.");
      }

      const formData = new FormData();
      formData.append("file", dateiForm.file);
      if (dateiForm.person_id_override) {
        formData.append("person_id_override", dateiForm.person_id_override);
      }
      if (dateiForm.labor_id_override) {
        formData.append("labor_id_override", dateiForm.labor_id_override);
      }
      if (dateiForm.labor_name_override) {
        formData.append("labor_name_override", dateiForm.labor_name_override);
      }
      if (dateiForm.entnahmedatum_override) {
        formData.append("entnahmedatum_override", dateiForm.entnahmedatum_override);
      }
      if (dateiForm.befunddatum_override) {
        formData.append("befunddatum_override", dateiForm.befunddatum_override);
      }
      if (dateiForm.befund_bemerkung_override) {
        formData.append("befund_bemerkung_override", dateiForm.befund_bemerkung_override);
      }
      if (dateiForm.import_bemerkung) {
        formData.append("import_bemerkung", dateiForm.import_bemerkung);
      }
      formData.append("quelle_behalten", String(dateiForm.quelle_behalten));

      return apiFetch<ImportVorgangDetail>("/api/importe/datei-entwurf", {
        method: "POST",
        body: formData
      });
    },
    onSuccess: async (detail) => {
      setSelectedImportId(detail.id);
      setDateiForm((current) => ({ ...initialDateiForm, person_id_override: current.person_id_override }));
      await queryClient.invalidateQueries({ queryKey: ["importe"] });
      await queryClient.invalidateQueries({ queryKey: ["importe", detail.id] });
    }
  });

  const uebernehmenMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportVorgangDetail>(`/api/importe/${selectedImportId}/uebernehmen`, {
        method: "POST",
        body: JSON.stringify({
          bestaetige_warnungen: warningsConfirmed,
          parameter_mappings: Object.entries(mappingState).map(([messwert_index, laborparameter_id]) => ({
            messwert_index: Number(messwert_index),
            laborparameter_id,
            alias_uebernehmen: Boolean(aliasState[Number(messwert_index)])
          }))
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["importe"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", detail.id] })
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gruppen"] }),
        queryClient.invalidateQueries({ queryKey: ["importe", selectedImportId] })
      ]);
    }
  });

  const selectedImport = selectedImportQuery.data;
  const hasWarnings = Boolean(selectedImport?.warnung_anzahl);

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Importprüfung</span>
        <h2>Import</h2>
        <p>
          JSON-Importe können als Entwurf angelegt werden. Zusätzlich lassen sich jetzt CSV- und Excel-Dateien mit
          Metadaten ergänzen, prüfen und erst danach bewusst übernehmen.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card card--wide">
          <h3>Dateiimport für CSV und Excel</h3>
          <p>
            Unterstützt werden tabellarische Dateien mit Spalten wie <code>Parameter</code>, <code>Wert</code>,{" "}
            <code>Einheit</code>, <code>Referenzuntere</code> und <code>Referenzobere</code>. Entnahmedatum und Person
            können hier direkt ergänzt oder überschrieben werden.
          </p>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createFileDraftMutation.mutate();
            }}
          >
            <label className="field field--full">
              <span>Datei</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xlsm"
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                }
              />
            </label>

            <label className="field">
              <span>Person</span>
              <select
                value={dateiForm.person_id_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, person_id_override: event.target.value }))
                }
              >
                <option value="">Aus Datei oder später zuordnen</option>
                {personenQuery.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.anzeigename}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Vorhandenes Labor</span>
              <select
                value={dateiForm.labor_id_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, labor_id_override: event.target.value }))
                }
              >
                <option value="">Kein festes Labor</option>
                {laboreQuery.data?.map((labor) => (
                  <option key={labor.id} value={labor.id}>
                    {labor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Laborname neu oder frei</span>
              <input
                value={dateiForm.labor_name_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, labor_name_override: event.target.value }))
                }
                placeholder="z. B. Labor XY"
              />
            </label>

            <label className="field">
              <span>Entnahmedatum</span>
              <input
                type="date"
                value={dateiForm.entnahmedatum_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, entnahmedatum_override: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Befunddatum</span>
              <input
                type="date"
                value={dateiForm.befunddatum_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, befunddatum_override: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Befundbemerkung</span>
              <input
                value={dateiForm.befund_bemerkung_override}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, befund_bemerkung_override: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Importbemerkung</span>
              <input
                value={dateiForm.import_bemerkung}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, import_bemerkung: event.target.value }))
                }
              />
            </label>

            <label className="field field--full">
              <span>Quelldatei als Dokument ablegen</span>
              <input
                type="checkbox"
                checked={dateiForm.quelle_behalten}
                onChange={(event) =>
                  setDateiForm((current) => ({ ...current, quelle_behalten: event.target.checked }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createFileDraftMutation.isPending}>
                {createFileDraftMutation.isPending ? "Analysiert..." : "Datei als Entwurf prüfen"}
              </button>
              {createFileDraftMutation.isError ? (
                <p className="form-error">{createFileDraftMutation.error.message}</p>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card">
          <h3>JSON-Entwurf anlegen</h3>
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
              <span>Import-JSON</span>
              <textarea
                rows={18}
                value={form.payload_json}
                onChange={(event) => setForm((current) => ({ ...current, payload_json: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createDraftMutation.isPending}>
                {createDraftMutation.isPending ? "Prüft..." : "Entwurf anlegen"}
              </button>
              {createDraftMutation.isError ? <p className="form-error">{createDraftMutation.error.message}</p> : null}
            </div>
          </form>
        </article>

        <article className="card">
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
                    onClick={() => setSelectedImportId(item.id)}
                    className={item.id === selectedImportId ? "row-selected" : undefined}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{item.status}</td>
                    <td>{item.quelle_typ}</td>
                    <td>{personById.get(item.person_id_vorschlag || "")?.anzeigename ?? "—"}</td>
                    <td>{item.dokument_dateiname ?? "—"}</td>
                    <td>{item.messwerte_anzahl}</td>
                    <td>{item.fehler_anzahl}</td>
                    <td>{item.warnung_anzahl}</td>
                  </tr>
                ))}
                {!importsQuery.data?.length ? (
                  <tr>
                    <td colSpan={7}>Noch keine Importentwürfe vorhanden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Prüfansicht</h3>
          {!selectedImport ? <p>Bitte einen Importentwurf auswählen.</p> : null}
          {selectedImport ? (
            <>
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
                Quelldatei: <strong>{selectedImport.dokument_dateiname ?? selectedImport.befund.dokument_dateiname ?? "—"}</strong>
              </p>
              <p>
                Dokumentpfad: <strong>{selectedImport.befund.dokument_pfad ?? "—"}</strong>
              </p>

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
                                  if (!nextValue) {
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
                            {parameterQuery.data?.map((parameter) => (
                              <option key={parameter.id} value={parameter.id}>
                                {parameter.anzeigename}
                              </option>
                            ))}
                          </select>
                          {mappingState[messwert.messwert_index]
                            ? ` (${parameterById.get(mappingState[messwert.messwert_index])?.anzeigename ?? "zugeordnet"})`
                            : ""}
                        </td>
                        <td>
                          <label className="field" style={{ minWidth: 0 }}>
                            <span>Als Alias übernehmen</span>
                            <input
                              type="checkbox"
                              checked={Boolean(aliasState[messwert.messwert_index])}
                              disabled={!mappingState[messwert.messwert_index]}
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

              {selectedImport.gruppenvorschlaege.length ? (
                <>
                  <h4>Gruppenvorschläge</h4>
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
                  </div>
                </>
              ) : null}

              <h4>Prüfpunkte</h4>
              <ul>
                {selectedImport.pruefpunkte.map((item) => (
                  <li key={item.id}>
                    <strong>{item.status}</strong>: {item.meldung}
                  </li>
                ))}
              </ul>
              {!selectedImport.pruefpunkte.length ? <p>Keine Prüfpunkte vorhanden.</p> : null}

              {hasWarnings ? (
                <label className="field field--full">
                  <span>Warnungen bewusst bestätigen</span>
                  <input
                    type="checkbox"
                    checked={warningsConfirmed}
                    onChange={(event) => setWarningsConfirmed(event.target.checked)}
                  />
                </label>
              ) : null}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => uebernehmenMutation.mutate()}
                  disabled={uebernehmenMutation.isPending || !selectedImportId}
                >
                  {uebernehmenMutation.isPending ? "Übernimmt..." : "Import übernehmen"}
                </button>
                <button
                  type="button"
                  onClick={() => verwerfenMutation.mutate()}
                  disabled={verwerfenMutation.isPending || !selectedImportId}
                >
                  {verwerfenMutation.isPending ? "Verwirft..." : "Import verwerfen"}
                </button>
              </div>
              {uebernehmenMutation.isError ? <p className="form-error">{uebernehmenMutation.error.message}</p> : null}
              {verwerfenMutation.isError ? <p className="form-error">{verwerfenMutation.error.message}</p> : null}
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
