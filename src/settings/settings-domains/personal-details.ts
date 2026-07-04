import type {
  PensionSettings,
  PensionValidationIssue,
} from "../settings-types";
import {
  getTodayIsoDate,
  isValidIsoDate,
  normalizeIsoMonthAsFirstOfMonth,
} from "../settings-shared/date";

export const personalDetailsDefaults = {
  startDate: getTodayIsoDate(),
  dateOfBirth: "1987-06-01",
  lifeExpectancy: 80,
  requirementAge: 68,
  desiredRetirementIncome: 31700,
} as const;

export const personalDetailsNumericSettingRules = {
  lifeExpectancy: { min: 75, max: 100, step: 1 },
  requirementAge: { min: 0, max: 70, step: 1 },
  desiredRetirementIncome: { min: 0, max: 200000, step: 1 },
} as const;

export function normalizePersonalDateSetting(
  key: "startDate" | "dateOfBirth",
  value: string,
  normalizeDate: (value: string, fallback: string) => string
) {
  if (key === "startDate") {
    return normalizeDate(value, getTodayIsoDate());
  }

  return normalizeIsoMonthAsFirstOfMonth(
    value,
    personalDetailsDefaults.dateOfBirth
  );
}

export function calculateDateAge(dateOfBirth: string, date: string) {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = date.split("-").map(Number);

  if (
    !Number.isFinite(birthYear) ||
    !Number.isFinite(birthMonth) ||
    !Number.isFinite(birthDay) ||
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return 0;
  }

  const yearAge = year - birthYear;
  const monthOffset = month - birthMonth;
  const dayOffset = day - birthDay;
  const adjustedMonthOffset = monthOffset + dayOffset / 31;

  return yearAge + adjustedMonthOffset / 12;
}

export function validatePersonalDetailsRules(
  settings: Pick<PensionSettings, "dateOfBirth" | "startDate">,
  lifeExpectancyDate: string
): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];
  const hasValidDateOfBirth = isValidIsoDate(settings.dateOfBirth);
  const hasValidStartDate = isValidIsoDate(settings.startDate);

  if (!hasValidDateOfBirth) {
    issues.push({
      field: "dateOfBirth",
      message: "Date of birth must be a valid date.",
    });
  }

  if (!hasValidStartDate) {
    issues.push({
      field: "startDate",
      message: "Calculation start date must be a valid date.",
    });
  }

  if (
    hasValidDateOfBirth &&
    hasValidStartDate &&
    settings.dateOfBirth >= settings.startDate
  ) {
    issues.push({
      field: "dateOfBirth",
      message: "Date of birth must be before the calculation start date.",
    });
  }

  if (
    hasValidStartDate &&
    isValidIsoDate(lifeExpectancyDate) &&
    settings.startDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "startDate",
      message:
        "Calculation start date must be on or before the life expectancy date.",
    });
  }

  return issues;
}
