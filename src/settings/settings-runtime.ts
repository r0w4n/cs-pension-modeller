import {
  calculateDefaultStatementYear,
  formatLocalIsoDate,
} from "./settings-shared/date";

export function getTodayIsoDate() {
  return formatLocalIsoDate(new Date());
}

export function getDefaultStatementYear(
  date: Pick<Date, "getFullYear" | "getMonth"> = new Date()
) {
  return calculateDefaultStatementYear(date);
}
