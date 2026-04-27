from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from labordaten_backend.modules.befunde.schemas import BefundCreate
from labordaten_backend.modules.importe.schemas import ImportMesswertPayload
from labordaten_backend.modules.messwerte.schemas import MesswertCreate
from labordaten_backend.modules.parameter.schemas import ParameterCreate, ParameterKlassifikationCreate
from labordaten_backend.modules.personen.schemas import PersonCreate
from labordaten_backend.modules.referenzen.schemas import ReferenzCreate
from labordaten_backend.modules.zielbereiche.schemas import ZielbereichCreate, ZielbereichQuelleCreate


def test_person_create_accepts_fixed_gender_codes_and_empty_value() -> None:
    person = PersonCreate(
        anzeigename="Ludwig",
        geburtsdatum=date(1964, 1, 12),
        geschlecht_code="w",
        blutgruppe="AB",
        rhesusfaktor="positiv",
    )

    assert person.geschlecht_code == "w"
    assert person.blutgruppe == "AB"
    assert person.rhesusfaktor == "positiv"
    assert (
        PersonCreate(anzeigename="Ludwig", geburtsdatum=date(1964, 1, 12), geschlecht_code=None).geschlecht_code
        is None
    )


def test_person_create_rejects_free_text_gender() -> None:
    with pytest.raises(ValidationError):
        PersonCreate(
            anzeigename="Ludwig",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="Männlich",
        )


def test_person_create_rejects_free_text_blood_group_and_rhesus_factor() -> None:
    with pytest.raises(ValidationError):
        PersonCreate(
            anzeigename="Ludwig",
            geburtsdatum=date(1964, 1, 12),
            blutgruppe="A positiv",
        )

    with pytest.raises(ValidationError):
        PersonCreate(
            anzeigename="Ludwig",
            geburtsdatum=date(1964, 1, 12),
            rhesusfaktor="+",
        )


def test_parameter_create_rejects_unknown_value_type() -> None:
    with pytest.raises(ValidationError):
        ParameterCreate(
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="zahl",
        )


def test_parameter_create_rejects_unknown_primary_classification() -> None:
    with pytest.raises(ValidationError):
        ParameterCreate(
            anzeigename="CRP",
            wert_typ_standard="numerisch",
            primaere_klassifikation="diagnosewert",
        )


def test_parameter_additional_classification_rejects_unknown_code() -> None:
    with pytest.raises(ValidationError):
        ParameterKlassifikationCreate(klassifikation="optimierungswert")


def test_messwert_create_rejects_unknown_operator() -> None:
    with pytest.raises(ValidationError):
        MesswertCreate(
            person_id="person-1",
            befund_id="befund-1",
            laborparameter_id="parameter-1",
            original_parametername="Ferritin",
            wert_typ="numerisch",
            wert_operator="gleich_oder_irgendwas",
            wert_roh_text="41",
            wert_num=41.0,
        )


def test_referenz_create_rejects_invalid_fixed_codes() -> None:
    with pytest.raises(ValidationError):
        ReferenzCreate(
            referenz_typ="extern",
            wert_typ="numerisch",
            untere_grenze_num=1.0,
        )

    with pytest.raises(ValidationError):
        ReferenzCreate(
            referenz_typ="labor",
            wert_typ="numerisch",
            untere_grenze_num=1.0,
            geschlecht_code="M",
        )


def test_zielbereich_create_rejects_invalid_gender_code() -> None:
    with pytest.raises(ValidationError):
        ZielbereichCreate(
            wert_typ="numerisch",
            untere_grenze_num=1.0,
            geschlecht_code="Männlich",
        )


def test_zielbereich_create_rejects_invalid_target_type() -> None:
    with pytest.raises(ValidationError):
        ZielbereichCreate(
            wert_typ="numerisch",
            zielbereich_typ="wunschbereich",
            untere_grenze_num=1.0,
        )


def test_zielbereich_quelle_create_rejects_invalid_source_type() -> None:
    with pytest.raises(ValidationError):
        ZielbereichQuelleCreate(name="Quelle", quellen_typ="blog")


def test_befund_create_rejects_unknown_source_type() -> None:
    with pytest.raises(ValidationError):
        BefundCreate(
            person_id="person-1",
            entnahmedatum=date(2026, 4, 21),
            quelle_typ="json",
        )


def test_import_payload_rejects_invalid_operator_and_gender_code() -> None:
    with pytest.raises(ValidationError):
        ImportMesswertPayload.model_validate(
            {
                "originalParametername": "Ferritin",
                "wertTyp": "numerisch",
                "wertOperator": "invalid",
                "wertRohText": "41",
                "wertNum": 41,
            }
        )

    with pytest.raises(ValidationError):
        ImportMesswertPayload.model_validate(
            {
                "originalParametername": "Ferritin",
                "wertTyp": "numerisch",
                "wertOperator": "exakt",
                "wertRohText": "41",
                "wertNum": 41,
                "referenzGeschlechtCode": "M",
            }
        )


def test_import_parameter_suggestion_accepts_primary_ksg_classification() -> None:
    from labordaten_backend.modules.importe.schemas import ImportParameterVorschlagPayload

    payload = ImportParameterVorschlagPayload.model_validate(
        {
            "anzeigename": "Vitamin D",
            "wertTypStandard": "numerisch",
            "primaereKlassifikation": "gesundmachwert",
            "messwertIndizes": [0],
        }
    )

    assert payload.primaere_klassifikation == "gesundmachwert"

    with pytest.raises(ValidationError):
        ImportParameterVorschlagPayload.model_validate(
            {
                "anzeigename": "Vitamin D",
                "primaereKlassifikation": "diagnosewert",
                "messwertIndizes": [0],
            }
        )


def test_import_payload_accepts_legacy_symbol_operators_for_backward_compatibility() -> None:
    payload = ImportMesswertPayload.model_validate(
        {
            "originalParametername": "Vitamin B12 bioaktiv i.S.",
            "wertTyp": "numerisch",
            "wertOperator": ">",
            "wertRohText": ">1350",
            "wertNum": 1350,
        }
    )

    assert payload.wert_operator == "groesser_als"
