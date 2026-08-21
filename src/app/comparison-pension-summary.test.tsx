import { render, screen } from "@testing-library/react";
import type { ComparisonResult } from "../result-projection/comparison-result";
import { defaultSettings } from "../settings";
import {
  PensionSummarySection,
  SimplePensionDetails,
  SimplePensionSummary,
} from "./comparison-pension-summary";

describe("PensionSummarySection", () => {
  it("starts the summary content with an on-track outcome banner", () => {
    render(
      <PensionSummarySection
        activeResult={createComparisonResultFixture()}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[
          {
            ageRange: "Age 60 to 67",
            sources: "ISA withdrawal",
            income: "£15,578.65",
            target: "£31,350.00",
            difference: "£15,771.35 shortfall",
          },
          {
            ageRange: "Age 67 to 80",
            sources: "Alpha pension, State Pension",
            income: "£36,667.60",
            target: "£31,350.00",
            difference: "£5,317.60 surplus",
          },
        ]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Retirement income summary" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent(
      "Based on the information entered, this scenario appears to provide your target income before tax of £31,350/year in today's money from age 60 until age 80."
    );
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("Bridge pots (ISA) cover ages 60-67.");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("Civil Service pension income starts at age 67.");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("State Pension starts at age 68.");
    expect(
      screen.queryByRole("heading", { name: "Bridge withdrawals" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Annual Alpha pension")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Annual pension income before tax")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Income by age range" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Age range" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Age 60 to 67" })
    ).toBeInTheDocument();
    expect(screen.getByText("ISA withdrawal")).toBeInTheDocument();
    expect(screen.getByText("£15,771.35 shortfall")).toBeInTheDocument();
  });

  it("does not mention bridge withdrawals when none are modelled", () => {
    const result = createComparisonResultFixture();
    result.summary.retirementIncome.bridgeWithdrawals = [];

    render(
      <PensionSummarySection
        activeResult={result}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).not.toHaveTextContent(/bridge withdrawals/i);
  });

  it("shows a shortfall outcome when the target is missed", () => {
    render(
      <PensionSummarySection
        activeResult={createComparisonResultFixture({
          targetMissMonths: 12,
          ageRanges: [
            {
              startAge: 74,
              endAge: 80,
              sourceLabels: ["Alpha pension", "State Pension"],
              monthlyIncomeBeforeTax: 2262.5,
              monthlyIncomeAfterTax: 2262.5,
              annualIncomeBeforeTax: 27150,
              annualIncomeAfterTax: 27150,
              annualTargetIncome: 31350,
              annualShortfall: 4200,
              annualSurplus: 0,
            },
          ],
        })}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent(
      "Shortfall from age 74. Based on the information entered, this scenario does not provide your target income before tax of £31,350/year through to age 80. The first shortfall is £4,200/year in today's money."
    );
  });

  it("keeps a resilient result on track and shows a State Pension caution", () => {
    const result = createComparisonResultFixture({
      statePensionAssumptionAffectsTarget: false,
    });
    result.scenario.settings.statePensionForecastConfirmed = false;

    render(
      <PensionSummarySection
        activeResult={result}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("Looks workable");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("State Pension amount not confirmed");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("target is still met if this income is excluded");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("Review the State Pension section");
  });

  it("marks a result as needing checking when it depends on assumed State Pension", () => {
    const result = createComparisonResultFixture({
      statePensionAssumptionAffectsTarget: true,
    });
    result.scenario.settings.statePensionForecastConfirmed = false;

    render(
      <PensionSummarySection
        activeResult={result}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent("Needs checking");
    expect(
      screen.getByRole("region", { name: "Retirement outcome" })
    ).toHaveTextContent(
      "meets your target only when the assumed State Pension"
    );
  });

  it("warns when a Premium factor is unavailable and income is excluded", () => {
    const result = createComparisonResultFixture();
    result.summary.premiumPension.factorUnavailable = true;

    render(
      <PensionSummarySection
        activeResult={result}
        description="Summary description"
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen.getByRole("region", { name: "Premium factor unavailable" })
    ).toHaveTextContent(
      "This Premium case is outside the published factors currently modelled, so Premium income is excluded."
    );
  });
});

describe("simple pension results", () => {
  it("explains the headline result without target or shortfall jargon", () => {
    const result = createComparisonResultFixture({ targetMissMonths: 12 });
    result.annualGap = -4200;

    render(
      <SimplePensionSummary
        activeResult={result}
        retirementIncomeDisplay="annual"
      />
    );

    expect(screen.getByText("Money left after estimated tax")).toBeVisible();
    expect(screen.getByText("Amount you want to spend")).toBeVisible();
    expect(screen.getAllByText("Less than you want").length).toBeGreaterThan(0);
    expect(screen.queryByText(/shortfall/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/target/i)).not.toBeInTheDocument();
  });

  it("uses plain English in the detailed age ranges", () => {
    render(
      <SimplePensionDetails
        activeResult={createComparisonResultFixture()}
        retirementIncomeDisplay="annual"
        incomeAgeRangeItems={[
          {
            ageRange: "Age 60 to 67",
            sources: "Alpha pension",
            income: "£15,578.65",
            target: "£31,350.00",
            difference: "£15,771.35 shortfall",
          },
        ]}
      />
    );

    expect(screen.getAllByText("£15,771.35 less than you want")).toHaveLength(
      2
    );
    expect(
      screen.queryByText(/compared with your target/i)
    ).not.toBeInTheDocument();
  });
});

function createComparisonResultFixture({
  targetMissMonths = 0,
  statePensionAssumptionAffectsTarget = false,
  ageRanges = [
    {
      startAge: 60,
      endAge: 67,
      sourceLabels: ["ISA withdrawal"],
      monthlyIncomeBeforeTax: 1298.22,
      monthlyIncomeAfterTax: 1298.22,
      annualIncomeBeforeTax: 15578.65,
      annualIncomeAfterTax: 15578.65,
      annualTargetIncome: 31350,
      annualShortfall: 0,
      annualSurplus: 0,
    },
  ],
}: {
  targetMissMonths?: number;
  statePensionAssumptionAffectsTarget?: boolean;
  ageRanges?: ComparisonResult["summary"]["retirementIncome"]["ageRanges"];
} = {}): ComparisonResult {
  const firstShortfallRange = ageRanges.find(
    (range) => range.annualShortfall > 0
  );

  return {
    scenario: {
      id: "current-model",
      name: "Current model",
      settings: {
        ...defaultSettings,
        requirementAge: 60,
        lifeExpectancy: 80,
        desiredRetirementIncome: 31350,
        alphaPensionDrawAge: 67,
        showNuvos: false,
        showStatePension: true,
        statePensionForecastConfirmed: true,
      },
      createdAt: "",
      updatedAt: "",
    },
    rows: [],
    summary: {
      calculated: {
        normalPensionAge: 67,
        statePensionAge: 68,
        earlyRetirementReductionPercent: 0,
      },
      retirementIncome: {
        summaryDate: "2047-01-01",
        sources: [],
        bridgeWithdrawals: [
          {
            key: "isa",
            label: "ISA",
            annualIncome: 15578.65,
            monthlyIncome: 1298.22,
            startAge: 60,
            endAge: 67,
          },
        ],
        ageRanges,
        totalMonthlyIncome: 3055.63,
        totalAnnualIncome: 36667.6,
      },
      premiumPension: {
        factorUnavailable: false,
      },
    },
    assessment: {
      meetsTargetThroughout: targetMissMonths === 0,
      targetMissMonths,
      firstShortfallAge: firstShortfallRange?.startAge ?? null,
      firstShortfallAnnualTarget: firstShortfallRange?.annualTargetIncome ?? 0,
      firstShortfallAnnualAmount: firstShortfallRange?.annualShortfall ?? 0,
      largestAnnualShortfall: firstShortfallRange?.annualShortfall ?? 0,
      totalLifetimeShortfall:
        (firstShortfallRange?.annualShortfall ?? 0) *
        (firstShortfallRange
          ? firstShortfallRange.endAge - firstShortfallRange.startAge
          : 0),
      lowestAnnualIncome: 15_578.65,
      retirementAnnualIncome: 15_578.65,
      retirementAnnualTarget: 31_350,
      retirementAnnualGap: -15_771.35,
      allSecureIncomeStartDate: "2054-01-01",
      allSecureIncomeStartAge: 67,
      allSecureIncomeStartAgeMonths: 0,
      allSecureAnnualIncome: 36_667.6,
      allSecureAnnualSurplus: 5317.6,
      planningHorizonSecureAnnualSurplus: 5317.6,
      firstFlexibleFundExhaustionDate: null,
      firstFlexibleFundExhaustionAge: null,
      firstFlexibleFundExhaustionAccount: null,
    },
    annualIncome: 36667.6,
    annualTarget: 31350,
    annualGap: 5317.6,
    isaDepletedAge: null,
    lisaDepletedAge: null,
    sippDepletedAge: null,
    lifeExpectancyAnnualIncome: 36667.6,
    statePensionAssumptionAffectsTarget,
    currentMatchesSaved: true,
  } as unknown as ComparisonResult;
}
