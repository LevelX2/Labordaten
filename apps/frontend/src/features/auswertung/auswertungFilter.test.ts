import { describe, expect, it } from "vitest";

import type { AuswertungResponse, Messwert } from "../../shared/types/api";
import { initialForm } from "./auswertungConfig";
import {
  applyAuswertungVorlageConfig,
  buildAuswertungPreviewCounts,
  buildAuswertungVorlageConfig,
  buildFilterPeriodLabel,
  buildFilterSummary,
  buildMissingTemplateWarning,
  buildQualitativeEvents,
  hasSharedFilterSearchParams,
  readStoredAuswertungFilter
} from "./auswertungFilter";

describe("auswertungFilter", () => {
  it("detects shared search params and reads stored filter fallbacks", () => {
    expect(hasSharedFilterSearchParams(new URLSearchParams("person_ids=p1"))).toBe(true);
    expect(hasSharedFilterSearchParams(new URLSearchParams("auto_laden=1"))).toBe(false);

    const storage = {
      getItem: () => JSON.stringify({ person_ids: ["p1"], diagramm_darstellung: "punkte" })
    };
    expect(readStoredAuswertungFilter(storage)?.person_ids).toEqual(["p1"]);
    expect(readStoredAuswertungFilter({ getItem: () => "{kaputt" })).toBeNull();
  });

  it("roundtrips template config and warns about missing ids", () => {
    const form = { ...initialForm, person_ids: ["p1", "p2"], laborparameter_ids: ["lp1"], datum_von: "" };
    const config = buildAuswertungVorlageConfig(form);
    expect(applyAuswertungVorlageConfig(config).person_ids).toEqual(["p1", "p2"]);
    expect(applyAuswertungVorlageConfig(config).datum_von).toBe("");
    expect(
      buildMissingTemplateWarning(form, {
        personen: [{ id: "p1", anzeigename: "Anna" }] as never,
        gruppen: [],
        parameter: [],
        labore: []
      })
    ).toBe("Diese Vorlage enthält 2 nicht mehr verfügbare Auswahlwerte.");
  });

  it("builds summaries, preview counts and qualitative events", () => {
    const form = {
      ...initialForm,
      person_ids: ["p1"],
      laborparameter_ids: ["lp1"],
      datum_von: "2026-04-01",
      datum_bis: "2026-04-30"
    };
    const summary = buildFilterSummary(form, {
      personen: [{ id: "p1", anzeigename: "Anna" }] as never,
      gruppen: [],
      parameter: [{ id: "lp1", anzeigename: "Ferritin" }] as never,
      labore: []
    });
    const messwerte = [
      { laborparameter_id: "lp1", befund_id: "b1" },
      { laborparameter_id: "lp2", befund_id: "b1" }
    ] as Messwert[];
    const qualitative = buildQualitativeEvents({
      person_ids: ["p1"],
      serien: [
        {
          laborparameter_id: "lp1",
          parameter_anzeigename: "CRP",
          wert_typ_standard: "text",
          statistik: { anzahl_messungen: 1, personen_anzahl: 1, trendrichtung: "unveraendert" },
          punkte: [
            {
              messwert_id: "m1",
              person_id: "p1",
              person_anzeigename: "Anna",
              datum: "2026-04-27",
              wert_typ: "text",
              wert_operator: "exakt",
              wert_anzeige: "positiv"
            }
          ]
        }
      ]
    } as AuswertungResponse);

    expect(summary).toContain("Anna");
    expect(buildFilterPeriodLabel(form)).toContain("bis");
    expect(buildAuswertungPreviewCounts(messwerte, 1)).toEqual({ personen: 1, parameter: 2, messwerte: 2, befunde: 1 });
    expect(qualitative[0].parameter_anzeigename).toBe("CRP");
  });
});
