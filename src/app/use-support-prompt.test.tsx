import { act, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { trackAnalyticsEvent } from "../analytics";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import { saveLocalStoragePreference } from "../settings";
import {
  SUPPORT_PROMPT_DECLINE_MONTHS,
  SUPPORT_PROMPT_DEBUG_SHOW_EVENT,
  SUPPORT_PROMPT_DELAY_MS,
  SUPPORT_PROMPT_SNOOZE_MS,
  SUPPORT_PROMPT_SUPPORTED_MONTHS,
} from "./support-prompt-config";
import { SUPPORT_PROMPT_STORAGE_KEY } from "./support-prompt-storage";
import { useSupportPrompt } from "./use-support-prompt";

vi.mock("../analytics", () => ({
  trackAnalyticsEvent: vi.fn(),
}));

type SupportPromptHookProps = Parameters<typeof useSupportPrompt>[0];

const now = new Date("2026-09-12T12:00:00.000Z");
const retirementPlanResult = {} as RetirementPlanResult;

function renderSupportPromptHook(
  overrides: Partial<SupportPromptHookProps> = {}
) {
  const initialProps: SupportPromptHookProps = {
    isResultsStepActive: false,
    isProjectionPending: false,
    calculationError: false,
    retirementPlanResult,
    localStorageEnabled: true,
    ...overrides,
  };

  return renderHook(
    (props: SupportPromptHookProps) => useSupportPrompt(props),
    {
      initialProps,
    }
  );
}

function setDocumentVisibility(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: visibilityState,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useSupportPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now });
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    saveLocalStoragePreference(true);
    setDocumentVisibility("visible");
    vi.mocked(trackAnalyticsEvent).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    setDocumentVisibility("visible");
  });

  it("does not open before Results or immediately after Results becomes eligible", () => {
    const { result, rerender } = renderSupportPromptHook();

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(false);

    rerender({
      isResultsStepActive: true,
      isProjectionPending: false,
      calculationError: false,
      retirementPlanResult,
      localStorageEnabled: true,
    });

    expect(result.current.viewModel.isOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS - 1);
    });
    expect(result.current.viewModel.isOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.viewModel.isOpen).toBe(true);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith("support_prompt_shown");

    rerender({
      isResultsStepActive: true,
      isProjectionPending: false,
      calculationError: false,
      retirementPlanResult,
      localStorageEnabled: true,
    });
    expect(
      vi
        .mocked(trackAnalyticsEvent)
        .mock.calls.filter(
          ([eventName]) => eventName === "support_prompt_shown"
        )
    ).toHaveLength(1);
  });

  it("does not open while calculation is pending, unavailable, or failed", () => {
    const { result: pendingResult } = renderSupportPromptHook({
      isResultsStepActive: true,
      isProjectionPending: true,
    });
    const { result: unavailableResult } = renderSupportPromptHook({
      isResultsStepActive: true,
      retirementPlanResult: null,
    });
    const { result: failedResult } = renderSupportPromptHook({
      isResultsStepActive: true,
      calculationError: true,
    });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });

    expect(pendingResult.current.viewModel.isOpen).toBe(false);
    expect(unavailableResult.current.viewModel.isOpen).toBe(false);
    expect(failedResult.current.viewModel.isOpen).toBe(false);
  });

  it("supports a development console event for manually showing the prompt", () => {
    const { result } = renderSupportPromptHook();

    act(() => {
      window.dispatchEvent(new Event(SUPPORT_PROMPT_DEBUG_SHOW_EVENT));
    });

    expect(result.current.viewModel.isOpen).toBe(true);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("resets the delay when the user leaves Results or hides the document", () => {
    const { result, rerender } = renderSupportPromptHook({
      isResultsStepActive: true,
    });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS / 2);
    });
    rerender({
      isResultsStepActive: false,
      isProjectionPending: false,
      calculationError: false,
      retirementPlanResult,
      localStorageEnabled: true,
    });
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(false);

    rerender({
      isResultsStepActive: true,
      isProjectionPending: false,
      calculationError: false,
      retirementPlanResult,
      localStorageEnabled: true,
    });
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS / 2);
      setDocumentVisibility("hidden");
    });
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(false);

    act(() => {
      setDocumentVisibility("visible");
    });
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(true);
  });

  it("snoozes Maybe later for seven days and tracks the visible selection once", () => {
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    act(() => {
      result.current.viewModel.maybeLater();
      result.current.viewModel.maybeLater();
    });

    expect(result.current.viewModel.isOpen).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "snoozed",
      nextPromptAt: new Date(
        now.getTime() + SUPPORT_PROMPT_SNOOZE_MS + SUPPORT_PROMPT_DELAY_MS
      ).toISOString(),
    });
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_prompt_maybe_later_selected"
    );
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(
        SUPPORT_PROMPT_SNOOZE_MS + SUPPORT_PROMPT_DELAY_MS
      );
    });
    expect(result.current.viewModel.isOpen).toBe(false);
  });

  it("snoozes Escape dismissal for seven days without counting it as Maybe later", () => {
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      result.current.viewModel.dismiss();
    });

    expect(result.current.viewModel.isOpen).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "snoozed",
      nextPromptAt: new Date(
        now.getTime() + SUPPORT_PROMPT_SNOOZE_MS + SUPPORT_PROMPT_DELAY_MS
      ).toISOString(),
    });
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_prompt_dismissed"
    );
    expect(trackAnalyticsEvent).not.toHaveBeenCalledWith(
      "support_prompt_maybe_later_selected"
    );
  });

  it("clicking the support link snoozes without marking payment as returned", () => {
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      result.current.viewModel.buyCoffee();
    });

    expect(result.current.viewModel.isOpen).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "snoozed",
      nextPromptAt: new Date(
        now.getTime() + SUPPORT_PROMPT_SNOOZE_MS + SUPPORT_PROMPT_DELAY_MS
      ).toISOString(),
    });
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_payment_link_selected"
    );
    expect(trackAnalyticsEvent).not.toHaveBeenCalledWith(
      "support_payment_returned"
    );
  });

  it("still suppresses the session when support-link preference storage fails", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      result.current.viewModel.buyCoffee();
    });

    expect(result.current.viewModel.isOpen).toBe(false);
    expect(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(false);
  });

  it("requires a fresh delay in a later session after a snooze expires", () => {
    window.localStorage.setItem(
      SUPPORT_PROMPT_STORAGE_KEY,
      JSON.stringify({
        status: "snoozed",
        nextPromptAt: new Date(now.getTime() - 1).toISOString(),
      })
    );
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    expect(result.current.viewModel.isOpen).toBe(false);
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });

    expect(result.current.viewModel.isOpen).toBe(true);
  });

  it("hides future prompts for six months after supported and one month after declined", () => {
    const { result: supportedResult, unmount: unmountSupported } =
      renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      supportedResult.current.viewModel.markSupported();
    });
    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "supported",
      nextPromptAt: addCalendarMonths(
        new Date(now.getTime() + SUPPORT_PROMPT_DELAY_MS),
        SUPPORT_PROMPT_SUPPORTED_MONTHS
      ).toISOString(),
    });
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_prior_support_selected"
    );

    unmountSupported();
    const { result: declinedResult } = renderSupportPromptHook({
      isResultsStepActive: true,
    });
    act(() => {
      declinedResult.current.viewModel.decline();
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });

    expect(declinedResult.current.viewModel.isOpen).toBe(false);
    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "declined",
      nextPromptAt: addCalendarMonths(
        new Date(now.getTime() + SUPPORT_PROMPT_DELAY_MS),
        SUPPORT_PROMPT_DECLINE_MONTHS
      ).toISOString(),
    });
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_prompt_decline_selected"
    );
  });

  it("uses in-memory suppression without writing when local saving is disabled", () => {
    saveLocalStoragePreference(false);
    const { result } = renderSupportPromptHook({
      isResultsStepActive: true,
      localStorageEnabled: false,
    });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      result.current.viewModel.decline();
    });

    expect(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
    });
    expect(result.current.viewModel.isOpen).toBe(false);
  });

  it("marks the browser preference as supported for a future thank-you return URL", () => {
    window.history.replaceState({}, "", "/?support=thank-you&mode=check");
    const { result } = renderSupportPromptHook();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(
      JSON.parse(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)!)
    ).toEqual({
      status: "supported",
      nextPromptAt: addCalendarMonths(
        now,
        SUPPORT_PROMPT_SUPPORTED_MONTHS
      ).toISOString(),
    });
    expect(window.location.search).toBe("?mode=check");
    expect(result.current.viewModel.showThankYouStatus).toBe(true);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      "support_payment_returned"
    );
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1);
  });

  it("processes the thank-you return once in React Strict Mode", () => {
    window.history.replaceState({}, "", "/?support=thank-you");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { rerender } = renderHook(
      (props: SupportPromptHookProps) => useSupportPrompt(props),
      {
        initialProps: {
          isResultsStepActive: false,
          isProjectionPending: false,
          calculationError: false,
          retirementPlanResult,
          localStorageEnabled: true,
        },
        wrapper,
      }
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });
    rerender({
      isResultsStepActive: false,
      isProjectionPending: false,
      calculationError: false,
      retirementPlanResult,
      localStorageEnabled: true,
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(
      vi
        .mocked(trackAnalyticsEvent)
        .mock.calls.filter(
          ([eventName]) => eventName === "support_payment_returned"
        )
    ).toHaveLength(1);
  });

  it("resets open and stored prompt state after local data is cleared", () => {
    const { result } = renderSupportPromptHook({ isResultsStepActive: true });

    act(() => {
      vi.advanceTimersByTime(SUPPORT_PROMPT_DELAY_MS);
      result.current.viewModel.decline();
      result.current.reset();
    });

    expect(window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)).toBeNull();
    expect(result.current.viewModel.isOpen).toBe(false);
    expect(result.current.viewModel.showThankYouStatus).toBe(false);
  });
});

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);

  return result;
}
