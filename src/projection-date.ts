export function calculateAnchoredMonthDifference(
  startDate: string,
  endDate: string
) {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  const monthDifference = (endYear - startYear) * 12 + (endMonth - startMonth);

  if (endDate < startDate) {
    return monthDifference;
  }

  return addMonths(startDate, monthDifference) <= endDate
    ? monthDifference
    : monthDifference - 1;
}

function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const monthIndex = parsed.getUTCMonth() + months;
  const year = parsed.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.getUTCDate(), getDaysInMonth(year, month));

  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
