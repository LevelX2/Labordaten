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
