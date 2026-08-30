import {
  coerceAlphaEpaPeriods,
  coerceAddedPensionLumpSums,
  coerceLegacySippLumpSum,
} from "./settings-domains/alpha-pension";
import { normalizeAdditionalGuaranteedIncomes } from "./settings-domains/additional-guaranteed-income";
import { coerceClassicSettings } from "./settings-domains/classic";
import { coerceNuvosSettings } from "./settings-domains/nuvos";
import { coercePremiumSettings } from "./settings-domains/premium";
import { coerceStatePensionSettings } from "./settings-domains/state-pension";
import {
  calculateDefaultSippDrawAge,
  coerceSippTaxReliefRate,
} from "./settings-domains/sipp";
import { calculateDefaultIsaDrawAge } from "./settings-domains/isa";
import { coerceTaxSettings } from "./settings-domains/tax";
import { createDefaultSettings } from "./settings-defaults";
import { migrateSettingsToLatest } from "./settings-migrations";
import { normalizeSettings } from "./settings-normalize";
import { calculateNormalPensionAge } from "./settings-shared/state";
import {
  LOCAL_STORAGE_ENABLED_KEY,
  SETTINGS_STORAGE_KEY,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  type AddedPensionFactorType,
  type FlexibleFundAccountId,
  type IsaWithdrawalStrategy,
  type LisaWithdrawalStrategy,
  type ProjectionBasis,
  type RetirementIncomeTargetBasis,
  type CsAvcWithdrawalStrategy,
  type SippWithdrawalStrategy,
  type SpendingStrategyType,
  type StoredPensionSettings,
  type PensionSettingsByJourney,
  type SettingsJourney,
  type StoredPensionSettingsByJourney,
  type PensionSettings,
  type JointRetirementSettings,
  type PartnerSettings,
} from "./settings-types";
import {
  LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
  type StoredJourneySettingsData,
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

function coerceFlexibleWithdrawalPriority(
  value: unknown
): FlexibleFundAccountId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const allowed = new Set<FlexibleFundAccountId>(FLEXIBLE_FUND_ACCOUNT_IDS);
  const priority = value.filter(
    (item): item is FlexibleFundAccountId =>
      typeof item === "string" && allowed.has(item as FlexibleFundAccountId)
  );

  return priority.length > 0 ? priority : undefined;
}

