import {
  SUPPORT_PROMPT_DECLINE_MONTHS,
  SUPPORT_PROMPT_DELAY_MS,
  SUPPORT_PROMPT_SNOOZE_MS,
  SUPPORT_PROMPT_SUPPORTED_MONTHS,
} from "./support-prompt-config";
import {
  createSupportPromptDeclinedPreference,
  createSupportPromptSnoozePreference,
  createSupportPromptSupportedPreference,
  hasCompletedSupportPromptDelay,
  isSupportPromptEligible,
} from "./support-prompt-lifecycle";

describe("support prompt lifecycle", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");
  const eligibleInput = {
    activeJourneyStep: "results" as const,
    calculationFinished: true,
    retirementPlanResultAvailable: true,
    calculationError: false,
    documentVisible: true,
    preference: null,
    sessionSuppressed: false,
    now,
  };

  it("requires visible completed Results with an available plan", () => {
    expect(isSupportPromptEligible(eligibleInput)).toBe(true);

    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        activeJourneyStep: "other",
      })
    ).toBe(false);
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        calculationFinished: false,
      })
    ).toBe(false);
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        retirementPlanResultAvailable: false,
      })
    ).toBe(false);
    expect(
      isSupportPromptEligible({ ...eligibleInput, calculationError: true })
    ).toBe(false);
    expect(
      isSupportPromptEligible({ ...eligibleInput, documentVisible: false })
    ).toBe(false);
    expect(
      isSupportPromptEligible({ ...eligibleInput, sessionSuppressed: true })
    ).toBe(false);
  });

  it("respects snoozed, supported, and declined preferences", () => {
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        preference: createSupportPromptSnoozePreference(now),
      })
    ).toBe(false);

    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        now: new Date(now.getTime() + SUPPORT_PROMPT_SNOOZE_MS + 1),
        preference: createSupportPromptSnoozePreference(now),
      })
    ).toBe(true);

    const supportedPreference = createSupportPromptSupportedPreference(now);
    const declinedPreference = createSupportPromptDeclinedPreference(now);

    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        preference: supportedPreference,
      })
    ).toBe(false);
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        preference: declinedPreference,
      })
    ).toBe(false);
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        now: addCalendarMonths(now, SUPPORT_PROMPT_SUPPORTED_MONTHS),
        preference: supportedPreference,
      })
    ).toBe(true);
    expect(
      isSupportPromptEligible({
        ...eligibleInput,
        now: addCalendarMonths(now, SUPPORT_PROMPT_DECLINE_MONTHS),
        preference: declinedPreference,
      })
    ).toBe(true);
  });

  it("requires the full eligible delay", () => {
    expect(hasCompletedSupportPromptDelay(null, now.getTime())).toBe(false);
    expect(hasCompletedSupportPromptDelay(now.getTime(), now.getTime())).toBe(
      false
    );
    expect(
      hasCompletedSupportPromptDelay(
        now.getTime(),
        now.getTime() + SUPPORT_PROMPT_DELAY_MS - 1
      )
    ).toBe(false);
    expect(
      hasCompletedSupportPromptDelay(
        now.getTime(),
        now.getTime() + SUPPORT_PROMPT_DELAY_MS
      )
    ).toBe(true);
  });
});

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}
