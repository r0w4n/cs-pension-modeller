import type { PensionSettings } from "../settings";

export const CLASSIC_NORMAL_PENSION_AGE = 60;
const CLASSIC_ACCRUAL_DENOMINATOR = 80;
const CLASSIC_PLUS_POST_2002_ACCRUAL_DENOMINATOR = 60;
const CLASSIC_AUTOMATIC_LUMP_SUM_MULTIPLIER = 3;
const CLASSIC_EARLY_RETIREMENT_REDUCTION_RATE = 0.05;

export type ClassicCalculationBreakdown = {
  annualPension: number;
  automaticLumpSum: number;
  finalPensionableEarnings: number;
  reckonableServiceYears: number;
};

export type ClassicPlusCalculationBreakdown = {
  pre2002AnnualPension: number;
  post2002AnnualPension: number;
  annualPension: number;
  automaticLumpSum: number;
  finalPensionableEarnings: number;
  pre2002ServiceYears: number;
  post2002ServiceYears: number;
};

export function calculateClassicBenefits(input: {
  finalPensionableEarnings: number;
  reckonableServiceYears: number;
}): ClassicCalculationBreakdown {
  const annualPension =
    (input.finalPensionableEarnings * input.reckonableServiceYears) /
    CLASSIC_ACCRUAL_DENOMINATOR;

  return {
    annualPension,
    automaticLumpSum: annualPension * CLASSIC_AUTOMATIC_LUMP_SUM_MULTIPLIER,
    finalPensionableEarnings: input.finalPensionableEarnings,
    reckonableServiceYears: input.reckonableServiceYears,
  };
}

export function calculateClassicPlusBenefits(input: {
  finalPensionableEarnings: number;
  pre2002ServiceYears: number;
  post2002ServiceYears: number;
}): ClassicPlusCalculationBreakdown {
  const pre2002AnnualPension =
    (input.finalPensionableEarnings * input.pre2002ServiceYears) /
    CLASSIC_ACCRUAL_DENOMINATOR;
  const post2002AnnualPension =
    (input.finalPensionableEarnings * input.post2002ServiceYears) /
    CLASSIC_PLUS_POST_2002_ACCRUAL_DENOMINATOR;

  return {
    pre2002AnnualPension,
    post2002AnnualPension,
    annualPension: pre2002AnnualPension + post2002AnnualPension,
    automaticLumpSum:
      pre2002AnnualPension * CLASSIC_AUTOMATIC_LUMP_SUM_MULTIPLIER,
    finalPensionableEarnings: input.finalPensionableEarnings,
    pre2002ServiceYears: input.pre2002ServiceYears,
    post2002ServiceYears: input.post2002ServiceYears,
  };
}

export function calculateClassicEarlyRetirementFactor(
  yearsEarly: number,
  monthsEarly: number
) {
  const totalMonthsEarly = Math.max(0, yearsEarly * 12 + monthsEarly);
  const reduction =
    totalMonthsEarly * (CLASSIC_EARLY_RETIREMENT_REDUCTION_RATE / 12);

  return Math.max(0, 1 - reduction);
}

export function calculateClassicPensionRevaluationFactor(input: {
  fromDate: string;
  rowDate: string;
  cpiPercent: number;
}) {
  const cpiRate = input.cpiPercent / 100;
  const totalYears = calculateWholeYearDifference(
    input.fromDate,
    input.rowDate
  );

  return (1 + cpiRate) ** totalYears;
}

export function calculateClassicAnnualPensionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  if (!input.settings.showClassic) {
    return 0;
  }

  return calculateClassicAmountsAtDate(input).annualPension;
}

export function calculateClassicAutomaticLumpSumAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  if (!input.settings.showClassic) {
    return 0;
  }

  return calculateClassicAmountsAtDate(input).automaticLumpSum;
}

export function calculateClassicPlusAnnualPensionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  if (!input.settings.showClassicPlus) {
    return 0;
  }

  return calculateClassicPlusAmountsAtDate(input).annualPension;
}

