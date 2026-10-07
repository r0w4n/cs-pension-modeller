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

  it("keeps its actions stable and can cancel visible feedback", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useSavedFeedback());
    const showSavedLabel = result.current.showSavedLabel;
    const hideSavedLabel = result.current.hideSavedLabel;

    rerender();
    expect(result.current.showSavedLabel).toBe(showSavedLabel);
    expect(result.current.hideSavedLabel).toBe(hideSavedLabel);

    act(() => result.current.showSavedLabel());
    expect(result.current.showSavedFeedback).toBe(true);
    act(() => result.current.hideSavedLabel());
    expect(result.current.showSavedFeedback).toBe(false);
    expect(result.current.savedFeedbackTimerRef.current).toBeNull();
  });
});
