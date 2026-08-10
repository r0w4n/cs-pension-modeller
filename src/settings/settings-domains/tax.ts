import type { StoredPensionSettings, TaxRegime } from "../settings-types";
import {
  PENSION_WITHDRAWAL_TAX_RULES,
  REST_OF_UK_INCOME_TAX_RULES,
  UK_INCOME_TAX_COMMON_RULES,
} from "../../data/income-tax-rules";

export const TAX_REGIME_OPTIONS = [
  {
    value: "rest_of_uk",
    label: "England, Wales or Northern Ireland (2026/27)",
  },
  { value: "scotland", label: "Scotland (2026/27)" },
] as const satisfies readonly { value: TaxRegime; label: string }[];

export const taxDefaults = {
  taxationEnabled: false,
  taxRegime: "rest_of_uk",
  taxPersonalAllowance: UK_INCOME_TAX_COMMON_RULES.personalAllowance,
  taxPersonalAllowanceTaperThreshold:
    UK_INCOME_TAX_COMMON_RULES.personalAllowanceTaperThreshold,
  taxBasicRateLimit: REST_OF_UK_INCOME_TAX_RULES.bands[0].upperTaxableIncome,
  taxAdditionalRateThreshold:
    REST_OF_UK_INCOME_TAX_RULES.bands[1].upperTaxableIncome,
  taxBasicRatePercent: REST_OF_UK_INCOME_TAX_RULES.bands[0].ratePercent,
  taxHigherRatePercent: REST_OF_UK_INCOME_TAX_RULES.bands[1].ratePercent,
  taxAdditionalRatePercent: REST_OF_UK_INCOME_TAX_RULES.bands[2].ratePercent,
  taxSippTaxFreeWithdrawalPercent:
    PENSION_WITHDRAWAL_TAX_RULES.usualMaximumTaxFreeSharePercent,
  taxCsAvcTaxFreeWithdrawalPercent:
    PENSION_WITHDRAWAL_TAX_RULES.usualMaximumTaxFreeSharePercent,
} as const;

export const taxNumericSettingRules = {
  taxPersonalAllowance: { min: 0, max: 50000, step: 1 },
  taxPersonalAllowanceTaperThreshold: { min: 0, max: 200000, step: 1 },
  taxBasicRateLimit: { min: 0, max: 100000, step: 1 },
  taxAdditionalRateThreshold: { min: 0, max: 300000, step: 1 },
  taxBasicRatePercent: { min: 0, max: 100, step: 0.1 },
  taxHigherRatePercent: { min: 0, max: 100, step: 0.1 },
  taxAdditionalRatePercent: { min: 0, max: 100, step: 0.1 },
  taxSippTaxFreeWithdrawalPercent: { min: 0, max: 25, step: 0.1 },
  taxCsAvcTaxFreeWithdrawalPercent: { min: 0, max: 25, step: 0.1 },
} as const;

export function normalizeTaxationBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizeTaxRegime(value: unknown): TaxRegime {
  return value === "scotland" ? "scotland" : "rest_of_uk";
}

function coerceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function coerceTaxSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  return {
    taxationEnabled: coerceBoolean(input.taxationEnabled),
    taxRegime:
      input.taxRegime === "rest_of_uk" || input.taxRegime === "scotland"
        ? input.taxRegime
        : undefined,
    taxPersonalAllowance: coerceNumber(input.taxPersonalAllowance),
    taxPersonalAllowanceTaperThreshold: coerceNumber(
      input.taxPersonalAllowanceTaperThreshold
    ),
    taxBasicRateLimit: coerceNumber(input.taxBasicRateLimit),
    taxAdditionalRateThreshold: coerceNumber(input.taxAdditionalRateThreshold),
    taxBasicRatePercent: coerceNumber(input.taxBasicRatePercent),
    taxHigherRatePercent: coerceNumber(input.taxHigherRatePercent),
    taxAdditionalRatePercent: coerceNumber(input.taxAdditionalRatePercent),
    taxSippTaxFreeWithdrawalPercent: coerceNumber(
      input.taxSippTaxFreeWithdrawalPercent
    ),
    taxCsAvcTaxFreeWithdrawalPercent: coerceNumber(
      input.taxCsAvcTaxFreeWithdrawalPercent
    ),
  };
}
