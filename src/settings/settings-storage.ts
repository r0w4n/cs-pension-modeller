import {
  coerceAddedPensionLumpSums,
  coerceLegacySippLumpSum,
} from "./settings-domains/alpha-pension";
import { coerceNuvosSettings } from "./settings-domains/nuvos";
import { coerceStatePensionSettings } from "./settings-domains/state-pension";
import { coerceSippTaxReliefRate } from "./settings-domains/sipp";
import { coerceTaxSettings } from "./settings-domains/tax";
import { createDefaultSettings } from "./settings-defaults";
import { normalizeSettings } from "./settings-normalize";
import { SETTINGS_STORAGE_KEY, type AddedPensionFactorType, type IsaWithdrawalStrategy, type ProjectionBasis, type SippWithdrawalStrategy, type StoredPensionSettings, type PensionSettings } from "./settings-types";

export function readStorageItem(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
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

function removeUndefinedValues<T extends object>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function coerceSettings(input: Partial<StoredPensionSettings>): Partial<StoredPensionSettings> {
  const legacySippLumpSumContribution = coerceNumber(
    (input as { sippLumpSumContribution?: unknown }).sippLumpSumContribution,
  );

  return {
    dateOfBirth: coerceString(input.dateOfBirth),
    lifeExpectancy: coerceNumber(input.lifeExpectancy),
    requirementAge:
      coerceNumber(input.requirementAge) ??
      coerceNumber((input as { targetRetirementAge?: unknown }).targetRetirementAge) ??
      coerceNumber(input.isaDrawAge),
    showAlpha: coerceBoolean(input.showAlpha),
    projectionBasis: coerceString(input.projectionBasis) as ProjectionBasis | undefined,
    inflationRateAnnual: coerceNumber(input.inflationRateAnnual),
    showSipp: coerceBoolean(input.showSipp),
    showIsa: coerceBoolean(input.showIsa),
    partialRetirementEnabled: coerceBoolean(input.partialRetirementEnabled),
    partialRetirementStartAge: coerceNumber(input.partialRetirementStartAge),
    partialRetirementWorkPercent: coerceNumber(input.partialRetirementWorkPercent),
    fullSalary: coerceNumber(input.fullSalary),
    desiredRetirementIncome: coerceNumber(input.desiredRetirementIncome),
    applyPensionIncreases: coerceBoolean(input.applyPensionIncreases),
    assumedCpiPercent: coerceNumber(input.assumedCpiPercent),
    alphaPensionAbsDate: coerceString(input.alphaPensionAbsDate),
    alphaAddedPensionMonthly: coerceNumber(input.alphaAddedPensionMonthly),
    alphaAddedPensionFactorType: coerceString(input.alphaAddedPensionFactorType) as
      | AddedPensionFactorType
      | undefined,
    alphaPensionLeaveAge: coerceNumber(input.alphaPensionLeaveAge),
    accruedPensionAtLastAbs: coerceNumber(input.accruedPensionAtLastAbs),
    pensionableEarnings: coerceNumber(input.pensionableEarnings),
    alphaPensionDrawAge: coerceNumber(input.alphaPensionDrawAge),
    alphaEpaEnabled: coerceBoolean(input.alphaEpaEnabled),
    alphaEpaYearsBeforeNpa: coerceNumber(input.alphaEpaYearsBeforeNpa),
    alphaEpaStartDate: coerceString(input.alphaEpaStartDate),
    alphaEpaEndDate: coerceString(input.alphaEpaEndDate),
    alphaAddedPensionLumpSums: coerceAddedPensionLumpSums(input.alphaAddedPensionLumpSums, {
      includeFactorType: true,
    }),
    sippCurrentPot: coerceNumber(input.sippCurrentPot),
    sippMonthlyContribution: coerceNumber(input.sippMonthlyContribution),
    sippDrawAge: coerceNumber(input.sippDrawAge),
    sippLumpSums:
      coerceAddedPensionLumpSums(input.sippLumpSums) ??
      coerceLegacySippLumpSum(legacySippLumpSumContribution),
    sippRealInterestPercent: coerceNumber(input.sippRealInterestPercent),
    sippTaxReliefRate: coerceSippTaxReliefRate(
      (input as { sippTaxReliefRate?: unknown }).sippTaxReliefRate,
      (input as { sippApplyTaxRelief?: unknown }).sippApplyTaxRelief,
    ),
    sippWithdrawalStrategy: coerceString(input.sippWithdrawalStrategy) as
      | SippWithdrawalStrategy
      | undefined,
    sippWithdrawalPercent: coerceNumber(input.sippWithdrawalPercent),
    sippWithdrawalTargetAge: coerceNumber(input.sippWithdrawalTargetAge),
    isaCurrentPot: coerceNumber(input.isaCurrentPot),
    isaMonthlyContribution: coerceNumber(input.isaMonthlyContribution),
    isaDrawAge: coerceNumber(input.isaDrawAge),
    isaLumpSums: coerceAddedPensionLumpSums(input.isaLumpSums),
    isaRealInterestPercent: coerceNumber(input.isaRealInterestPercent),
    isaWithdrawalStrategy: coerceString(input.isaWithdrawalStrategy) as
      | IsaWithdrawalStrategy
      | undefined,
    isaWithdrawalPercent: coerceNumber(input.isaWithdrawalPercent),
    isaWithdrawalTargetAge: coerceNumber(input.isaWithdrawalTargetAge),
    ...coerceStatePensionSettings(input),
    ...coerceNuvosSettings(input),
    ...coerceTaxSettings(input),
  };
}

export function loadStoredSettings(): PensionSettings {
  const defaults = createDefaultSettings();
  const stored = readStorageItem(SETTINGS_STORAGE_KEY);

  if (!stored) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredPensionSettings>;

    return normalizeSettings({
      ...defaults,
      ...removeUndefinedValues(coerceSettings(parsed)),
    });
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: PensionSettings) {
  const normalizedSettings = normalizeSettings(settings);
  const { startDate: _startDate, normalPensionAge: _normalPensionAge, ...storedSettings } =
    normalizedSettings;

  writeStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(storedSettings));
}
