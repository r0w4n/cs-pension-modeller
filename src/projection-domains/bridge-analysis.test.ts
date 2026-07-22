import { describe, expect, it } from "vitest";
import {
  generateRetirementBridgeAnalysis,
  prepareBridgeProjectionSettings,
} from "./bridge-analysis";
import { createProjectionTable, generatePensionSummary } from "../projection";
import { defaultSettings } from "../settings";

describe("projection bridge analysis domain", () => {
  it("supports bridge analysis with no Civil Service pension", () => {
    const settings = prepareBridgeProjectionSettings({
      ...defaultSettings,
      startDate: "2026-04-01",
      dateOfBirth: "1980-04-01",
      requirementAge: 60,
      lifeExpectancy: 61,
      desiredRetirementIncome: 6000,
      showAlpha: false,
      showNuvos: false,
      showStatePension: false,
      showSipp: false,
      showIsa: true,
      isaCurrentPot: 10000,
    });
    const pensionRows = createProjectionTable({
      ...settings,
      showSipp: false,
      showIsa: false,
    });
    const summary = generatePensionSummary(pensionRows, settings);
    const analysis = generateRetirementBridgeAnalysis(pensionRows, settings);

    expect(
      summary.retirementIncome.sources.some((source) => source.key === "alpha")
    ).toBe(false);
    expect(analysis.planWorks).toBe(true);
    expect(analysis.phases[0]?.incomeSourcesActive).toEqual(["None"]);
  });

  it("shows State Pension changing bridge phase income sources", () => {
    const settings = prepareBridgeProjectionSettings({
      ...defaultSettings,
      startDate: "2026-04-01",
      dateOfBirth: "1960-04-01",
      requirementAge: 66,
      lifeExpectancy: 68,
      desiredRetirementIncome: 12000,
      showAlpha: false,
      showNuvos: false,
      showStatePension: true,
      currentStatePension: 12000,
      statePensionDrawDate: "2026-05-06",
      showSipp: true,
      showIsa: true,
      sippDrawAge: 57,
      sippCurrentPot: 30000,
      isaCurrentPot: 30000,
    });
    const pensionRows = createProjectionTable({
      ...settings,
      showSipp: false,
      showIsa: false,
    });

    const analysis = generateRetirementBridgeAnalysis(pensionRows, settings);

    expect(analysis.planWorks).toBe(true);
    expect(
      analysis.phases.some((phase) =>
        phase.incomeSourcesActive.includes("State Pension")
      )
    ).toBe(true);
    expect(analysis.stableAnnualGuaranteedIncome).toBeCloseTo(12000, 6);
  });

  it("grosses up taxable CS AVC bridge withdrawals to meet a net target", () => {
    const settings = prepareBridgeProjectionSettings({
      ...defaultSettings,
      startDate: "2025-12-01",
      dateOfBirth: "1966-01-01",
      requirementAge: 60,
      lifeExpectancy: 60.25,
      desiredRetirementIncome: 12000,
      showAlpha: false,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showStatePension: false,
      showSipp: false,
      showCsAvc: true,
      showIsa: false,
      showLisa: false,
      showAdditionalGuaranteedIncome: false,
      csAvcCurrentPot: 5000,
      csAvcMonthlyContribution: 0,
      csAvcDrawAge: 60,
      csAvcRealInterestPercent: 0,
      taxationEnabled: true,
      taxPersonalAllowance: 0,
      taxBasicRatePercent: 20,
      taxHigherRatePercent: 20,
      taxAdditionalRatePercent: 20,
      taxCsAvcTaxFreeWithdrawalPercent: 0,
    });
    const pensionRows = createProjectionTable({
      ...settings,
      showCsAvc: false,
    });

    const firstRow = generateRetirementBridgeAnalysis(pensionRows, settings)
      .potProjection[0];

    expect(firstRow?.monthlyTargetIncome).toBe(1000);
    expect(firstRow?.csAvcDrawdown).toBeCloseTo(1250, 6);
    expect(firstRow?.unfundedShortfall).toBeCloseTo(0, 6);
  });
});
