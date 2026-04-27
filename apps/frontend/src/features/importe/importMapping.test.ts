import { describe, expect, it } from "vitest";

import type { ImportMesswertPreview, ImportVorgangDetail, Parameter } from "../../shared/types/api";
import {
  IGNORE_MEASUREMENT_MAPPING_VALUE,
  NEW_PARAMETER_MAPPING_VALUE,
  formatMappingInfo,
  getAliasRecommendation,
  getMappingFilterMode,
  getOpenMappingCount,
  getParameterCandidates,
  getVisibleImportChecksByMesswertIndex,
  getVisibleImportChecks,
} from "./importMapping";

function parameter(overrides: Partial<Parameter>): Parameter {
  return {
    id: "parameter-1",
    anzeigename: "Ferritin",
    interner_schluessel: "ferritin",
    beschreibung: "Eisen Speicherprotein",
    wert_typ_standard: "numerisch",
    standard_einheit: "ng/ml",
    primaere_klassifikation: null,
    aktiv: true,
    wissensseite_id: null,
    wissensseite_pfad_relativ: null,
    wissensseite_titel: null,
    erstellt_am: "2026-04-20T00:00:00",
    geaendert_am: "2026-04-20T00:00:00",
    ...overrides,
  } as Parameter;
}

function messwert(overrides: Partial<ImportMesswertPreview>): ImportMesswertPreview {
  return {
    messwert_index: 0,
    parameter_id: null,
    parameter_anzeigename: null,
    parameter_mapping_herkunft: null,
    parameter_mapping_hinweis: null,
    parameter_mapping_mehrdeutig: false,
    parameter_vorschlag: null,
    original_parametername: "Ferritin",
    wert_typ: "numerisch",
    wert_operator: "exakt",
    wert_roh_text: "41",
    wert_num: 41,
    wert_text: null,
    einheit_original: "ng/ml",
    referenz_text_original: null,
    untere_grenze_num: null,
    untere_grenze_operator: null,
    obere_grenze_num: null,
    obere_grenze_operator: null,
    referenz_einheit: null,
    referenz_geschlecht_code: null,
    referenz_alter_min_tage: null,
    referenz_alter_max_tage: null,
    bemerkung_kurz: null,
    bemerkung_lang: null,
    ki_hinweis: null,
    alias_uebernehmen: false,
    unsicher_flag: false,
    pruefbedarf_flag: false,
    uebernahme_status: "offen",
    ...overrides,
  } as ImportMesswertPreview;
}

describe("importMapping", () => {
  it("scores parameter candidates by unit, type and name", () => {
    const candidates = getParameterCandidates({
      messwert: messwert({ original_parametername: "Ferritin", einheit_original: "ng/ml" }),
      parameter: [
        parameter({ id: "other", anzeigename: "Vitamin D", interner_schluessel: "vitamin_d" }),
        parameter({ id: "match", anzeigename: "Ferritin" }),
      ],
      searchText: "",
      filterMode: "streng",
    });

    expect(candidates[0].parameter.id).toBe("match");
    expect(candidates[0].score).toBeGreaterThan(candidates[1]?.score ?? 0);
  });

  it("classifies manual, new and ignored mappings", () => {
    const item = messwert({ parameter_id: "existing", parameter_mapping_herkunft: "alias" });

    expect(formatMappingInfo(item, NEW_PARAMETER_MAPPING_VALUE)).toBe("Neuanlage vorgesehen");
    expect(getMappingFilterMode(item, IGNORE_MEASUREMENT_MAPPING_VALUE)).toBe("ignoriert");
    expect(getMappingFilterMode(item, "other")).toBe("manuell");
  });

  it("hides resolved check items and counts still-open mappings", () => {
    const detail = {
      status: "in_pruefung",
      messwerte: [messwert({ messwert_index: 0 }), messwert({ messwert_index: 1, parameter_id: "p2" })],
      pruefpunkte: [
        {
          id: "check-1",
          importvorgang_id: "import-1",
          objekt_typ: "messwert",
          objekt_schluessel_temp: "messwert:0",
          pruefart: "parameter_mapping",
          status: "warnung",
          meldung: "offen",
          bestaetigt_vom_nutzer: false,
          bestaetigt_am: null,
        },
      ],
    } as ImportVorgangDetail;

    expect(getOpenMappingCount(detail, {})).toBe(1);
    expect(getVisibleImportChecks(detail, { 0: "p1" })).toHaveLength(0);
  });

  it("groups visible measurement checks by measurement index", () => {
    const detail = {
      status: "in_pruefung",
      messwerte: [messwert({ messwert_index: 0 }), messwert({ messwert_index: 1, parameter_id: "p2" })],
      pruefpunkte: [
        {
          id: "check-1",
          importvorgang_id: "import-1",
          objekt_typ: "messwert",
          objekt_schluessel_temp: "messwert:1",
          pruefart: "alias_anlage",
          status: "fehler",
          meldung: "Alias bereits vergeben",
          bestaetigt_vom_nutzer: false,
          bestaetigt_am: null,
        },
      ],
    } as ImportVorgangDetail;

    const checksByIndex = getVisibleImportChecksByMesswertIndex(detail, {});

    expect(checksByIndex.get(1)?.[0].meldung).toBe("Alias bereits vergeben");
    expect(checksByIndex.has(0)).toBe(false);
  });

  it("recommends aliases only for real alternate spellings", () => {
    const params = new Map([["p1", parameter({ id: "p1", anzeigename: "Ferritin" })]]);

    expect(getAliasRecommendation({ messwert: messwert({ original_parametername: "Ferritin" }), parameterId: "p1", parameterById: params }).recommended).toBe(false);
    expect(getAliasRecommendation({ messwert: messwert({ original_parametername: "Ferritin i.S." }), parameterId: "p1", parameterById: params }).recommended).toBe(true);
  });
});
