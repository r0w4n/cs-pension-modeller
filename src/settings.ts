export {
  LOCAL_STORAGE_ENABLED_KEY,
  SETTINGS_STORAGE_KEY,
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE,
  MAX_ADDED_PENSION_PURCHASE_INPUT_AGE,
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  STATE_PENSION_AGE_STEP,
  DEFAULT_PREMIUM_VALUATION_DATE,
} from "./settings/settings-types";

export type {
  AddedPensionLumpSumCadence,
  AddedPensionFactorType,
  AddedPensionLumpSum,
  AlphaEpaPeriod,
  AlphaEpaYearsBeforeNpa,
  AdditionalGuaranteedIncome,
  AdditionalGuaranteedIncomeIndexation,
  FlexibleFundAccountId,
  FlexibleWithdrawalStrategy,
  SippWithdrawalStrategy,
  CsAvcWithdrawalStrategy,
  IsaWithdrawalStrategy,
  LisaWithdrawalStrategy,
  SippTaxReliefRate,
  PensionWithdrawalTaxTreatment,
  TaxRegime,
  ProjectionBasis,
  RetirementIncomeTargetBasis,
  SpendingSmileStrategy,
  SpendingStrategyType,
  ClassicCalculationMode,
  ClassicFinalSalaryLink,
  PensionSettings,
  PensionValidationIssue,
} from "./settings/settings-types";
export { usesAfterTaxRetirementIncomeTarget } from "./settings/settings-types";
export {
  FLEXIBLE_FUND_ACCOUNT_CONFIG,
  FLEXIBLE_FUND_ACCOUNT_IDS,
  FLEXIBLE_WITHDRAWAL_STRATEGY_OPTIONS,
  normalizeFlexibleWithdrawalStrategy,
} from "./settings/settings-types";

export {
  defaultSettings,
  createDefaultSettings,
  getTodayIsoDate,
  formatLocalIsoDate,
  formatCurrency,
  isValidIsoDate,
} from "./settings/settings-defaults";

export {
  normalizeSetting,
  normalizeStatePensionDrawDate,
  normalizeAlphaPensionDrawAge,
  normalizeSippDrawAge,
  normalizeStatePensionDrawAge,
} from "./settings/settings-normalize";

export { validateSettings } from "./settings/settings-validate";

export {
  clearAllLocalStorageData,
  clearStoredSettings,
  isLocalStorageEnabled,
  loadStoredSettings,
  parseStoredSettings,
  removeStorageItem,
  saveLocalStoragePreference,
  saveSettings,
  getStoredSettingsSnapshot,
  readStorageItem,
  writeStorageItem,
} from "./settings/settings-storage";

export { calculateDateAge } from "./settings/settings-domains/personal-details";

export {
  calculateMinimumStatePensionDrawAge,
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDateFromAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumSippAccessAge,
  calculateMinimumCsAvcAccessAge,
  resolveSippMinimumAccessAge,
  resolveCsAvcMinimumAccessAge,
  calculateStatePensionDrawDate,
  calculateNormalPensionAge,
} from "./settings/settings-shared/state";

export {
  createAlphaAbsDateFromYear,
  getAlphaAbsYear,
  resolveAlphaAbsDate,
  getLatestAlphaAddedPensionPurchaseDate,
  createDefaultAddedPensionLumpSum,
  createDefaultAlphaEpaPeriod,
  getAlphaEpaPeriodForDate,
  getAlphaEpaPeriods,
  isAlphaEpaOptionAvailable,
  getAlphaEpaDate,
} from "./settings/settings-domains/alpha-pension";

export {
  getPartialRetirementStartDate,
  getPartialRetirementContributionMultiplier,
  getPartialRetirementSavingsContributionMultiplier,
  getPartialRetirementMonthlyEmploymentIncome,
  getPreRetirementMonthlyEmploymentTaxContext,
} from "./settings/settings-domains/partial-retirement";

export {
  createDefaultAdditionalGuaranteedIncome,
  getAdditionalGuaranteedIncomeDisplayName,
} from "./settings/settings-domains/additional-guaranteed-income";

export {
  calculateDefaultIsaDrawAge,
  ISA_DEFAULT_YEARS_BEFORE_NPA,
} from "./settings/settings-domains/isa";

export { calculateDefaultSippDrawAge } from "./settings/settings-domains/sipp";

export {
  PENSION_WITHDRAWAL_TAX_TREATMENT_OPTIONS,
  TAX_REGIME_OPTIONS,
} from "./settings/settings-domains/tax";

export { LISA_MONTHLY_CONTRIBUTION_MAX } from "./settings/settings-domains/lisa";