export function calculateClassicPlusAutomaticLumpSumAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  if (!input.settings.showClassicPlus) {
    return 0;
  }

  return calculateClassicPlusAmountsAtDate(input).automaticLumpSum;
}

function calculateClassicAmountsAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  const { settings, rowDate } = input;
  const base =
    settings.classicCalculationMode === "manual"
      ? {
          annualPension: settings.classicAnnualPension,
          automaticLumpSum: settings.classicAutomaticLumpSum,
        }
      : calculateClassicBenefits({
          finalPensionableEarnings: getFinalPensionableEarnings({
            currentFinalPensionableEarnings:
              settings.classicCurrentFinalPensionableEarnings,
            preservedFinalPensionableEarnings:
              settings.classicPreservedFinalPensionableEarnings,
            finalSalaryLink: settings.classicFinalSalaryLink,
            payRisePercent: settings.alphaPayRisePercent,
            startDate: settings.startDate,
            rowDate,
          }),
          reckonableServiceYears: settings.classicReckonableServiceYears,
        });

  return applyClassicRevaluation({
    annualPension: base.annualPension,
    automaticLumpSum: base.automaticLumpSum,
    applyPensionIncreases: settings.classicApplyPensionIncreases,
    cpiPercent:
      settings.projectionBasis === "real" ? 0 : settings.inflationRateAnnual,
    startDate: settings.startDate,
    rowDate,
  });
}

function calculateClassicPlusAmountsAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  const { settings, rowDate } = input;
  const base =
    settings.classicPlusCalculationMode === "manual"
      ? {
          annualPension: settings.classicPlusAnnualPension,
          automaticLumpSum: settings.classicPlusAutomaticLumpSum,
        }
      : calculateClassicPlusBenefits({
          finalPensionableEarnings: getFinalPensionableEarnings({
            currentFinalPensionableEarnings:
              settings.classicPlusCurrentFinalPensionableEarnings,
            preservedFinalPensionableEarnings:
              settings.classicPlusPreservedFinalPensionableEarnings,
            finalSalaryLink: settings.classicPlusFinalSalaryLink,
            payRisePercent: settings.alphaPayRisePercent,
            startDate: settings.startDate,
            rowDate,
          }),
          pre2002ServiceYears: settings.classicPlusPre2002ServiceYears,
          post2002ServiceYears: settings.classicPlusPost2002ServiceYears,
        });

  return applyClassicRevaluation({
    annualPension: base.annualPension,
    automaticLumpSum: base.automaticLumpSum,
    applyPensionIncreases: settings.classicPlusApplyPensionIncreases,
    cpiPercent:
      settings.projectionBasis === "real" ? 0 : settings.inflationRateAnnual,
    startDate: settings.startDate,
    rowDate,
  });
}

function getFinalPensionableEarnings(input: {
  currentFinalPensionableEarnings: number;
  preservedFinalPensionableEarnings: number;
  finalSalaryLink: PensionSettings["classicFinalSalaryLink"];
  payRisePercent: number;
  startDate: string;
  rowDate: string;
}) {
  if (input.finalSalaryLink === "broken") {
    return input.preservedFinalPensionableEarnings;
  }

  const payRiseRate = input.payRisePercent / 100;
  const years = calculateWholeYearDifference(input.startDate, input.rowDate);

  return input.currentFinalPensionableEarnings * (1 + payRiseRate) ** years;
}

function applyClassicRevaluation(input: {
  annualPension: number;
  automaticLumpSum: number;
  applyPensionIncreases: boolean;
  cpiPercent: number;
  startDate: string;
  rowDate: string;
}) {
  const revaluationFactor = input.applyPensionIncreases
    ? calculateClassicPensionRevaluationFactor({
        fromDate: input.startDate,
        rowDate: input.rowDate,
        cpiPercent: input.cpiPercent,
      })
    : 1;

  return {
    annualPension: input.annualPension * revaluationFactor,
    automaticLumpSum: input.automaticLumpSum * revaluationFactor,
  };
}

function calculateWholeYearDifference(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  let yearDifference = endYear - startYear;

  if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
    yearDifference -= 1;
  }

  return Math.max(0, yearDifference);
}
