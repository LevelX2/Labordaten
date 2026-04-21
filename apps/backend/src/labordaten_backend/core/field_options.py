from collections.abc import Collection

GESCHLECHT_CODES = ("w", "m", "d")
WERT_TYPEN = ("numerisch", "text")
WERT_OPERATOREN = ("exakt", "kleiner_als", "kleiner_gleich", "groesser_als", "groesser_gleich", "ungefaehr")
REFERENZ_GRENZ_OPERATOREN = ("kleiner_als", "kleiner_gleich", "groesser_als", "groesser_gleich")
REFERENZ_TYPEN = ("labor", "ziel_allgemein", "ziel_person")
BEFUND_QUELLE_TYPEN = ("manuell", "import", "ki_import")
UMRECHNUNGSREGEL_TYPEN = ("faktor", "faktor_plus_offset", "formel")


def _allowed_values_text(valid_values: Collection[str]) -> str:
    return ", ".join(f"'{value}'" for value in valid_values)


def validate_required_code(value: str, *, valid_values: Collection[str], field_label: str) -> str:
    if value not in valid_values:
        raise ValueError(
            f"{field_label} muss einer der festen Werte {_allowed_values_text(valid_values)} sein."
        )
    return value


def validate_optional_code(
    value: str | None, *, valid_values: Collection[str], field_label: str
) -> str | None:
    if value is None:
        return None
    return validate_required_code(value, valid_values=valid_values, field_label=field_label)
