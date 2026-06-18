import { describe, expect, it } from "vitest";
import type { EvaluatedStrategy } from "./optimiserTypes";
import { rankStrategies } from "./strategyRanker";

describe("optimiser strategy ranker", () => {
  it("ranks viable strategies with lower avoidable surplus ahead of overshooting routes", () => {
    const closeToTarget = createEvaluatedStrategy({
      id: "close-to-target",
      surplusScore: 0,
    });
    const overshooting = createEvaluatedStrategy({
      id: "overshooting",
      surplusScore: 20000,
    });

    expect(
      rankStrategies([overshooting, closeToTarget], "lowest-contribution").map(
        (strategy) => strategy.id
      )
    ).toEqual(["close-to-target", "overshooting"]);
  });
});

function createEvaluatedStrategy(input: {
  id: string;
  surplusScore: number;
}): EvaluatedStrategy {
  return {
    id: input.id,
    monthlySippContribution: 0,
    monthlyIsaContribution: 0,
    monthlyAddedPensionContribution: 0,
    retirementAge: 55,
    alphaDrawAge: 67,
    nuvosDrawAge: null,
    statePensionAge: 67,
    withdrawalOrder: "isa-first",
    withdrawalStrategy: "use_by_age",
    partialRetirementEnabled: false,
    partialRetirementStartAge: null,
    partialRetirementWorkPercent: null,
    viable: true,
    totalMonthlyContribution: 500,
    alphaTakenEarly: false,
    annualAlphaPensionAfterReduction: 20000,
    bridgeYearsBeforeAlphaStarts: 12,
    lowestProjectedBridgeBalance: 0,
    firstFailureAge: null,
    firstFailureDate: null,
    failureReason: null,
    projectedSurplusOrShortfall: 0,
    rankingScore: 0,
    scoreBreakdown: {
      contributionScore: 500,
      retirementAgeScore: 55,
      complexityScore: 1,
      surplusScore: input.surplusScore,
    },
    explanation: "",
  };
}
