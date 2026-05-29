import { render, screen } from "@testing-library/react";
import {
  ComparisonBridgeChart,
  DeferredBelowFold,
} from "./chart";
import { createDefaultSettings } from "../settings";
import { createBridgeChartLimits, createBridgeChartParameters } from "../app-domains";

vi.mock("../RetirementIncomeBridgeChart", () => ({
  RetirementIncomeBridgeChart: (props: { alphaLabel: string }) => (
    <div>Chart {props.alphaLabel}</div>
  ),
}));

describe("chart module", () => {
  it("renders deferred content immediately when forced", () => {
    render(
      <DeferredBelowFold estimatedHeight={120} forceRender>
        <p>Deferred body</p>
      </DeferredBelowFold>,
    );

    expect(screen.getByText("Deferred body")).toBeInTheDocument();
  });

  it("renders the comparison bridge chart when all inputs are present", () => {
    const settings = createDefaultSettings();

    render(
      <ComparisonBridgeChart
        retirementIncomeSeries={[
          {
            date: "2026-01-01",
            age: 40,
            targetIncomeAnnual: 24000,
            isaIncomeAnnual: 0,
            sippIncomeAnnual: 0,
            partialRetirementIncomeAnnual: 0,
            alphaIncomeAnnual: 12000,
            nuvosIncomeAnnual: 0,
            statePensionIncomeAnnual: 0,
            totalIncomeAnnual: 12000,
            assessedIncomeAnnual: 12000,
            shortfallAnnual: 12000,
            isaBalance: 0,
            sippBalance: 0,
            phase: "build-up",
          },
        ]}
        bridgeChartParameters={createBridgeChartParameters(settings)}
        bridgeChartLimits={createBridgeChartLimits(settings)}
        onChangeChartParameters={vi.fn()}
      />,
    );

    expect(screen.getByText("Chart Alpha pension")).toBeInTheDocument();
  });
});
