import {
  isLocalStorageEnabled,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "../settings";

const ACKNOWLEDGEMENT_STORAGE_KEY = "cs-pension-modeller.acknowledgement";
const ACKNOWLEDGEMENT_VERSION = "v1";
export const APP_MODE_STORAGE_KEY = "cs-pension-modeller.appMode";
const GUIDANCE_NOTES_STORAGE_KEY = "cs-pension-modeller.guidanceNotes";
const LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.retirementIncomeDisplay";
const JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.journeyRetirementIncomeDisplay";
const COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.comparisonRetirementIncomeDisplay";

export type AppMode = "bridge" | "simple" | "expert";
export type RetirementIncomeDisplay = "monthly" | "annual";

export function loadAcknowledgementState() {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  return (
    readStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY) === ACKNOWLEDGEMENT_VERSION
  );
}

export function saveAcknowledgementState() {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY, ACKNOWLEDGEMENT_VERSION);
}

export function loadStoredAppMode(): AppMode | null {
  if (!isLocalStorageEnabled()) {
    return null;
  }

  const storedMode = readStorageItem(APP_MODE_STORAGE_KEY);

  if (
    storedMode === "bridge" ||
    storedMode === "simple" ||
    storedMode === "expert"
  ) {
    return storedMode;
  }

  return null;
}

export function saveStoredAppMode(mode: AppMode) {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(APP_MODE_STORAGE_KEY, mode);
}

export function loadStoredGuidanceNotes() {
  if (!isLocalStorageEnabled()) {
    return true;
  }

  const storedPreference = readStorageItem(GUIDANCE_NOTES_STORAGE_KEY);

  return storedPreference === null ? true : storedPreference !== "false";
}

export function saveStoredGuidanceNotes(showGuidanceNotes: boolean) {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(
    GUIDANCE_NOTES_STORAGE_KEY,
    showGuidanceNotes ? "true" : "false"
  );
}

export function loadStoredJourneyRetirementIncomeDisplay(): RetirementIncomeDisplay {
  return loadRetirementIncomeDisplayPreference(
    JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY
  );
}

export function saveStoredJourneyRetirementIncomeDisplay(
  retirementIncomeDisplay: RetirementIncomeDisplay
) {
  saveRetirementIncomeDisplayPreference(
    JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
    retirementIncomeDisplay
  );
}

export function loadStoredComparisonRetirementIncomeDisplay(): RetirementIncomeDisplay {
  return loadRetirementIncomeDisplayPreference(
    COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY
  );
}

export function saveStoredComparisonRetirementIncomeDisplay(
  retirementIncomeDisplay: RetirementIncomeDisplay
) {
  saveRetirementIncomeDisplayPreference(
    COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
    retirementIncomeDisplay
  );
}

export function clearStoredAppPreferences() {
  removeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY);
  removeStorageItem(APP_MODE_STORAGE_KEY);
  removeStorageItem(GUIDANCE_NOTES_STORAGE_KEY);
  removeStorageItem(JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY);
  removeStorageItem(COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY);
  removeStorageItem(LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY);
}

function loadRetirementIncomeDisplayPreference(storageKey: string) {
  if (!isLocalStorageEnabled()) {
    return "monthly";
  }

  const storedDisplay =
    readStorageItem(storageKey) ??
    readStorageItem(LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY);

  if (storedDisplay === "annual" || storedDisplay === "monthly") {
    return storedDisplay;
  }

  return "monthly";
}

function saveRetirementIncomeDisplayPreference(
  storageKey: string,
  retirementIncomeDisplay: RetirementIncomeDisplay
) {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(storageKey, retirementIncomeDisplay);
}
