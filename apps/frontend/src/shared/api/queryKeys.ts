export const queryKeys = {
  personen: ["personen"] as const,
  parameter: ["parameter"] as const,
  gruppen: ["gruppen"] as const,
  labore: ["labore"] as const,
  importe: ["importe"] as const,
  importDetail: (importId: string | null) => ["importe", importId] as const,
  einheiten: ["einheiten"] as const,
  wissensbasisSeiten: (scope?: string) =>
    scope ? (["wissensbasis", "seiten", scope] as const) : (["wissensbasis", "seiten"] as const),
};
