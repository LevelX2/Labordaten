import { useState } from "react";

type SelectionOption = {
  id: string;
  label: string;
  meta?: string | null;
};

type SelectionChecklistProps = {
  label: string;
  options: SelectionOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  emptyText?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export function SelectionChecklist({
  label,
  options,
  selectedIds,
  onChange,
  emptyText = "Noch keine Einträge vorhanden.",
  collapsible = false,
  defaultExpanded = true
}: SelectionChecklistProps) {
  const selectedCount = selectedIds.filter((id) => options.some((option) => option.id === id)).length;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || selectedCount > 0);

  return (
    <div className="field field--full">
      <span>{label}</span>
      <div className="selection-checklist">
        <div className="selection-checklist__toolbar">
          <p>
            {selectedCount} von {options.length} ausgewählt
          </p>
          <div className="selection-checklist__actions">
            {collapsible ? (
              <button type="button" onClick={() => setIsExpanded((current) => !current)}>
                {isExpanded ? "Liste einklappen" : "Liste aufklappen"}
              </button>
            ) : null}
            <button type="button" onClick={() => onChange(options.map((option) => option.id))} disabled={!options.length}>
              Alle auswählen
            </button>
            <button type="button" onClick={() => onChange([])} disabled={!selectedIds.length}>
              Alle abwählen
            </button>
          </div>
        </div>

        {options.length && isExpanded ? (
          <div className="selection-checklist__options">
            {options.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`selection-checklist__option${checked ? " selection-checklist__option--selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selectedIds, option.id]
                          : selectedIds.filter((item) => item !== option.id)
                      )
                    }
                  />
                  <span>
                    <strong>{option.label}</strong>
                    {option.meta ? <small>{option.meta}</small> : null}
                  </span>
                </label>
              );
            })}
          </div>
        ) : options.length ? (
          <p className="selection-checklist__empty">Liste eingeklappt. Bei Bedarf aufklappen.</p>
        ) : (
          <p className="selection-checklist__empty">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
