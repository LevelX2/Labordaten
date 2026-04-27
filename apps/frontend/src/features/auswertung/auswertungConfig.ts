import { getDefaultDateRange } from "../../shared/utils/dateRangeDefaults";
import type { AuswertungFormState, DiagrammDarstellung, VertikalachsenModus } from "./auswertungTypes";

const defaultDateRange = getDefaultDateRange();

export const maxAuswertungParameter = 20;
export const auswertungFilterStorageKey = "labordaten.auswertung.filter";

export const initialForm: AuswertungFormState = {
  person_ids: [],
  laborparameter_ids: [],
  gruppen_ids: [],
  klassifikationen: [],
  labor_ids: [],
  datum_von: defaultDateRange.datum_von,
  datum_bis: defaultDateRange.datum_bis,
  diagramm_darstellung: "verlauf",
  zeitraum_darstellung: "wertezeitraum",
  vertikalachsen_modus: "nullbasis",
  include_laborreferenz: true,
  include_zielbereich: true,
  messwerttabelle_standard_offen: false
};

export const palette = ["#1f5a92", "#1f6a53", "#d77a2f", "#8d4aa5", "#a34848", "#4d6b1f"];
export const laborreferenzPalette = ["#d97706", "#dc2626", "#c026d3", "#7c3aed", "#2563eb", "#0891b2"];
export const zielbereichPalette = ["#1f6a53", "#4d7f2a", "#008097", "#2b6f92", "#5f7f1f", "#6f6f1f"];

export const diagrammDarstellungOptions: Array<{ value: DiagrammDarstellung; label: string }> = [
  { value: "verlauf", label: "Verlauf" },
  { value: "punkte", label: "Punkte" },
  { value: "punkte_bereiche", label: "Punkte + Bereiche" }
];

export const vertikalachsenModusOptions: Array<{ value: VertikalachsenModus; label: string }> = [
  { value: "nullbasis", label: "0 einschließen" },
  { value: "datenbereich", label: "Werte und Bereiche optimieren" }
];
