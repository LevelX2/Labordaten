import type { AuswertungPunkt } from "../../shared/types/api";
import type { ParameterKlassifikationCode } from "../../shared/types/api";

export type DiagrammDarstellung = "verlauf" | "punkte" | "punkte_bereiche";
export type VertikalachsenModus = "nullbasis" | "datenbereich";
export type ZeitraumDarstellung = "wertezeitraum" | "selektionszeitraum";

export type AuswertungFormState = {
  person_ids: string[];
  laborparameter_ids: string[];
  gruppen_ids: string[];
  klassifikationen: ParameterKlassifikationCode[];
  labor_ids: string[];
  datum_von: string;
  datum_bis: string;
  diagramm_darstellung: DiagrammDarstellung;
  zeitraum_darstellung: ZeitraumDarstellung;
  vertikalachsen_modus: VertikalachsenModus;
  include_laborreferenz: boolean;
  include_zielbereich: boolean;
  messwerttabelle_standard_offen: boolean;
};

export type AuswertungPanelKey = "templates" | "filters" | "display";

export type AuswertungPreviewCounts = {
  personen: number;
  parameter: number;
  messwerte: number;
  befunde: number;
};

export type StatistikCard = {
  label: string;
  value: number | string;
  detail: string;
};

export type ChartRow = Record<string, string | number | null>;

export type ChartPerson = {
  id: string;
  name: string;
  index: number;
  pointCount: number;
  laborreferenzCount: number;
  zielbereichCount: number;
};

export type ChartLineGroup = {
  id: string;
  personId: string;
  label: string;
  color: string;
  kind: "wert" | "laborreferenz" | "zielbereich";
  count: number;
};

export type ChartRangeKind = "laborreferenz" | "zielbereich";

export type RangeMarker = {
  id: string;
  timestamp: number;
  personId: string;
  kind: ChartRangeKind;
  lower: number | null;
  upper: number | null;
  color: string;
};

export type ChartScale = (value: number) => number;

export type CustomizedChartAxis = {
  scale?: ChartScale;
};

export type CustomizedChartProps = {
  xAxisMap?: Record<string, CustomizedChartAxis>;
  yAxisMap?: Record<string, CustomizedChartAxis>;
  offset?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type YAxisScaleConfig = {
  domain: [number, number];
  ticks: number[];
  step: number;
};

export type QualitativeAuswertungEvent = AuswertungPunkt & {
  parameter_anzeigename: string;
};
