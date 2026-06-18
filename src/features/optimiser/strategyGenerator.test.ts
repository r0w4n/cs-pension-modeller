import { describe, expect, it } from "vitest";
import type { OptimisationSearchSpace } from "./optimiserTypes";
import { generateCandidateStrategies } from "./strategyGenerator";

describe("optimiser strategy generator", () => {
  it("respects the total monthly contribution cap across SIPP, ISA and added pension", () => {
    const searchSpace: OptimisationSearchSpace = {
      maxTotalMonthlyContribution: 500,
      monthlySippContribution: { min: 0, max: 500, step: 500 },
      monthlyIsaContribution: { min: 0, max: 500, step: 500 },
      monthlyAddedPensionContribution: { min: 0, max: 100, step: 100 },
      retirementAge: { min: 55, max: 55, step: 1 },
      alphaDrawAge: { min: 57, max: 57, step: 1 },
      withdrawalOrders: ["isa-first"],
      withdrawalStrategies: ["use_by_age"],
    };

    const result = generateCandidateStrategies(searchSpace, {
      normalPensionAge: 68,
      nuvosDrawAge: null,
      statePensionAge: null,
      maxCandidates: 100,
    });

    expect(result.candidates).not.toHaveLength(0);
    expect(
      result.candidates.every(
        (candidate) =>
          candidate.monthlySippContribution +
            candidate.monthlyIsaContribution +
            candidate.monthlyAddedPensionContribution <=
          500
      )
    ).toBe(true);
    expect(result.candidates).not.toContainEqual(
      expect.objectContaining({
        monthlySippContribution: 500,
        monthlyIsaContribution: 500,
      })
    );
  });
});
