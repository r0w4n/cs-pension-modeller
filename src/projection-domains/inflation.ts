import type { PensionSettings } from "../settings";
import { resolveAnnualSpendingTarget } from "../spending-smile";

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
  const target = resolveAnnualSpendingTarget({ settings, rowDate });
  return settings.projectionBasis === "real"
    ? target.annualRealTarget
    : target.annualNominalTarget;
}
