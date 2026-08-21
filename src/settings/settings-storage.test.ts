import {
  clearAllLocalStorageData,
  clearStoredSettings,
  isLocalStorageEnabled,
  loadStoredSettings,
  loadStoredSettingsByJourney,
  parseStoredSettingsByJourney,
  parseStoredSettings,
  saveLocalStoragePreference,
  readStorageItem,
  saveSettings,
  saveSettingsByJourney,
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
      retirementIncomeTargetBasis: "after_tax" as const,
      statePensionForecastConfirmed: true,
      sippHasProtectedPensionAge: true,
      sippProtectedPensionAge: 50,
      startDate: "2026-05-01",
    };

    saveSettings(settings);

    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as {
      version?: unknown;
      data?: { journeys?: { expert?: Record<string, unknown> } };
    };
    expect(stored.version).toBe(SETTINGS_SCHEMA_VERSION);
    expect(stored.data?.journeys?.expert?.startDate).toBeUndefined();

    const loaded = loadStoredSettings();
    expect(loaded.desiredRetirementIncome).toBe(60000);
    expect(loaded.retirementIncomeTargetBasis).toBe("after_tax");
    expect(loaded.statePensionForecastConfirmed).toBe(true);
    expect(loaded.sippHasProtectedPensionAge).toBe(true);
    expect(loaded.sippProtectedPensionAge).toBe(50);
    expect(loaded.startDate).toBe("2026-04-25");
  });

  it("persists target-based withdrawal strategies and account priority", () => {
    const settings = {
      ...createDefaultSettings(),
      isaWithdrawalStrategy: "meet_income_target" as const,
      sippWithdrawalStrategy: "meet_income_target" as const,
      flexibleWithdrawalPriority: [
        "isa" as const,
        "sipp" as const,
        "csAvc" as const,
        "lisa" as const,
      ],
    };

    saveSettings(settings);

    const loaded = loadStoredSettings();
    expect(loaded.isaWithdrawalStrategy).toBe("meet_income_target");
    expect(loaded.sippWithdrawalStrategy).toBe("meet_income_target");
    expect(loaded.flexibleWithdrawalPriority).toEqual([
      "isa",
      "sipp",
      "csAvc",
      "lisa",
    ]);
  });

  it("saves independent settings for all three journeys in one envelope", () => {
    const defaults = createDefaultSettings();

    saveSettingsByJourney({
      simple: { ...defaults, requirementAge: 61 },
      bridge: { ...defaults, requirementAge: 62 },
      expert: { ...defaults, requirementAge: 63 },
    });

    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as {
      version?: unknown;
      data?: {
        journeys?: Record<string, { requirementAge?: unknown }>;
      };
    };
    expect(stored.version).toBe(SETTINGS_SCHEMA_VERSION);
    expect(stored.data?.journeys?.simple.requirementAge).toBe(61);
    expect(stored.data?.journeys?.bridge.requirementAge).toBe(62);
    expect(stored.data?.journeys?.expert.requirementAge).toBe(63);
    const loaded = loadStoredSettingsByJourney().settings;
    expect(loaded.simple.requirementAge).toBe(61);
    expect(loaded.bridge.requirementAge).toBe(62);
    expect(loaded.expert.requirementAge).toBe(63);
  });

  it("permanently accepts legacy flat parameter files", () => {
    const imported = parseStoredSettingsByJourney({
      targetRetirementAge: 64,
      desiredRetirementIncome: 42000,
    });

    expect(imported?.migratedFromLegacy).toBe(true);
    expect(imported?.settings.simple.requirementAge).toBe(64);
    expect(imported?.settings.simple.desiredRetirementIncome).toBe(42000);
    expect(imported?.settings.bridge.requirementAge).toBe(64);
    expect(imported?.settings.bridge.desiredRetirementIncome).toBe(42000);
    expect(imported?.settings.expert.requirementAge).toBe(64);
    expect(imported?.settings.expert.desiredRetirementIncome).toBe(42000);
  });

  it("defensively restores missing and invalid priority entries", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: SETTINGS_SCHEMA_VERSION,
        data: {
          journeys: {
            simple: {},
            bridge: {},
            expert: {
              flexibleWithdrawalPriority: ["isa", "unknown", "isa"],
            },
          },
        },
      })
    );

    expect(loadStoredSettings().flexibleWithdrawalPriority).toEqual([
      "isa",
      "sipp",
      "csAvc",
      "lisa",
    ]);
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
    expect(loaded.retirementIncomeTargetBasis).toBe("after_tax");
    expect(loaded.taxationEnabled).toBe(true);
    expect(loaded.statePensionForecastConfirmed).toBe(false);
  });

  it("does not infer protected SIPP access from legacy SIPP draw age", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        data: {
          dateOfBirth: "1972-08-01",
          sippDrawAge: 55,
          showSipp: true,
        },
      })
    );

    const loaded = loadStoredSettings();

    expect(loaded.sippDrawAge).toBe(55);
    expect(loaded.sippHasProtectedPensionAge).toBe(false);
    expect(loaded.sippProtectedPensionAge).toBe(55);
  });

  it("loads current versioned settings envelopes", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: SETTINGS_SCHEMA_VERSION,
        data: {
          journeys: {
            simple: { requirementAge: 61 },
            bridge: { requirementAge: 60 },
            expert: {
              requirementAge: 62,
              desiredRetirementIncome: 61000,
            },
          },
        },
      })
    );

    const loaded = loadStoredSettings();

    expect(loaded.requirementAge).toBe(62);
    expect(loaded.desiredRetirementIncome).toBe(61000);
  });

  it("rounds imported ISA and SIPP ages to the nearest quarter year", () => {
    const imported = parseStoredSettings({
      dateOfBirth: "1977-06-01",
      sippDrawAge: 67.16666666666667,
      isaDrawAge: 57.16666666666667,
    });

    expect(imported?.sippDrawAge).toBe(67.25);
    expect(imported?.isaDrawAge).toBe(57.25);
  });

  it("preserves custom ISA and SIPP draw ages on import", () => {
    const imported = parseStoredSettings({
      dateOfBirth: "1977-06-01",
      sippDrawAge: 66.5,
      isaDrawAge: 68,
    });

    expect(imported?.sippDrawAge).toBe(66.5);
    expect(imported?.isaDrawAge).toBe(68);
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
