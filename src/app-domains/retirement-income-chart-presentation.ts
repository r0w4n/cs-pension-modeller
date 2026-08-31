export type RetirementIncomeChartInteractionMode =
  "editable-person" | "editable-household" | "readonly-household";

export type RetirementIncomeChartPresentation = {
  readOnly: boolean;
  showInlineMilestones: boolean;
  showPeriodInspection: boolean;
};

export function getRetirementIncomeChartPresentation(
  mode: RetirementIncomeChartInteractionMode
): RetirementIncomeChartPresentation {
  if (mode === "editable-household") {
    return {
      readOnly: false,
      showInlineMilestones: false,
      showPeriodInspection: true,
    };
  }

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
