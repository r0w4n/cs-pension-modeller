import { describe, expect, it } from "vitest";
import alphaLateRetirementFactors from "../data/alpha_pension_late_retirement_factors.json";
import {
  calculateAccruedAlphaPension,
  calculateAlphaCommutation,
  calculateAlphaLateRetirementMultiplier,
  calculateAlphaPartialRetirement,
  calculateAlphaPensionComponentBreakdown,
  calculateAlphaPensionAfterAnnualIncrease,
  calculateAlphaPensionRevaluationFactor,
  calculateAnnualAlphaPensionIncludingReduction,
  calculateLumpSumAddedPension,
  calculateMonthlyAddedPension,
  calculateMonthlyAlphaAccrual,
  calculateMonthlyAlphaPensionGross,
  calculateProjectedAlphaPensionableEarnings,
  calculateStartingAlphaPensionAtStartDate,
  getAddedPensionFactorForAge,
  getAddedPensionPeriodCalculationDate,
  getAddedPensionRevaluationFactor,
  getAlphaEarlyRetirementFactor,
  getAlphaLateRetirementFactor,
  getAlphaLeavingServiceOutcome,
} from "./alpha";
import { defaultSettings } from "../settings";

describe("projection alpha domain", () => {
  it("records the current GAD provenance for Alpha late-retirement factors", () => {
    expect(alphaLateRetirementFactors.source).toMatchObject({
      publisher: "Government Actuary's Department",
      workbook: "CS_GB_Consolidated_Factors_2026-01.xlsx",
      workbook_issue_date: "2026-05-29",
      tables: {
        age_addition: {
          standard_and_dependants: "0-415",
          self_only_added_pension: "0-416",
        },
        late_payment_supplement: {
          standard_and_dependants: "0-419",
          self_only_added_pension: "0-420",
        },
      },
    });
  });

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

  it("revalues Alpha benefits by CPI", () => {
    expect(
      calculateAlphaPensionRevaluationFactor({
        fromDate: "2025-04-01",
        rowDate: "2028-04-01",
        activeUntilDate: "2026-04-01",
        cpiPercent: 2,
      })
    ).toBeCloseTo(1.02 * 1.02 * 1.02, 6);
  });

  it("allows annual Alpha revaluation to be positive or negative", () => {
    expect(calculateAlphaPensionAfterAnnualIncrease(10000, 2)).toBe(10200);
    expect(calculateAlphaPensionAfterAnnualIncrease(10000, -1)).toBe(9900);
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

  it("loads current GAD added-pension factors by purchase type and NPA", () => {
    expect(getAddedPensionFactorForAge(45, "self", "lump_sum", 68)).toBe(7.75);
    expect(getAddedPensionFactorForAge(45, "self", "monthly", 68)).toBe(7.9);
    expect(
      getAddedPensionFactorForAge(60, "self_plus_beneficiaries", "monthly", 68)
    ).toBe(14.17);
    expect(getAddedPensionFactorForAge(45, "self", "lump_sum", 67.5)).toBe(
      (8.28 + 7.75) / 2
    );
  });

  it("uses the GAD revaluation table and scheme-year calculation date", () => {
    expect(getAddedPensionRevaluationFactor("2026-04-01", "2049-04-01")).toBe(
      1.58
    );
    expect(
      getAddedPensionPeriodCalculationDate("2026-07-15", "2027-02-01")
    ).toBe("2026-07-15");
    expect(
      getAddedPensionPeriodCalculationDate("2026-07-15", "2027-04-01")
    ).toBe("2027-04-01");
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
    ).toBeCloseTo(137.7 / (14.17 * 1.17), 6);
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
    ).toBeCloseTo(12820 / (13.55 * 1.13), 6);
  });

  it("uses the published completed-month Alpha factor without annual interpolation", () => {
    expect(getAlphaEarlyRetirementFactor(68, 60.5)).toBe(0.677);
    expect(getAlphaEarlyRetirementFactor(68, 60 + 6.9 / 12)).toBe(0.677);
  });

  it("uses the Alpha factor table rather than the nuvos formula", () => {
    expect(getAlphaEarlyRetirementFactor(65, 60)).toBe(0.783);
  });

  it("loads representative current GAD factors for every supported Alpha NPA", () => {
    expect(getAlphaEarlyRetirementFactor(65, 55)).toBe(0.632);
    expect(getAlphaEarlyRetirementFactor(66, 60)).toBe(0.741);
    expect(getAlphaEarlyRetirementFactor(67, 60)).toBe(0.7);
    expect(getAlphaEarlyRetirementFactor(68, 60)).toBe(0.661);
  });

  it("interpolates between published tables for a non-integer Alpha NPA", () => {
    expect(getAlphaEarlyRetirementFactor(66 + 1 / 12, 60)).toBeCloseTo(
      0.741 + (0.7 - 0.741) / 12,
      10
    );
  });

  it("uses the final published monthly factor immediately before Alpha NPA", () => {
    expect(getAlphaEarlyRetirementFactor(67, 66 + 11 / 12)).toBe(0.998);
    expect(getAlphaEarlyRetirementFactor(67, 67)).toBe(1);
  });

  it("loads active age-addition and deferred late-payment factors from the current GAD tables", () => {
    expect(getAlphaLateRetirementFactor({ age: 68, status: "active" })).toBe(
      1.187
    );
    expect(getAlphaLateRetirementFactor({ age: 68, status: "deferred" })).toBe(
      1.17
    );
    expect(
      getAlphaLateRetirementFactor({
        age: 68,
        status: "active",
        factorType: "self",
      })
    ).toBe(1.199);
  });

  it("calculates late-retirement multipliers relative to the member's NPA", () => {
    expect(
      calculateAlphaLateRetirementMultiplier({
        normalPensionAge: 67,
        retirementAge: 68,
        status: "active",
      })
    ).toBe(1.0608);
    expect(
      calculateAlphaLateRetirementMultiplier({
        normalPensionAge: 67,
        retirementAge: 68,
        status: "deferred",
      })
    ).toBeCloseTo(1.17 / 1.108, 10);
    expect(
      calculateAlphaLateRetirementMultiplier({
        normalPensionAge: 67,
        retirementAge: 67,
        status: "active",
      })
    ).toBe(1);
  });

  it("returns no late-retirement multiplier outside the published table", () => {
    expect(
      calculateAlphaLateRetirementMultiplier({
        normalPensionAge: 68,
        retirementAge: 86,
        status: "active",
      })
    ).toBeNull();
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

  it("exchanges Alpha pension for a lump sum at twelve pounds per annual pound", () => {
    expect(
      calculateAlphaCommutation({
        annualPensionBeforeCommutation: 12000,
        annualPensionExchanged: 1000,
      })
    ).toEqual({
      annualPensionAfterCommutation: 11000,
      retirementLumpSum: 12000,
    });
  });

  it("rejects an Alpha commutation amount above the available annual pension", () => {
    expect(() =>
      calculateAlphaCommutation({
        annualPensionBeforeCommutation: 12000,
        annualPensionExchanged: 12001,
      })
    ).toThrow(RangeError);
  });

  it("calculates the pension taken and retained on eligible Alpha partial retirement", () => {
    expect(
      calculateAlphaPartialRetirement({
        accruedAlphaPension: 12000,
        pensionTakenPercent: 50,
        payReductionPercent: 20,
        hasEmployerAgreement: true,
        hasReachedMinimumPensionAge: true,
        paymentFactor: 0.9,
      })
    ).toEqual({
      eligible: true,
      annualPensionPayable: 5400,
      remainingAccruedPension: 6000,
    });
  });

  it("builds Alpha component payment rows using separate factors", () => {
    expect(
      calculateAlphaPensionComponentBreakdown([
        {
          component: "standardAlpha",
          unreducedAnnualAmount: 10000,
          paymentFactor: 0.897,
        },
        {
          component: "epaAlpha",
          unreducedAnnualAmount: 1200,
          paymentFactor: 1,
        },
      ])
    ).toEqual([
      {
        component: "standardAlpha",
        unreducedAnnualAmount: 10000,
        payableAnnualAmount: 8970,
        annualReduction: 1030,
      },
      {
        component: "epaAlpha",
        unreducedAnnualAmount: 1200,
        payableAnnualAmount: 1200,
        annualReduction: 0,
      },
      {
        component: "total",
        unreducedAnnualAmount: 11200,
        payableAnnualAmount: 10170,
        annualReduction: 1030,
      },
    ]);
  });

  it("does not release Alpha pension when partial-retirement conditions are not met", () => {
    expect(
      calculateAlphaPartialRetirement({
        accruedAlphaPension: 12000,
        pensionTakenPercent: 50,
        payReductionPercent: 19,
        hasEmployerAgreement: true,
        hasReachedMinimumPensionAge: true,
      })
    ).toEqual({
      eligible: false,
      annualPensionPayable: 0,
      remainingAccruedPension: 12000,
    });
  });

  it("preserves Alpha benefits after two qualifying years", () => {
    expect(getAlphaLeavingServiceOutcome(1.99)).toBe("refund_or_transfer");
    expect(getAlphaLeavingServiceOutcome(2)).toBe("preserved");
  });
});
