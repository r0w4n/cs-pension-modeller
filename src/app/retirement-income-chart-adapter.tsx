import { RetirementIncomeChart } from "../RetirementIncomeChart";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomePoint,
} from "../result-projection/retirement-income-chart-model";
import type { ResidualFlexibleFundInsight } from "../app-domains/flexible-withdrawals";
import type { PensionValidationIssue } from "../settings";

export type RetirementIncomeChartPresentation =
  "simple" | "standard" | "detailed";

export function RetirementIncomeChartAdapter({
  retirementIncomeSeries,
  retirementIncomeChartParameters,
  retirementIncomeChartLimits,
  hideInactiveLegendItems = false,
  showFlexibleWithdrawalInsights = false,
  residualFlexibleFundInsights,
  presentation = "standard",
  validationIssues,
  onChangeChartParameters,
}: {
  retirementIncomeSeries?: RetirementIncomePoint[];
  retirementIncomeChartParameters?: RetirementIncomeChartParameters;
  retirementIncomeChartLimits?: RetirementIncomeChartLimits;
  hideInactiveLegendItems?: boolean;
  showFlexibleWithdrawalInsights?: boolean;
  residualFlexibleFundInsights?: ResidualFlexibleFundInsight[];
  presentation?: RetirementIncomeChartPresentation;
  validationIssues?: PensionValidationIssue[];
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeChartParameters>
  ) => void;
}) {
  if (
    !retirementIncomeSeries ||
    !retirementIncomeChartParameters ||
    !retirementIncomeChartLimits ||
    !onChangeChartParameters
  ) {
    return null;
  }

  return (
    <RetirementIncomeChart
      data={retirementIncomeSeries}
      alphaLabel="Alpha pension"
      hideInactiveLegendItems={
        presentation === "simple" || hideInactiveLegendItems
      }
      showFlexibleWithdrawalInsights={
        presentation === "detailed" || showFlexibleWithdrawalInsights
      }
      residualFlexibleFundInsights={residualFlexibleFundInsights}
      presentation={presentation === "simple" ? "simple" : "standard"}
      limits={retirementIncomeChartLimits}
      statePensionEditable
      validationIssues={validationIssues}
      onChangeParameters={onChangeChartParameters}
      {...retirementIncomeChartParameters}
    />
  );
}
