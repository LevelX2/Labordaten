import type { Dispatch, SetStateAction } from "react";

import { DateRangeFilterFields } from "../../shared/components/DateRangeFilterFields";
import { SelectionChecklist } from "../../shared/components/SelectionChecklist";
import { ViewTemplateBar } from "../../shared/components/ViewTemplateBar";
import { PARAMETER_KLASSIFIKATION_OPTIONS } from "../../shared/constants/fieldOptions";
import type { AnsichtVorlage, Gruppe, Labor, Parameter, ParameterKlassifikationCode, Person } from "../../shared/types/api";
import { diagrammDarstellungOptions, initialForm, vertikalachsenModusOptions } from "./auswertungConfig";
import type { AuswertungFormState, VertikalachsenModus } from "./auswertungTypes";

export function AuswertungTemplatesPanel({
  templates,
  selectedTemplateId,
  selectedTemplateName,
  hasUnsavedTemplateChanges,
  isPending,
  templateWarning,
  templateError,
  onClose,
  onSelect,
  onSave,
  onSaveAs,
  onRename,
  onDelete
}: {
  templates: AnsichtVorlage[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  hasUnsavedTemplateChanges: boolean;
  isPending: boolean;
  templateWarning: string | null;
  templateError: Error | null;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  onSave: () => void;
  onSaveAs: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <article className="card card--soft parameter-action-panel">
      <div className="parameter-panel__header">
        <div>
          <h3>Auswertungsvorlagen</h3>
          <p>
            {selectedTemplateName}
            {hasUnsavedTemplateChanges ? " • geändert" : ""}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Panel Auswertungsvorlagen schließen"
          title="Panel Auswertungsvorlagen schließen"
        >
          ×
        </button>
      </div>
      <ViewTemplateBar
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        hasUnsavedChanges={hasUnsavedTemplateChanges}
        isPending={isPending}
        onSelect={onSelect}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onRename={onRename}
        onDelete={onDelete}
      />
      {templateWarning ? <p className="form-hint">{templateWarning}</p> : null}
      {templateError ? <p className="form-error">{templateError.message}</p> : null}
    </article>
  );
}

export function AuswertungFiltersPanel({
  form,
  setForm,
  personen,
  gruppen,
  parameter,
  labore,
  isLoadBlocked,
  isLoading,
  onSubmit,
  onReset,
  onClose
}: {
  form: AuswertungFormState;
  setForm: Dispatch<SetStateAction<AuswertungFormState>>;
  personen: Person[];
  gruppen: Gruppe[];
  parameter: Parameter[];
  labore: Labor[];
  isLoadBlocked: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <article className="card card--soft parameter-action-panel">
      <div className="parameter-panel__header">
        <div>
          <h3>Auswertungsfilter</h3>
          <p>Die Auswahl steuert Diagramme, Kennzahlen und qualitative Ereignisse gemeinsam.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Panel Auswertungsfilter schließen"
          title="Panel Auswertungsfilter schließen"
        >
          ×
        </button>
      </div>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <SelectionChecklist
          label="Personen"
          options={personen.map((person) => ({
            id: person.id,
            label: person.anzeigename
          }))}
          selectedIds={form.person_ids}
          onChange={(person_ids) => setForm((current) => ({ ...current, person_ids }))}
          emptyText="Noch keine Personen vorhanden."
          collapsible
        />

        <SelectionChecklist
          label="Parametergruppen"
          options={gruppen.map((gruppe) => ({
            id: gruppe.id,
            label: gruppe.name,
            meta: gruppe.beschreibung
          }))}
          selectedIds={form.gruppen_ids}
          onChange={(gruppen_ids) => setForm((current) => ({ ...current, gruppen_ids }))}
          emptyText="Noch keine Parametergruppen vorhanden."
          collapsible
          defaultExpanded={false}
          compactWhenEmptyCollapsed
        />

        <SelectionChecklist
          label="Parameter"
          options={parameter.map((item) => ({
            id: item.id,
            label: item.anzeigename,
            meta: item.standard_einheit
          }))}
          selectedIds={form.laborparameter_ids}
          onChange={(laborparameter_ids) => setForm((current) => ({ ...current, laborparameter_ids }))}
          emptyText="Noch keine Parameter vorhanden."
          collapsible
          defaultExpanded={false}
          searchable
          searchPlaceholder="Parameter filtern"
          showSelectedOnlyToggle
          selectedOnlyLabel="Nur ausgewählte anzeigen"
          compactWhenEmptyCollapsed
        />

        <SelectionChecklist
          label="KSG-Klassen"
          options={PARAMETER_KLASSIFIKATION_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label
          }))}
          selectedIds={form.klassifikationen}
          onChange={(klassifikationen) =>
            setForm((current) => ({ ...current, klassifikationen: klassifikationen as ParameterKlassifikationCode[] }))
          }
          emptyText="Keine KSG-Klassen verfügbar."
          collapsible
          defaultExpanded={false}
          compactWhenEmptyCollapsed
        />

        <SelectionChecklist
          label="Labore"
          options={labore.map((labor) => ({
            id: labor.id,
            label: labor.name
          }))}
          selectedIds={form.labor_ids}
          onChange={(labor_ids) => setForm((current) => ({ ...current, labor_ids }))}
          emptyText="Noch keine Labore vorhanden."
          collapsible
          defaultExpanded={false}
          compactWhenEmptyCollapsed
        />

        <DateRangeFilterFields
          fromValue={form.datum_von}
          toValue={form.datum_bis}
          fallbackFromValue={initialForm.datum_von}
          fallbackToValue={initialForm.datum_bis}
          onFromChange={(datum_von) => setForm((current) => ({ ...current, datum_von }))}
          onToChange={(datum_bis) => setForm((current) => ({ ...current, datum_bis }))}
        />

        <div className="form-actions">
          <button type="button" onClick={onReset}>
            Filter zurücksetzen
          </button>
          <button type="submit" disabled={isLoadBlocked}>
            {isLoading ? "Lädt..." : "Auswertung laden"}
          </button>
        </div>
      </form>
    </article>
  );
}

