import {
  SUPPORT_PROMPT_DECLINE_MONTHS,
  SUPPORT_PROMPT_DELAY_MS,
  SUPPORT_PROMPT_SNOOZE_MS,
  SUPPORT_PROMPT_SUPPORTED_MONTHS,
} from "./support-prompt-config";
import type { SupportPromptPreference } from "./support-prompt-storage";

export type SupportPromptEligibilityInput = {
  activeJourneyStep: "results" | "other";
  calculationFinished: boolean;
  calculationError: boolean;
  documentVisible: boolean;
  preference: SupportPromptPreference | null;
  sessionSuppressed: boolean;
  now: Date;
};

export function isSupportPromptEligible({
  activeJourneyStep,
  calculationFinished,
  calculationError,
  documentVisible,
  preference,
  sessionSuppressed,
  now,
}: SupportPromptEligibilityInput) {
  return (
    activeJourneyStep === "results" &&
    calculationFinished &&
    !calculationError &&
    documentVisible &&
    !sessionSuppressed &&
    !isSupportPromptPreferenceSuppressed(preference, now)
  );
}

export function isSupportPromptPreferenceSuppressed(
  preference: SupportPromptPreference | null,
  now: Date
) {
  if (!preference) {
    return false;
  }

  return Date.parse(preference.nextPromptAt) > now.getTime();
}

export function createSupportPromptSnoozePreference(now: Date) {
  return {
    status: "snoozed",
    nextPromptAt: new Date(
      now.getTime() + SUPPORT_PROMPT_SNOOZE_MS
    ).toISOString(),
  } satisfies SupportPromptPreference;
}

export function createSupportPromptSupportedPreference(now: Date) {
  return {
    status: "supported",
    nextPromptAt: addCalendarMonths(
      now,
      SUPPORT_PROMPT_SUPPORTED_MONTHS
    ).toISOString(),
  } satisfies SupportPromptPreference;
}

export function createSupportPromptDeclinedPreference(now: Date) {
  return {
    status: "declined",
    nextPromptAt: addCalendarMonths(
      now,
      SUPPORT_PROMPT_DECLINE_MONTHS
    ).toISOString(),
  } satisfies SupportPromptPreference;
}

export function hasCompletedSupportPromptDelay(
  eligibleSince: number | null,
  nowMs: number
) {
  return (
    eligibleSince !== null && nowMs - eligibleSince >= SUPPORT_PROMPT_DELAY_MS
  );
}

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}
