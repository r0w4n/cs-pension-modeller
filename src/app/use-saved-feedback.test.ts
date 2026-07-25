import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSavedFeedback } from "./use-saved-feedback";

describe("useSavedFeedback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("clears pending feedback when the component unmounts", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result, unmount } = renderHook(() => useSavedFeedback());

    act(() => {
      result.current.showSavedLabel();
    });

    const pendingTimer = result.current.savedFeedbackTimerRef.current;
    expect(pendingTimer).not.toBeNull();

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(pendingTimer);
    expect(result.current.savedFeedbackTimerRef.current).toBeNull();
  });
});
