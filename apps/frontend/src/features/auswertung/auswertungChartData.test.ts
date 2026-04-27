import { describe, expect, it } from "vitest";

import type { AuswertungPunkt } from "../../shared/types/api";
import {
  buildChartData,
  buildChartLineGroups,
  buildPersonChartData,
  buildRangeMarkers,
  buildYAxisScale,
  formatLegendItemLabel,
  parseDateToTimestamp
} from "./auswertungChartData";

function point(overrides: Partial<AuswertungPunkt> = {}): AuswertungPunkt {
  return {
    messwert_id: overrides.messwert_id ?? "m1",
    person_id: overrides.person_id ?? "p1",
    person_anzeigename: overrides.person_anzeigename ?? "Anna",
    parameter_primaere_klassifikation: overrides.parameter_primaere_klassifikation ?? "gesundmachwert",
    datum: overrides.datum ?? "2026-04-27",
    wert_typ: overrides.wert_typ ?? "numerisch",
    wert_operator: overrides.wert_operator ?? "exakt",
    wert_anzeige: overrides.wert_anzeige ?? "12",
    wert_num: overrides.wert_num ?? 12,
    einheit: overrides.einheit ?? "ng/ml",
    laborreferenz_untere_num: overrides.laborreferenz_untere_num,
    laborreferenz_obere_num: overrides.laborreferenz_obere_num,
    zielbereich_untere_num: overrides.zielbereich_untere_num,
    zielbereich_obere_num: overrides.zielbereich_obere_num,
    ...overrides
  };
}

describe("auswertungChartData", () => {
  it("parses only ISO date values and sorts chart rows by date", () => {
    expect(parseDateToTimestamp("kein-datum")).toBeNull();
    const rows = buildChartData([
      point({ messwert_id: "m2", datum: "2026-05-02", wert_num: 8, wert_anzeige: "8" }),
      point({ messwert_id: "m1", datum: "2026-04-27", wert_num: 12, wert_anzeige: "12" }),
      point({ messwert_id: "m3", datum: null, wert_num: 99 })
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].timestamp).toBe(parseDateToTimestamp("2026-04-27"));
    expect(rows[1].timestamp).toBe(parseDateToTimestamp("2026-05-02"));
  });

  it("builds people, line groups and range markers from numeric points only", () => {
    const points = [
      point({ laborreferenz_untere_num: 4, laborreferenz_obere_num: 20, zielbereich_untere_num: 8 }),
      point({ messwert_id: "m2", person_id: "p2", person_anzeigename: "Ben", wert_num: 7 }),
      point({ messwert_id: "m3", person_id: "p3", person_anzeigename: "Text", wert_typ: "text", wert_num: null })
    ];
    const people = buildPersonChartData(points);
    const groups = buildChartLineGroups(people, true, true, true);
    const markers = buildRangeMarkers(points, people);

    expect(people.map((person) => person.id)).toEqual(["p1", "p2"]);
    expect(groups.map((group) => group.kind)).toContain("laborreferenz");
    expect(formatLegendItemLabel(groups[0])).toBe("Werte (1)");
    expect(markers.map((marker) => marker.kind)).toEqual(["laborreferenz", "zielbereich"]);
  });

  it("builds y-axis scales with and without zero baseline", () => {
    const points = [point({ wert_num: 10, laborreferenz_untere_num: 5 }), point({ messwert_id: "m2", wert_num: 20 })];
    const zeroScale = buildYAxisScale(points, "nullbasis", true, false);
    const dataScale = buildYAxisScale(points, "datenbereich", true, false);

    expect(zeroScale?.domain[0]).toBe(0);
    expect(dataScale?.domain[0]).toBeLessThanOrEqual(5);
    expect(dataScale?.ticks.length).toBeGreaterThan(0);
  });
});
