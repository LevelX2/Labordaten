import { useState } from "react";

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

type TemplateEditorMode = "saveAs" | "rename" | null;

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
  const [editorMode, setEditorMode] = useState<TemplateEditorMode>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openEditor = (mode: Exclude<TemplateEditorMode, null>) => {
    setConfirmDelete(false);
    setEditorMode(mode);
    setDraftName(mode === "rename" ? (selectedTemplate?.name ?? "") : "");
  };

  const closeEditor = () => {
    setEditorMode(null);
    setDraftName("");
  };

  const submitEditor = () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      return;
    }
    if (editorMode === "rename") {
      onRename(trimmedName);
    } else {
      onSaveAs(trimmedName);
    }
    closeEditor();
  };

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
          onClick={() => openEditor("saveAs")}
        >
          Speichern unter
        </button>
        <button
          type="button"
          className="inline-button"
          disabled={isPending || !selectedTemplate}
          onClick={() => openEditor("rename")}
        >
          Umbenennen
        </button>
        <button
          type="button"
          className="inline-button"
          disabled={isPending || !selectedTemplate}
          onClick={() => {
            closeEditor();
            setConfirmDelete(true);
          }}
        >
          Löschen
        </button>
      </div>

      <span className={`view-template-bar__status${hasUnsavedChanges ? " view-template-bar__status--dirty" : ""}`}>
        {selectedTemplate ? (hasUnsavedChanges ? "Ungespeicherte Änderungen" : "Gespeichert") : "Nicht gespeichert"}
      </span>

      {editorMode ? (
        <form
          className="view-template-bar__editor"
          onSubmit={(event) => {
            event.preventDefault();
            submitEditor();
          }}
        >
          <label className="view-template-bar__name-field">
            <span>{editorMode === "rename" ? "Vorlage umbenennen" : "Neue Vorlage"}</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              autoFocus
              disabled={isPending}
            />
          </label>
          <div className="view-template-bar__editor-actions">
            <button type="submit" className="inline-button" disabled={isPending || !draftName.trim()}>
              {editorMode === "rename" ? "Umbenennen" : "Anlegen"}
            </button>
            <button type="button" className="inline-button" onClick={closeEditor} disabled={isPending}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}

      {confirmDelete && selectedTemplate ? (
        <div className="view-template-bar__confirm">
          <span>Vorlage „{selectedTemplate.name}“ löschen?</span>
          <div className="view-template-bar__editor-actions">
            <button
              type="button"
              className="inline-button"
              disabled={isPending}
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
            >
              Löschen
            </button>
            <button
              type="button"
              className="inline-button"
              disabled={isPending}
              onClick={() => setConfirmDelete(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
