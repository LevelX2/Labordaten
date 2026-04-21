from __future__ import annotations

from typing import Literal


MeasurementOperator = Literal[
    "exakt",
    "kleiner_als",
    "kleiner_gleich",
    "groesser_als",
    "groesser_gleich",
    "ungefaehr",
]
ReferenceBoundOperator = Literal[
    "kleiner_als",
    "kleiner_gleich",
    "groesser_als",
    "groesser_gleich",
]

DEFAULT_LOWER_REFERENCE_OPERATOR: ReferenceBoundOperator = "groesser_gleich"
DEFAULT_UPPER_REFERENCE_OPERATOR: ReferenceBoundOperator = "kleiner_gleich"

_MEASUREMENT_OPERATOR_PREFIX = {
    "exakt": "",
    "kleiner_als": "< ",
    "kleiner_gleich": "<= ",
    "groesser_als": "> ",
    "groesser_gleich": ">= ",
    "ungefaehr": "~ ",
}
_REFERENCE_OPERATOR_SYMBOL = {
    "kleiner_als": "<",
    "kleiner_gleich": "<=",
    "groesser_als": ">",
    "groesser_gleich": ">=",
}


def format_numeric_measurement_value(
    value: float | None,
    operator: str | None,
    raw_value: str | None,
) -> str:
    operator_prefix = _MEASUREMENT_OPERATOR_PREFIX.get(operator or "exakt", "")
    if value is not None:
        return f"{operator_prefix}{value}"
    return f"{operator_prefix}{raw_value or ''}".strip()


def normalize_lower_reference_operator(operator: str | None) -> ReferenceBoundOperator:
    if operator in {"groesser_als", "groesser_gleich"}:
        return operator
    return DEFAULT_LOWER_REFERENCE_OPERATOR


def normalize_upper_reference_operator(operator: str | None) -> ReferenceBoundOperator:
    if operator in {"kleiner_als", "kleiner_gleich"}:
        return operator
    return DEFAULT_UPPER_REFERENCE_OPERATOR


def format_numeric_reference_range(
    *,
    lower_value: float | None,
    upper_value: float | None,
    lower_operator: str | None,
    upper_operator: str | None,
    unit: str | None = None,
) -> str | None:
    lower_text = _format_reference_bound("lower", lower_value, lower_operator)
    upper_text = _format_reference_bound("upper", upper_value, upper_operator)
    unit_suffix = f" {unit}" if unit else ""

    if lower_text and upper_text:
        if (
            normalize_lower_reference_operator(lower_operator) == DEFAULT_LOWER_REFERENCE_OPERATOR
            and normalize_upper_reference_operator(upper_operator) == DEFAULT_UPPER_REFERENCE_OPERATOR
        ):
            return f"{lower_value} bis {upper_value}{unit_suffix}"
        return f"{lower_text} bis {upper_text}{unit_suffix}"
    if lower_text:
        return f"{lower_text}{unit_suffix}"
    if upper_text:
        return f"{upper_text}{unit_suffix}"
    return None


def is_numeric_value_outside_reference(
    *,
    value: float | None,
    lower_value: float | None,
    upper_value: float | None,
    lower_operator: str | None,
    upper_operator: str | None,
) -> bool | None:
    if value is None:
        return None
    if lower_value is not None:
        normalized_lower = normalize_lower_reference_operator(lower_operator)
        if normalized_lower == "groesser_als" and value <= lower_value:
            return True
        if normalized_lower == "groesser_gleich" and value < lower_value:
            return True
    if upper_value is not None:
        normalized_upper = normalize_upper_reference_operator(upper_operator)
        if normalized_upper == "kleiner_als" and value >= upper_value:
            return True
        if normalized_upper == "kleiner_gleich" and value > upper_value:
            return True
    if lower_value is None and upper_value is None:
        return None
    return False


def _format_reference_bound(
    side: Literal["lower", "upper"],
    value: float | None,
    operator: str | None,
) -> str | None:
    if value is None:
        return None

    normalized_operator = (
        normalize_lower_reference_operator(operator)
        if side == "lower"
        else normalize_upper_reference_operator(operator)
    )
    return f"{_REFERENCE_OPERATOR_SYMBOL[normalized_operator]} {value}"
