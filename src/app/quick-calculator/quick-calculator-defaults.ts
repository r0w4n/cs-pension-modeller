import {
  calculateDateAge,
  isValidIsoDate,
  type PensionSettings,
} from "../../settings";
import type { QuickCalculatorCompletion } from "./quick-calculator-storage";

export const QUICK_DEFAULT_ACCRUED_PENSION = 0;
export const QUICK_DEFAULT_PENSIONABLE_EARNINGS = 40_000;
export const QUICK_DEFAULT_RETIREMENT_AGE = 57;
export const QUICK_DEFAULT_REDUCED_HOURS_AGE = 55;
export const QUICK_DEFAULT_WORK_PERCENT = 50;

export const FRESH_QUICK_CALCULATOR_COMPLETION: QuickCalculatorCompletion = {
  dateOfBirth: false,
  accruedPensionAtLastAbs: true,
  pensionableEarnings: true,
  retirementAgeInitialised: false,
  partialRetirementAgeInitialised: false,
};

export function createQuickCalculatorDefaults(
  defaults: PensionSettings
): PensionSettings {
  return {
    ...defaults,
    dateOfBirth: "",
    accruedPensionAtLastAbs: QUICK_DEFAULT_ACCRUED_PENSION,
    pensionableEarnings: QUICK_DEFAULT_PENSIONABLE_EARNINGS,
    alphaPensionDrawAge: QUICK_DEFAULT_RETIREMENT_AGE,
    alphaPensionLeaveAge: QUICK_DEFAULT_RETIREMENT_AGE,
    requirementAge: QUICK_DEFAULT_RETIREMENT_AGE,
    alphaAddedPensionMonthly: 0,
    alphaAddedPensionFactorType: "self",
    partialRetirementStartAge: QUICK_DEFAULT_REDUCED_HOURS_AGE,
    partialRetirementWorkPercent: QUICK_DEFAULT_WORK_PERCENT,
    showStatePension: true,
    statePensionForecastConfirmed: false,
    alphaEpaEnabled: false,
    alphaEpaPeriods: [],
  };
}

export type QuickCalculatorAgeDefaults = {
  retirementAge: number;
  reducedHoursAge: number;
  supported: boolean;
};

export function getQuickCalculatorAgeDefaults(
  dateOfBirth: string,
  calculationDate: string
): QuickCalculatorAgeDefaults {
  if (!isValidIsoDate(dateOfBirth) || !isValidIsoDate(calculationDate)) {
    return {
      retirementAge: QUICK_DEFAULT_RETIREMENT_AGE,
      reducedHoursAge: QUICK_DEFAULT_REDUCED_HOURS_AGE,
      supported: true,
    };
  }

  const currentAge = calculateDateAge(dateOfBirth, calculationDate);
  const nextFutureQuarterAge = Math.floor(currentAge * 4 + 1) / 4;
  const retirementAge = Math.max(
    QUICK_DEFAULT_RETIREMENT_AGE,
    nextFutureQuarterAge
  );
  const reducedHoursAge = Math.max(
    QUICK_DEFAULT_REDUCED_HOURS_AGE,
    nextFutureQuarterAge
  );

  return {
    retirementAge,
    reducedHoursAge,
    supported: retirementAge <= 70 && reducedHoursAge <= 70,
  };
}
