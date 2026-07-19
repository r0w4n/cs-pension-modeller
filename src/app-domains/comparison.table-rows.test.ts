import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import type { ReactNode } from "react";
import {
  buildComparisonDetailedRows,
  buildComparisonStatusItems,
  buildComparisonTableRows,
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
