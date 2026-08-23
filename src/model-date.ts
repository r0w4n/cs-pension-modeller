export function addYearsToIsoDate(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  const nextDate = new Date(
    Date.UTC(year + wholeYears, month - 1 + remainingMonths, day)
  );

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
