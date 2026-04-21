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
};

export function SelectionChecklist({
  label,
  options,
  selectedIds,
  onChange,
  emptyText = "Noch keine Einträge vorhanden."
}: SelectionChecklistProps) {
  const selectedCount = selectedIds.filter((id) => options.some((option) => option.id === id)).length;

  return (
    <div className="field field--full">
      <span>{label}</span>
      <div className="selection-checklist">
        <div className="selection-checklist__toolbar">
          <p>
            {selectedCount} von {options.length} ausgewählt
          </p>
          <div className="selection-checklist__actions">
            <button type="button" onClick={() => onChange(options.map((option) => option.id))} disabled={!options.length}>
              Alle auswählen
            </button>
            <button type="button" onClick={() => onChange([])} disabled={!selectedIds.length}>
              Alle abwählen
            </button>
          </div>
        </div>

        {options.length ? (
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
        ) : (
          <p className="selection-checklist__empty">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
