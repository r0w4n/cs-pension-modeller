import type {
  PensionSettings,
  PensionValidationIssue,
} from "../settings-types";
import { addYearsToIsoDate } from "../settings-shared/date";

export function getPartialRetirementStartDate(settings: PensionSettings) {
  return addYearsToIsoDate(
    settings.dateOfBirth,
    settings.partialRetirementStartAge
  );
}

export function getPartialRetirementMonthlyEmploymentIncome(
  settings: PensionSettings,
  rowDate: string
) {
  const retirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );

  if (
    !settings.partialRetirementEnabled ||
    rowDate < getPartialRetirementStartDate(settings) ||
    rowDate >= retirementDate
  ) {
    return 0;
  }

  return (
    (Math.max(0, settings.fullSalary) *
      (settings.partialRetirementWorkPercent / 100)) /
    12
  );
}

export function getPreRetirementMonthlyEmploymentTaxContext(
  settings: PensionSettings,
  rowDate: string
) {
  // This is tax-rate context only: it prevents retirement from appearing to
  // create a new Personal Allowance without adding salary to retirement cash flow.
  const retirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );

  if (rowDate >= retirementDate) {
    return 0;
  }

  if (
    settings.partialRetirementEnabled &&
    rowDate >= getPartialRetirementStartDate(settings)
  ) {
    return 0;
  }

  return Math.max(0, settings.fullSalary) / 12;
}

export function normalizePartialRetirementBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function getPartialRetirementContributionMultiplier(
  settings: PensionSettings,
  rowDate: string
) {
  if (!settings.partialRetirementEnabled) {
    return 1;
  }

  return rowDate >= getPartialRetirementStartDate(settings)
    ? settings.partialRetirementWorkPercent / 100
    : 1;
}

export function getPartialRetirementSavingsContributionMultiplier(
  settings: PensionSettings,
  rowDate: string
) {
  if (
    !settings.partialRetirementEnabled ||
    rowDate < getPartialRetirementStartDate(settings)
  ) {
    return 1;
  }

  const fullSalary = Math.max(0, settings.fullSalary);
  const partialSalary =
    fullSalary * (settings.partialRetirementWorkPercent / 100);

  return fullSalary > 0
    ? partialSalary / fullSalary
    : settings.partialRetirementWorkPercent / 100;
}

export type PartialRetirementValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  retirementDate: string;
  partialRetirementStartDate: string;
};

export function validatePartialRetirementRules({
  settings,
  lifeExpectancyDate,
  retirementDate,
  partialRetirementStartDate,
}: PartialRetirementValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (
    settings.partialRetirementEnabled &&
    partialRetirementStartDate <= settings.dateOfBirth
  ) {
    issues.push({
      field: "partialRetirementStartAge",
      message: "Partial retirement must start after date of birth.",
    });
  }

  if (
    settings.partialRetirementEnabled &&
    partialRetirementStartDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "partialRetirementStartAge",
      message: "Partial retirement start must be within life expectancy.",
    });
  }

  if (
    settings.partialRetirementEnabled &&
    partialRetirementStartDate >= retirementDate
  ) {
    issues.push({
      field: "partialRetirementStartAge",
      message:
        "Partial retirement start age must be before the retirement start age.",
    });
  }

  return issues;
}
