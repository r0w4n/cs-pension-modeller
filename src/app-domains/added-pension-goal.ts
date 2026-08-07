import { createProjectionTable, generatePensionSummary } from "../projection";
import { normalizeSetting, type PensionSettings } from "../settings";

const REFERENCE_MONTHLY_CONTRIBUTION = 100;

export type AddedPensionGoalBasis = {
  targetMonthlyIncome: number;
  projectedMonthlyIncome: number;
  monthlyIncomePerContributionPound: number;
};

export function createAddedPensionGoalBasis(
  settings: PensionSettings
): AddedPensionGoalBasis {
  const baselineSummary = getPensionSummary({
    ...settings,
    alphaAddedPensionMonthly: 0,
  });
  const referenceSummary = getPensionSummary({
    ...settings,
    alphaAddedPensionMonthly: REFERENCE_MONTHLY_CONTRIBUTION,
  });
  const projectedMonthlyIncome =
    baselineSummary?.retirementIncome.totalMonthlyIncome ?? 0;
  const referenceMonthlyIncome =
    referenceSummary?.retirementIncome.totalMonthlyIncome ?? 0;

  return {
    targetMonthlyIncome: settings.desiredRetirementIncome / 12,
    projectedMonthlyIncome,
    monthlyIncomePerContributionPound: Math.max(
      0,
      (referenceMonthlyIncome - projectedMonthlyIncome) /
        REFERENCE_MONTHLY_CONTRIBUTION
    ),
  };
}

export function estimateAddedPensionMonthlyContribution(
  basis: AddedPensionGoalBasis,
  desiredExtraMonthlyIncome: number
) {
  if (
    desiredExtraMonthlyIncome <= 0 ||
    basis.monthlyIncomePerContributionPound <= 0
  ) {
    return 0;
  }

  return normalizeSetting(
    "alphaAddedPensionMonthly",
    desiredExtraMonthlyIncome / basis.monthlyIncomePerContributionPound
  );
}

export function calculateAddedPensionMonthlyIncome(
  basis: AddedPensionGoalBasis,
  monthlyContribution: number
) {
  return monthlyContribution * basis.monthlyIncomePerContributionPound;
}

function getPensionSummary(settings: PensionSettings) {
  const rows = createProjectionTable(settings);

  if (rows.length === 0) {
    return null;
  }

  return generatePensionSummary(rows, settings);
}
