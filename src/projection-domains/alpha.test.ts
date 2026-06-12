import { describe, expect, it } from "vitest";
import {
  calculateAccruedAlphaPension,
  calculateAlphaPensionRevaluationFactor,
  calculateAnnualAlphaPensionIncludingReduction,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaAccrual,
  calculateMonthlyAlphaPensionGross,
  calculateProjectedAlphaPensionableEarnings,
  calculateStartingAlphaPensionAtStartDate,
  getAddedPensionFactorForAge,
  getAlphaEarlyRetirementFactor,
} from "./alpha";
import { defaultSettings } from "../settings";

describe("projection alpha domain", () => {
  it("calculates monthly alpha accrual at 2.32 percent divided by 12", () => {
    expect(calculateMonthlyAlphaAccrual(42000)).toBeCloseTo(81.2, 6);
  });

  it("projects pensionable earnings from the calculation start date when pay rises are above zero", () => {
    const settings = {
      ...defaultSettings,
      startDate: "2025-04-01",
      pensionableEarnings: 50000,
      alphaPayRisePercent: 3,
    };

    expect(
      calculateProjectedAlphaPensionableEarnings(settings, "2026-03-31")
    ).toBe(50000);
    expect(
      calculateProjectedAlphaPensionableEarnings(settings, "2026-04-01")
    ).toBeCloseTo(51500, 6);
    expect(
      calculateProjectedAlphaPensionableEarnings(settings, "2027-04-01")
    ).toBeCloseTo(53045, 6);
  });

  it("keeps pensionable earnings flat when expected pay rises are zero", () => {
    expect(
      calculateProjectedAlphaPensionableEarnings(
        {
          ...defaultSettings,
          startDate: "2025-04-01",
          pensionableEarnings: 50000,
          alphaPayRisePercent: 0,
        },
        "2027-04-01"
      )
    ).toBe(50000);
  });

  it("calculates accrued alpha pension cumulatively", () => {
    expect(calculateAccruedAlphaPension(8250, 243.6)).toBeCloseTo(8493.6, 6);
  });

  it("revalues Alpha benefits by CPI plus 1.5 percent while active and CPI after leaving", () => {
    expect(
      calculateAlphaPensionRevaluationFactor({
        fromDate: "2025-04-01",
        rowDate: "2028-04-01",
        activeUntilDate: "2026-04-01",
        cpiPercent: 2,
      })
    ).toBeCloseTo(1.035 * 1.02 * 1.02, 6);
  });

  it("uses the 2.32 percent accrual rate when deriving the starting Alpha pension", () => {
    expect(
      calculateStartingAlphaPensionAtStartDate({
        alphaPensionAccruedAtLastStatement: 0,
        alphaPensionAbsDate: "2025-04-01",
        startDate: "2026-04-01",
        pensionableEarnings: 100000,
      })
    ).toBeCloseTo(2320, 6);
  });

  it("loads the added pension factor from JSON", () => {
    expect(getAddedPensionFactorForAge(60)).toBe(12.82);
    expect(getAddedPensionFactorForAge(60, "self_plus_beneficiaries")).toBe(
      13.77
    );
  });

  it("calculates monthly added pension with the self and dependants factor", () => {
    expect(
      calculateMonthlyAddedPension({
        rowDate: "2047-06-15",
        stopDate: "2047-06-15",
        dateOfBirth: "1987-06-15",
        addedPensionMonthlyContribution: 137.7,
        factorType: "self_plus_beneficiaries",
      })
    ).toBeCloseTo(10, 6);
  });

  it("calculates yearly recurring lump sum added pension purchases", () => {
    expect(
      calculateLumpSumAddedPension({
        previousRowDate: "2048-06-15",
        rowDate: "2049-06-15",
        dateOfBirth: "1987-06-15",
        lumpSums: [
          {
            id: "yearly",
            amount: 12820,
            startDate: "2047-06-15",
            cadence: "yearly",
            endDate: "2049-06-15",
          },
        ],
      })
    ).toBeCloseTo(12820 / getAddedPensionFactorForAge(62), 6);
  });

  it("interpolates Alpha early retirement reduction factors for decimal ages", () => {
    expect(getAlphaEarlyRetirementFactor(68, 60.5)).toBeCloseTo(
      (0.648 + 0.68) / 2,
      6
    );
  });

  it("uses the Alpha factor table rather than the nuvos formula", () => {
    expect(getAlphaEarlyRetirementFactor(65, 60)).toBe(0.771);
  });

  it("applies early retirement reduction when draw date is on or before NPA", () => {
    expect(
      calculateAnnualAlphaPensionIncludingReduction(
        12000,
        "2047-06-15",
        "2055-06-15",
        0.648
      )
    ).toBeCloseTo(7776, 6);
  });

  it("returns zero monthly alpha gross income before draw date and annual divided by 12 afterwards", () => {
    expect(
      calculateMonthlyAlphaPensionGross("2047-06-14", "2047-06-15", 12000)
    ).toBe(0);
    expect(
      calculateMonthlyAlphaPensionGross("2047-06-15", "2047-06-15", 12000)
    ).toBe(1000);
  });
});
