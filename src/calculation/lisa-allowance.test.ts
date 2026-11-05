import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  normalizeSettings,
  type PensionSettings,
} from "../settings";
import { calculateLisaPotAtDate } from "../projection-domains/lisa";
import { calculateRetirementPlan } from "./retirement-plan";

function createSettings(overrides: Partial<PensionSettings> = {}) {
  return normalizeSettings({
    ...defaultSettings,
    startDate: "2026-04-06",
    dateOfBirth: "1990-04-06",
    lifeExpectancy: 75,
    requirementAge: 60,
    showAlpha: false,
    showStatePension: false,
    showSipp: false,
    showIsa: false,
    showLisa: true,
    lisaCurrentPot: 0,
    lisaMonthlyContribution: 0,
    lisaRealInterestPercent: 2.5,
    lisaDrawAge: 60,
    lisaLumpSums: [lumpSum("2036-04-06", 4000)],
    projectionBasis: "real",
    inflationRateAnnual: 2.5,
    ...overrides,
  });
}

function lumpSum(date: string, amount: number) {
  return {
    id: date,
    startDate: date,
    endDate: date,
    cadence: "once" as const,
    amount,
  };
}

function calculate(settings: PensionSettings) {
  const plan = calculateRetirementPlan(settings, {
    includeTargetBasedWithdrawalPreviews: false,
  });
  expect(plan.validationIssues).toEqual([]);
  return plan;
}

describe("LISA cash allowances in the canonical plan", () => {
  it.each([
    {
      projectionBasis: "real" as const,
      inflation: 2.5,
      expected: 3905.9920086286365,
    },
    {
      projectionBasis: "real" as const,
      inflation: 10,
      expected: 5000 / 1.1 ** 10,
    },
    { projectionBasis: "real" as const, inflation: 0, expected: 5000 },
    { projectionBasis: "nominal" as const, inflation: 2.5, expected: 5000 },
  ])(
    "keeps the future cap in cash pounds in $projectionBasis terms with $inflation% inflation",
    ({ projectionBasis, inflation, expected }) => {
      const settings = createSettings({
        projectionBasis,
        inflationRateAnnual: inflation,
        lisaRealInterestPercent: projectionBasis === "real" ? inflation : 0,
      });
      const plan = calculate(settings);
      expect(
        plan.rows.find((row) => row.date === "2036-04-06")?.lisaPot
      ).toBeCloseTo(expected, 6);
      expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
        expected,
        6
      );
      expect(
        calculateLisaPotAtDate({
          settings,
          rowDate: "2036-04-06",
          drawDate: "2050-04-06",
        })
      ).toBeCloseTo(expected, 6);
    }
  );

  it("does not reduce a real contribution that remains below the cash cap", () => {
    const plan = calculate(
      createSettings({ lisaLumpSums: [lumpSum("2036-04-06", 1000)] })
    );
    expect(
      plan.rows.find((row) => row.date === "2036-04-06")?.lisaPot
    ).toBeCloseTo(1250, 6);
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
      1250,
      6
    );
  });

  it("shares a fixed cash allowance between regular payments and lump sums and keeps the summary consistent", () => {
    const settings = createSettings({
      dateOfBirth: "1977-04-06",
      lisaMonthlyContribution: 300,
      lisaLumpSums: [lumpSum("2026-10-06", 1000)],
      inflationRateAnnual: 10,
      lisaRealInterestPercent: 10,
    });
    const plan = calculate(settings);
    let previousPot = 0;
    let cashAdditionsWithBonus = 0;
    for (let month = 0; month < 12; month += 1) {
      const year = month < 9 ? 2026 : 2027;
      const calendarMonth = ((month + 3) % 12) + 1;
      const date = `${year}-${String(calendarMonth).padStart(2, "0")}-06`;
      const row = plan.rows.find((row) => row.date === date);
      expect(row).toBeDefined();
      const pot = row!.lisaPot;
      // No real investment growth: each increase is an accepted addition plus bonus.
      cashAdditionsWithBonus += (pot - previousPot) * 1.1 ** (month / 12);
      previousPot = pot;
    }
    expect(cashAdditionsWithBonus).toBeCloseTo(5000, 6);
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
      previousPot,
      6
    );
  });

  it("resets the cash allowance on 6 April in future tax years", () => {
    const plan = calculate(
      createSettings({
        lisaLumpSums: [
          lumpSum("2036-04-05", 4000),
          lumpSum("2036-04-06", 4000),
        ],
      })
    );
    expect(
      plan.rows.find((row) => row.date === "2036-04-06")?.lisaPot
    ).toBeCloseTo(10000 / 1.025 ** 10, 6);
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
      10000 / 1.025 ** 10,
      6
    );
  });

  it("excludes a future payment on the 50th birthday", () => {
    const plan = calculate(createSettings({ dateOfBirth: "1986-04-06" }));
    expect(plan.rows.find((row) => row.date === "2036-04-06")?.lisaPot).toBe(0);
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBe(0);
  });

  it("keeps the contribution summary separate from an existing balance and investment returns", () => {
    const plan = calculate(
      createSettings({ lisaCurrentPot: 10000, lisaRealInterestPercent: 7 })
    );
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
      3905.9920086286365,
      6
    );
    expect(
      plan.rows.find((row) => row.date === "2036-04-06")?.lisaPot
    ).toBeGreaterThan(13905.99);
  });

  it("reduces regular payments during partial retirement without reducing lump sums", () => {
    const plan = calculate(
      createSettings({
        dateOfBirth: "1977-04-06",
        partialRetirementEnabled: true,
        partialRetirementStartAge: 49,
        partialRetirementWorkPercent: 50,
        lisaMonthlyContribution: 300,
        lisaLumpSums: [lumpSum("2026-10-06", 1000)],
        inflationRateAnnual: 10,
        lisaRealInterestPercent: 10,
      })
    );
    expect(
      plan.rows.find((row) => row.date === "2027-04-06")?.lisaPot
    ).toBeCloseTo(3500, 6);
    expect(plan.summary.lisaPension.totalContributionsWithBonus).toBeCloseTo(
      3500,
      6
    );
  });
});
