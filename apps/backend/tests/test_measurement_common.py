from datetime import date, datetime

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.modules.messwerte.common import effective_date, resolve_measurement_display


def test_effective_date_prefers_sample_date_over_report_and_creation_date() -> None:
    messwert = Messwert(erstellt_am=datetime(2026, 4, 29, 12, 0, 0))
    befund = Befund(entnahmedatum=date(2026, 4, 27), befunddatum=date(2026, 4, 28))

    assert effective_date(befund, messwert) == date(2026, 4, 27)


def test_resolve_measurement_display_uses_normalized_value_when_requested() -> None:
    messwert = Messwert(
        wert_typ="numerisch",
        wert_operator="exakt",
        wert_roh_text="41",
        wert_num=41,
        einheit_original="ng/ml",
        wert_normiert_num=410,
        einheit_normiert="ug/l",
    )

    display = resolve_measurement_display(messwert, "ug/l")

    assert display.wert_num == 410
    assert display.einheit == "ug/l"
    assert display.wert_anzeige == "410"
