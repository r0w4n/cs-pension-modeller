import {
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  type PensionSettings,
  type PensionValidationIssue,
  type SippTaxReliefRate,
  type SippWithdrawalStrategy,
} from "../settings-types";
import { resolveSippMinimumAccessAge } from "../settings-shared/state";

export function normalizeSippWithdrawalStrategy(
  value: unknown
): SippWithdrawalStrategy {
  return value === "percentage" ||
    value === "zero_at_death" ||
    value === "use_by_age"
    ? value
    : "use_by_age";
}

export function normalizeSippBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizeSippTaxReliefRate(value: unknown): SippTaxReliefRate {
  return value === "none" || value === "20" || value === "40" ? value : "20";
}

export function coerceSippTaxReliefRate(
  value: unknown,
  legacyBooleanValue: unknown
) {
  if (value === "none" || value === "20" || value === "40") {
    return value;
  }

  if (legacyBooleanValue === true) {
    return "20";
  }

  if (legacyBooleanValue === false) {
    return "none";
  }

  return undefined;
}

export type SippValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  sippDrawDate: string;
  sippWithdrawalTargetDate: string;
};

export function validateSippRules({
  settings,
  lifeExpectancyDate,
  sippDrawDate,
  sippWithdrawalTargetDate,
}: SippValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showSipp && sippDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "sippDrawAge",
      message: "SIPP draw start age must be within life expectancy.",
    });
  }

  if (settings.showSipp) {
    const minimumSippAccessAge = resolveSippMinimumAccessAge(settings);

    if (settings.sippDrawAge < minimumSippAccessAge) {
      issues.push({
        field: "sippDrawAge",
        message: createSippAccessAgeValidationMessage(
          settings,
          sippDrawDate,
          minimumSippAccessAge
        ),
      });
    }
  }

  if (
    settings.showSipp &&
    settings.sippWithdrawalStrategy === "use_by_age" &&
    sippWithdrawalTargetDate <= sippDrawDate
  ) {
    issues.push({
      field: "sippWithdrawalTargetAge",
      message: "SIPP use-by age must be after the SIPP draw start age.",
    });
  }

  if (
    settings.showSipp &&
    settings.sippWithdrawalStrategy === "use_by_age" &&
    sippWithdrawalTargetDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "sippWithdrawalTargetAge",
      message: "SIPP use-by age must be within life expectancy.",
    });
  }

  if (settings.showSipp && sippDrawDate <= settings.startDate) {
    issues.push({
      field: "sippDrawAge",
      message: "SIPP draw start age must be after the calculation start date.",
    });
  }

  return issues;
}

function createSippAccessAgeValidationMessage(
  settings: PensionSettings,
  sippDrawDate: string,
  minimumSippAccessAge: number
) {
  if (settings.sippHasProtectedPensionAge) {
    return `SIPP draw start age must not be earlier than the provider-confirmed protected SIPP access age of ${minimumSippAccessAge}.`;
  }

  if (sippDrawDate >= NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE) {
    return "SIPP draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age.";
  }

  return "SIPP draw start age must be at least 55 before 6 April 2028, unless your provider has confirmed an earlier protected pension age.";
}
