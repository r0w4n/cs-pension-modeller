import { describe, expect, it } from "vitest";
import { createProjectionTable } from "../projection";
import { createDefaultSettings } from "../settings";
import { assessRetirementPlan } from "./retirement-plan-assessment";

describe("retirement plan assessment", () => {
  it("uses the configured withdrawal strategy rather than assuming savings fill the target", () => {
    const settings = createIsaOnlySettings({
      isaCurrentPot: 100_000,
      isaWithdrawalStrategy: "percentage",
      isaWithdrawalPercent: 0,
    });

    const assessment = assessRetirementPlan(
      createProjectionTable(settings),
      settings
    );

    expect(assessment.meetsTargetThroughout).toBe(false);
    expect(assessment.targetMissMonths).toBeGreaterThan(0);
    expect(assessment.firstShortfallAnnualAmount).toBe(6000);
    expect(assessment.largestAnnualShortfall).toBe(6000);
    expect(assessment.retirementAnnualIncome).toBe(0);
    expect(assessment.retirementAnnualGap).toBe(-6000);
  });

  it("reports a plan as workable when target-based withdrawals fund every projected month", () => {
    const settings = createIsaOnlySettings({
      isaCurrentPot: 100_000,
      isaWithdrawalStrategy: "meet_income_target",
    });

    const assessment = assessRetirementPlan(
      createProjectionTable(settings),
      settings
    );

    expect(assessment.meetsTargetThroughout).toBe(true);
    expect(assessment.targetMissMonths).toBe(0);
    expect(assessment.totalLifetimeShortfall).toBe(0);
    expect(assessment.retirementAnnualIncome).toBe(6000);
    expect(assessment.retirementAnnualGap).toBe(0);
  });

  it("assesses secure income from the canonical classic projection", () => {
    const settings = {
      ...createIsaOnlySettings({ isaCurrentPot: 0 }),
      requirementAge: 60,
      lifeExpectancy: 61,
      showIsa: false,
      showClassic: true,
      classicCalculationMode: "manual" as const,
      classicAnnualPension: 12_000,
      classicAutomaticLumpSum: 0,
      classicPensionDrawAge: 60,
      classicApplyPensionIncreases: false,
    };

    const assessment = assessRetirementPlan(
      createProjectionTable(settings),
      settings
    );

    expect(assessment.meetsTargetThroughout).toBe(true);
    expect(assessment.allSecureIncomeStartDate).toBe("2030-01-01");
    expect(assessment.allSecureAnnualIncome).toBe(12_000);
    expect(assessment.allSecureAnnualSurplus).toBe(6000);
    expect(assessment.planningHorizonSecureAnnualSurplus).toBe(6000);
  });

  it("uses secure income after estimated tax for an after-tax target", () => {
    const settings = {
      ...createIsaOnlySettings({ isaCurrentPot: 0 }),
      requirementAge: 60,
      lifeExpectancy: 61,
      desiredRetirementIncome: 9000,
      retirementIncomeTargetBasis: "after_tax" as const,
      taxationEnabled: true,
      taxPersonalAllowance: 0,
      showIsa: false,
      showClassic: true,
      classicCalculationMode: "manual" as const,
      classicAnnualPension: 12_000,
      classicAutomaticLumpSum: 0,
      classicPensionDrawAge: 60,
      classicApplyPensionIncreases: false,
    };

    const assessment = assessRetirementPlan(
      createProjectionTable(settings),
      settings
    );

    expect(assessment.allSecureAnnualIncome).toBe(9600);
    expect(assessment.allSecureAnnualSurplus).toBe(600);
    expect(assessment.meetsTargetThroughout).toBe(true);
  });

  it("records flexible-fund exhaustion from the configured projection", () => {
    const settings = createIsaOnlySettings({
      isaCurrentPot: 6000,
      isaWithdrawalStrategy: "use_by_age",
      isaWithdrawalTargetAge: 58,
    });

    const assessment = assessRetirementPlan(
      createProjectionTable(settings),
      settings
    );

    expect(assessment.firstFlexibleFundExhaustionAccount).toBe("ISA");
    expect(assessment.firstFlexibleFundExhaustionDate).toBe("2027-12-01");
    expect(assessment.firstFlexibleFundExhaustionAge).toBeCloseTo(57 + 11 / 12);
  });
});

function createIsaOnlySettings(input: {
  isaCurrentPot: number;
  isaWithdrawalStrategy?: "percentage" | "meet_income_target" | "use_by_age";
  isaWithdrawalPercent?: number;
  isaWithdrawalTargetAge?: number;
}) {
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
    isaCurrentPot: input.isaCurrentPot,
    isaMonthlyContribution: 0,
    isaDrawAge: 57,
    isaRealInterestPercent: 0,
    isaWithdrawalStrategy:
      input.isaWithdrawalStrategy ?? ("meet_income_target" as const),
    isaWithdrawalPercent: input.isaWithdrawalPercent ?? 4,
    isaWithdrawalTargetAge: input.isaWithdrawalTargetAge ?? 58,
  };
}
