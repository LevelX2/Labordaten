import { useId } from "react";

import { formatDateInputValue } from "../utils/dateFormatting";

type DateRangeFilterFieldsProps = {
  fromValue: string;
  toValue: string;
  fallbackFromValue: string;
  fallbackToValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  errorMessage?: string;
  className?: string;
};

export function isInvalidDateRange(fromValue: string, toValue: string): boolean {
  return Boolean(fromValue && toValue && toValue < fromValue);
}

function shiftDateByYears(value: string, years: number, fallbackValue: string): string {
  const baseValue = value || fallbackValue;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseValue);
  if (!match) {
    return baseValue;
  }

  const [, yearText, monthText, dayText] = match;
  const targetYear = Number(yearText) + years;
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const maxDayInTargetMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
  const nextDate = new Date(targetYear, monthIndex, Math.min(day, maxDayInTargetMonth));
  return formatDateInputValue(nextDate);
}

export function DateRangeFilterFields({
  fromValue,
  toValue,
  fallbackFromValue,
  fallbackToValue,
  onFromChange,
  onToChange,
  fromLabel = "Datum von",
  toLabel = "Datum bis",
  errorMessage = "Das Bis-Datum darf nicht vor dem Von-Datum liegen.",
  className
}: DateRangeFilterFieldsProps) {
  const errorId = useId();
  const isInvalid = isInvalidDateRange(fromValue, toValue);
  const rootClassName = [
    "date-range-filter",
    "field--full",
    isInvalid ? "date-range-filter--invalid" : null,
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div className="field date-range-filter__field">
        <span>{fromLabel}</span>
        <div className="date-range-filter__control">
          <button
            type="button"
            className="date-range-filter__button date-range-filter__button--previous"
            onClick={() => onFromChange(shiftDateByYears(fromValue, -1, fallbackFromValue))}
            aria-label={`${fromLabel} ein Jahr zurücksetzen`}
            title={`${fromLabel} ein Jahr zurücksetzen`}
          >
            -1 J
          </button>
          <input
            type="date"
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value)}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? errorId : undefined}
          />
          <button
            type="button"
            className="date-range-filter__button date-range-filter__button--next"
            onClick={() => onFromChange(shiftDateByYears(fromValue, 1, fallbackFromValue))}
            aria-label={`${fromLabel} ein Jahr vorziehen`}
            title={`${fromLabel} ein Jahr vorziehen`}
          >
            +1 J
          </button>
        </div>
      </div>

      <div className="field date-range-filter__field">
        <span>{toLabel}</span>
        <div className="date-range-filter__control">
          <button
            type="button"
            className="date-range-filter__button date-range-filter__button--previous"
            onClick={() => onToChange(shiftDateByYears(toValue, -1, fallbackToValue))}
            aria-label={`${toLabel} ein Jahr zurücksetzen`}
            title={`${toLabel} ein Jahr zurücksetzen`}
          >
            -1 J
          </button>
          <input
            type="date"
            value={toValue}
            onChange={(event) => onToChange(event.target.value)}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? errorId : undefined}
          />
          <button
            type="button"
            className="date-range-filter__button date-range-filter__button--next"
            onClick={() => onToChange(shiftDateByYears(toValue, 1, fallbackToValue))}
            aria-label={`${toLabel} ein Jahr vorziehen`}
            title={`${toLabel} ein Jahr vorziehen`}
          >
            +1 J
          </button>
        </div>
      </div>

      {isInvalid ? (
        <p id={errorId} className="form-error date-range-filter__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
