export {
  LOCAL_STORAGE_ENABLED_KEY,
  SETTINGS_STORAGE_KEY,
  FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE,
  MAX_ADDED_PENSION_PURCHASE_INPUT_AGE,
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  STATE_PENSION_AGE_STEP,
} from "./settings/settings-types";

export type {
  AddedPensionLumpSumCadence,
  AddedPensionFactorType,
  AddedPensionLumpSum,
  SippWithdrawalStrategy,
  IsaWithdrawalStrategy,
  SippTaxReliefRate,
  ProjectionBasis,
  PensionSettings,
  PensionValidationIssue,
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
  calculateStatePensionDrawDate,
  calculateNormalPensionAge,
} from "./settings/settings-shared/state";

export {
  createAlphaAbsDateFromYear,
  getAlphaAbsYear,
  resolveAlphaAbsDate,
  getLatestAlphaAddedPensionPurchaseDate,
  createDefaultAddedPensionLumpSum,
  getAlphaEpaDate,
} from "./settings/settings-domains/alpha-pension";

export {
  getPartialRetirementStartDate,
  getPartialRetirementContributionMultiplier,
  getPartialRetirementSavingsContributionMultiplier,
} from "./settings/settings-domains/partial-retirement";