export function AuswertungDisplayPanel({
  form,
  setForm,
  onClose
}: {
  form: AuswertungFormState;
  setForm: Dispatch<SetStateAction<AuswertungFormState>>;
  onClose: () => void;
}) {
  return (
    <article className="card card--soft parameter-action-panel auswertung-display-panel">
      <div className="parameter-panel__header">
        <div>
          <h3>Darstellung</h3>
          <p>Diese Einstellungen verändern nur die Ansicht der geladenen Auswertung, nicht die Filterauswahl.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Panel Darstellung schließen"
          title="Panel Darstellung schließen"
        >
          ×
        </button>
      </div>

      <div className="auswertung-display-grid">
        <div className="field field--full">
          <span>Diagrammtyp</span>
          <div className="auswertung-display-modes" role="group" aria-label="Diagrammtyp auswählen">
            {diagrammDarstellungOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`auswertung-display-mode${
                  form.diagramm_darstellung === option.value ? " auswertung-display-mode--active" : ""
                }`}
                onClick={() => setForm((current) => ({ ...current, diagramm_darstellung: option.value }))}
                aria-pressed={form.diagramm_darstellung === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Zeitraumdarstellung im Diagramm</span>
          <select
            value={form.zeitraum_darstellung}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                zeitraum_darstellung: event.target.value as AuswertungFormState["zeitraum_darstellung"]
              }))
            }
          >
            <option value="wertezeitraum">Nur Zeitraum mit Werten</option>
            <option value="selektionszeitraum">Gewählten Selektionszeitraum fest anzeigen</option>
          </select>
        </label>

        <label className="field">
          <span>Vertikaler Achsenbereich</span>
          <select
            value={form.vertikalachsen_modus}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                vertikalachsen_modus: event.target.value as VertikalachsenModus
              }))
            }
          >
            {vertikalachsenModusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Laborreferenzen anzeigen</span>
          <input
            type="checkbox"
            checked={form.include_laborreferenz}
            onChange={(event) => setForm((current) => ({ ...current, include_laborreferenz: event.target.checked }))}
          />
        </label>

        <label className="field">
          <span>Zielbereiche anzeigen</span>
          <input
            type="checkbox"
            checked={form.include_zielbereich}
            onChange={(event) => setForm((current) => ({ ...current, include_zielbereich: event.target.checked }))}
          />
        </label>

        <label className="field">
          <span>Wertetabellen standardmäßig geöffnet</span>
          <input
            type="checkbox"
            checked={form.messwerttabelle_standard_offen}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                messwerttabelle_standard_offen: event.target.checked
              }))
            }
          />
        </label>
      </div>
    </article>
  );
}
