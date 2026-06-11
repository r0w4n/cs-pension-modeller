import {
  clearAllLocalStorageData,
  clearStoredSettings,
  isLocalStorageEnabled,
  loadStoredSettings,
  saveLocalStoragePreference,
  readStorageItem,
  saveSettings,
  writeStorageItem,
} from "./settings-storage";
import {
  LOCAL_STORAGE_ENABLED_KEY,
  SETTINGS_STORAGE_KEY,
} from "./settings-types";
import { createDefaultSettings } from "./settings-defaults";
import { SETTINGS_SCHEMA_VERSION } from "./settings-versions";

describe("settings-storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads and writes storage values", () => {
    expect(writeStorageItem("test-key", "value")).toBe(true);
    expect(readStorageItem("test-key")).toBe("value");
  });

  it("remembers the local storage preference", () => {
    expect(isLocalStorageEnabled()).toBe(true);

    saveLocalStoragePreference(false);

    expect(isLocalStorageEnabled()).toBe(false);
    expect(window.localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY)).toBe(
      "false"
    );
  });

  it("saves and reloads normalized settings", () => {
    const settings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 60000,
      startDate: "2026-05-01",
    };

    saveSettings(settings);

    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as { version?: unknown; data?: Record<string, unknown> };
    expect(stored.version).toBe(SETTINGS_SCHEMA_VERSION);
    expect(stored.data?.startDate).toBeUndefined();

    const loaded = loadStoredSettings();
    expect(loaded.desiredRetirementIncome).toBe(60000);
    expect(loaded.startDate).toBe("2026-04-25");
  });

  it("migrates legacy unversioned settings when loading", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        targetRetirementAge: 61,
        desiredRetirementIncome: 60000,
      })
    );

    const loaded = loadStoredSettings();

    expect(loaded.requirementAge).toBe(61);
    expect(loaded.desiredRetirementIncome).toBe(60000);
  });

  it("loads current versioned settings envelopes", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: SETTINGS_SCHEMA_VERSION,
        data: {
          requirementAge: 62,
          desiredRetirementIncome: 61000,
        },
      })
    );

    const loaded = loadStoredSettings();

    expect(loaded.requirementAge).toBe(62);
    expect(loaded.desiredRetirementIncome).toBe(61000);
  });

  it("falls back to defaults for settings from a newer schema version", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: SETTINGS_SCHEMA_VERSION + 1,
        data: {
          requirementAge: 62,
        },
      })
    );

    expect(loadStoredSettings()).toEqual(createDefaultSettings());
  });

  it("skips loading and saving settings when local storage is disabled", () => {
    saveLocalStoragePreference(false);
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ desiredRetirementIncome: 60000 })
    );

    expect(loadStoredSettings()).toEqual(createDefaultSettings());

    const updatedSettings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 70000,
    };

    expect(saveSettings(updatedSettings)).toBe(false);
    const storedSettings = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as { desiredRetirementIncome?: unknown };

    expect(storedSettings.desiredRetirementIncome).toBe(60000);
  });

  it("can clear stored settings without changing the local storage preference", () => {
    saveLocalStoragePreference(false);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "{}");

    clearStoredSettings();

    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY)).toBe(
      "false"
    );
  });

  it("can clear all local storage data for the site", () => {
    window.localStorage.setItem("test-key", "value");
    saveLocalStoragePreference(false);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "{}");

    clearAllLocalStorageData();

    expect(window.localStorage.getItem("test-key")).toBeNull();
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY)).toBeNull();
  });
});
