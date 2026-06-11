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

export type AppMode = "bridge" | "simple" | "expert";

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

export function clearStoredAppPreferences() {
  removeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY);
  removeStorageItem(APP_MODE_STORAGE_KEY);
  removeStorageItem(GUIDANCE_NOTES_STORAGE_KEY);
}
