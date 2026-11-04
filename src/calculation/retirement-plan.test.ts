import { describe, expect, it } from "vitest";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
} from "../settings";
import { calculateRetirementPlan } from "./retirement-plan";

describe("calculateRetirementPlan", () => {
  it.each([
    {
      projectionBasis: "nominal" as const,
      inflation: 5,
      annual: 10609,
      modelledRate: 0.03,
    },
    {
      projectionBasis: "real" as const,
      inflation: 2.5,
      annual: 10097.7989292088,
      modelledRate: 0.0048780487804878,
    },
  ])(
    "keeps canonical State Pension rows and assumptions consistent in $projectionBasis terms",
    ({ projectionBasis, inflation, annual, modelledRate }) => {
      const settings = normalizeSettings({
        ...createDefaultSettings(),
        startDate: "2026-12-01",
        dateOfBirth: "1961-12-01",
        requirementAge: 67,
        lifeExpectancy: 70,
        showAlpha: false,
        showSipp: false,
        showIsa: false,
        currentStatePension: 10000,
        statePensionForecastConfirmed: true,
        statePensionDrawDate: "2028-12-01",
        statePensionApplyFutureGrowth: true,
        statePensionCpiPercent: 3,
        statePensionWageGrowthPercent: 0,
        projectionBasis,
        inflationRateAnnual: inflation,
      });
      const result = calculateRetirementPlan(settings);
      const drawRow = result.rows.find((row) => row.date === "2028-12-01");

      expect(result.validationIssues).toEqual([]);
      expect(drawRow?.monthlyStatePension).toBeCloseTo(annual / 12, 6);
      expect(
        result.inflationAssumptions.statePensionNominalIncreaseAnnual
      ).toBe(0.03);
      expect(
        result.inflationAssumptions.statePensionModelledIncreaseAnnual
      ).toBeCloseTo(modelledRate, 12);
    }
  );

  it("uses each person's own CPI assumption in the canonical household projection", () => {
    const defaults = createDefaultSettings();
    const person = {
      dateOfBirth: "1961-12-01",
      requirementAge: 67,
      lifeExpectancy: 70,
      showAlpha: false,
      showSipp: false,
      showIsa: false,
      currentStatePension: 10000,
      statePensionForecastConfirmed: true,
      statePensionDrawDate: "2028-12-01",
      statePensionApplyFutureGrowth: true,
      statePensionWageGrowthPercent: 0,
    };
    const result = calculateRetirementPlan(
      normalizeSettings({
        ...defaults,
        ...person,
        startDate: "2026-12-01",
        projectionBasis: "nominal",
        inflationRateAnnual: 5,
        statePensionCpiPercent: 3,
        partner: {
          ...createDefaultPartnerSettings(),
          ...person,
          statePensionCpiPercent: 10,
        },
        jointRetirement: { ...defaults.jointRetirement, enabled: true },
      })
    );
    const drawRow = result.jointProjection?.rows.find(
      (row) => row.date === "2028-12-01"
    );

    expect(result.validationIssues).toEqual([]);
    expect(drawRow?.people.you?.monthlyStatePension).toBeCloseTo(10609 / 12, 6);
    expect(drawRow?.people.partner?.monthlyStatePension).toBeCloseTo(
      12100 / 12,
      6
    );
  });

  it("returns one deterministic canonical result without mutating settings", () => {
    const settings = createDefaultSettings();
    const settingsBeforeCalculation = structuredClone(settings);

    const firstResult = calculateRetirementPlan(settings);
    const secondResult = calculateRetirementPlan(settings);

    expect(firstResult).toEqual(secondResult);
    expect(settings).toEqual(settingsBeforeCalculation);
    expect(firstResult.settings).toBe(settings);
    expect(firstResult.rows.length).toBeGreaterThan(0);
    expect(firstResult.summary).toBeDefined();
    expect(firstResult.assessment).toBeDefined();
    expect(firstResult.targetBasedWithdrawalPreviews).toBeDefined();
    expect(typeof firstResult.statePensionAssumptionAffectsTarget).toBe(
      "boolean"
    );
    expect(firstResult.diagnostics.targetWithdrawalConvergence.converged).toBe(
      true
    );
  });

  it("detects when a household target depends on Partner's unconfirmed State Pension", () => {
    const settings = createHouseholdStatePensionSettings({
      showYourStatePension: false,
      annualTarget: 10_000,
    });

    const result = calculateRetirementPlan(settings);

    expect(result.householdAssessment?.meetsTargetThroughout).toBe(true);
    expect(result.statePensionAssumptionAffectsTarget).toBe(true);
  });

  it("keeps a household workable when confirmed income meets the target without Partner's unconfirmed State Pension", () => {
    const settings = createHouseholdStatePensionSettings({
      showYourStatePension: true,
      annualTarget: 10_000,
    });

    const result = calculateRetirementPlan(settings);

    expect(result.householdAssessment?.meetsTargetThroughout).toBe(true);
    expect(result.statePensionAssumptionAffectsTarget).toBe(false);
  });

  it("preserves exhausted target-withdrawal diagnostics in the canonical result", () => {
    const result = calculateRetirementPlan(createDefaultSettings(), {
      targetWithdrawalMaxIterations: 0,
    });

    expect(result.diagnostics.targetWithdrawalConvergence).toEqual({
      converged: false,
      iterations: 0,
      maxIterations: 0,
    });
    expect(result.assessment).toBeDefined();
    expect(result.statePensionAssumptionAffectsTarget).toBe(false);
  });
});

function createHouseholdStatePensionSettings({
  showYourStatePension,
  annualTarget,
}: {
  showYourStatePension: boolean;
  annualTarget: number;
}) {
  const defaults = createDefaultSettings();

  return normalizeSettings({
    ...defaults,
    startDate: "2026-06-01",
    dateOfBirth: "1970-06-01",
    requirementAge: 67,
    lifeExpectancy: 70,
    taxationEnabled: false,
    showAlpha: false,
    showStatePension: showYourStatePension,
    currentStatePension: 12_000,
    statePensionForecastConfirmed: true,
    statePensionDrawDate: "2037-06-01",
    statePensionApplyFutureGrowth: false,
    showSipp: false,
    showIsa: false,
    partner: {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1970-06-01",
      requirementAge: 67,
      lifeExpectancy: 70,
      showAlpha: false,
      showStatePension: true,
      currentStatePension: 12_000,
      statePensionForecastConfirmed: false,
      statePensionDrawDate: "2037-06-01",
      statePensionApplyFutureGrowth: false,
      showSipp: false,
      showIsa: false,
    },
    jointRetirement: {
      ...defaults.jointRetirement,
      enabled: true,
      transitionDesiredRetirementIncome: annualTarget,
      fullyRetiredDesiredRetirementIncome: annualTarget,
    },
  });
}
