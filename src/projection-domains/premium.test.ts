import { describe, expect, it } from "vitest";
import { getAlphaEarlyRetirementFactor } from "./alpha";
import { calculateNuvosEarlyRetirementFactor } from "./nuvos";
import {
  calculatePremiumPension,
  getPremiumEarlyRetirementFactor,
} from "./premium";

const premiumTestFactors = {
  60: {
    58: 0.91,
  },
};

describe("projection Premium domain", () => {
  it("revalues Premium by CPI only with no early reduction at NPA", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 60,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
      earlyRetirementFactors: premiumTestFactors,
    });

    expect(result.scheme).toBe("premium");
    expect(result.cpiRevaluedPensionAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 10,
      6
    );
    expect(result.earlyRetirementFactor).toBe(1);
    expect(result.annualPensionPayableAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 10,
      6
    );
    expect(result.isReducedForEarlyPayment).toBe(false);
  });

  it("applies a Premium early-retirement factor after CPI revaluation", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 58,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
      earlyRetirementFactors: premiumTestFactors,
    });

    expect(result.cpiRevaluedPensionAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 8,
      6
    );
    expect(result.earlyRetirementFactor).toBe(0.91);
    expect(result.annualPensionPayableAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 8 * 0.91,
      6
    );
    expect(result.isReducedForEarlyPayment).toBe(true);
  });

  it("does not apply a late-retirement uplift above Premium NPA", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 62,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
      earlyRetirementFactors: premiumTestFactors,
    });

    expect(result.earlyRetirementFactor).toBe(1);
    expect(result.annualPensionPayableAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 12,
      6
    );
  });

  it("uses Premium factors rather than Alpha or nuvos reductions", () => {
    const alphaFactor = getAlphaEarlyRetirementFactor(60, 58);
    const nuvosFactor = calculateNuvosEarlyRetirementFactor(2, 0);

    expect(getPremiumEarlyRetirementFactor(58, 60, premiumTestFactors)).toBe(
      0.91
    );
    expect(alphaFactor).not.toBe(0.91);
    expect(nuvosFactor).not.toBe(0.91);
  });

  it("returns factor unavailable instead of estimating a missing Premium factor", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 57,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
      earlyRetirementFactors: premiumTestFactors,
    });

    expect(result.earlyRetirementFactor).toBeNull();
    expect(result.factorUnavailable).toBe(true);
    expect(result.annualPensionPayableAtDrawAge).toBe(0);
  });
});
