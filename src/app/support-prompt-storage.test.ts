import { saveLocalStoragePreference } from "../settings";
import {
  clearStoredSupportPromptPreference,
  loadSupportPromptPreference,
  parseSupportPromptPreference,
  saveSupportPromptPreference,
  SUPPORT_PROMPT_STORAGE_KEY,
} from "./support-prompt-storage";

describe("support prompt storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips valid support prompt preferences", () => {
    const snoozed = {
      status: "snoozed" as const,
      nextPromptAt: "2026-09-19T12:00:00.000Z",
    };

    expect(saveSupportPromptPreference(snoozed)).toBe(true);
    expect(loadSupportPromptPreference()).toEqual(snoozed);

    const supported = {
      status: "supported" as const,
      nextPromptAt: "2027-03-12T12:00:00.000Z",
    };
    expect(saveSupportPromptPreference(supported)).toBe(true);
    expect(loadSupportPromptPreference()).toEqual(supported);

    const declined = {
      status: "declined" as const,
      nextPromptAt: "2026-10-12T12:00:00.000Z",
    };
    expect(saveSupportPromptPreference(declined)).toBe(true);
    expect(loadSupportPromptPreference()).toEqual(declined);
  });

  it.each([
    null,
    undefined,
    "not an object",
    { status: "snoozed", nextPromptAt: null },
    { status: "snoozed", nextPromptAt: "not a date" },
    { status: "supported", nextPromptAt: null },
    { status: "declined", nextPromptAt: null },
    { status: "supported", nextPromptAt: "not a date" },
    { status: "declined", nextPromptAt: "not a date" },
    { status: "unexpected", nextPromptAt: null },
    { nextPromptAt: null },
  ])("rejects invalid preference value %#", (value) => {
    expect(parseSupportPromptPreference(value)).toBeNull();
  });

  it("fails safely when storage is corrupt, inaccessible, disabled, or cleared", () => {
    window.localStorage.setItem(SUPPORT_PROMPT_STORAGE_KEY, "{bad json");
    expect(loadSupportPromptPreference()).toBeNull();

    const getItemSpy = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("Storage unavailable.");
      });
    expect(loadSupportPromptPreference()).toBeNull();
    getItemSpy.mockRestore();

    saveLocalStoragePreference(false);
    expect(
      saveSupportPromptPreference({
        status: "supported",
        nextPromptAt: "2027-03-12T12:00:00.000Z",
      })
    ).toBe(false);
    expect(loadSupportPromptPreference()).toBeNull();

    saveLocalStoragePreference(true);
    saveSupportPromptPreference({
      status: "declined",
      nextPromptAt: "2026-10-12T12:00:00.000Z",
    });
    clearStoredSupportPromptPreference();
    expect(loadSupportPromptPreference()).toBeNull();
  });
});
