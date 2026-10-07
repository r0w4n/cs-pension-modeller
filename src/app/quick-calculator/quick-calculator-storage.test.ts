import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultSettings } from "../../settings";
import {
  clearStoredQuickCalculatorState,
  loadQuickCalculatorState,
  parseQuickCalculatorState,
  QUICK_CALCULATOR_STORAGE_KEY,
  saveQuickCalculatorState,
} from "./quick-calculator-storage";

describe("quick calculator storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips only quick input state in a versioned envelope", () => {
    const settings = createDefaultSettings();
    const state = {
      inputs: {
        dateOfBirth: "1987-06-01",
        alphaPensionAbsDate: "2025",
        accruedPensionAtLastAbs: 5_000,
        pensionableEarnings: 42_000,
        alphaPensionDrawAge: 60,
        alphaAddedPensionMonthly: 200,
        alphaAddedPensionFactorType: "self" as const,
        partialRetirementStartAge: 55,
        partialRetirementWorkPercent: 50,
        showStatePension: true,
        currentStatePension: settings.currentStatePension,
        statePensionForecastConfirmed: false,
        alphaEpaEnabled: false,
        alphaEpaPeriods: [],
      },
      completion: {
        dateOfBirth: true,
        accruedPensionAtLastAbs: true,
        pensionableEarnings: true,
        retirementAgeInitialised: true,
        partialRetirementAgeInitialised: true,
      },
    };

    expect(saveQuickCalculatorState(state)).toBe(true);
    expect(loadQuickCalculatorState()).toEqual({ status: "loaded", state });
    expect(
      JSON.parse(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)!)
    ).toMatchObject({ version: 1, data: state });
    expect(clearStoredQuickCalculatorState()).toBe(true);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("rejects malformed and unknown-version data", () => {
    expect(parseQuickCalculatorState({ version: 2, data: {} })).toBeNull();
    window.localStorage.setItem(
      QUICK_CALCULATOR_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: { inputs: { pensionableEarnings: "lots" } },
      })
    );
    expect(loadQuickCalculatorState()).toEqual({ status: "invalid" });
  });

  it("keeps the last valid snapshot when a direct save contains invalid EPA dates", () => {
    const settings = createDefaultSettings();
    const validState = {
      inputs: {
        dateOfBirth: "1987-06-01",
        alphaPensionAbsDate: "2025",
        accruedPensionAtLastAbs: 5_000,
        pensionableEarnings: 42_000,
        alphaPensionDrawAge: 60,
        alphaAddedPensionMonthly: 200,
        alphaAddedPensionFactorType: "self" as const,
        partialRetirementStartAge: 55,
        partialRetirementWorkPercent: 50,
        showStatePension: true,
        currentStatePension: settings.currentStatePension,
        statePensionForecastConfirmed: false,
        alphaEpaEnabled: true,
        alphaEpaPeriods: [
          {
            id: "epa-one",
            yearsBeforeNpa: 1 as const,
            startDate: "2030-04-01",
            endDate: "2031-03-31",
          },
        ],
      },
      completion: {
        dateOfBirth: true,
        accruedPensionAtLastAbs: true,
        pensionableEarnings: true,
        retirementAgeInitialised: true,
        partialRetirementAgeInitialised: true,
      },
    };
    expect(saveQuickCalculatorState(validState)).toBe(true);
    const validRaw = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);

    expect(
      saveQuickCalculatorState({
        ...validState,
        inputs: {
          ...validState.inputs,
          alphaEpaEnabled: false,
          alphaEpaPeriods: [
            { ...validState.inputs.alphaEpaPeriods[0], startDate: "" },
          ],
        },
      })
    ).toBe(false);
    expect(window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)).toBe(
      validRaw
    );
    expect(loadQuickCalculatorState()).toEqual({
      status: "loaded",
      state: validState,
    });
  });

  it("does not save when global local saving is disabled", () => {
    window.localStorage.setItem(
      "cs-pension-modeller.localStorageEnabled",
      "false"
    );
    expect(
      saveQuickCalculatorState({
        inputs: {
          dateOfBirth: "1987-06-01",
          alphaPensionAbsDate: "2025",
          accruedPensionAtLastAbs: 0,
          pensionableEarnings: 0,
          alphaPensionDrawAge: 60,
          alphaAddedPensionMonthly: 0,
          alphaAddedPensionFactorType: "self",
          partialRetirementStartAge: 55,
          partialRetirementWorkPercent: 50,
          showStatePension: true,
          currentStatePension: 0,
          statePensionForecastConfirmed: false,
          alphaEpaEnabled: false,
          alphaEpaPeriods: [],
        },
        completion: {
          dateOfBirth: true,
          accruedPensionAtLastAbs: true,
          pensionableEarnings: true,
          retirementAgeInitialised: true,
          partialRetirementAgeInitialised: true,
        },
      })
    ).toBe(false);
  });
});
