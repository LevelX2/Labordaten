import { describe, expect, it } from "vitest";

import type { AuswertungPunkt } from "../../shared/types/api";
import { formatNumber, formatTargetRange, formatTooltipValue, formatTrend } from "./auswertungFormatting";

describe("auswertungFormatting", () => {
  it("formats numbers, trends and tooltip fallbacks", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(12.345)).toMatch(/12,35|12\.35/);
    expect(formatTrend("steigend")).toBe("Steigend");
    expect(formatTrend("fallend")).toBe("Fallend");
    expect(formatTrend("stabil")).toBe("Unverändert");
    expect(formatTooltipValue(undefined)).toBe("—");
    expect(formatTooltipValue("positiv")).toBe("positiv");
  });

  it("prefers target range text over numeric bounds", () => {
    expect(formatTargetRange({ zielbereich_text: "optimal" } as AuswertungPunkt)).toBe("optimal");
    expect(
      formatTargetRange({
        zielbereich_untere_num: 10,
        zielbereich_obere_num: 20,
        zielbereich_einheit: "ng/ml"
      } as AuswertungPunkt)
    ).toContain("10");
  });
});
