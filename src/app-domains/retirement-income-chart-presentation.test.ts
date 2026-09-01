import { getRetirementIncomeChartPresentation } from "./retirement-income-chart-presentation";

describe("retirement income chart presentation", () => {
  it("keeps read-only and editable household presentation modes distinct", () => {
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
    expect(getRetirementIncomeChartPresentation("editable-household")).toEqual({
      readOnly: false,
      showInlineMilestones: false,
      showPeriodInspection: true,
    });
  });
});
