import { RetirementIncomeChart } from "../RetirementIncomeChart";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartEvent,
  RetirementIncomeChartStaticMilestone,
  RetirementIncomeChartSeriesDefinition,
  RetirementIncomePoint,
} from "../result-projection/retirement-income-chart-model";
import type { ResidualFlexibleFundInsight } from "../result-projection/flexible-withdrawals";
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
  alphaLabel = "Alpha pension",
  statePensionEditable = true,
  chartDescription,
  chartDataAccessibilitySummary,
  readOnly = false,
  useDataTargets = false,
  showMilestoneMarkers = true,
  timelineMode = "age",
  seriesDefinitions,
  periodEvents,
  staticMilestones,
  showShortfallOverlay = true,
  onChangeTargetIncome,
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
  alphaLabel?: string;
  statePensionEditable?: boolean;
  chartDescription?: string;
  chartDataAccessibilitySummary?: string;
  readOnly?: boolean;
  useDataTargets?: boolean;
  showMilestoneMarkers?: boolean;
  timelineMode?: "age" | "calendar";
  seriesDefinitions?: RetirementIncomeChartSeriesDefinition[];
  periodEvents?: RetirementIncomeChartEvent[];
  staticMilestones?: RetirementIncomeChartStaticMilestone[];
  showShortfallOverlay?: boolean;
  onChangeTargetIncome?: (value: number, age?: number) => void;
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
    (!onChangeChartParameters && !readOnly)
  ) {
    return null;
  }

  const commonProps = {
    data: retirementIncomeSeries,
    alphaLabel,
    chartDescription,
    chartDataAccessibilitySummary,
    hideInactiveLegendItems:
      presentation === "simple" || hideInactiveLegendItems,
    showFlexibleWithdrawalInsights:
      presentation === "detailed" || showFlexibleWithdrawalInsights,
    residualFlexibleFundInsights,
    presentation:
      presentation === "simple" ? ("simple" as const) : ("standard" as const),
    limits: retirementIncomeChartLimits,
    statePensionEditable,
    useDataTargets,
    showMilestoneMarkers,
    timelineMode,
    seriesDefinitions,
    periodEvents,
    staticMilestones,
    showShortfallOverlay,
    onChangeTargetIncome,
    validationIssues,
    ...retirementIncomeChartParameters,
  };

  return readOnly ? (
    <RetirementIncomeChart
      {...commonProps}
      readOnly
      interactionMode="readonly-household"
    />
  ) : (
    <RetirementIncomeChart
      {...commonProps}
      readOnly={false}
      interactionMode="editable-person"
      onChangeParameters={onChangeChartParameters!}
    />
  );
}
