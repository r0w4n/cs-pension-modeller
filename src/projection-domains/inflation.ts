import type { PensionSettings } from "../settings";

export function calculateRealAnnualRate(
  nominalRateAnnual: number,
  inflationRateAnnual: number
) {
  return (1 + nominalRateAnnual) / (1 + inflationRateAnnual) - 1;
}

export function getModelledAnnualGrowthRate(
  settings: PensionSettings,
  nominalRateAnnual: number
) {
  if (settings.projectionBasis === "nominal") {
    return nominalRateAnnual;
  }

  return calculateRealAnnualRate(
    nominalRateAnnual,
    settings.inflationRateAnnual / 100
  );
}

export function getModelledMonthlyGrowthRate(
  settings: PensionSettings,
  nominalRateAnnual: number
) {
  return (
    (1 + getModelledAnnualGrowthRate(settings, nominalRateAnnual)) ** (1 / 12) -
    1
  );
}

export function getModelledPensionInflationPercent(settings: PensionSettings) {
  return settings.projectionBasis === "real" ? 0 : settings.inflationRateAnnual;
}

export function calculateRetirementIncomeTargetAtDate(
  settings: PensionSettings,
  rowDate: string
) {
  if (settings.projectionBasis === "real") {
    return settings.desiredRetirementIncome;
  }

  const monthlyInflationRate =
    (1 + settings.inflationRateAnnual / 100) ** (1 / 12) - 1;
  const monthsUntilRow = Math.max(
    0,
    calculateWholeMonthDifference(settings.startDate, rowDate)
  );

  return (
    settings.desiredRetirementIncome *
    (1 + monthlyInflationRate) ** monthsUntilRow
  );
}

function calculateWholeMonthDifference(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  let monthDifference = (endYear - startYear) * 12 + (endMonth - startMonth);

  if (endDay < startDay) {
    monthDifference -= 1;
  }

  return monthDifference;
}
