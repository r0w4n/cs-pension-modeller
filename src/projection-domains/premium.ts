import premiumEarlyRetirementFactorData from "../data/premium_pension_reduction_factors.json";
import type { PensionSettings } from "../settings";

export type PremiumEarlyRetirementFactorTable = Record<
  number,
  Record<number, readonly number[]>
>;

export type PremiumCalculationInput = {
  annualPensionAtValuationDate: number;
  valuationDate: string;
  dateOfBirth: string;
  drawAge: number;
  normalPensionAge: number;
  cpiAssumption: number;
  earlyRetirementFactors?: PremiumEarlyRetirementFactorTable;
};

export type PremiumCalculationResult = {
  scheme: "premium";
  annualPensionAtValuationDate: number;
  cpiRevaluedPensionAtDrawAge: number;
  earlyRetirementFactor: number | null;
  annualPensionPayableAtDrawAge: number;
  normalPensionAge: number;
  drawAge: number;
  isReducedForEarlyPayment: boolean;
  factorUnavailable: boolean;
};

export const PREMIUM_EARLY_RETIREMENT_FACTORS: PremiumEarlyRetirementFactorTable =
  premiumEarlyRetirementFactorData.factors;

export function calculatePremiumPension(
  input: PremiumCalculationInput
): PremiumCalculationResult {
  const {
    annualPensionAtValuationDate,
    valuationDate,
    dateOfBirth,
    drawAge,
    normalPensionAge,
    cpiAssumption,
    earlyRetirementFactors = PREMIUM_EARLY_RETIREMENT_FACTORS,
  } = input;
  const drawDate = addYears(dateOfBirth, drawAge);
  const yearsToDraw = calculateWholeYearDifference(valuationDate, drawDate);
  const cpiRevaluedPensionAtDrawAge =
    annualPensionAtValuationDate * (1 + cpiAssumption) ** yearsToDraw;
  const isReducedForEarlyPayment =
    toCompletedAgeMonths(drawAge) < toCompletedAgeMonths(normalPensionAge);
  const earlyRetirementFactor = isReducedForEarlyPayment
    ? getPremiumEarlyRetirementFactor(
        drawAge,
        normalPensionAge,
        earlyRetirementFactors
      )
    : 1;
  const factorUnavailable = earlyRetirementFactor === null;

  return {
    scheme: "premium",
    annualPensionAtValuationDate,
    cpiRevaluedPensionAtDrawAge,
    earlyRetirementFactor,
    annualPensionPayableAtDrawAge: factorUnavailable
      ? 0
      : cpiRevaluedPensionAtDrawAge * earlyRetirementFactor,
    normalPensionAge,
    drawAge,
    isReducedForEarlyPayment,
    factorUnavailable,
  };
}

export function calculateAnnualPremiumPensionAtDate(input: {
  settings: PensionSettings;
  rowDate: string;
  premiumDrawDate: string;
}) {
  const { settings, rowDate } = input;

  if (
    !settings.showPremium ||
    rowDate < settings.premiumValuationDate ||
    settings.premiumAnnualPensionAtValuationDate <= 0
  ) {
    return 0;
  }

  const cpiRate =
    settings.projectionBasis === "real"
      ? 0
      : settings.inflationRateAnnual / 100;
  const revaluationYears = calculateWholeYearDifference(
    settings.premiumValuationDate,
    rowDate
  );

  return (
    settings.premiumAnnualPensionAtValuationDate *
    (1 + cpiRate) ** revaluationYears
  );
}

export function getPremiumEarlyRetirementFactor(
  drawAge: number,
  normalPensionAge: number,
  earlyRetirementFactors: PremiumEarlyRetirementFactorTable = PREMIUM_EARLY_RETIREMENT_FACTORS
) {
  const drawAgeInMonths = toCompletedAgeMonths(drawAge);
  const normalPensionAgeInMonths = toCompletedAgeMonths(normalPensionAge);

  if (drawAgeInMonths >= normalPensionAgeInMonths) {
    return 1;
  }

  // Under-55 cases can require the separate Circumstance 2 formula and
  // additional scheme-specific inputs, so they remain unsupported.
  if (drawAgeInMonths < 55 * 12 || !Number.isInteger(normalPensionAge)) {
    return null;
  }

  const drawAgeYears = Math.floor(drawAgeInMonths / 12);
  const completedMonths = drawAgeInMonths % 12;

  return (
    earlyRetirementFactors[normalPensionAge]?.[drawAgeYears]?.[
      completedMonths
    ] ?? null
  );
}

export function calculateAnnualPremiumPensionIncludingReduction(
  annualPremiumPension: number,
  premiumReductionFactor: number | null
) {
  if (premiumReductionFactor === null) {
    return 0;
  }

  return annualPremiumPension * premiumReductionFactor;
}

function addYears(date: string, years: number) {
  const parsed = parseIsoDate(date);
  const completedMonths = toCompletedAgeMonths(years);
  const next = new Date(
    Date.UTC(
      parsed.getUTCFullYear() + Math.floor(completedMonths / 12),
      parsed.getUTCMonth() + (completedMonths % 12),
      parsed.getUTCDate()
    )
  );

  return next.toISOString().slice(0, 10);
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

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toCompletedAgeMonths(age: number) {
  return Math.floor(age * 12 + 1e-8);
}
