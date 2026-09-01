import { RetirementIncomeChart } from "../RetirementIncomeChart";
import type { ReactNode } from "react";
import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomeChartEditableMilestone,
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
  chartTitle,
  chartDataAccessibilitySummary,
  readOnly = false,
  useDataTargets = false,
  showMilestoneMarkers = true,
  timelineMode = "age",
  seriesDefinitions,
  periodEvents,
  staticMilestones,
  editableMilestones,
  showShortfallOverlay = true,
  showParameterControls = true,
  additionalParameterControls,
  onChangeTargetIncome,
  presentation = "standard",
  validationIssues,
  onChangeChartParameters,
  onChangeEditableMilestone,
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
  chartTitle?: string;
  chartDataAccessibilitySummary?: string;
  readOnly?: boolean;
  useDataTargets?: boolean;
  showMilestoneMarkers?: boolean;
  timelineMode?: "age" | "calendar";
  seriesDefinitions?: RetirementIncomeChartSeriesDefinition[];
  periodEvents?: RetirementIncomeChartEvent[];
  staticMilestones?: RetirementIncomeChartStaticMilestone[];
  editableMilestones?: RetirementIncomeChartEditableMilestone[];
  showShortfallOverlay?: boolean;
  showParameterControls?: boolean;
  additionalParameterControls?: ReactNode;
  onChangeTargetIncome?: (value: number, age?: number) => void;
  presentation?: RetirementIncomeChartPresentation;
  validationIssues?: PensionValidationIssue[];
  onChangeChartParameters?: (
    patch: Partial<RetirementIncomeChartParameters>
  ) => void;
  onChangeEditableMilestone?: (key: string, timelineValue: number) => void;
}) {
  if (
    !retirementIncomeSeries ||
    !retirementIncomeChartParameters ||
    !retirementIncomeChartLimits ||
    (!onChangeChartParameters && !onChangeEditableMilestone && !readOnly)
  ) {
    return null;
  }

  const commonProps = {
    data: retirementIncomeSeries,
    alphaLabel,
    chartDescription,
    chartTitle,
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
    editableMilestones,
    showShortfallOverlay,
    showParameterControls,
    additionalParameterControls,
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
      interactionMode={
        editableMilestones ? "editable-household" : "editable-person"
      }
      onChangeParameters={onChangeChartParameters ?? (() => undefined)}
      onChangeEditableMilestone={onChangeEditableMilestone}
    />
  );
}
