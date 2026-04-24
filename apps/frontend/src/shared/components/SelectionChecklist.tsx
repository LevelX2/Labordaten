import { useMemo, useState } from "react";

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
  searchable?: boolean;
  searchPlaceholder?: string;
  showSelectedOnlyToggle?: boolean;
  selectedOnlyLabel?: string;
};

function buildSelectionOptionSearchText(option: SelectionOption): string {
  return [option.label, option.meta ?? ""].join(" ").toLocaleLowerCase("de-DE");
}

export function SelectionChecklist({
  label,
  options,
  selectedIds,
  onChange,
  emptyText = "Noch keine Einträge vorhanden.",
  collapsible = false,
  defaultExpanded = true,
  searchable = false,
  searchPlaceholder,
  showSelectedOnlyToggle = false,
  selectedOnlyLabel = "Nur ausgewählte"
}: SelectionChecklistProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = options.filter((option) => selectedIdSet.has(option.id)).length;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || selectedCount > 0);
  const hasOptions = options.length > 0;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("de-DE");
  const isLocalFilterActive = normalizedSearchQuery.length > 0 || showSelectedOnly;
  const visibleOptions = useMemo(
    () =>
      options.filter((option) => {
        if (showSelectedOnly && !selectedIdSet.has(option.id)) {
          return false;
        }
        if (!normalizedSearchQuery) {
          return true;
        }
        return buildSelectionOptionSearchText(option).includes(normalizedSearchQuery);
      }),
    [normalizedSearchQuery, options, selectedIdSet, showSelectedOnly]
  );
  const actionOptions = isLocalFilterActive ? visibleOptions : options;
  const actionOptionIdSet = new Set(actionOptions.map((option) => option.id));
  const canSelectActionOptions =
    actionOptions.length > 0 && actionOptions.some((option) => !selectedIdSet.has(option.id));
  const canDeselectActionOptions =
    actionOptions.length > 0 && actionOptions.some((option) => selectedIdSet.has(option.id));
  const visibilitySummary = isLocalFilterActive ? `${visibleOptions.length} sichtbar` : null;
  const toggleHint = [visibilitySummary, isExpanded ? "Liste einklappen" : "Liste aufklappen"].filter(Boolean).join(" • ");
  const toolbarSummary = [selectedCount === options.length && options.length > 0 ? "Alle ausgewählt" : `${selectedCount} von ${options.length} ausgewählt`, visibilitySummary]
    .filter(Boolean)
    .join(" • ");
  const visibleEmptyText = showSelectedOnly
    ? normalizedSearchQuery
      ? "Keine ausgewählten Einträge passen zur Suche."
      : "Noch keine ausgewählten Einträge vorhanden."
    : normalizedSearchQuery
      ? "Keine Einträge passen zur Suche."
      : emptyText;

  return (
    <div className="field field--full">
      <span>{label}</span>
      <div className="selection-checklist">
        {collapsible ? (
          <button
            type="button"
            className={`selection-checklist__toggle${isExpanded ? " selection-checklist__toggle--open" : ""}`}
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            <span>
              <strong>{selectedCount} von {options.length} ausgewählt</strong>
              <small>{toggleHint}</small>
            </span>
            <span className="selection-checklist__chevron" aria-hidden="true">
              ▾
            </span>
          </button>
        ) : (
          <div className="selection-checklist__toolbar">
            <p>{toolbarSummary}</p>
          </div>
        )}

        {!collapsible || isExpanded ? (
          <>
            {searchable || showSelectedOnlyToggle ? (
              <div className="selection-checklist__filterbar">
                {searchable ? (
                  <div className="clearable-field">
                    <input
                      className="clearable-field__input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={searchPlaceholder ?? `${label} filtern`}
                    />
                    <button
                      type="button"
                      className="clearable-field__clear"
                      onClick={() => setSearchQuery("")}
                      aria-label={`${label}suche löschen`}
                      disabled={!searchQuery}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                {showSelectedOnlyToggle ? (
                  <div className="selection-checklist__toolbar">
                    <button
                      type="button"
                      className={`selection-checklist__filter-toggle${showSelectedOnly ? " selection-checklist__filter-toggle--active" : ""}`}
                      onClick={() => setShowSelectedOnly((current) => !current)}
                      aria-pressed={showSelectedOnly}
                      disabled={!showSelectedOnly && selectedCount === 0}
                    >
                      {selectedOnlyLabel}
                    </button>
                    <p>{toolbarSummary}</p>
                  </div>
                ) : searchable ? (
                  <p className="selection-checklist__meta">{toolbarSummary}</p>
                ) : null}
              </div>
            ) : null}
            <div className="selection-checklist__actions">
              <button
                type="button"
                onClick={() =>
                  onChange(Array.from(new Set([...selectedIds, ...actionOptions.map((option) => option.id)])))
                }
                disabled={!canSelectActionOptions}
              >
                {isLocalFilterActive ? "Sichtbare auswählen" : "Alle auswählen"}
              </button>
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => !actionOptionIdSet.has(id)))}
                disabled={!canDeselectActionOptions}
              >
                {isLocalFilterActive ? "Sichtbare abwählen" : "Alle abwählen"}
              </button>
            </div>
          </>
        ) : null}

        {hasOptions && isExpanded && visibleOptions.length > 0 ? (
          <div className="selection-checklist__options">
            {visibleOptions.map((option) => {
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
                          ? Array.from(new Set([...selectedIds, option.id]))
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
        ) : hasOptions ? (
          <p className="selection-checklist__empty">Liste eingeklappt. Bei Bedarf aufklappen.</p>
        ) : (
          <p className="selection-checklist__empty">{emptyText}</p>
        )}
        {hasOptions && isExpanded && visibleOptions.length === 0 ? (
          <p className="selection-checklist__empty">{visibleEmptyText}</p>
        ) : null}
      </div>
    </div>
  );
}