function removeUndefinedValues<T extends object>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function isSettingsObject(input: unknown): input is Record<string, unknown> {
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
      ProjectionBasis | undefined,
    inflationRateAnnual: coerceNumber(input.inflationRateAnnual),
    showSipp: coerceBoolean(input.showSipp),
    showCsAvc: coerceBoolean(input.showCsAvc),
    showIsa: coerceBoolean(input.showIsa),
    showLisa: coerceBoolean(input.showLisa),
    showAdditionalGuaranteedIncome: coerceBoolean(
      input.showAdditionalGuaranteedIncome
    ),
    additionalGuaranteedIncomes: normalizeAdditionalGuaranteedIncomes(
      input.additionalGuaranteedIncomes
    ),
    partialRetirementEnabled: coerceBoolean(input.partialRetirementEnabled),
    partialRetirementStartAge: coerceNumber(input.partialRetirementStartAge),
    partialRetirementWorkPercent: coerceNumber(
      input.partialRetirementWorkPercent
    ),
    fullSalary: coerceNumber(input.fullSalary),
    desiredRetirementIncome: coerceNumber(input.desiredRetirementIncome),
    retirementIncomeTargetBasis: coerceString(
      input.retirementIncomeTargetBasis
    ) as RetirementIncomeTargetBasis | undefined,
    spendingStrategyType: coerceString(input.spendingStrategyType) as
      SpendingStrategyType | undefined,
    spendingSmile:
      input.spendingSmile &&
      typeof input.spendingSmile === "object" &&
      !Array.isArray(input.spendingSmile)
        ? input.spendingSmile
        : undefined,
    flexibleWithdrawalPriority: coerceFlexibleWithdrawalPriority(
      input.flexibleWithdrawalPriority
    ),
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
    alphaEpaPeriods: coerceAlphaEpaPeriods(input.alphaEpaPeriods),
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
    sippHasProtectedPensionAge: coerceBoolean(input.sippHasProtectedPensionAge),
    sippProtectedPensionAge: coerceNumber(input.sippProtectedPensionAge),
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
      SippWithdrawalStrategy | undefined,
    sippWithdrawalPercent: coerceNumber(input.sippWithdrawalPercent),
    sippWithdrawalTargetAge: coerceNumber(input.sippWithdrawalTargetAge),
    csAvcCurrentPot: coerceNumber(input.csAvcCurrentPot),
    csAvcMonthlyContribution: coerceNumber(input.csAvcMonthlyContribution),
    csAvcHasProtectedPensionAge: coerceBoolean(
      input.csAvcHasProtectedPensionAge
    ),
    csAvcProtectedPensionAge: coerceNumber(input.csAvcProtectedPensionAge),
    csAvcDrawAge: coerceNumber(input.csAvcDrawAge),
    csAvcLumpSums: coerceAddedPensionLumpSums(input.csAvcLumpSums),
    csAvcRealInterestPercent: coerceNumber(input.csAvcRealInterestPercent),
    csAvcWithdrawalStrategy: coerceString(input.csAvcWithdrawalStrategy) as
      CsAvcWithdrawalStrategy | undefined,
    csAvcWithdrawalPercent: coerceNumber(input.csAvcWithdrawalPercent),
    csAvcWithdrawalTargetAge: coerceNumber(input.csAvcWithdrawalTargetAge),
    isaCurrentPot: coerceNumber(input.isaCurrentPot),
    isaMonthlyContribution: coerceNumber(input.isaMonthlyContribution),
    isaDrawAge: coerceNumber(input.isaDrawAge),
    isaLumpSums: coerceAddedPensionLumpSums(input.isaLumpSums),
    isaRealInterestPercent: coerceNumber(input.isaRealInterestPercent),
    isaWithdrawalStrategy: coerceString(input.isaWithdrawalStrategy) as
      IsaWithdrawalStrategy | undefined,
    isaWithdrawalPercent: coerceNumber(input.isaWithdrawalPercent),
    isaWithdrawalTargetAge: coerceNumber(input.isaWithdrawalTargetAge),
    lisaCurrentPot: coerceNumber(input.lisaCurrentPot),
    lisaMonthlyContribution: coerceNumber(input.lisaMonthlyContribution),
    lisaDrawAge: coerceNumber(input.lisaDrawAge),
    lisaLumpSums: coerceAddedPensionLumpSums(input.lisaLumpSums),
    lisaRealInterestPercent: coerceNumber(input.lisaRealInterestPercent),
    lisaWithdrawalStrategy: coerceString(input.lisaWithdrawalStrategy) as
      LisaWithdrawalStrategy | undefined,
    lisaWithdrawalPercent: coerceNumber(input.lisaWithdrawalPercent),
    lisaWithdrawalTargetAge: coerceNumber(input.lisaWithdrawalTargetAge),
    ...coerceClassicSettings(input),
    ...coerceStatePensionSettings(input),
    ...coerceNuvosSettings(input),
    ...coercePremiumSettings(input),
    ...coerceTaxSettings(input),
    partner: coercePartnerSettings(input.partner),
    jointRetirement: coerceJointRetirementSettings(input.jointRetirement),
  };
}

function coercePartnerSettings(value: unknown): PartnerSettings | undefined {
  if (!isSettingsObject(value)) {
    return undefined;
  }

  // The normalizer fills safe defaults while preserving the Partner's own date
  // of birth, including an explicitly blank value from an imported plan.
  return coerceSettings(value) as PartnerSettings;
}

function coerceJointRetirementSettings(
  value: unknown
): JointRetirementSettings | undefined {
  if (!isSettingsObject(value)) {
    return undefined;
  }

  const priority = Array.isArray(value.flexibleWithdrawalPriority)
    ? value.flexibleWithdrawalPriority.filter(
        (entry): entry is `${"you" | "partner"}:${FlexibleFundAccountId}` =>
          typeof entry === "string" &&
          /^(you|partner):(sipp|csAvc|lisa|isa)$/.test(entry)
      )
    : [];

  return {
    enabled: coerceBoolean(value.enabled) ?? false,
    transitionDesiredRetirementIncome:
      coerceNumber(value.transitionDesiredRetirementIncome) ?? 0,
    fullyRetiredDesiredRetirementIncome:
      coerceNumber(value.fullyRetiredDesiredRetirementIncome) ?? 0,
    spendingStrategyType:
      value.spendingStrategyType === "SPENDING_SMILE"
        ? "SPENDING_SMILE"
        : "FLAT",
    spendingSmile:
      value.spendingSmile &&
      typeof value.spendingSmile === "object" &&
      !Array.isArray(value.spendingSmile)
        ? (value.spendingSmile as JointRetirementSettings["spendingSmile"])
        : {
            goGoPercentage: 100,
            slowGoStartAge: 75,
            slowGoPercentage: 85,
            noGoStartAge: 85,
            noGoPercentage: 70,
          },
    flexibleWithdrawalPriority: priority,
  };
}

