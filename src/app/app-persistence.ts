import { readStorageItem, writeStorageItem } from "../settings";

const ACKNOWLEDGEMENT_STORAGE_KEY = "cs-pension-modeller.acknowledgement";
const ACKNOWLEDGEMENT_VERSION = "v1";
export const APP_MODE_STORAGE_KEY = "cs-pension-modeller.appMode";
const GUIDANCE_NOTES_STORAGE_KEY = "cs-pension-modeller.guidanceNotes";

export type AppMode = "bridge" | "simple" | "expert";

export function loadAcknowledgementState() {
  return readStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY) === ACKNOWLEDGEMENT_VERSION;
}

export function saveAcknowledgementState() {
  writeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY, ACKNOWLEDGEMENT_VERSION);
}

export function loadStoredAppMode(): AppMode | null {
  const storedMode = readStorageItem(APP_MODE_STORAGE_KEY);

  return storedMode === "bridge" ||
    storedMode === "simple" ||
    storedMode === "expert"
    ? storedMode
    : storedMode === "journey"
      ? "simple"
      : null;
}

export function saveStoredAppMode(mode: AppMode) {
  writeStorageItem(APP_MODE_STORAGE_KEY, mode);
}

export function loadStoredGuidanceNotes() {
  const storedPreference = readStorageItem(GUIDANCE_NOTES_STORAGE_KEY);

  return storedPreference === null ? true : storedPreference !== "false";
}

export function saveStoredGuidanceNotes(showGuidanceNotes: boolean) {
  writeStorageItem(
    GUIDANCE_NOTES_STORAGE_KEY,
    showGuidanceNotes ? "true" : "false",
  );
}
