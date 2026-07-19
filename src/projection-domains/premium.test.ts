import { describe, expect, it } from "vitest";
import { getAlphaEarlyRetirementFactor } from "./alpha";
import { calculateNuvosEarlyRetirementFactor } from "./nuvos";
import {
  calculatePremiumPension,
  getPremiumEarlyRetirementFactor,
} from "./premium";

describe("projection Premium domain", () => {
  it("revalues Premium by CPI only with no early reduction at NPA", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 60,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
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
    });

    expect(result.cpiRevaluedPensionAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 8,
      6
    );
    expect(result.earlyRetirementFactor).toBe(0.916);
    expect(result.annualPensionPayableAtDrawAge).toBeCloseTo(
      5000 * 1.025 ** 8 * 0.916,
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

    expect(getPremiumEarlyRetirementFactor(58, 60)).toBe(0.916);
    expect(alphaFactor).not.toBe(0.916);
    expect(nuvosFactor).not.toBe(0.916);
  });

  it("loads the published whole-year NPA 60 and NPA 65 factors", () => {
    expect(getPremiumEarlyRetirementFactor(55, 60)).toBe(0.806);
    expect(getPremiumEarlyRetirementFactor(59, 60)).toBe(0.957);
    expect(getPremiumEarlyRetirementFactor(55, 65)).toBe(0.632);
    expect(getPremiumEarlyRetirementFactor(64, 65)).toBe(0.95);
  });

  it("returns factor unavailable for an under-55 case needing additional scheme inputs", () => {
    const result = calculatePremiumPension({
      annualPensionAtValuationDate: 5000,
      valuationDate: "2020-04-01",
      dateOfBirth: "1970-04-01",
      drawAge: 54,
      normalPensionAge: 60,
      cpiAssumption: 0.025,
    });

    expect(result.earlyRetirementFactor).toBeNull();
    expect(result.factorUnavailable).toBe(true);
    expect(result.annualPensionPayableAtDrawAge).toBe(0);
  });

  it("does not silently floor a fractional draw age or estimate a personal NPA factor", () => {
    expect(getPremiumEarlyRetirementFactor(58.5, 60)).toBeNull();
    expect(getPremiumEarlyRetirementFactor(58, 63)).toBeNull();
  });
});
