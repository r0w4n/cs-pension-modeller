export type RetirementIncomeChartInteractionMode =
  "editable-person" | "readonly-household";

export type RetirementIncomeChartPresentation = {
  readOnly: boolean;
  showInlineMilestones: boolean;
  showPeriodInspection: boolean;
};

export function getRetirementIncomeChartPresentation(
  mode: RetirementIncomeChartInteractionMode
): RetirementIncomeChartPresentation {
  return mode === "readonly-household"
    ? {
        readOnly: true,
        showInlineMilestones: false,
        showPeriodInspection: true,
      }
    : {
        readOnly: false,
        showInlineMilestones: true,
        showPeriodInspection: false,
      };
}