export function loadStoredSettings(): PensionSettings {
  return loadStoredSettingsByJourney().settings.expert;
}

export type LoadedJourneySettings = {
  settings: PensionSettingsByJourney;
  migratedFromLegacy: boolean;
};

export function loadStoredSettingsByJourney(): LoadedJourneySettings {
  if (!isLocalStorageEnabled()) {
    return createDefaultJourneySettings();
  }

  const stored = readStorageItem(SETTINGS_STORAGE_KEY);

  if (!stored) {
    return createDefaultJourneySettings();
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    return (
      parseStoredSettingsByJourney(parsed) ?? createDefaultJourneySettings()
    );
  } catch {
    return createDefaultJourneySettings();
  }
}

export function parseStoredSettingsByJourney(
  input: unknown
): LoadedJourneySettings | null {
  const envelope: StoredSettingsEnvelope<unknown> = isStoredSettingsEnvelope(
    input
  )
    ? input
    : {
        version: LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
        data: input,
      };
  const migratedFromLegacy = envelope.version < 14;
  const migratedData = migrateSettingsToLatest(envelope);

  if (!isSettingsObject(migratedData)) {
    return null;
  }

  const journeys = migratedData.journeys;

  if (!isSettingsObject(journeys)) {
    return null;
  }

  return {
    settings: {
      simple: parseJourneySettings(journeys.simple),
      bridge: parseJourneySettings(journeys.bridge),
      expert: parseJourneySettings(journeys.expert),
    },
    migratedFromLegacy,
  };
}

function parseJourneySettings(input: unknown) {
  return parseStoredSettings(input) ?? createDefaultSettings();
}

function createDefaultJourneySettings(): LoadedJourneySettings {
  return {
    settings: {
      simple: createDefaultSettings(),
      bridge: createDefaultSettings(),
      expert: createDefaultSettings(),
    },
    migratedFromLegacy: true,
  };
}

export function parseStoredSettings(input: unknown): PensionSettings | null {
  if (!isSettingsObject(input)) {
    return null;
  }

  const defaults = createDefaultSettings();
  const coercedSettings = removeUndefinedValues(
    coerceSettings(input as Partial<StoredPensionSettings>)
  );
  const dateOfBirth =
    typeof coercedSettings.dateOfBirth === "string"
      ? coercedSettings.dateOfBirth
      : defaults.dateOfBirth;
  const normalPensionAge = calculateNormalPensionAge(dateOfBirth);
  const sippDrawAge = reconcileImportedDefaultDrawAge({
    value: coercedSettings.sippDrawAge,
    legacyDefault: normalPensionAge,
    roundedDefault: calculateDefaultSippDrawAge(normalPensionAge),
  });
  const isaDrawAge = reconcileImportedDefaultDrawAge({
    value: coercedSettings.isaDrawAge,
    legacyDefault: normalPensionAge - 10,
    roundedDefault: calculateDefaultIsaDrawAge(normalPensionAge),
  });

  return normalizeSettings({
    ...defaults,
    ...coercedSettings,
    sippDrawAge,
    isaDrawAge,
  });
}

function reconcileImportedDefaultDrawAge({
  value,
  legacyDefault,
  roundedDefault,
}: {
  value: number | undefined;
  legacyDefault: number;
  roundedDefault: number;
}) {
  return value === undefined || value === legacyDefault
    ? roundedDefault
    : value;
}

export function saveSettings(settings: PensionSettings) {
  const currentSettings = loadStoredSettingsByJourney().settings;

  return saveSettingsByJourney({
    ...currentSettings,
    expert: settings,
  });
}

export function saveSettingsByJourney(settings: PensionSettingsByJourney) {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  const envelope = getStoredSettingsEnvelope(settings);

  return writeStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(envelope));
}

export function getStoredSettingsEnvelope(
  settings: PensionSettingsByJourney
): StoredSettingsEnvelope<StoredJourneySettingsData> {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    data: getStoredSettingsByJourneySnapshot(settings),
  };
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

export function getStoredSettingsByJourneySnapshot(
  settings: PensionSettingsByJourney
): StoredJourneySettingsData {
  return {
    journeys: Object.fromEntries(
      (Object.keys(settings) as SettingsJourney[]).map((journey) => [
        journey,
        getStoredSettingsSnapshot(settings[journey]),
      ])
    ) as StoredPensionSettingsByJourney,
  };
}
