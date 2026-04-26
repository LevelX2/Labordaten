from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status


INVALID_DATE_RANGE_MESSAGE = "Das Bis-Datum darf nicht vor dem Von-Datum liegen."


def validate_date_range(datum_von: date | None, datum_bis: date | None) -> None:
    if datum_von and datum_bis and datum_bis < datum_von:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_DATE_RANGE_MESSAGE,
        )
