import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../settings";
import type { CandidateStrategy, OptimisationTarget } from "./optimiserTypes";
import {
  createStrategyProjectionSettings,
  evaluateStrategy,
} from "./strategyEvaluator";

describe("optimiser strategy evaluator", () => {
  const target: OptimisationTarget = {
    targetAnnualIncome: 32400,
    targetRetirementAge: 55,
    incomeStartAge: 55,
    incomeEndAge: 90,
    incomeBasis: "gross",
  };
  const baseSettings = {
    ...defaultSettings,
    dateOfBirth: "1987-06-01",
    startDate: "2026-06-01",
    showAlpha: true,
    accruedPensionAtLastAbs: 60000,
    pensionableEarnings: 0,
    showNuvos: false,
    showStatePension: false,
    taxationEnabled: false,
    isaCurrentPot: 70000,
    sippCurrentPot: 0,
    sippMonthlyContribution: 0,
    isaMonthlyContribution: 0,
    alphaAddedPensionMonthly: 0,
    applyPensionIncreases: false,
  };
  const candidate: CandidateStrategy = {
    id: "candidate",
    monthlySippContribution: 0,
    monthlyIsaContribution: 0,
    monthlyAddedPensionContribution: 0,
    retirementAge: 55,
    alphaDrawAge: 57,
    nuvosDrawAge: null,
    statePensionAge: null,
    withdrawalOrder: "isa-first",
    withdrawalStrategy: "zero_at_death",
    partialRetirementEnabled: false,
    partialRetirementStartAge: null,
    partialRetirementWorkPercent: null,
  };

  it("marks a strategy as a shortfall when the displayed withdrawal strategy leaves monthly income below target", () => {
    const strategy = evaluateStrategy({
      settings: baseSettings,
      candidate,
      target,
    });

    expect(strategy.viable).toBe(false);
    expect(strategy.firstFailureAge).toBe(55);
    expect(strategy.projectedSurplusOrShortfall).toBeLessThan(0);
  });

  it("targets the bridge endpoint when use-by-age drawdown is selected", () => {
    const strategySettings = createStrategyProjectionSettings({
      settings: baseSettings,
      candidate: {
        ...candidate,
        withdrawalStrategy: "use_by_age",
      },
      target,
    });

    expect(strategySettings.isaWithdrawalStrategy).toBe("use_by_age");
    expect(strategySettings.sippWithdrawalStrategy).toBe("use_by_age");
    expect(strategySettings.isaWithdrawalTargetAge).toBe(57);
  });

  it("targets SIPP use-by-age drawdown at the next secure-income point after SIPP access", () => {
    const strategySettings = createStrategyProjectionSettings({
      settings: baseSettings,
      candidate: {
        ...candidate,
        alphaDrawAge: 60,
        withdrawalStrategy: "use_by_age",
      },
      target,
    });

    expect(strategySettings.sippDrawAge).toBe(57);
    expect(strategySettings.sippWithdrawalTargetAge).toBe(60);
  });

  it("can mark the same bridge as viable when use-by-age drawdown covers the short bridge period", () => {
    const strategy = evaluateStrategy({
      settings: baseSettings,
      candidate: {
        ...candidate,
        withdrawalStrategy: "use_by_age",
      },
      target,
    });

    expect(strategy.viable).toBe(true);
    expect(strategy.firstFailureDate).toBeNull();
  });
});
