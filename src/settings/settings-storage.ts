import {
  coerceAddedPensionLumpSums,
  coerceLegacySippLumpSum,
} from "./settings-domains/alpha-pension";
import { coerceClassicSettings } from "./settings-domains/classic";
import { coerceNuvosSettings } from "./settings-domains/nuvos";
import { coercePremiumSettings } from "./settings-domains/premium";
import { coerceStatePensionSettings } from "./settings-domains/state-pension";
import { coerceSippTaxReliefRate } from "./settings-domains/sipp";
import { coerceTaxSettings } from "./settings-domains/tax";
import { createDefaultSettings } from "./settings-defaults";
import { migrateSettingsToLatest } from "./settings-migrations";
import { normalizeSettings } from "./settings-normalize";
import {
  LOCAL_STORAGE_ENABLED_KEY,
  SETTINGS_STORAGE_KEY,
  type AddedPensionFactorType,
  type IsaWithdrawalStrategy,
  type LisaWithdrawalStrategy,
  type ProjectionBasis,
  type SippWithdrawalStrategy,
  type StoredPensionSettings,
  type PensionSettings,
} from "./settings-types";
import {
  LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
  type StoredSettingsEnvelope,
} from "./settings-versions";

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

export function removeStorageItem(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearAllLocalStorageData() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

export function isLocalStorageEnabled() {
  return readStorageItem(LOCAL_STORAGE_ENABLED_KEY) !== "false";
}

export function saveLocalStoragePreference(enabled: boolean) {
  writeStorageItem(LOCAL_STORAGE_ENABLED_KEY, enabled ? "true" : "false");
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
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function isSettingsObject(
  input: unknown
): input is Partial<StoredPensionSettings> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function isStoredSettingsEnvelope(
  input: unknown
): input is StoredSettingsEnvelope<unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }

  const candidate = input as Partial<StoredSettingsEnvelope<unknown>>;

  return typeof candidate.version === "number" && "data" in candidate;
}

function coerceSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  const legacySippLumpSumContribution = coerceNumber(
    (input as { sippLumpSumContribution?: unknown }).sippLumpSumContribution
  );

  return {
    dateOfBirth: coerceString(input.dateOfBirth),
    lifeExpectancy: coerceNumber(input.lifeExpectancy),
    requirementAge: coerceNumber(input.requirementAge),
    showAlpha: coerceBoolean(input.showAlpha),
    projectionBasis: coerceString(input.projectionBasis) as
      | ProjectionBasis
      | undefined,
    inflationRateAnnual: coerceNumber(input.inflationRateAnnual),
    showSipp: coerceBoolean(input.showSipp),
    showIsa: coerceBoolean(input.showIsa),
    showLisa: coerceBoolean(input.showLisa),
    partialRetirementEnabled: coerceBoolean(input.partialRetirementEnabled),
    partialRetirementStartAge: coerceNumber(input.partialRetirementStartAge),
    partialRetirementWorkPercent: coerceNumber(
      input.partialRetirementWorkPercent
    ),
    fullSalary: coerceNumber(input.fullSalary),
    desiredRetirementIncome: coerceNumber(input.desiredRetirementIncome),
    applyPensionIncreases: coerceBoolean(input.applyPensionIncreases),
    assumedCpiPercent: coerceNumber(input.assumedCpiPercent),
    alphaPensionAbsDate: coerceString(input.alphaPensionAbsDate),
    alphaAddedPensionMonthly: coerceNumber(input.alphaAddedPensionMonthly),
    alphaAddedPensionFactorType: coerceString(
      input.alphaAddedPensionFactorType
    ) as AddedPensionFactorType | undefined,
    alphaPensionLeaveAge: coerceNumber(input.alphaPensionLeaveAge),
    accruedPensionAtLastAbs: coerceNumber(input.accruedPensionAtLastAbs),
    pensionableEarnings: coerceNumber(input.pensionableEarnings),
    alphaPayRisePercent: coerceNumber(input.alphaPayRisePercent),
    alphaPensionDrawAge: coerceNumber(input.alphaPensionDrawAge),
    alphaEpaEnabled: coerceBoolean(input.alphaEpaEnabled),
    alphaEpaYearsBeforeNpa: coerceNumber(input.alphaEpaYearsBeforeNpa),
    alphaEpaStartDate: coerceString(input.alphaEpaStartDate),
    alphaEpaEndDate: coerceString(input.alphaEpaEndDate),
    alphaAddedPensionLumpSums: coerceAddedPensionLumpSums(
      input.alphaAddedPensionLumpSums,
      {
        includeFactorType: true,
      }
    ),
    sippCurrentPot: coerceNumber(input.sippCurrentPot),
    sippMonthlyContribution: coerceNumber(input.sippMonthlyContribution),
    sippDrawAge: coerceNumber(input.sippDrawAge),
    sippLumpSums:
      coerceAddedPensionLumpSums(input.sippLumpSums) ??
      coerceLegacySippLumpSum(legacySippLumpSumContribution),
    sippRealInterestPercent: coerceNumber(input.sippRealInterestPercent),
    sippTaxReliefRate: coerceSippTaxReliefRate(
      (input as { sippTaxReliefRate?: unknown }).sippTaxReliefRate,
      (input as { sippApplyTaxRelief?: unknown }).sippApplyTaxRelief
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
    lisaCurrentPot: coerceNumber(input.lisaCurrentPot),
    lisaMonthlyContribution: coerceNumber(input.lisaMonthlyContribution),
    lisaDrawAge: coerceNumber(input.lisaDrawAge),
    lisaLumpSums: coerceAddedPensionLumpSums(input.lisaLumpSums),
    lisaRealInterestPercent: coerceNumber(input.lisaRealInterestPercent),
    lisaWithdrawalStrategy: coerceString(input.lisaWithdrawalStrategy) as
      | LisaWithdrawalStrategy
      | undefined,
    lisaWithdrawalPercent: coerceNumber(input.lisaWithdrawalPercent),
    lisaWithdrawalTargetAge: coerceNumber(input.lisaWithdrawalTargetAge),
    ...coerceClassicSettings(input),
    ...coerceStatePensionSettings(input),
    ...coerceNuvosSettings(input),
    ...coercePremiumSettings(input),
    ...coerceTaxSettings(input),
  };
}

export function loadStoredSettings(): PensionSettings {
  if (!isLocalStorageEnabled()) {
    return createDefaultSettings();
  }

  const stored = readStorageItem(SETTINGS_STORAGE_KEY);

  if (!stored) {
    return createDefaultSettings();
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    const envelope: StoredSettingsEnvelope<unknown> = isStoredSettingsEnvelope(
      parsed
    )
      ? parsed
      : {
          version: LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
          data: parsed,
        };

    return (
      parseStoredSettings(migrateSettingsToLatest(envelope)) ??
      createDefaultSettings()
    );
  } catch {
    return createDefaultSettings();
  }
}

export function parseStoredSettings(input: unknown): PensionSettings | null {
  if (!isSettingsObject(input)) {
    return null;
  }

  const defaults = createDefaultSettings();

  return normalizeSettings({
    ...defaults,
    ...removeUndefinedValues(coerceSettings(input)),
  });
}

export function saveSettings(settings: PensionSettings) {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  const storedSettings = getStoredSettingsSnapshot(settings);
  const envelope: StoredSettingsEnvelope = {
    version: SETTINGS_SCHEMA_VERSION,
    data: storedSettings,
  };

  return writeStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(envelope));
}

export function clearStoredSettings() {
  return removeStorageItem(SETTINGS_STORAGE_KEY);
}

export function getStoredSettingsSnapshot(
  settings: PensionSettings
): StoredPensionSettings {
  const normalizedSettings = normalizeSettings(settings);
  const {
    startDate: _startDate,
    normalPensionAge: _normalPensionAge,
    ...storedSettings
  } = normalizedSettings;
  return storedSettings;
}
