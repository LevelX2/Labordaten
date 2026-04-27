import { describe, expect, it } from "vitest";

import type { ParameterUmrechnungsregel, Zielbereich, ZielbereichQuelle, ZielwertPaket } from "../../shared/types/api";
import {
  buildDuplicateSuggestionKey,
  formatCountLabel,
  formatUmrechnungsregel,
  formatZielbereichQuelle,
  formatZielbereichValue,
  formatZielwertPaket,
  normalizeUnitForComparison,
  summarizeDescription,
} from "./parameterFormatting";

describe("parameterFormatting", () => {
  it("formats target ranges and text targets", () => {
    expect(
      formatZielbereichValue({
        wert_typ: "numerisch",
        untere_grenze_num: 30,
        obere_grenze_num: 60,
      } as Zielbereich)
    ).toBe("30 bis 60");

    expect(formatZielbereichValue({ wert_typ: "text", soll_text: "negativ" } as Zielbereich)).toBe("negativ");
  });

  it("summarizes source and package labels", () => {
    expect(formatZielbereichQuelle({ name: "IMD", titel: "Leitfaden", jahr: 2026, version: null } as ZielbereichQuelle)).toBe(
      "IMD · Leitfaden · 2026"
    );
    expect(formatZielwertPaket({ name: "Orfanos-Boeckel", version: "1", jahr: 2026 } as ZielwertPaket)).toBe(
      "Orfanos-Boeckel · 1 · 2026"
    );
  });

  it("keeps small display helpers deterministic", () => {
    expect(formatUmrechnungsregel({ regel_typ: "faktor_plus_offset", faktor: 2, offset: 3 } as ParameterUmrechnungsregel)).toBe(
      "x * 2 + 3"
    );
    expect(formatCountLabel(1, "Alias", "Aliase")).toBe("1 Alias");
    expect(formatCountLabel(2, "Alias", "Aliase")).toBe("2 Aliase");
    expect(buildDuplicateSuggestionKey("ziel", "quelle")).toBe("ziel:quelle");
    expect(normalizeUnitForComparison(" NG/ml ")).toBe("ng/ml");
    expect(summarizeDescription("")).toBe("Noch keine Erläuterung hinterlegt.");
  });
});
