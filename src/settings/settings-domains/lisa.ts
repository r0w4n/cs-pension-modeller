import type {
  LisaWithdrawalStrategy,
  PensionSettings,
  PensionValidationIssue,
} from "../settings-types";
import { addYearsToIsoDate } from "../settings-shared/date";

export const LISA_ACCESS_AGE = 60;
export const LISA_CONTRIBUTION_STOP_AGE = 50;
export const LISA_ANNUAL_ALLOWANCE = 4_000;
export const LISA_MONTHLY_CONTRIBUTION_MAX = LISA_ANNUAL_ALLOWANCE / 12;
export const LISA_GOVERNMENT_BONUS_RATE = 0.25;

export function normalizeLisaWithdrawalStrategy(
  value: unknown
): LisaWithdrawalStrategy {
  return value === "percentage" ||
    value === "zero_at_death" ||
    value === "use_by_age"
    ? value
    : "use_by_age";
}

export function normalizeLisaBooleanSetting(value: unknown) {
  return Boolean(value);
}

export type LisaValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  lisaDrawDate: string;
  lisaWithdrawalTargetDate: string;
};

export function validateLisaRules({
  settings,
  lifeExpectancyDate,
  lisaDrawDate,
  lisaWithdrawalTargetDate,
}: LisaValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showLisa && lisaDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "lisaDrawAge",
      message: "LISA draw start age must be within life expectancy.",
    });
  }

  if (
    settings.showLisa &&
    lisaDrawDate < addYearsToIsoDate(settings.dateOfBirth, LISA_ACCESS_AGE)
  ) {
    issues.push({
      field: "lisaDrawAge",
      message: "LISA draw start age must be at least 60.",
    });
  }

  if (
    settings.showLisa &&
    settings.lisaWithdrawalStrategy === "use_by_age" &&
    lisaWithdrawalTargetDate <= lisaDrawDate
  ) {
    issues.push({
      field: "lisaWithdrawalTargetAge",
      message: "LISA use-by age must be after the LISA draw start age.",
    });
  }

  if (
    settings.showLisa &&
    settings.lisaWithdrawalStrategy === "use_by_age" &&
    lisaWithdrawalTargetDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "lisaWithdrawalTargetAge",
      message: "LISA use-by age must be within life expectancy.",
    });
  }

  if (settings.showLisa && lisaDrawDate <= settings.startDate) {
    issues.push({
      field: "lisaDrawAge",
      message: "LISA draw start age must be after the calculation start date.",
    });
  }

  return issues;
}
