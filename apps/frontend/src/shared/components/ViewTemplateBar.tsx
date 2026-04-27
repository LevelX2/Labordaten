import type { AnsichtVorlage } from "../types/api";

type ViewTemplateBarProps = {
  templates: AnsichtVorlage[];
  selectedTemplateId: string;
  hasUnsavedChanges: boolean;
  isPending?: boolean;
  onSelect: (templateId: string) => void;
  onSave: () => void;
  onSaveAs: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

function askForTemplateName(message: string, initialValue = ""): string | null {
  const value = window.prompt(message, initialValue);
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function ViewTemplateBar({
  templates,
  selectedTemplateId,
  hasUnsavedChanges,
  isPending = false,
  onSelect,
  onSave,
  onSaveAs,
  onRename,
  onDelete
}: ViewTemplateBarProps) {
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  return (
    <div className="view-template-bar">
      <label className="view-template-bar__select">
        <span>Vorlage</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => onSelect(event.target.value)}
          disabled={isPending}
        >
          <option value="">Keine Vorlage</option>
          {templates.map((template) => (
            <option value={template.id} key={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <div className="view-template-bar__actions">
        <button
          type="button"
          className="inline-button"
          disabled={isPending || !selectedTemplateId}
          onClick={onSave}
        >
          Speichern
        </button>
        <button
          type="button"
          className="inline-button"
          disabled={isPending}
          onClick={() => {
            const name = askForTemplateName("Name der neuen Vorlage");
            if (name) {
              onSaveAs(name);
            }
          }}
        >
          Speichern unter
        </button>
        <button
          type="button"
          className="inline-button"
          disabled={isPending || !selectedTemplate}
          onClick={() => {
            const name = askForTemplateName("Neuer Vorlagenname", selectedTemplate?.name ?? "");
            if (name) {
              onRename(name);
            }
          }}
        >
          Umbenennen
        </button>
        <button
          type="button"
          className="inline-button"
          disabled={isPending || !selectedTemplate}
          onClick={() => {
            if (window.confirm("Diese Vorlage löschen?")) {
              onDelete();
            }
          }}
        >
          Löschen
        </button>
      </div>

      <span className={`view-template-bar__status${hasUnsavedChanges ? " view-template-bar__status--dirty" : ""}`}>
        {selectedTemplate ? (hasUnsavedChanges ? "Ungespeicherte Änderungen" : "Gespeichert") : "Nicht gespeichert"}
      </span>
    </div>
  );
}
