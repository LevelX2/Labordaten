export const queryKeys = {
  personen: ["personen"] as const,
  parameter: ["parameter"] as const,
  gruppen: ["gruppen"] as const,
  labore: ["labore"] as const,
  importe: ["importe"] as const,
  importDetail: (importId: string | null) => ["importe", importId] as const,
  einheiten: ["einheiten"] as const,
  auswertungPreview: (queryString: string) => ["auswertung", "treffer-vorab", queryString] as const,
  auswertungGesamtzahlen: ["auswertung", "gesamtzahlen"] as const,
  auswertungVorlagen: ["vorlagen", "auswertung_verlauf"] as const,
  wissensbasisSeiten: (scope?: string) =>
    scope ? (["wissensbasis", "seiten", scope] as const) : (["wissensbasis", "seiten"] as const),
};
