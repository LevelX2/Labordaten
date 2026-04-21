from __future__ import annotations

import re


_UMLAUT_REPLACEMENTS = str.maketrans(
    {
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
        "ß": "ss",
        "Ä": "ae",
        "Ö": "oe",
        "Ü": "ue",
    }
)


def normalize_parameter_name(value: str | None) -> str:
    if value is None:
        return ""
    normalized = value.translate(_UMLAUT_REPLACEMENTS).lower().strip()
    return re.sub(r"[^a-z0-9]+", "", normalized)


def tokenize_parameter_name(value: str | None) -> set[str]:
    if value is None:
        return set()
    normalized = value.translate(_UMLAUT_REPLACEMENTS).lower().strip()
    return {token for token in re.split(r"[^a-z0-9]+", normalized) if token}


def build_parameter_key_candidate(value: str | None) -> str:
    if value is None:
        return "parameter"
    normalized = value.translate(_UMLAUT_REPLACEMENTS).lower().strip()
    tokens = [token for token in re.split(r"[^a-z0-9]+", normalized) if token]
    if not tokens:
        return "parameter"
    return "_".join(tokens)
