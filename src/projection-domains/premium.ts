import type { PensionSettings } from "../settings";

export type PremiumEarlyRetirementFactorTable = Record<
  number,
  Record<number, number>
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

// TODO: Populate with authoritative Civil Service/GAD Premium early-retirement
// factors. Do not approximate Premium reductions using Alpha or nuvos factors.
export const PREMIUM_EARLY_RETIREMENT_FACTORS: PremiumEarlyRetirementFactorTable =
  {
    60: {},
    65: {},
  };

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
  const isReducedForEarlyPayment = drawAge < normalPensionAge;
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
  const { settings, rowDate, premiumDrawDate } = input;

  if (
    !settings.showPremium ||
    rowDate < settings.premiumValuationDate ||
    settings.premiumAnnualPensionAtValuationDate <= 0
  ) {
    return 0;
  }

  const calculationDate = rowDate < premiumDrawDate ? rowDate : premiumDrawDate;
  const cpiRate =
    settings.projectionBasis === "real"
      ? 0
      : settings.inflationRateAnnual / 100;
  const revaluationYears = calculateWholeYearDifference(
    settings.premiumValuationDate,
    calculationDate
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
  if (drawAge >= normalPensionAge) {
    return 1;
  }

  const wholeDrawAge = Math.floor(drawAge);

  return earlyRetirementFactors[normalPensionAge]?.[wholeDrawAge] ?? null;
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
  const next = new Date(
    Date.UTC(
      parsed.getUTCFullYear() + Math.floor(years),
      parsed.getUTCMonth() + Math.round((years % 1) * 12),
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
