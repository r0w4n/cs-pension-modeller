import type {
  IsaWithdrawalStrategy,
  PensionSettings,
  PensionValidationIssue,
} from "../settings-types";
import { normalizeFlexibleWithdrawalStrategy } from "../settings-types";
import { roundModelAge } from "../settings-shared/age";

export const ISA_DEFAULT_YEARS_BEFORE_NPA = 10;

export function calculateDefaultIsaDrawAge(normalPensionAge: number) {
  return roundModelAge(normalPensionAge - ISA_DEFAULT_YEARS_BEFORE_NPA);
}

export function normalizeIsaWithdrawalStrategy(
  value: unknown
): IsaWithdrawalStrategy {
  return normalizeFlexibleWithdrawalStrategy(value);
}

export function normalizeIsaBooleanSetting(value: unknown) {
  return Boolean(value);
}

export type IsaValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  isaDrawDate: string;
  isaWithdrawalTargetDate: string;
};

export function validateIsaRules({
  settings,
  lifeExpectancyDate,
  isaDrawDate,
  isaWithdrawalTargetDate,
}: IsaValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showIsa && isaDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "isaDrawAge",
      message: "ISA draw start age must be within life expectancy.",
    });
  }

  if (
    settings.showIsa &&
    settings.isaWithdrawalStrategy === "use_by_age" &&
    isaWithdrawalTargetDate <= isaDrawDate
  ) {
    issues.push({
      field: "isaWithdrawalTargetAge",
      message: "ISA use-by age must be after the ISA draw start age.",
    });
  }

  if (
    settings.showIsa &&
    settings.isaWithdrawalStrategy === "use_by_age" &&
    isaWithdrawalTargetDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "isaWithdrawalTargetAge",
      message: "ISA use-by age must be within life expectancy.",
    });
  }

  if (settings.showIsa && isaDrawDate <= settings.startDate) {
    issues.push({
      field: "isaDrawAge",
      message: "ISA draw start age must be after the current date.",
    });
  }

  return issues;
}
