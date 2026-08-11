import type {
  PensionWithdrawalTaxTreatment,
  StoredPensionSettings,
  TaxRegime,
} from "../settings-types";
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

export const PENSION_WITHDRAWAL_TAX_TREATMENT_OPTIONS = [
  {
    value: "fully_taxable",
    label: "Fully taxable drawdown",
  },
  {
    value: "ufpls",
    label: "25% tax-free on each withdrawal",
  },
  {
    value: "custom",
    label: "Custom tax-free share",
  },
  {
    value: "unknown",
    label: "Not confirmed — assume fully taxable",
  },
] as const satisfies readonly {
  value: PensionWithdrawalTaxTreatment;
  label: string;
}[];

export const taxDefaults = {
  taxationEnabled: true,
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
  taxSippWithdrawalTreatment: "ufpls" as PensionWithdrawalTaxTreatment,
  taxSippTaxFreeWithdrawalPercent:
    PENSION_WITHDRAWAL_TAX_RULES.usualMaximumTaxFreeSharePercent,
  taxCsAvcWithdrawalTreatment: "ufpls" as PensionWithdrawalTaxTreatment,
  taxCsAvcTaxFreeWithdrawalPercent:
    PENSION_WITHDRAWAL_TAX_RULES.usualMaximumTaxFreeSharePercent,
  taxTrackLumpSumAllowance: true,
  taxLumpSumAllowance: PENSION_WITHDRAWAL_TAX_RULES.standardLumpSumAllowance,
  taxLumpSumAllowanceUsed: 0,
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
  taxLumpSumAllowance: { min: 0, max: 2_000_000, step: 1 },
  taxLumpSumAllowanceUsed: { min: 0, max: 2_000_000, step: 1 },
} as const;

export function normalizeTaxationBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizeTaxRegime(value: unknown): TaxRegime {
  return value === "scotland" ? "scotland" : "rest_of_uk";
}

export function normalizePensionWithdrawalTaxTreatment(
  value: unknown
): PensionWithdrawalTaxTreatment {
  return value === "fully_taxable" ||
    value === "ufpls" ||
    value === "custom" ||
    value === "unknown"
    ? value
    : "unknown";
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
    taxSippWithdrawalTreatment:
      typeof input.taxSippWithdrawalTreatment === "string"
        ? normalizePensionWithdrawalTaxTreatment(
            input.taxSippWithdrawalTreatment
          )
        : undefined,
    taxSippTaxFreeWithdrawalPercent: coerceNumber(
      input.taxSippTaxFreeWithdrawalPercent
    ),
    taxCsAvcWithdrawalTreatment:
      typeof input.taxCsAvcWithdrawalTreatment === "string"
        ? normalizePensionWithdrawalTaxTreatment(
            input.taxCsAvcWithdrawalTreatment
          )
        : undefined,
    taxCsAvcTaxFreeWithdrawalPercent: coerceNumber(
      input.taxCsAvcTaxFreeWithdrawalPercent
    ),
    taxTrackLumpSumAllowance: coerceBoolean(input.taxTrackLumpSumAllowance),
    taxLumpSumAllowance: coerceNumber(input.taxLumpSumAllowance),
    taxLumpSumAllowanceUsed: coerceNumber(input.taxLumpSumAllowanceUsed),
  };
}
