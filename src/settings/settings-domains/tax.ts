import type { StoredPensionSettings } from "../settings-types";

export const taxDefaults = {
  taxationEnabled: false,
  taxPersonalAllowance: 12570,
  taxPersonalAllowanceTaperThreshold: 100000,
  taxBasicRateLimit: 37700,
  taxAdditionalRateThreshold: 125140,
  taxBasicRatePercent: 20,
  taxHigherRatePercent: 40,
  taxAdditionalRatePercent: 45,
  taxSippTaxFreeWithdrawalPercent: 25,
  taxCsAvcTaxFreeWithdrawalPercent: 25,
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
