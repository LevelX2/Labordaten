import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api/client";
import { LoeschAktionPanel } from "./LoeschAktionPanel";
import type {
  Einheit,
  EinheitAlias,
  EinheitAliasCreatePayload,
  EinheitCreatePayload
} from "../types/api";

type EinheitenPflegeCardProps = {
  title?: string;
  className?: string;
};

type AliasFormState = {
  alias_text: string;
  bemerkung: string;
};

const initialAliasForm: AliasFormState = {
  alias_text: "",
  bemerkung: ""
};

export function EinheitenPflegeCard({
  title = "Einheiten",
  className = "card"
}: EinheitenPflegeCardProps) {
  const queryClient = useQueryClient();
  const [kuerzel, setKuerzel] = useState("");
  const [aliasForm, setAliasForm] = useState<AliasFormState>(initialAliasForm);
  const [selectedEinheitId, setSelectedEinheitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoeschpruefung, setShowLoeschpruefung] = useState(false);

  const einheitenQuery = useQuery({
    queryKey: ["einheiten"],
    queryFn: () => apiFetch<Einheit[]>("/api/einheiten")
  });

  const sortedEinheiten = useMemo(
    () =>
      [...(einheitenQuery.data ?? [])].sort((left, right) =>
        left.kuerzel.localeCompare(right.kuerzel, "de-DE", { sensitivity: "base" })
      ),
    [einheitenQuery.data]
  );

  const filteredEinheiten = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("de-DE");
    if (!normalizedSearch) {
      return sortedEinheiten;
    }

    return sortedEinheiten.filter((einheit) => {
      const aliasMatch = einheit.aliase.some((alias) =>
        alias.alias_text.toLocaleLowerCase("de-DE").includes(normalizedSearch)
      );
      return einheit.kuerzel.toLocaleLowerCase("de-DE").includes(normalizedSearch) || aliasMatch;
    });
  }, [searchTerm, sortedEinheiten]);

  const selectedEinheit = useMemo(
    () => sortedEinheiten.find((einheit) => einheit.id === selectedEinheitId) ?? null,
    [selectedEinheitId, sortedEinheiten]
  );

  const aliasCount = useMemo(
    () => sortedEinheiten.reduce((sum, einheit) => sum + einheit.aliase.length, 0),
    [sortedEinheiten]
  );

  useEffect(() => {
    if (!sortedEinheiten.length) {
      setSelectedEinheitId(null);
      setShowLoeschpruefung(false);
      return;
    }

    const selectionStillExists = sortedEinheiten.some((einheit) => einheit.id === selectedEinheitId);
    if (!selectedEinheitId || !selectionStillExists) {
      setSelectedEinheitId(sortedEinheiten[0].id);
      setShowLoeschpruefung(false);
    }
  }, [selectedEinheitId, sortedEinheiten]);

  useEffect(() => {
    setAliasForm(initialAliasForm);
  }, [selectedEinheitId]);

  const createEinheitMutation = useMutation({
    mutationFn: () =>
      apiFetch<Einheit>("/api/einheiten", {
        method: "POST",
        body: JSON.stringify({
          kuerzel
        } satisfies EinheitCreatePayload)
      }),
    onSuccess: async (createdEinheit) => {
      setKuerzel("");
      setSearchTerm("");
      setShowLoeschpruefung(false);
      await queryClient.invalidateQueries({ queryKey: ["einheiten"] });
      setSelectedEinheitId(createdEinheit.id);
    }
  });

  const createAliasMutation = useMutation({
    mutationFn: () => {
      if (!selectedEinheit) {
        throw new Error("Bitte zuerst eine Einheit auswählen.");
      }

      return apiFetch<EinheitAlias>(`/api/einheiten/${selectedEinheit.id}/aliase`, {
        method: "POST",
        body: JSON.stringify({
          alias_text: aliasForm.alias_text,
          bemerkung: aliasForm.bemerkung || null
        } satisfies EinheitAliasCreatePayload)
      });
    },
    onSuccess: async () => {
      setAliasForm(initialAliasForm);
      await queryClient.invalidateQueries({ queryKey: ["einheiten"] });
    }
  });

  return (
    <article className={className}>
      <div className="unit-care__header">
        <div>
          <h3>{title}</h3>
          <p>
            Eine Einheit hat eine führende Schreibweise. Abweichende Labor-Schreibweisen werden als Aliase genau
            dieser Einheit zugeordnet.
          </p>
        </div>
        <div className="unit-care__stats" aria-label="Einheitenbestand">
          <span className="parameter-pill parameter-pill--accent">{sortedEinheiten.length} Einheiten</span>
          <span className="parameter-pill">{aliasCount} Aliase</span>
        </div>
      </div>

      {einheitenQuery.isLoading ? <p>Lädt...</p> : null}
      {einheitenQuery.isError ? <p className="form-error">{einheitenQuery.error.message}</p> : null}

      <div className="unit-workspace">
        <aside className="unit-sidebar" aria-label="Einheiten auswählen oder neu anlegen">
          <form
            className="unit-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              createEinheitMutation.mutate();
            }}
          >
            <label className="field">
              <span>Neue führende Einheit</span>
              <input value={kuerzel} onChange={(event) => setKuerzel(event.target.value)} placeholder="z. B. ng/ml" />
              <small>Nur echte Einheiten anlegen. Andere Schreibweisen kommen rechts als Alias dazu.</small>
            </label>

            <div className="form-actions">
              <button type="submit" disabled={createEinheitMutation.isPending || !kuerzel.trim()}>
                {createEinheitMutation.isPending ? "Speichert..." : "Einheit anlegen"}
              </button>
              {createEinheitMutation.isError ? (
                <p className="form-error">{createEinheitMutation.error.message}</p>
              ) : null}
            </div>
          </form>

          <label className="field">
            <span>Bestand durchsuchen</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Einheit oder Alias suchen"
            />
          </label>

          <div className="unit-list" role="list">
            {filteredEinheiten.map((einheit) => (
              <button
                key={einheit.id}
                type="button"
                className={`unit-list__item ${einheit.id === selectedEinheitId ? "unit-list__item--selected" : ""}`}
                onClick={() => {
                  setSelectedEinheitId(einheit.id);
                  setShowLoeschpruefung(false);
                }}
              >
                <span className="unit-list__main">
                  <strong>{einheit.kuerzel}</strong>
                  <small>
                    {einheit.aliase.length
                      ? `${einheit.aliase.length} Alias-Schreibweisen`
                      : "Noch keine Aliase"}
                  </small>
                </span>
                <span className={`parameter-pill ${einheit.aktiv ? "parameter-pill--accent" : ""}`}>
                  {einheit.aktiv ? "Aktiv" : "Inaktiv"}
                </span>
              </button>
            ))}
            {!filteredEinheiten.length ? (
              <div className="parameter-list__empty">
                <p>Keine passende Einheit gefunden.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="unit-detail" aria-live="polite">
          {selectedEinheit ? (
            <>
              <div className="parameter-detail__header">
                <div>
                  <h3 className="parameter-detail__title">{selectedEinheit.kuerzel}</h3>
                  <p>Kanonische Schreibweise für Import, Messwerte und manuelle Erfassung.</p>
                </div>
                <div className="parameter-header-controls">
                  <span className={`parameter-pill ${selectedEinheit.aktiv ? "parameter-pill--accent" : ""}`}>
                    {selectedEinheit.aktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                  <span className="parameter-pill">
                    {selectedEinheit.aliase.length === 1
                      ? "1 Alias"
                      : `${selectedEinheit.aliase.length} Aliase`}
                  </span>
                </div>
              </div>

              <section className="unit-detail__section">
                <div className="unit-detail__section-header">
                  <div>
                    <h4>Alias-Schreibweisen</h4>
                    <p>Varianten, die fachlich auf {selectedEinheit.kuerzel} zeigen.</p>
                  </div>
                </div>

                {selectedEinheit.aliase.length ? (
                  <div className="unit-alias-list">
                    {selectedEinheit.aliase.map((alias) => (
                      <div key={alias.id} className="unit-alias-list__item">
                        <strong>{alias.alias_text}</strong>
                        {alias.bemerkung ? <small>{alias.bemerkung}</small> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="parameter-list__empty">
                    <p>Noch keine Alias-Schreibweisen hinterlegt.</p>
                  </div>
                )}
              </section>

              <section className="unit-detail__section">
                <div className="unit-detail__section-header">
                  <div>
                    <h4>Schreibweise derselben Einheit ergänzen</h4>
                    <p>Beispiele: Groß-/Kleinschreibung, Unicode-Varianten oder Labor-Schreibweisen.</p>
                  </div>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createAliasMutation.mutate();
                  }}
                >
                  <label className="field">
                    <span>Alias</span>
                    <input
                      required
                      value={aliasForm.alias_text}
                      onChange={(event) =>
                        setAliasForm((current) => ({ ...current, alias_text: event.target.value }))
                      }
                      placeholder="z. B. mg/L"
                    />
                  </label>

                  <label className="field field--full">
                    <span>Bemerkung</span>
                    <textarea
                      rows={3}
                      value={aliasForm.bemerkung}
                      onChange={(event) =>
                        setAliasForm((current) => ({ ...current, bemerkung: event.target.value }))
                      }
                      placeholder="Optionaler Hinweis zur Schreibweise"
                    />
                  </label>

                  <div className="form-actions">
                    <button
                      type="submit"
                      disabled={createAliasMutation.isPending || !selectedEinheit || !aliasForm.alias_text.trim()}
                    >
                      {createAliasMutation.isPending ? "Speichert..." : `Alias für ${selectedEinheit.kuerzel} anlegen`}
                    </button>
                    {createAliasMutation.isError ? (
                      <p className="form-error">{createAliasMutation.error.message}</p>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="unit-detail__section unit-detail__section--subtle">
                <div className="unit-detail__section-header">
                  <div>
                    <h4>Löschen oder deaktivieren</h4>
                    <p>Die Prüfung zeigt, ob die Einheit schon verwendet wird und welche Aktion fachlich sicher ist.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-button"
                    onClick={() => setShowLoeschpruefung((current) => !current)}
                  >
                    {showLoeschpruefung ? "Prüfung ausblenden" : "Prüfung öffnen"}
                  </button>
                </div>

                {showLoeschpruefung ? (
                  <LoeschAktionPanel
                    entitaetTyp="einheit"
                    entitaetId={selectedEinheit.id}
                    title="Löschprüfung für diese Einheit"
                    emptyText="Bitte zuerst eine Einheit auswählen."
                    className="unit-delete-panel"
                    onClose={() => setShowLoeschpruefung(false)}
                    invalidateQueryKeys={[["einheiten"], ["parameter"], ["messwerte"]]}
                  />
                ) : null}
              </section>
            </>
          ) : (
            <div className="parameter-list__empty">
              <p>Lege links eine Einheit an oder wähle eine vorhandene Einheit aus.</p>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
