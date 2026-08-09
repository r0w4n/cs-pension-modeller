import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import type { ReactNode } from "react";
import {
  buildComparisonDetailedRows,
  buildComparisonStatusItems,
  buildComparisonTableRows,
  buildRetirementOutcomeBanner,
  createComparisonResult,
} from "./comparison";
import { createDefaultSettings } from "../settings";
import { createRetirementIncomeSeries } from "./retirement-income";

describe("comparison table rows", () => {
  it("uses section divider rows and simplified default metric labels", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const rows = buildComparisonTableRows([result]);
    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Headline outcome"
      )
    ).toBe(true);
    expect(rows.some((row) => row.metric === "Status")).toBe(true);
    expect(rows.some((row) => row.metric === "Section")).toBe(false);
    expect(rows.some((row) => row.metric === "Overall status")).toBe(false);
    expect(rows.some((row) => row.metric === "Target income")).toBe(true);
    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Spending target"
      )
    ).toBe(false);
  });

  it("shows SMILE phase assumptions when a compared scenario uses them", () => {
    const flatSettings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 30_000,
    };
    const smileSettings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 30_000,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        goGoPercentage: 110,
        slowGoStartAge: 74,
        slowGoPercentage: 80,
        noGoStartAge: 84,
        noGoPercentage: 65,
      },
    };
    const results = [
      createComparisonResult(
        {
          id: "flat",
          name: "Flat plan",
          settings: flatSettings,
          createdAt: "",
          updatedAt: "",
        },
        JSON.stringify(flatSettings)
      ),
      createComparisonResult(
        {
          id: "smile",
          name: "SMILE plan",
          settings: smileSettings,
          createdAt: "",
          updatedAt: "",
        },
        JSON.stringify(flatSettings)
      ),
    ];

    const rows = buildComparisonTableRows(results);

    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Spending target"
      )
    ).toBe(true);
    expect(getComparisonRow(rows, "Spending strategy").values).toEqual([
      "Flat spending",
      "Go-Go, Slow-Go, No-Go",
    ]);
    expect(getComparisonRow(rows, "Underlying target").values).toEqual([
      "£30,000.00/year",
      "£30,000.00/year",
    ]);
    expect(getComparisonRow(rows, "Go-go target").values).toEqual([
      "n/a",
      "£33,000.00/year (110%)",
    ]);
    expect(getComparisonRow(rows, "Slow-go starts").values).toEqual([
      "n/a",
      "74",
    ]);
    expect(getComparisonRow(rows, "Slow-go target").values).toEqual([
      "n/a",
      "£24,000.00/year (80%)",
    ]);
    expect(getComparisonRow(rows, "No-go starts").values).toEqual([
      "n/a",
      "84",
    ]);
    expect(getComparisonRow(rows, "No-go target").values).toEqual([
      "n/a",
      "£19,500.00/year (65%)",
    ]);
    expect(
      getComparisonRow(
        buildComparisonTableRows(results, {
          retirementIncomeDisplay: "monthly",
        }),
        "Slow-go target"
      ).values
    ).toEqual(["n/a", "£2,000.00/month (80%)"]);
  });

  it("can show recurring comparison values monthly or annually", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const monthlyRows = buildComparisonTableRows([result], {
      retirementIncomeDisplay: "monthly",
    });
    const annualRows = buildComparisonTableRows([result], {
      retirementIncomeDisplay: "annual",
    });

    expect(getFirstComparisonValue(monthlyRows, "Target income")).toContain(
      "/month"
    );
    expect(getFirstComparisonValue(monthlyRows, "Alpha income")).toContain(
      "/month"
    );
    expect(getFirstComparisonValue(monthlyRows, "Extra saving")).toContain(
      "/month"
    );
    expect(getFirstComparisonValue(annualRows, "Target income")).toContain(
      "/year"
    );
    expect(getFirstComparisonValue(annualRows, "Alpha income")).toContain(
      "/year"
    );
    expect(getFirstComparisonValue(annualRows, "Extra saving")).toContain(
      "/year"
    );
  });

  it("can hide bridge funding and flexible assets sections", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const rows = buildComparisonTableRows([result], {
      hideBridgeFundingSection: true,
      hideFlexibleAssetsSection: true,
    });

    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Bridge funding"
      )
    ).toBe(false);
    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Flexible assets"
      )
    ).toBe(false);
  });

  it("folds later secure income into a total secure income row", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const rows = buildComparisonTableRows([result]);

    expect(
      rows.some(
        (row) => row.isSectionDivider && row.section === "Later secure income"
      )
    ).toBe(false);
    expect(rows.some((row) => row.metric === "Total secure income")).toBe(true);
  });

  it("shows nuvos comparison rows when a saved scenario includes nuvos", () => {
    const currentSettings = createDefaultSettings();
    const savedSettings = {
      ...createDefaultSettings(),
      showNuvos: true,
      nuvosAccruedPensionAtLastAbs: 12000,
      nuvosPensionableEarnings: 12000,
      nuvosPensionDrawAge: 65,
      nuvosPensionLeaveAge: 65,
    };
    const currentResult = createComparisonResult(
      {
        id: "current-model",
        name: "Current model",
        settings: currentSettings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(currentSettings)
    );
    const savedResult = createComparisonResult(
      {
        id: "scenario-1",
        name: "Saved with nuvos",
        settings: savedSettings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(currentSettings)
    );

    const rows = buildComparisonTableRows([currentResult, savedResult]);
    const nuvosStartRow = getComparisonRow(rows, "nuvos start");
    const nuvosIncomeRow = getComparisonRow(rows, "nuvos income");

    expect(nuvosStartRow.values[0]).toBe("n/a");
    expect(nuvosStartRow.values[1]).toBe("65");
    expect(nuvosIncomeRow.values[0]).toBe("n/a");
    expect(nuvosIncomeRow.values[1]).toContain("/year");
  });

  it("hides nuvos comparison rows when no compared scenario includes nuvos", () => {
    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const rows = buildComparisonTableRows([result]);

    expect(rows.some((row) => row.metric === "nuvos start")).toBe(false);
    expect(rows.some((row) => row.metric === "nuvos income")).toBe(false);
  });

  it("shows a sustainable pension draw age when projected Alpha income supports the target", () => {
    const settings = {
      ...createDefaultSettings(),
      startDate: "2025-04-01",
      dateOfBirth: "1971-01-01",
      requirementAge: 55,
      normalPensionAge: 67,
      alphaPensionDrawAge: 67,
      lifeExpectancy: 56,
      desiredRetirementIncome: 5000,
      inflationRateAnnual: 0,
      showAlpha: true,
      accruedPensionAtLastAbs: 20000,
      pensionableEarnings: 0,
      alphaAddedPensionMonthly: 0,
      showNuvos: false,
      showStatePension: false,
      showSipp: false,
      showIsa: false,
      showLisa: false,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Sustainable Alpha",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    expect(
      getFirstComparisonValue(
        buildComparisonDetailedRows([result]),
        "Earliest sustainable pension draw age"
      )
    ).toBe("55");
  });

  it("keeps bridge wording for normal status items but hides it when bridge funding is hidden", () => {
    const settings = createDefaultSettings();
    const baseResult = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );
    const result = {
      ...baseResult,
      targetMissMonths: 0,
      bridgeAnalysis: {
        ...baseResult.bridgeAnalysis,
        planWorks: false,
        additionalMonthlyContributionRequired: 250,
        totalUnfundedShortfall: 10_000,
        fullSecureAnnualGuaranteedSurplus: 0,
      },
    };

    expect(
      buildComparisonStatusItems(result).find(
        (item) => item.label === "Main issue"
      )?.value as string
    ).toContain("Bridge still unfunded");
    expect(
      buildComparisonStatusItems(result, {
        hideBridgeFundingSection: true,
      }).find((item) => item.label === "Main issue")?.value as string
    ).not.toContain("Bridge");
  });

  it("does not report a one-month target shortfall when month-based ages meet at a transition", () => {
    const dateOfBirth = "1980-01-01";
    const startDate = "2026-06-13";
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth,
      startDate,
      lifeExpectancy: 55,
      requirementAge: 54,
      normalPensionAge: 68,
      showAlpha: false,
      showNuvos: false,
      showStatePension: false,
      showSipp: false,
      showIsa: true,
      taxationEnabled: false,
      partialRetirementEnabled: false,
      fullSalary: 0,
      desiredRetirementIncome: 12000,
      applyPensionIncreases: true,
      alphaPensionAbsDate: "2025",
      alphaPensionLeaveAge: 54,
      pensionableEarnings: 0,
      alphaPensionDrawAge: 54,
      currentStatePension: 0,
      statePensionDrawDate: "2048-01-01",
      sippCurrentPot: 0,
      sippMonthlyContribution: 0,
      isaCurrentPot: 120000,
      isaMonthlyContribution: 0,
      isaDrawAge: 54,
      isaLumpSums: [],
      isaRealInterestPercent: 0,
      isaWithdrawalStrategy: "use_by_age" as const,
      isaWithdrawalTargetAge: 56,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    expect(
      createRetirementIncomeSeries(result.rows, settings)
        .filter(
          (point) =>
            point.age >= settings.requirementAge &&
            point.age <= settings.lifeExpectancy &&
            point.shortfallAnnual > 0
        )
        .map((point) => ({
          date: point.date,
          age: point.age,
          shortfallAnnual: point.shortfallAnnual,
          isaIncomeAnnual: point.isaIncomeAnnual,
          sippIncomeAnnual: point.sippIncomeAnnual,
          alphaIncomeAnnual: point.alphaIncomeAnnual,
          targetIncomeAnnual: point.targetIncomeAnnual,
          assessedIncomeAnnual: point.assessedIncomeAnnual,
        }))
    ).toEqual([]);
    expect(result.targetMissMonths).toBe(0);
  });

  it("treats sub-penny floating-point differences as meeting the target", () => {
    const settings = createExactTargetScenarioSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Exact target",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    expect(result.annualIncome).toBeCloseTo(45_400, 6);
    expect(result.annualGap).toBe(0);
    expect(result.targetMissMonths).toBe(0);
    expect(result.summary.retirementIncome.ageRanges).toEqual([
      expect.objectContaining({
        annualTargetIncome: 45_400,
        annualShortfall: 0,
        annualSurplus: 0,
      }),
    ]);
    expect(result.bridgeAnalysis.totalUnfundedShortfall).toBe(0);
    expect(result.bridgeAnalysis.fullSecureAnnualGuaranteedSurplus).toBe(0);
    expect(buildRetirementOutcomeBanner(result).status).toBe("onTrack");
    expect(
      buildComparisonStatusItems(result, {
        hideBridgeFundingSection: true,
      })
    ).toEqual([
      { label: "Overall status", value: "Looks workable" },
      {
        label: "Target shortfall",
        value: "No shortfall against the target",
      },
      {
        label: "Main issue",
        value: "No shortfall identified from the current assumptions.",
      },
    ]);
  });

  it("does not report on track while the State Pension amount is unconfirmed", () => {
    const settings = {
      ...createExactTargetScenarioSettings(),
      statePensionForecastConfirmed: false,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Unconfirmed State Pension",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const banner = buildRetirementOutcomeBanner(result);

    expect(banner.status).toBe("atRisk");
    expect(banner.label).toBe("Needs checking");
    expect(banner.message).toContain(
      "unconfirmed State Pension assumption of £12,548/year"
    );
    expect(
      buildComparisonStatusItems(result, {
        hideBridgeFundingSection: true,
      })
    ).toEqual([
      { label: "Overall status", value: "Needs checking" },
      {
        label: "Target shortfall",
        value:
          "No calculated shortfall using the unconfirmed State Pension amount",
      },
      {
        label: "Main issue",
        value: "State Pension uses an unconfirmed assumption of £12,548/year",
      },
    ]);
  });

  it("counts projection months rather than chart-only transition points", () => {
    const settings = {
      ...createExactTargetScenarioSettings(),
      desiredRetirementIncome: 45_500,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Real shortfall",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );
    const projectionMonthsInAssessmentPeriod = result.rows.filter((row) => {
      const age = row.age + row.ageMonths / 12;

      return age >= settings.requirementAge && age <= settings.lifeExpectancy;
    }).length;

    expect(projectionMonthsInAssessmentPeriod).toBe(157);
    expect(result.targetMissMonths).toBe(projectionMonthsInAssessmentPeriod);
  });

  it("shows expected flexible bridge exhaustion as caution rather than a problem", () => {
    const settings = createFlexibleAssetsScenario({
      isaCurrentPot: 120000,
    });
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const assetsExhaustedValue = getComparisonRow(
      buildComparisonTableRows([result]),
      "Assets exhausted"
    ).values[0];

    expect(getComparisonToneClass(assetsExhaustedValue)).toContain(
      "comparison-cell--caution"
    );
  });

  it("keeps unexpectedly early flexible asset exhaustion marked as a problem", () => {
    const settings = createFlexibleAssetsScenario({
      isaCurrentPot: 0,
    });
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const assetsExhaustedValue = getComparisonRow(
      buildComparisonTableRows([result]),
      "Assets exhausted"
    ).values[0];

    expect(getComparisonToneClass(assetsExhaustedValue)).toContain(
      "comparison-cell--problem"
    );
  });
});

function createExactTargetScenarioSettings() {
  return {
    ...createDefaultSettings(),
    startDate: "2026-08-07",
    dateOfBirth: "1974-06-01",
    normalPensionAge: 67,
    lifeExpectancy: 80,
    requirementAge: 67,
    projectionBasis: "real" as const,
    currentStatePension: 12_547.6,
    statePensionForecastConfirmed: true,
    desiredRetirementIncome: 45_400,
    statePensionDrawDate: "2041-06-01",
    statePensionApplyFutureGrowth: false,
    assumedCpiPercent: 0,
    alphaPensionAbsDate: "2025",
    alphaAddedPensionMonthly: 86.15157362859668,
    alphaPensionLeaveAge: 67,
    accruedPensionAtLastAbs: 16_000,
    pensionableEarnings: 42_000,
    alphaPayRisePercent: 0,
    alphaPensionDrawAge: 67,
    taxationEnabled: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
  };
}

function createFlexibleAssetsScenario(input: { isaCurrentPot: number }) {
  return {
    ...createDefaultSettings(),
    startDate: "2026-06-13",
    dateOfBirth: "1970-01-01",
    lifeExpectancy: 60,
    requirementAge: 57,
    normalPensionAge: 68,
    showAlpha: false,
    showNuvos: false,
    showStatePension: false,
    showSipp: false,
    showIsa: true,
    taxationEnabled: false,
    applyPensionIncreases: true,
    alphaPensionAbsDate: "2025",
    alphaPensionLeaveAge: 57,
    pensionableEarnings: 0,
    alphaPensionDrawAge: 57,
    sippCurrentPot: 0,
    sippMonthlyContribution: 0,
    isaCurrentPot: input.isaCurrentPot,
    isaMonthlyContribution: 0,
    isaDrawAge: 57,
    isaLumpSums: [],
    isaRealInterestPercent: 0,
    isaWithdrawalStrategy: "use_by_age" as const,
    isaWithdrawalTargetAge: 59,
  };
}

function getComparisonToneClass(value: ReactNode) {
  if (!isValidElement<{ className?: string }>(value)) {
    throw new Error("Expected a rendered comparison tone cell.");
  }

  return value.props.className ?? "";
}

function getFirstComparisonValue(
  rows: ReturnType<typeof buildComparisonTableRows>,
  metric: string
) {
  const value = rows.find((row) => row.metric === metric)?.values[0];

  if (typeof value !== "string") {
    throw new Error(`Expected ${metric} comparison value to be text.`);
  }

  return value;
}

function getComparisonRow(
  rows: ReturnType<typeof buildComparisonTableRows>,
  metric: string
) {
  const row = rows.find((candidate) => candidate.metric === metric);

  if (!row) {
    throw new Error(`Expected ${metric} comparison row.`);
  }

  return row;
}
