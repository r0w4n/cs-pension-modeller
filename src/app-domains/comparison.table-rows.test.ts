import { describe, expect, it } from "vitest";
import {
  buildComparisonStatusItems,
  buildComparisonTableRows,
  createComparisonResult,
} from "./comparison";
import { createDefaultSettings } from "../settings";

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
});
