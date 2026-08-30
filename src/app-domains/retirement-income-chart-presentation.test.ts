import { getRetirementIncomeChartPresentation } from "./retirement-income-chart-presentation";

describe("retirement income chart presentation", () => {
  it("hides inline milestones and enables inspection only for a read-only household", () => {
    expect(getRetirementIncomeChartPresentation("readonly-household")).toEqual({
      readOnly: true,
      showInlineMilestones: false,
      showPeriodInspection: true,
    });
    expect(getRetirementIncomeChartPresentation("editable-person")).toEqual({
      readOnly: false,
      showInlineMilestones: true,
      showPeriodInspection: false,
    });
  });
});
