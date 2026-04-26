import { formatDateInputValue } from "./dateFormatting";

export function getDefaultDateRange() {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  return {
    datum_von: formatDateInputValue(oneYearAgo),
    datum_bis: formatDateInputValue(today)
  };
}
