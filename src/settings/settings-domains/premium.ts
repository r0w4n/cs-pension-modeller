import {
  DEFAULT_PREMIUM_VALUATION_DATE,
  type PensionSettings,
  type PensionValidationIssue,
  type StoredPensionSettings,
} from "../settings-types";

export const premiumDefaults = {
  showPremium: false,
  premiumAnnualPensionAtValuationDate: 0,
  premiumValuationDate: DEFAULT_PREMIUM_VALUATION_DATE,
  premiumNormalPensionAge: 60,
  premiumDrawAge: 60,
  premiumEarliestAccessAge: 55 as const,
  premiumHasNpa65: false,
} as const;

export const premiumNumericSettingRules = {
  premiumAnnualPensionAtValuationDate: { min: 0, max: 50000, step: 1 },
  premiumNormalPensionAge: { min: 60, max: 65, step: 1 },
  premiumDrawAge: { min: 50, max: 70, step: 1 },
} as const;

export function normalizePremiumBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizePremiumEarliestAccessAge(value: unknown): 50 | 55 {
  return Number(value) === 50 ? 50 : 55;
}

export type PremiumValidationContext = {
  settings: Pick<
    PensionSettings,
    | "showPremium"
    | "startDate"
    | "premiumValuationDate"
    | "premiumDrawAge"
    | "premiumEarliestAccessAge"
  >;
  lifeExpectancyDate: string;
  premiumDrawDate: string;
};

export function validatePremiumRules({
  settings,
  lifeExpectancyDate,
  premiumDrawDate,
}: PremiumValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (!settings.showPremium) {
    return issues;
  }

  if (premiumDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "premiumDrawAge",
      message: "Premium pension draw age must be within life expectancy.",
    });
  }

  if (settings.premiumDrawAge < settings.premiumEarliestAccessAge) {
    issues.push({
      field: "premiumDrawAge",
      message:
        "Premium draw age must be at or after the selected earliest access age.",
    });
  }

  if (settings.premiumValuationDate > settings.startDate) {
    issues.push({
      field: "premiumValuationDate",
      message: "Premium valuation date must be on or before the current date.",
    });
  }

  return issues;
}

function coerceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function coerceBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function coercePremiumSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  return {
    showPremium: coerceBoolean(input.showPremium),
    premiumAnnualPensionAtValuationDate: coerceNumber(
      input.premiumAnnualPensionAtValuationDate
    ),
    premiumValuationDate: coerceString(input.premiumValuationDate),
    premiumNormalPensionAge: coerceNumber(input.premiumNormalPensionAge),
    premiumDrawAge: coerceNumber(input.premiumDrawAge),
    premiumEarliestAccessAge: normalizePremiumEarliestAccessAge(
      input.premiumEarliestAccessAge
    ),
    premiumHasNpa65: coerceBoolean(input.premiumHasNpa65),
  };
}
