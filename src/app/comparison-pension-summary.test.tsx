import { render, screen } from "@testing-library/react";
import type { ComparisonResult } from "../app-domains";
import { defaultSettings } from "../settings";
import { PensionSummarySection } from "./comparison-pension-summary";

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
      "On track. You can retire at 60 and meet your target income of £31,350/year in today's money until age 80."
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
      "Shortfall from age 74. This plan does not meet your target income of £31,350/year through to age 80. The first shortfall is £4,200/year in today's money."
    );
  });
});

function createComparisonResultFixture({
  targetMissMonths = 0,
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
  ageRanges?: ComparisonResult["summary"]["retirementIncome"]["ageRanges"];
} = {}): ComparisonResult {
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
    },
    bridgeAnalysis: {},
    annualIncome: 36667.6,
    annualTarget: 31350,
    annualGap: 5317.6,
    isaDepletedAge: null,
    lisaDepletedAge: null,
    sippDepletedAge: null,
    retirementAnnualIncome: 15578.65,
    statePensionAnnualIncome: 36667.6,
    lifeExpectancyAnnualIncome: 36667.6,
    targetMissMonths,
    currentMatchesSaved: true,
  } as unknown as ComparisonResult;
}
