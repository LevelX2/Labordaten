from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from labordaten_backend.modules.befunde.schemas import BefundCreate
from labordaten_backend.modules.importe.schemas import ImportMesswertPayload
from labordaten_backend.modules.messwerte.schemas import MesswertCreate
from labordaten_backend.modules.parameter.schemas import ParameterCreate
from labordaten_backend.modules.personen.schemas import PersonCreate
from labordaten_backend.modules.referenzen.schemas import ReferenzCreate
from labordaten_backend.modules.zielbereiche.schemas import ZielbereichCreate


def test_person_create_accepts_fixed_gender_codes_and_empty_value() -> None:
    person = PersonCreate(
        anzeigename="Ludwig",
        geburtsdatum=date(1964, 1, 12),
        geschlecht_code="w",
    )

    assert person.geschlecht_code == "w"
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


def test_parameter_create_rejects_unknown_value_type() -> None:
    with pytest.raises(ValidationError):
        ParameterCreate(
            anzeigename="Ferritin",
            standard_einheit="ng/ml",
            wert_typ_standard="zahl",
        )


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
