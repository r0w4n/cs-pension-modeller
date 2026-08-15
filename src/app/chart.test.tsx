import { render, screen } from "@testing-library/react";
import { ComparisonRetirementIncomeChart, DeferredBelowFold } from "./chart";
import { createDefaultSettings } from "../settings";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
} from "../app-domains";

vi.mock("../RetirementIncomeChart", () => ({
  RetirementIncomeChart: (props: { alphaLabel: string }) => (
    <div>Chart {props.alphaLabel}</div>
  ),
}));

describe("chart module", () => {
  it("renders deferred content immediately when forced", () => {
    render(
      <DeferredBelowFold estimatedHeight={120} forceRender>
        <p>Deferred body</p>
      </DeferredBelowFold>
    );

    expect(screen.getByText("Deferred body")).toBeInTheDocument();
  });

  it("renders the comparison retirement income chart when all inputs are present", () => {
    const settings = createDefaultSettings();

    render(
      <ComparisonRetirementIncomeChart
        retirementIncomeSeries={[
          {
            date: "2026-01-01",
            age: 40,
            targetIncomeAnnual: 24000,
            isaIncomeAnnual: 0,
            lisaIncomeAnnual: 0,
            sippIncomeAnnual: 0,
            csAvcIncomeAnnual: 0,
            partialRetirementIncomeAnnual: 0,
            alphaIncomeAnnual: 12000,
            classicIncomeAnnual: 0,
            classicPlusIncomeAnnual: 0,
            nuvosIncomeAnnual: 0,
            premiumIncomeAnnual: 0,
            additionalGuaranteedIncomeAnnual: 0,
            statePensionIncomeAnnual: 0,
            totalIncomeAnnual: 12000,
            assessedIncomeAnnual: 12000,
            shortfallAnnual: 12000,
            guaranteedNetIncomeAnnual: 12000,
            unavoidableSurplusAnnual: 0,
            avoidableFlexibleSurplusAnnual: 0,
            flexibleWithdrawalInsights: [],
            isaBalance: 0,
            lisaBalance: 0,
            sippBalance: 0,
          },
        ]}
        retirementIncomeChartParameters={createRetirementIncomeChartParameters(
          settings
        )}
        retirementIncomeChartLimits={createRetirementIncomeChartLimits(
          settings
        )}
        onChangeChartParameters={vi.fn()}
      />
    );

    expect(screen.getByText("Chart Alpha pension")).toBeInTheDocument();
  });
});
