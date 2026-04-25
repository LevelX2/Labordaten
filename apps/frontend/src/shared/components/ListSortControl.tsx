import type { SortClause, SortOption, SortPreset } from "../utils/listSorting";

type ListSortControlProps<Field extends string> = {
  options: SortOption<Field>[];
  clauses: SortClause<Field>[];
  onChange: (nextClauses: SortClause<Field>[]) => void;
  presets?: SortPreset<Field>[];
  maxLevels?: number;
  addLabel?: string;
};

function getDefaultClause<Field extends string>(
  options: SortOption<Field>[],
  clauses: SortClause<Field>[]
): SortClause<Field> | null {
  const firstOption = options.find((option) => !clauses.some((clause) => clause.field === option.value));
  if (!firstOption) {
    return null;
  }

  return {
    field: firstOption.value,
    direction: firstOption.defaultDirection ?? "asc"
  };
}

export function ListSortControl<Field extends string>({
  options,
  clauses,
  onChange,
  presets = [],
  maxLevels = 3,
  addLabel = "Sortierebene hinzufügen"
}: ListSortControlProps<Field>) {
  const canAddClause = clauses.length < maxLevels && options.length > clauses.length;

  return (
    <div className="list-sort-control">
      {presets.length ? (
        <div className="list-sort-control__presets">
          {presets.map((preset) => {
            const isActive =
              preset.clauses.length === clauses.length &&
              preset.clauses.every(
                (clause, index) =>
                  clauses[index]?.field === clause.field && clauses[index]?.direction === clause.direction
              );

            return (
              <button
                key={preset.id}
                type="button"
                className={`list-sort-control__preset${isActive ? " list-sort-control__preset--active" : ""}`}
                onClick={() => onChange(preset.clauses)}
              >
                <strong>{preset.label}</strong>
                <small>{preset.description}</small>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="list-sort-control__rows">
        {clauses.map((clause, index) => {
          const availableOptions = options.filter(
            (option) =>
              option.value === clause.field ||
              !clauses.some((existingClause, existingIndex) => {
                return existingIndex !== index && existingClause.field === option.value;
              })
          );
          const option = options.find((item) => item.value === clause.field);

          return (
            <div className="list-sort-control__row" key={`${clause.field}-${index}`}>
              <span className="list-sort-control__row-label">Ebene {index + 1}</span>

              <select
                value={clause.field}
                onChange={(event) =>
                  onChange(
                    clauses.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            field: event.target.value as Field,
                            direction:
                              options.find((entry) => entry.value === (event.target.value as Field))
                                ?.defaultDirection ?? item.direction
                          }
                        : item
                    )
                  )
                }
              >
                {availableOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={clause.direction}
                onChange={(event) =>
                  onChange(
                    clauses.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            direction: event.target.value as SortClause<Field>["direction"]
                          }
                        : item
                    )
                  )
                }
              >
                <option value="asc">{option?.directionLabels?.asc ?? "Aufsteigend"}</option>
                <option value="desc">{option?.directionLabels?.desc ?? "Absteigend"}</option>
              </select>

              <button
                type="button"
                className="list-sort-control__remove"
                onClick={() => onChange(clauses.filter((_, itemIndex) => itemIndex !== index))}
                disabled={clauses.length <= 1}
              >
                Entfernen
              </button>
            </div>
          );
        })}
      </div>

      <div className="list-sort-control__actions">
        <button
          type="button"
          onClick={() => {
            const nextClause = getDefaultClause(options, clauses);
            if (!nextClause) {
              return;
            }
            onChange([...clauses, nextClause]);
          }}
          disabled={!canAddClause}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
