import {
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  type PensionSettings,
  type PensionValidationIssue,
  type CsAvcWithdrawalStrategy,
} from "../settings-types";
import { resolveCsAvcMinimumAccessAge } from "../settings-shared/state";

export function normalizeCsAvcWithdrawalStrategy(
  value: unknown
): CsAvcWithdrawalStrategy {
  return value === "percentage" ||
    value === "zero_at_death" ||
    value === "use_by_age"
    ? value
    : "use_by_age";
}

export function normalizeCsAvcBooleanSetting(value: unknown) {
  return Boolean(value);
}

export type CsAvcValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  csAvcDrawDate: string;
  csAvcWithdrawalTargetDate: string;
};

export function validateCsAvcRules({
  settings,
  lifeExpectancyDate,
  csAvcDrawDate,
  csAvcWithdrawalTargetDate,
}: CsAvcValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showCsAvc && csAvcDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "csAvcDrawAge",
      message: "CS AVC draw start age must be within life expectancy.",
    });
  }

  if (settings.showCsAvc) {
    const minimumCsAvcAccessAge = resolveCsAvcMinimumAccessAge(settings);

    if (settings.csAvcDrawAge < minimumCsAvcAccessAge) {
      issues.push({
        field: "csAvcDrawAge",
        message: createCsAvcAccessAgeValidationMessage(
          settings,
          csAvcDrawDate,
          minimumCsAvcAccessAge
        ),
      });
    }
  }

  if (
    settings.showCsAvc &&
    settings.csAvcWithdrawalStrategy === "use_by_age" &&
    csAvcWithdrawalTargetDate <= csAvcDrawDate
  ) {
    issues.push({
      field: "csAvcWithdrawalTargetAge",
      message: "CS AVC use-by age must be after the CS AVC draw start age.",
    });
  }

  if (
    settings.showCsAvc &&
    settings.csAvcWithdrawalStrategy === "use_by_age" &&
    csAvcWithdrawalTargetDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "csAvcWithdrawalTargetAge",
      message: "CS AVC use-by age must be within life expectancy.",
    });
  }

  if (settings.showCsAvc && csAvcDrawDate <= settings.startDate) {
    issues.push({
      field: "csAvcDrawAge",
      message: "CS AVC draw start age must be after the current date.",
    });
  }

  return issues;
}

function createCsAvcAccessAgeValidationMessage(
  settings: PensionSettings,
  csAvcDrawDate: string,
  minimumCsAvcAccessAge: number
) {
  if (settings.csAvcHasProtectedPensionAge) {
    return `CS AVC draw start age must not be earlier than the provider-confirmed protected CS AVC access age of ${minimumCsAvcAccessAge}.`;
  }

  if (csAvcDrawDate >= NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE) {
    return "CS AVC draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age.";
  }

  return "CS AVC draw start age must be at least 55 before 6 April 2028, unless your provider has confirmed an earlier protected pension age.";
}
