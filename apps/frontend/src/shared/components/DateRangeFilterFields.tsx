type DateRangeFilterFieldsProps = {
  fromValue: string;
  toValue: string;
  fallbackFromValue: string;
  fallbackToValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
};

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return formatIsoDate(nextDate);
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
  className
}: DateRangeFilterFieldsProps) {
  const rootClassName = ["date-range-filter", "field--full", className].filter(Boolean).join(" ");

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
          <input type="date" value={fromValue} onChange={(event) => onFromChange(event.target.value)} />
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
          <input type="date" value={toValue} onChange={(event) => onToChange(event.target.value)} />
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
    </div>
  );
}
