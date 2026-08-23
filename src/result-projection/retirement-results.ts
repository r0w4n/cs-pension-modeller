import type { RetirementIncomeDisplay } from "../projection";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import type { PensionSettings, RetirementIncomeTargetBasis } from "../settings";
import { buildIncomeAgeRangeItems } from "./income-age-ranges";
import { summarizeFlexibleWithdrawalInsights } from "./flexible-withdrawals";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
  createRetirementIncomeSeries,
} from "./retirement-income";

export function projectRetirementPlanResult(result: RetirementPlanResult) {
  const { rows, settings } = result;
  const flexibleWithdrawalSummary = summarizeFlexibleWithdrawalInsights(
    rows,
    settings
  );

  return {
    retirementIncomeSeries: createRetirementIncomeSeries(rows, settings),
    flexibleWithdrawalSummary,
    targetBasedWithdrawalPreviews: result.targetBasedWithdrawalPreviews,
  };
}

export function projectRetirementPlanControls(settings: PensionSettings) {
  return {
    retirementIncomeChartLimits: createRetirementIncomeChartLimits(settings),
    retirementIncomeChartParameters:
      createRetirementIncomeChartParameters(settings),
  };
}

export function projectRetirementIncomeDisplay(
  result: RetirementPlanResult,
  retirementIncomeDisplay: RetirementIncomeDisplay,
  targetBasis: RetirementIncomeTargetBasis = result.settings
    .retirementIncomeTargetBasis
) {
  return {
    incomeAgeRangeItems: buildIncomeAgeRangeItems(
      result.summary,
      retirementIncomeDisplay,
      targetBasis
    ),
  };
}

export type RetirementResultsProjection = ReturnType<
  typeof projectRetirementPlanResult
>;
