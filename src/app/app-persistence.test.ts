import { saveLocalStoragePreference } from "../settings";
import {
  APP_MODE_STORAGE_KEY,
  clearStoredAppPreferences,
  loadAcknowledgementState,
  loadStoredComparisonRetirementIncomeDisplay,
  loadStoredAppMode,
  loadStoredGuidanceNotes,
  loadStoredJourneyRetirementIncomeDisplay,
  saveAcknowledgementState,
  saveStoredComparisonRetirementIncomeDisplay,
  saveStoredAppMode,
  saveStoredGuidanceNotes,
  saveStoredJourneyRetirementIncomeDisplay,
} from "./app-persistence";

const ACKNOWLEDGEMENT_STORAGE_KEY = "cs-pension-modeller.acknowledgement";
const GUIDANCE_NOTES_STORAGE_KEY = "cs-pension-modeller.guidanceNotes";
const LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.retirementIncomeDisplay";
const JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.journeyRetirementIncomeDisplay";
const COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY =
  "cs-pension-modeller.comparisonRetirementIncomeDisplay";
const LOCAL_STORAGE_ENABLED_KEY = "cs-pension-modeller.localStorageEnabled";

describe("app persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the acknowledgement marker when local storage is enabled", () => {
    expect(loadAcknowledgementState()).toBe(false);

    saveAcknowledgementState();

    expect(window.localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY)).toBe("v1");
    expect(loadAcknowledgementState()).toBe(true);
  });

  it("round-trips a saved app mode and ignores invalid stored values", () => {
    saveStoredAppMode("expert");
    expect(loadStoredAppMode()).toBe("expert");

    window.localStorage.setItem(APP_MODE_STORAGE_KEY, "unexpected");
    expect(loadStoredAppMode()).toBeNull();
  });

  it("defaults guidance notes to shown and only hides them for an explicit false value", () => {
    expect(loadStoredGuidanceNotes()).toBe(true);

    saveStoredGuidanceNotes(false);
    expect(loadStoredGuidanceNotes()).toBe(false);

    window.localStorage.setItem(GUIDANCE_NOTES_STORAGE_KEY, "true");
    expect(loadStoredGuidanceNotes()).toBe(true);

    window.localStorage.setItem(GUIDANCE_NOTES_STORAGE_KEY, "corrupted");
    expect(loadStoredGuidanceNotes()).toBe(true);
  });

  it("round-trips the journey retirement income display preference", () => {
    expect(loadStoredJourneyRetirementIncomeDisplay()).toBe("monthly");

    saveStoredJourneyRetirementIncomeDisplay("annual");
    expect(loadStoredJourneyRetirementIncomeDisplay()).toBe("annual");

    window.localStorage.setItem(
      JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "unexpected"
    );
    expect(loadStoredJourneyRetirementIncomeDisplay()).toBe("monthly");
  });

  it("round-trips the comparison retirement income display preference", () => {
    expect(loadStoredComparisonRetirementIncomeDisplay()).toBe("monthly");

    saveStoredComparisonRetirementIncomeDisplay("annual");
    expect(loadStoredComparisonRetirementIncomeDisplay()).toBe("annual");

    window.localStorage.setItem(
      COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "unexpected"
    );
    expect(loadStoredComparisonRetirementIncomeDisplay()).toBe("monthly");
  });

  it("keeps the legacy shared display as a fallback when the new keys are empty", () => {
    window.localStorage.setItem(
      LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "annual"
    );

    expect(loadStoredJourneyRetirementIncomeDisplay()).toBe("annual");
    expect(loadStoredComparisonRetirementIncomeDisplay()).toBe("annual");
  });

  it("returns safe defaults and skips writes when local storage is disabled", () => {
    saveLocalStoragePreference(false);

    saveAcknowledgementState();
    saveStoredAppMode("simple");
    saveStoredGuidanceNotes(false);
    saveStoredJourneyRetirementIncomeDisplay("annual");
    saveStoredComparisonRetirementIncomeDisplay("annual");

    expect(loadAcknowledgementState()).toBe(false);
    expect(loadStoredAppMode()).toBeNull();
    expect(loadStoredGuidanceNotes()).toBe(true);
    expect(loadStoredJourneyRetirementIncomeDisplay()).toBe("monthly");
    expect(loadStoredComparisonRetirementIncomeDisplay()).toBe("monthly");
    expect(window.localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APP_MODE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDANCE_NOTES_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY)
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY
      )
    ).toBeNull();
  });

  it("clears app preferences without removing the local storage preference", () => {
    window.localStorage.setItem(ACKNOWLEDGEMENT_STORAGE_KEY, "v1");
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, "bridge");
    window.localStorage.setItem(GUIDANCE_NOTES_STORAGE_KEY, "false");
    window.localStorage.setItem(
      JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "annual"
    );
    window.localStorage.setItem(
      COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "monthly"
    );
    window.localStorage.setItem(
      LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY,
      "annual"
    );
    window.localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, "false");

    clearStoredAppPreferences();

    expect(window.localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APP_MODE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDANCE_NOTES_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(JOURNEY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY)
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        COMPARISON_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY
      )
    ).toBeNull();
    expect(
      window.localStorage.getItem(LEGACY_RETIREMENT_INCOME_DISPLAY_STORAGE_KEY)
    ).toBeNull();
    expect(window.localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY)).toBe(
      "false"
    );
  });
});
