import { describe, expect, it } from "vitest";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
} from "../settings";
import { calculateRetirementPlan } from "./retirement-plan";

describe("calculateRetirementPlan", () => {
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
