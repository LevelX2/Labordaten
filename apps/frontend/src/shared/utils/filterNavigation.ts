type SharedFilterValues = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
};

function readAll(searchParams: URLSearchParams, key: keyof SharedFilterValues): string[] {
  return searchParams.getAll(key).filter(Boolean);
}

export function applySharedFilterSearchParams<T extends SharedFilterValues>(
  base: T,
  searchParams: URLSearchParams
): T {
  return {
    ...base,
    person_ids: readAll(searchParams, "person_ids"),
    laborparameter_ids: readAll(searchParams, "laborparameter_ids"),
    gruppen_ids: readAll(searchParams, "gruppen_ids"),
    labor_ids: readAll(searchParams, "labor_ids"),
    datum_von: searchParams.get("datum_von") ?? base.datum_von,
    datum_bis: searchParams.get("datum_bis") ?? base.datum_bis
  };
}

export function buildSharedFilterSearchParams(filter: SharedFilterValues): URLSearchParams {
  const searchParams = new URLSearchParams();

  filter.person_ids.forEach((value) => searchParams.append("person_ids", value));
  filter.laborparameter_ids.forEach((value) => searchParams.append("laborparameter_ids", value));
  filter.gruppen_ids.forEach((value) => searchParams.append("gruppen_ids", value));
  filter.labor_ids.forEach((value) => searchParams.append("labor_ids", value));

  if (filter.datum_von) {
    searchParams.set("datum_von", filter.datum_von);
  }
  if (filter.datum_bis) {
    searchParams.set("datum_bis", filter.datum_bis);
  }

  return searchParams;
}
