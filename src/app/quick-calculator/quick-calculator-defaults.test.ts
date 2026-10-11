import { createDefaultSettings } from "../../settings";
import {
  createQuickCalculatorDefaults,
  FRESH_QUICK_CALCULATOR_COMPLETION,
  getQuickCalculatorAgeDefaults,
} from "./quick-calculator-defaults";

describe("quick calculator defaults", () => {
  it("applies quick assumptions without changing full-modeller defaults", () => {
    const modellerDefaults = createDefaultSettings();
    const quickDefaults = createQuickCalculatorDefaults(modellerDefaults);

    expect(quickDefaults).toMatchObject({
      dateOfBirth: "",
      accruedPensionAtLastAbs: 0,
      pensionableEarnings: 40_000,
      alphaPensionDrawAge: 57,
      alphaPensionLeaveAge: 57,
      requirementAge: 57,
      alphaAddedPensionMonthly: 0,
      alphaAddedPensionFactorType: "self",
      partialRetirementStartAge: 55,
      partialRetirementWorkPercent: 50,
      showStatePension: true,
      statePensionForecastConfirmed: false,
      alphaEpaEnabled: false,
      alphaEpaPeriods: [],
    });
    expect(quickDefaults.currentStatePension).toBe(
      modellerDefaults.currentStatePension
    );
    expect(quickDefaults.inflationRateAnnual).toBe(
      modellerDefaults.inflationRateAnnual
    );
    expect(modellerDefaults.pensionableEarnings).toBe(0);
    expect(modellerDefaults.partialRetirementWorkPercent).toBe(60);
    expect(FRESH_QUICK_CALCULATOR_COMPLETION).toEqual({
      dateOfBirth: false,
      accruedPensionAtLastAbs: true,
      pensionableEarnings: true,
      retirementAgeInitialised: false,
      partialRetirementAgeInitialised: false,
    });
  });

  it("uses the next future quarter for older members without exceeding age 70", () => {
    expect(getQuickCalculatorAgeDefaults("1960-06-01", "2026-09-24")).toEqual({
      retirementAge: 66.5,
      reducedHoursAge: 66.5,
      supported: true,
    });
    expect(getQuickCalculatorAgeDefaults("1956-06-01", "2026-09-24")).toEqual({
      retirementAge: 70.5,
      reducedHoursAge: 70.5,
      supported: false,
    });
  });
});
