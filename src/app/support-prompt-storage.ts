import {
  isLocalStorageEnabled,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "../settings";

export const SUPPORT_PROMPT_STORAGE_KEY = "cs-pension-modeller.supportPrompt";

export type SupportPromptPreference = {
  status: "snoozed" | "supported" | "declined";
  nextPromptAt: string;
};

export function loadSupportPromptPreference(): SupportPromptPreference | null {
  if (!isLocalStorageEnabled()) {
    return null;
  }

  const storedValue = readStorageItem(SUPPORT_PROMPT_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return parseSupportPromptPreference(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export function saveSupportPromptPreference(
  preference: SupportPromptPreference
) {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  return writeStorageItem(
    SUPPORT_PROMPT_STORAGE_KEY,
    JSON.stringify(preference)
  );
}

export function clearStoredSupportPromptPreference() {
  return removeStorageItem(SUPPORT_PROMPT_STORAGE_KEY);
}

export function parseSupportPromptPreference(
  value: unknown
): SupportPromptPreference | null {
  if (!isPreferenceObject(value)) {
    return null;
  }

  const status = value.status;
  const nextPromptAt = value.nextPromptAt;

  if (status === "snoozed") {
    if (typeof nextPromptAt !== "string" || !isValidIsoDate(nextPromptAt)) {
      return null;
    }

    return { status, nextPromptAt };
  }

  if (
    (status === "supported" || status === "declined") &&
    typeof nextPromptAt === "string" &&
    isValidIsoDate(nextPromptAt)
  ) {
    return { status, nextPromptAt };
  }

  return null;
}

function isPreferenceObject(
  value: unknown
): value is Record<keyof SupportPromptPreference, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidIsoDate(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString() === value;
}
