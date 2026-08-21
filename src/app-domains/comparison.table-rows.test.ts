import { describe, expect, it } from "vitest";
import {
  buildComparisonDetailedRows,
  buildComparisonStatusItems,
  buildComparisonTableRows,
  buildRetirementOutcomeBanner,
} from "./comparison";
import {
  createComparisonResult as projectComparisonResult,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import { createDefaultSettings } from "../settings";
import { createRetirementIncomeSeries } from "../result-projection/retirement-income";
import { calculateRetirementPlan } from "../calculation/retirement-plan";

function createComparisonResult(
  scenario: ComparisonScenario,
  currentSettingsSignature: string,
  plan = calculateRetirementPlan(scenario.settings)
) {
  return projectComparisonResult(scenario, currentSettingsSignature, plan);
}

describe("comparison table rows", () => {
  it("reuses the canonical bridge diagnostic from a precomputed plan", () => {
    const settings = createDefaultSettings();
    const plan = calculateRetirementPlan(settings);
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings),
      plan
    );

    expect(result.bridgeFundingEstimate).toBe(plan.bridgeFundingEstimate);
  });

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
    expect(
      getFirstComparisonValue(
        monthlyRows,
        "Illustrative extra saving for bridge"
      )
    ).toContain("/month");
    expect(getFirstComparisonValue(annualRows, "Target income")).toContain(
      "/year"
    );
    expect(getFirstComparisonValue(annualRows, "Alpha income")).toContain(
      "/year"
    );
    expect(
      getFirstComparisonValue(
        annualRows,
        "Illustrative extra saving for bridge"
      )
    ).toContain("/year");
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

  it("uses the canonical assessment when the bridge diagnostic disagrees", () => {
    const settings = createExactTargetScenarioSettings();
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
      bridgeFundingEstimate: {
        ...baseResult.bridgeFundingEstimate,
        planWorks: false,
        additionalMonthlyContributionRequired: 250,
        totalUnfundedShortfall: 10_000,
        fullSecureAnnualGuaranteedSurplus: 0,
      },
    };

    expect(
      buildComparisonStatusItems(result).find(
        (item) => item.label === "Overall status"
      )?.value
    ).toBe("Looks workable");
    expect(
      buildComparisonStatusItems(result).find(
        (item) => item.label === "Main issue"
      )?.value as string
    ).not.toContain("Bridge");
  });

  it("reports the configured zero-withdrawal strategy rather than a hypothetical bridge", () => {
    const settings = createZeroWithdrawalStrategySettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "No ISA withdrawals",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );
    const retirementPoint = createRetirementIncomeSeries(
      result.rows,
      settings
    ).find((point) => point.age >= settings.requirementAge);

    expect(result.bridgeFundingEstimate.planWorks).toBe(true);
    expect(retirementPoint?.shortfallAnnual).toBe(6000);
    expect(result.assessment.meetsTargetThroughout).toBe(false);
    expect(buildRetirementOutcomeBanner(result).label).toBe("Shortfall");
    expect(
      buildComparisonStatusItems(result).find(
        (item) => item.label === "Overall status"
      )?.value
    ).toBe("Needs attention");
    expect(
      getFirstComparisonValue(buildComparisonTableRows([result]), "Plan status")
    ).toBe("Shortfall with configured withdrawals");
  });

  it("discloses the entered salary used as pre-retirement tax context", () => {
    const settings = {
      ...createDefaultSettings(),
      taxationEnabled: true,
      fullSalary: 48_000,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Tax context",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    expect(
      getFirstComparisonValue(
        buildComparisonDetailedRows([result]),
        "Pre-retirement employment tax context"
      )
    ).toBe("£48,000.00 annual entered full salary");
    expect(
      getFirstComparisonValue(
        buildComparisonDetailedRows([result]),
        "Projection-end tax context"
      )
    ).toBe("Final taxable monthly income continued to the following 5 April");
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
    expect(result.assessment.targetMissMonths).toBe(0);
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
    expect(result.assessment.targetMissMonths).toBe(0);
    expect(result.summary.retirementIncome.ageRanges).toEqual([
      expect.objectContaining({
        annualTargetIncome: 45_400,
        annualShortfall: 0,
        annualSurplus: 0,
      }),
    ]);
    expect(result.bridgeFundingEstimate.totalUnfundedShortfall).toBe(0);
    expect(result.bridgeFundingEstimate.fullSecureAnnualGuaranteedSurplus).toBe(
      0
    );
    expect(buildRetirementOutcomeBanner(result).status).toBe("onTrack");
    expect(buildComparisonStatusItems(result)).toEqual([
      { label: "Overall status", value: "Looks workable" },
      {
        label: "Target shortfall",
        value: "No shortfall against the target",
      },
      {
        label: "Main issue",
        value: "No shortfall identified from the current assumptions.",
      },
      { label: "Income basis", value: "Before Income Tax" },
    ]);
  });

  it("keeps the chart, outcome and plan status aligned for classic-only income", () => {
    const settings = createClassicOnlyTargetScenarioSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Classic-only income",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );
    const retirementPoint = createRetirementIncomeSeries(
      result.rows,
      settings
    ).find((point) => point.age >= settings.requirementAge);
    const statusItems = buildComparisonStatusItems(result);

    expect(retirementPoint).toEqual(
      expect.objectContaining({
        classicIncomeAnnual: 12_000,
        assessedIncomeAnnual: 12_000,
        shortfallAnnual: 0,
      })
    );
    expect(result.assessment.targetMissMonths).toBe(0);
    expect(result.bridgeFundingEstimate.planWorks).toBe(true);
    expect(result.bridgeFundingEstimate.fullSecureAnnualGuaranteedSurplus).toBe(
      6000
    );
    expect(buildRetirementOutcomeBanner(result)).toEqual(
      expect.objectContaining({ status: "onTrack", label: "Looks workable" })
    );
    expect(statusItems).toEqual(
      expect.arrayContaining([
        { label: "Overall status", value: "Looks workable" },
        {
          label: "Main issue",
          value: "No shortfall identified from the current assumptions.",
        },
      ])
    );
  });

  it("requires checking when an on-track result depends on unconfirmed State Pension", () => {
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
    expect(banner.warning?.heading).toBe("State Pension amount not confirmed");
    expect(banner.warning?.message).toContain(
      "meets your target only when the assumed State Pension of £12,548 a year is included"
    );
    expect(buildComparisonStatusItems(result)).toEqual([
      { label: "Overall status", value: "Needs checking" },
      {
        label: "Target shortfall",
        value:
          "No calculated shortfall using the unconfirmed State Pension amount",
      },
      {
        label: "Main issue",
        value: "The target depends on an assumed State Pension of £12,548/year",
      },
      { label: "Income basis", value: "Before Income Tax" },
    ]);
  });

  it("keeps the result workable when the target is met without unconfirmed State Pension", () => {
    const settings = {
      ...createExactTargetScenarioSettings(),
      desiredRetirementIncome: 30_000,
      statePensionForecastConfirmed: false,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Resilient without State Pension",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    const banner = buildRetirementOutcomeBanner(result);

    expect(result.statePensionAssumptionAffectsTarget).toBe(false);
    expect(banner.status).toBe("onTrack");
    expect(banner.label).toBe("Looks workable");
    expect(banner.warning?.heading).toBe("State Pension amount not confirmed");
    expect(banner.warning?.message).toContain(
      "target is still met if this income is excluded"
    );
    expect(buildComparisonStatusItems(result)).toEqual([
      { label: "Overall status", value: "Looks workable" },
      {
        label: "Target shortfall",
        value: "No shortfall against the target",
      },
      {
        label: "Main issue",
        value:
          "State Pension is an unconfirmed assumption, but the target remains met without it",
      },
      { label: "Income basis", value: "Before Income Tax" },
    ]);
  });

  it("keeps an after-tax result workable when Alpha alone meets the target", () => {
    const settings = {
      ...createDefaultSettings(),
      startDate: "2026-08-13",
      dateOfBirth: "1977-04-01",
      lifeExpectancy: 80,
      requirementAge: 67,
      projectionBasis: "real" as const,
      currentStatePension: 12_547.6,
      statePensionForecastConfirmed: false,
      desiredRetirementIncome: 32_700,
      retirementIncomeTargetBasis: "after_tax" as const,
      statePensionDrawDate: "2044-04-01",
      statePensionApplyFutureGrowth: false,
      assumedCpiPercent: 0,
      alphaPensionAbsDate: "2025",
      alphaAddedPensionMonthly: 0,
      alphaPensionLeaveAge: 67,
      accruedPensionAtLastAbs: 16_000,
      pensionableEarnings: 70_000,
      alphaPayRisePercent: 0,
      alphaPensionDrawAge: 67,
      taxationEnabled: true,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "After-tax Alpha surplus",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );

    expect(result.assessment.targetMissMonths).toBe(0);
    expect(result.statePensionAssumptionAffectsTarget).toBe(false);
    const banner = buildRetirementOutcomeBanner(result);
    expect(banner.status).toBe("onTrack");
    expect(banner.label).toBe("Looks workable");
    expect(banner.warning?.heading).toBe("State Pension amount not confirmed");
    expect(banner.warning?.message).toContain(
      "target is still met if this income is excluded"
    );
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
    expect(result.assessment.targetMissMonths).toBe(
      projectionMonthsInAssessmentPeriod
    );
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

function createClassicOnlyTargetScenarioSettings() {
  return {
    ...createDefaultSettings(),
    startDate: "2026-04-01",
    dateOfBirth: "1980-04-01",
    requirementAge: 60,
    lifeExpectancy: 61,
    desiredRetirementIncome: 6000,
    taxationEnabled: false,
    showAlpha: false,
    showClassic: true,
    classicCalculationMode: "manual" as const,
    classicAnnualPension: 12_000,
    classicAutomaticLumpSum: 0,
    classicPensionDrawAge: 60,
    classicApplyPensionIncreases: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
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

function createZeroWithdrawalStrategySettings() {
  return {
    ...createDefaultSettings(),
    startDate: "2026-01-01",
    dateOfBirth: "1970-01-01",
    requirementAge: 57,
    lifeExpectancy: 58,
    desiredRetirementIncome: 6000,
    retirementIncomeTargetBasis: "gross" as const,
    projectionBasis: "real" as const,
    taxationEnabled: false,
    assumedCpiPercent: 0,
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showLisa: false,
    showIsa: true,
    isaCurrentPot: 100_000,
    isaMonthlyContribution: 0,
    isaDrawAge: 57,
    isaRealInterestPercent: 0,
    isaWithdrawalStrategy: "percentage" as const,
    isaWithdrawalPercent: 0,
  };
}

function getComparisonToneClass(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("tone" in value) ||
    typeof value.tone !== "string"
  ) {
    throw new Error("Expected a semantic comparison tone cell.");
  }

  return `comparison-cell comparison-cell--${value.tone}`;
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
