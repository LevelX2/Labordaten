import { describe, expect, it } from "vitest";

import {
  buildMesswertCreatePayload,
  buildMesswertReferenzCreatePayload,
  buildPersonCreatePayload,
  buildZielbereichCreatePayload,
} from "./payloadBuilders";

describe("payloadBuilders", () => {
  it("maps empty optional person fields to null", () => {
    expect(
      buildPersonCreatePayload({
        anzeigename: "Ludwig",
        vollname: "",
        geburtsdatum: "1964-01-12",
        geschlecht_code: "",
        hinweise_allgemein: "",
      }),
    ).toEqual({
      anzeigename: "Ludwig",
      vollname: null,
      geburtsdatum: "1964-01-12",
      geschlecht_code: null,
      blutgruppe: null,
      rhesusfaktor: null,
      hinweise_allgemein: null,
    });
  });

  it("keeps fixed blood group and rhesus codes in person payloads", () => {
    expect(
      buildPersonCreatePayload({
        anzeigename: "Ludwig",
        vollname: "",
        geburtsdatum: "1964-01-12",
        geschlecht_code: "m",
        blutgruppe: "AB",
        rhesusfaktor: "positiv",
        hinweise_allgemein: "",
      }),
    ).toMatchObject({
      geschlecht_code: "m",
      blutgruppe: "AB",
      rhesusfaktor: "positiv",
    });
  });

  it("builds numeric measurement payloads with numbers and null text fields", () => {
    expect(
      buildMesswertCreatePayload({
        person_id: "person-1",
        befund_id: "befund-1",
        laborparameter_id: "parameter-1",
        original_parametername: "Ferritin",
        wert_typ: "numerisch",
        wert_operator: "kleiner_als",
        wert_roh_text: "41",
        wert_num: "41",
        wert_text: "",
        einheit_original: "ng/ml",
        bemerkung_kurz: "",
      }),
    ).toEqual({
      person_id: "person-1",
      befund_id: "befund-1",
      laborparameter_id: "parameter-1",
      original_parametername: "Ferritin",
      wert_typ: "numerisch",
      wert_operator: "kleiner_als",
      wert_roh_text: "41",
      wert_num: 41,
      wert_text: null,
      einheit_original: "ng/ml",
      bemerkung_kurz: null,
    });
  });

  it("builds text measurement payloads with fallback to raw text", () => {
    expect(
      buildMesswertCreatePayload({
        person_id: "person-1",
        befund_id: "befund-1",
        laborparameter_id: "parameter-1",
        original_parametername: "Status",
        wert_typ: "text",
        wert_operator: "exakt",
        wert_roh_text: "positiv",
        wert_num: "",
        wert_text: "",
        einheit_original: "ignored",
        bemerkung_kurz: "kurz",
      }),
    ).toEqual({
      person_id: "person-1",
      befund_id: "befund-1",
      laborparameter_id: "parameter-1",
      original_parametername: "Status",
      wert_typ: "text",
      wert_operator: "exakt",
      wert_roh_text: "positiv",
      wert_num: null,
      wert_text: "positiv",
      einheit_original: null,
      bemerkung_kurz: "kurz",
    });
  });

  it("builds reference payloads with fallback unit and null empty gender", () => {
    expect(
      buildMesswertReferenzCreatePayload(
        {
          wert_typ: "numerisch",
          referenz_text_original: "",
          untere_grenze_num: "12",
          untere_grenze_operator: "groesser_als",
          obere_grenze_num: "48",
          obere_grenze_operator: "kleiner_als",
          einheit: "",
          soll_text: "",
          geschlecht_code: "",
          bemerkung: "",
        },
        "mg/dl",
      ),
    ).toEqual({
      referenz_typ: "labor",
      wert_typ: "numerisch",
      referenz_text_original: null,
      untere_grenze_num: 12,
      untere_grenze_operator: "groesser_als",
      obere_grenze_num: 48,
      obere_grenze_operator: "kleiner_als",
      einheit: "mg/dl",
      soll_text: null,
      geschlecht_code: null,
      bemerkung: null,
    });
  });

  it("builds text target payloads without numeric leftovers", () => {
    expect(
      buildZielbereichCreatePayload(
        {
          wert_typ: "text",
          zielbereich_typ: "therapieziel",
          zielrichtung: "zielwert_nahe",
          zielbereich_quelle_id: "",
          zielwert_paket_id: "",
          untere_grenze_num: "1",
          obere_grenze_num: "2",
          einheit: "ignored",
          soll_text: "im Zielbereich",
          geschlecht_code: "w",
          quelle_original_text: "",
          quelle_stelle: "",
          bemerkung: "",
        },
        "mg/dl",
      ),
    ).toEqual({
      wert_typ: "text",
      zielbereich_typ: "therapieziel",
      zielrichtung: "zielwert_nahe",
      zielbereich_quelle_id: null,
      zielwert_paket_id: null,
      untere_grenze_num: null,
      obere_grenze_num: null,
      einheit: null,
      soll_text: "im Zielbereich",
      geschlecht_code: "w",
      quelle_original_text: null,
      quelle_stelle: null,
      bemerkung: null,
    });
  });
});
