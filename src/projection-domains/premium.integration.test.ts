import { describe, expect, it } from "vitest";
import { createRetirementIncomeSeries } from "../app-domains/retirement-income";
import { createProjectionTable, generatePensionSummary } from "../projection";
import { defaultSettings, type PensionSettings } from "../settings";

function createPremiumSettings(
  overrides: Partial<PensionSettings> = {}
): PensionSettings {
  return {
    ...defaultSettings,
    dateOfBirth: "1970-04-01",
    startDate: "2025-04-01",
    lifeExpectancy: 62,
    projectionBasis: "nominal",
    inflationRateAnnual: 2.5,
    showAlpha: false,
    showNuvos: false,
    showPremium: true,
    showStatePension: false,
    showSipp: false,
    showIsa: false,
    showLisa: false,
    taxationEnabled: false,
    premiumAnnualPensionAtValuationDate: 5000,
    premiumValuationDate: "2020-04-01",
    premiumNormalPensionAge: 60,
    premiumDrawAge: 60,
    premiumEarliestAccessAge: 55,
    ...overrides,
  };
}

describe("Premium projection integration", () => {
  it("starts Premium income at draw age and includes it in gross totals", () => {
    const settings = createPremiumSettings();
    const rows = createProjectionTable(settings);
    const beforeDrawRow = rows.find((row) => row.date === "2029-04-01");
    const drawRow = rows.find((row) => row.date === "2030-04-01");
    const expectedAnnual = 5000 * 1.025 ** 10;

    expect(beforeDrawRow?.monthlyPremiumPensionGross).toBe(0);
    expect(beforeDrawRow?.totalMonthlyIncomeBeforeTax).toBe(0);
    expect(drawRow?.annualPremiumPensionIncludingReduction).toBeCloseTo(
      expectedAnnual,
      6
    );
    expect(drawRow?.monthlyPremiumPensionGross).toBeCloseTo(
      expectedAnnual / 12,
      6
    );
    expect(drawRow?.totalMonthlyIncomeBeforeTax).toBeCloseTo(
      expectedAnnual / 12,
      6
    );
  });

  it("includes Premium in summary retirement income and chart series from draw age", () => {
    const settings = createPremiumSettings();
    const rows = createProjectionTable(settings);
    const summary = generatePensionSummary(rows, settings);
    const series = createRetirementIncomeSeries(rows, settings);
    const beforeDrawPoint = series.find((point) => point.date === "2029-04-01");
    const drawPoint = series.find((point) => point.date === "2030-04-01");

    expect(summary.premiumPension.annualAtDraw).toBeGreaterThan(0);
    expect(summary.retirementIncome.sources).toContainEqual(
      expect.objectContaining({
        key: "premium",
        label: "Premium pension",
      })
    );
    expect(beforeDrawPoint?.premiumIncomeAnnual).toBe(0);
    expect(drawPoint?.premiumIncomeAnnual).toBeCloseTo(
      summary.premiumPension.annualAtDraw,
      6
    );
    expect(drawPoint?.totalIncomeAnnual).toBeCloseTo(
      summary.premiumPension.annualAtDraw,
      6
    );
  });

  it("excludes early Premium income when the required Premium factor is unavailable", () => {
    const settings = createPremiumSettings({
      premiumDrawAge: 58,
      lifeExpectancy: 60,
    });
    const rows = createProjectionTable(settings);
    const drawRow = rows.find((row) => row.date === "2028-04-01");
    const summary = generatePensionSummary(rows, settings);

    expect(drawRow?.annualPremiumPension).toBeGreaterThan(0);
    expect(drawRow?.annualPremiumPensionIncludingReduction).toBe(0);
    expect(drawRow?.monthlyPremiumPensionGross).toBe(0);
    expect(summary.premiumPension.factorUnavailable).toBe(true);
  });
});
