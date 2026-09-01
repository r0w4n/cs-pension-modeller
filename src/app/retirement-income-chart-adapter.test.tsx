import { render, screen } from "@testing-library/react";
import { DeferredBelowFold } from "./deferred-below-fold";
import { RetirementIncomeChartAdapter } from "./retirement-income-chart-adapter";
import { createDefaultSettings } from "../settings";
import {
  createRetirementIncomeChartLimits,
  createRetirementIncomeChartParameters,
} from "../result-projection/retirement-income";

const chartAdapterMocks = vi.hoisted(() => ({
  retirementIncomeChart: vi.fn(),
}));

vi.mock("../RetirementIncomeChart", () => ({
  RetirementIncomeChart: (props: {
    alphaLabel: string;
    timelineMode: string;
  }) => {
    chartAdapterMocks.retirementIncomeChart(props);
    return <div>Chart {props.alphaLabel}</div>;
  },
}));

describe("retirement income chart adapters", () => {
  beforeEach(() => {
    chartAdapterMocks.retirementIncomeChart.mockClear();
  });

  it("renders deferred content immediately when forced", () => {
    render(
      <DeferredBelowFold estimatedHeight={120} forceRender>
        <p>Deferred body</p>
      </DeferredBelowFold>
    );

    expect(screen.getByText("Deferred body")).toBeInTheDocument();
  });

  it("renders the journey retirement income chart when all inputs are present", () => {
    const settings = createDefaultSettings();

    render(
      <RetirementIncomeChartAdapter
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
    expect(chartAdapterMocks.retirementIncomeChart).toHaveBeenCalledWith(
      expect.objectContaining({ timelineMode: "calendar-age" })
    );
  });

  it("maps the detailed journey presentation onto the shared chart", () => {
    const settings = createDefaultSettings();
    const residualFlexibleFundInsights = [
      {
        accountId: "isa" as const,
        label: "ISA",
        endingBalance: 4_000,
        planningHorizonAge: 100,
        wasUsed: true,
      },
    ];

    render(
      <RetirementIncomeChartAdapter
        retirementIncomeSeries={[]}
        retirementIncomeChartParameters={createRetirementIncomeChartParameters(
          settings
        )}
        retirementIncomeChartLimits={createRetirementIncomeChartLimits(
          settings
        )}
        residualFlexibleFundInsights={residualFlexibleFundInsights}
        presentation="detailed"
        onChangeChartParameters={vi.fn()}
      />
    );

    expect(chartAdapterMocks.retirementIncomeChart).toHaveBeenCalledWith(
      expect.objectContaining({
        presentation: "standard",
        showFlexibleWithdrawalInsights: true,
        residualFlexibleFundInsights,
      })
    );
  });
});
