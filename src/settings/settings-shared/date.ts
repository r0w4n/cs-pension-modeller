export function getTodayIsoDate() {
  return formatLocalIsoDate(new Date());
}

export function formatLocalIsoDate(
  date: Pick<Date, "getFullYear" | "getMonth" | "getDate">
) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

export function isValidIsoMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText] = match;
  const year = Number(yearText);
  const month = Number(monthText);

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

export function normalizeIsoDate(value: string, fallback: string) {
  return isValidIsoDate(value) ? value : fallback;
}

export function normalizeIsoMonthAsFirstOfMonth(
  value: string,
  fallback: string
) {
  if (isValidIsoDate(value)) {
    return value;
  }

  return isValidIsoMonth(value) ? `${value}-01` : fallback;
}

export function addMonthsToIsoDate(value: string, monthsToAdd: number) {
  const [year, month, day] = value.split("-").map(Number);
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonthIndex = ((monthIndex % 12) + 12) % 12;
  const maxDay = new Date(
    Date.UTC(nextYear, nextMonthIndex + 1, 0)
  ).getUTCDate();
  const safeDay = Math.min(day, maxDay);

  return new Date(Date.UTC(nextYear, nextMonthIndex, safeDay))
    .toISOString()
    .slice(0, 10);
}

export function addYearsToIsoDate(value: string, years: number) {
  return addMonthsToIsoDate(value, Math.round(years * 12));
}

export function addDaysToIsoDate(value: string, daysToAdd: number) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + daysToAdd))
    .toISOString()
    .slice(0, 10);
}

export function isIsoDateInRange(
  value: string,
  startDate: string,
  endDate: string
) {
  return value >= startDate && value <= endDate;
}

export function roundUpToStep(value: number, step: number) {
  return Math.ceil((value - Number.EPSILON) / step) * step;
}
