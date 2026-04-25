export type SortDirection = "asc" | "desc";

export type SortClause<Field extends string = string> = {
  field: Field;
  direction: SortDirection;
};

export type SortOption<Field extends string = string> = {
  value: Field;
  label: string;
  directionLabels?: {
    asc: string;
    desc: string;
  };
  defaultDirection?: SortDirection;
};

export type SortPreset<Field extends string = string> = {
  id: string;
  label: string;
  description: string;
  clauses: SortClause<Field>[];
};

function isSortDirection(value: string): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function normalizeSortClauses<Field extends string>(
  clauses: SortClause<Field>[],
  allowedFields: readonly Field[],
  fallbackClauses: SortClause<Field>[],
  maxLevels = 3
): SortClause<Field>[] {
  const allowedFieldSet = new Set(allowedFields);
  const normalized: SortClause<Field>[] = [];

  for (const clause of clauses) {
    if (!allowedFieldSet.has(clause.field)) {
      continue;
    }
    if (normalized.some((item) => item.field === clause.field)) {
      continue;
    }

    normalized.push(clause);
    if (normalized.length >= maxLevels) {
      break;
    }
  }

  if (normalized.length) {
    return normalized;
  }

  return fallbackClauses.slice(0, maxLevels);
}

export function readSortClauses<Field extends string>(
  searchParams: URLSearchParams,
  allowedFields: readonly Field[],
  fallbackClauses: SortClause<Field>[],
  key = "sort",
  maxLevels = 3
): SortClause<Field>[] {
  const clauses = searchParams
    .getAll(key)
    .map((value) => {
      const [field, direction] = value.split(":");
      if (!field || !direction || !isSortDirection(direction)) {
        return null;
      }

      return {
        field: field as Field,
        direction
      };
    })
    .filter((value): value is SortClause<Field> => value !== null);

  return normalizeSortClauses(clauses, allowedFields, fallbackClauses, maxLevels);
}

export function appendSortClauses<Field extends string>(
  searchParams: URLSearchParams,
  clauses: SortClause<Field>[],
  key = "sort"
) {
  clauses.forEach((clause) => {
    searchParams.append(key, `${clause.field}:${clause.direction}`);
  });
}

export function formatSortSummary<Field extends string>(
  clauses: SortClause<Field>[],
  options: SortOption<Field>[]
): string {
  return clauses
    .map((clause) => {
      const option = options.find((item) => item.value === clause.field);
      const directionLabel = option?.directionLabels?.[clause.direction] ??
        (clause.direction === "asc" ? "aufsteigend" : "absteigend");
      return `${option?.label ?? clause.field}: ${directionLabel}`;
    })
    .join(" • ");
}
